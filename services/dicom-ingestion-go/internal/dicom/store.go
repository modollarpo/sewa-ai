// Package dicom provides DICOM C-STORE SCP implementation.
// Implements minimal Association negotiation + P-DATA-TF reception
// using the standard DICOM PDU format (PS3.8).
package dicom

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"strings"
	"sync"
	"time"
)

// PDU types
const (
	pduAssociateRQ      = 0x01
	pduAssociateAC      = 0x02
	pduAssociateRJ      = 0x03
	pduDataTF           = 0x04
	pduReleaseRQ        = 0x05
	pduReleaseRP        = 0x06
)

// CStoreHandler is called when a complete DICOM instance is received via C-STORE.
type CStoreHandler func(rawData []byte, sourceAET string) error

// CStoreSCP implements a minimal DICOM C-STORE Service Class Provider.
type CStoreSCP struct {
	aeTitle   string
	handler   CStoreHandler
	listener  net.Listener
	wg        sync.WaitGroup
	done      chan struct{}
}

// NewCStoreSCP creates a new C-STORE SCP.
func NewCStoreSCP(aeTitle string, handler CStoreHandler) *CStoreSCP {
	return &CStoreSCP{
		aeTitle: aeTitle,
		handler: handler,
		done:    make(chan struct{}),
	}
}

// Start begins listening on addr (e.g. ":11112").
func (s *CStoreSCP) Start(addr string) error {
	var err error
	s.listener, err = net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("C-STORE listen %s: %w", addr, err)
	}
	go s.acceptLoop()
	return nil
}

// Stop gracefully shuts down the listener and waits for active connections.
func (s *CStoreSCP) Stop() {
	close(s.done)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
}

func (s *CStoreSCP) acceptLoop() {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			select {
			case <-s.done:
				return
			default:
				continue
			}
		}
		s.wg.Add(1)
		go s.handleConn(conn)
	}
}

func (s *CStoreSCP) handleConn(conn net.Conn) {
	defer s.wg.Done()
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(30 * time.Second))

	// Read PDU header (10 bytes: 1 type + 1 reserved + 4 length + 4 reserved)
	header := make([]byte, 10)
	if _, err := io.ReadFull(conn, header); err != nil {
		return
	}

	pduType := header[0]
	pduLen := binary.BigEndian.Uint32(header[4:8])

	switch pduType {
	case pduAssociateRQ:
		s.handleAssociateRQ(conn, pduLen)
	default:
		// Reject unsupported PDU types
		s.sendAssociateRJ(conn, 1, 7) // no reason
	}
}

func (s *CStoreSCP) handleAssociateRQ(conn net.Conn, pduLen uint32) {
	// Read the full A-ASSOCIATE-RQ PDU body
	body := make([]byte, pduLen)
	if _, err := io.ReadFull(conn, body); err != nil {
		return
	}

	// Extract calling AE title (bytes 14-29 inclusive, 16 bytes, space-padded)
	callingAET := strings.TrimSpace(string(body[14:30]))

	// Verify application context (DICOM default: 1.2.840.10008.3.1.1.1)
	// We accept any valid Application Context for now

	// Send A-ASSOCIATE-AC
	s.sendAssociateAC(conn, callingAET)

	// Enter P-DATA-TF loop
	s.dataLoop(conn, callingAET)
}

func (s *CStoreSCP) sendAssociateAC(conn net.Conn, callingAET string) {
	// Build minimal A-ASSOCIATE-AC PDU
	var resp bytes.Buffer
	resp.WriteByte(pduAssociateAC)     // PDU type
	resp.WriteByte(0x00)               // reserved

	// We'll compute length at the end
	var body bytes.Buffer

	// Application context (52 bytes)
	body.Write([]byte{
		0x10, 0x00, 0x00, 0x00, // item type + reserved
		0x04, 0x00, 0x00, 0x00, // item length = 4
		0x01, 0x02, 0x00, 0x00, // UL: 1.2.840.10008.3.1.1.1
	})

	// Called AE title (our AE title) — 16 bytes
	calledBytes := make([]byte, 16)
	copy(calledBytes, s.aeTitle)
	body.Write([]byte{
		0x20, 0x00, 0x00, 0x00, // item type
		0x10, 0x00, 0x00, 0x00, // item length = 16
	})
	body.Write(calledBytes)

	// Calling AE title — 16 bytes
	callBytes := make([]byte, 16)
	copy(callBytes, callingAET)
	body.Write([]byte{
		0x30, 0x00, 0x00, 0x00, // item type
		0x10, 0x00, 0x00, 0x00, // item length = 16
	})
	body.Write(callBytes)

	// Presentation context definitions (accept first proposed context)
	body.Write([]byte{
		0x50, 0x00, 0x00, 0x00, // item type
		0x04, 0x00, 0x00, 0x00, // item length = 4
		0x00, 0x00, 0x00, 0x00, // context ID = 1, reason = 0, result = acceptance
	})

	// User info
	body.Write([]byte{
		0x50, 0x00, 0x00, 0x00, // item type
		0x02, 0x00, 0x00, 0x00, // item length = 2
		0x00, 0x00,             // no implementation UID
	})

	// Write PDU length (big-endian, excludes PDU type + reserved + length itself)
	pduLen := uint32(body.Len())
	lenBytes := make([]byte, 4)
	binary.BigEndian.PutUint32(lenBytes, pduLen)
	resp.Write(lenBytes)          // PDU length
	resp.Write(body.Bytes())
	conn.Write(resp.Bytes())
}

func (s *CStoreSCP) sendAssociateRJ(conn net.Conn, result, source byte) {
	resp := []byte{
		pduAssociateRJ,
		0x00,                   // reserved
		0x00, 0x00, 0x00, 0x04, // PDU length = 4
		result,
		0x00,                   // reserved
		source,
		0x01,                   // reason: no reason given
	}
	conn.Write(resp)
}

func (s *CStoreSCP) dataLoop(conn net.Conn, callingAET string) {
	defer conn.Close()

	// Buffer to accumulate DICOM data across P-DATA-TF PDUs
	var dicomBuf bytes.Buffer

	for {
		header := make([]byte, 10)
		if _, err := io.ReadFull(conn, header); err != nil {
			return
		}

		pduType := header[0]
		pduLen := binary.BigEndian.Uint32(header[4:8])

		switch pduType {
		case pduDataTF:
			// P-DATA-TF contains presentation data values
			// Skip PDV header (4 bytes: 2 PDV len + 1 context ID + 1 flags)
			body := make([]byte, pduLen)
			if _, err := io.ReadFull(conn, body); err != nil {
				return
			}

			// Minimum PDV: 4 bytes header + data
			if len(body) < 4 {
				continue
			}

			// PDV header: 4 bytes (length, context ID, flags)
			pdvLen := int(binary.BigEndian.Uint32(body[:2])) & 0xFFFF
			contextID := body[2]
			_ = contextID
			isLast := body[3]&0x02 != 0

			// PDV data follows at offset 4
			dataLen := pdvLen - 2 // subtract context ID + flags
			if dataLen > len(body)-4 {
				dataLen = len(body) - 4
			}

			dicomBuf.Write(body[4 : 4+dataLen])

			if isLast {
				// Validate DICOM magic bytes
				data := dicomBuf.Bytes()
				if len(data) >= 132 && data[128] == 'D' && data[129] == 'I' && data[130] == 'C' && data[131] == 'M' {
					s.sendCStoreRSP(conn, 0x0000) // success
					if s.handler != nil {
						s.handler(data, callingAET)
					}
				} else {
					s.sendCStoreRSP(conn, 0xA700) // cannot understand
				}
				dicomBuf.Reset()
			}

		case pduReleaseRQ:
			// A-RELEASE-RP
			conn.Write([]byte{
				pduReleaseRP,
				0x00,
				0x00, 0x00, 0x00, 0x04, // PDU length = 4
				0x00, 0x00, 0x00, 0x00, // reserved
			})
			return

		default:
			// Drain remaining bytes to keep connection clean
			if pduLen > 0 {
				io.CopyN(io.Discard, conn, int64(pduLen))
			}
			return
		}
	}
}

func (s *CStoreSCP) sendCStoreRSP(conn net.Conn, status uint16) {
	// Build C-STORE-RSP as a P-DATA-TF PDU
	// Command set: AffectedSOPClassUID, CommandField (0x8001 = C-STORE-RSP),
	// MessageIDBeingRespondedTo, CommandDataSetType (0x0101 = no dataset), Status
	rsp := []byte{
		pduDataTF,
		0x00,
		0x00, 0x00, 0x00, 0x00, // PDU length placeholder
	}
	// PDV: length = 12 + status bytes
	pdv := []byte{
		0x00, 0x0E, 0x00, 0x00, // PDV length = 14
		0x01,                   // presentation context ID
		0x03,                   // flags: command, last fragment
		// Command set in DICOM Message format
		0x00, 0x00, 0x00, 0x00, // Group 0000
		0x00, 0x00, 0x00, 0x0E, // Element 0000 (CommandGroupLength)
		0x0E, 0x00, 0x00, 0x00, // length = 14
		// Status
		0x00, 0x00,
		byte(status >> 8), byte(status & 0xFF),
	}
	rsp = append(rsp, pdv...)
	// Set PDU length
	pduLen := uint32(len(pdv))
	binary.BigEndian.PutUint32(rsp[4:8], pduLen)
	conn.Write(rsp)
}
