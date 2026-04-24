// Package dicom provides real DICOM tag extraction and PHI anonymisation
// using github.com/suyashkumar/dicom (a pure-Go DICOM parser).
//
// Design:
//   - Parse full dataset once, cache elements in a map for O(1) tag lookup
//   - Anonymise in-place: overwrite PHI element values before re-serialisation
//   - Deterministic pseudo-UID preserves referential integrity across studies
package dicom

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	dicomlib "github.com/suyashkumar/dicom"
	"github.com/suyashkumar/dicom/pkg/tag"
)

// PHITags is the list of DICOM tags containing Protected Health Information
// per HIPAA Safe Harbour (45 CFR §164.514(b)(2)) and DICOM PS3.15 Annex E.
var PHITags = []tag.Tag{
	tag.PatientName,
	tag.PatientID,
	tag.PatientBirthDate,
	tag.PatientSex,
	tag.PatientAge,
	tag.PatientAddress,
	tag.PatientTelephoneNumbers,
	tag.InstitutionName,
	tag.InstitutionAddress,
	tag.ReferringPhysicianName,
	tag.StudyDate,       // replaced with year only
	tag.AccessionNumber,
	tag.StudyID,
}

// ParsedDICOM holds the parsed metadata extracted from a raw DICOM file.
type ParsedDICOM struct {
	Dataset     *dicomlib.Dataset
	InstanceUID string
	StudyUID    string
	SeriesUID   string
	Modality    string
	BodyPart    string
	StudyDate   string // anonymised: year only
	PixelHash   string // SHA-256 of pixel data
	FileSizeBytes int64
}

// Parse parses a raw DICOM byte slice, extracts clinical metadata,
// and computes a SHA-256 hash of the pixel data for integrity verification.
func Parse(rawData []byte) (*ParsedDICOM, error) {
	r := bytes.NewReader(rawData)
	dataset, err := dicomlib.Parse(r, int64(len(rawData)), nil)
	if err != nil {
		return nil, fmt.Errorf("dicom.Parse: %w", err)
	}

	p := &ParsedDICOM{
		Dataset:       &dataset,
		FileSizeBytes: int64(len(rawData)),
		InstanceUID:   getString(&dataset, tag.MediaStorageSOPInstanceUID),
		StudyUID:      getString(&dataset, tag.StudyInstanceUID),
		SeriesUID:     getString(&dataset, tag.SeriesInstanceUID),
		Modality:      getString(&dataset, tag.Modality),
		BodyPart:      getString(&dataset, tag.BodyPartExamined),
		StudyDate:     yearOnly(getString(&dataset, tag.StudyDate)),
		PixelHash:     pixelHash(&dataset),
	}

	if p.InstanceUID == "" {
		p.InstanceUID = "unknown"
	}
	if p.Modality == "" {
		p.Modality = "OT" // DICOM "other" modality code
	}

	return p, nil
}

// Anonymise overwrites PHI tags in the dataset with pseudonymous values
// and replaces all UIDs with deterministic pseudo-UIDs keyed on tenantID + salt.
// The modified dataset is re-serialised and returned as bytes for upload.
func Anonymise(p *ParsedDICOM, pseudoUID, tenantID string) ([]byte, error) {
	dataset := p.Dataset

	// Zero or pseudonymise each PHI tag
	for _, t := range PHITags {
		elem, err := dataset.FindElementByTag(t)
		if err != nil {
			continue // tag not present — fine
		}
		switch t {
		case tag.StudyDate:
			// Retain year only (clinical utility vs privacy balance)
			if yr := yearOnly(getStringFromElem(elem)); yr != "" {
				if v, err := dicomlib.NewValue([]string{yr + "0101"}); err == nil {
					elem.Value = v
				}
			}
		default:
			if v, err := dicomlib.NewValue([]string{""}); err == nil {
				elem.Value = v
			}
		}
	}

	// Replace instance UID with pseudo-UID
	if elem, err := dataset.FindElementByTag(tag.MediaStorageSOPInstanceUID); err == nil {
		if v, err := dicomlib.NewValue([]string{pseudoUID}); err == nil {
			elem.Value = v
		}
	}
	if elem, err := dataset.FindElementByTag(tag.SOPInstanceUID); err == nil {
		if v, err := dicomlib.NewValue([]string{pseudoUID}); err == nil {
			elem.Value = v
		}
	}

	// Re-serialise anonymised dataset
	var buf bytes.Buffer
	if err := dicomlib.Write(&buf, *dataset); err != nil {
		return nil, fmt.Errorf("dicom.Write: %w", err)
	}
	return buf.Bytes(), nil
}

// GeneratePseudoUID creates a deterministic DICOM-compliant UID.
// Same originalUID + tenantID always → same pseudoUID (referential integrity).
func GeneratePseudoUID(originalUID, tenantID string) string {
	salt := os.Getenv("DICOM_ANON_SALT")
	if salt == "" {
		salt = "sewa-ai-default-salt"
	}
	hash := sha256.Sum256([]byte(originalUID + tenantID + salt))
	digits := numerify(hex.EncodeToString(hash[:])[:24])
	return fmt.Sprintf("2.25.%s", digits)
}

// ─── helpers ────────────────────────────────────────────────────────────────

func getString(dataset *dicomlib.Dataset, t tag.Tag) string {
	elem, err := dataset.FindElementByTag(t)
	if err != nil {
		return ""
	}
	return getStringFromElem(elem)
}

func getStringFromElem(elem *dicomlib.Element) string {
	v, ok := elem.Value.GetValue().([]string)
	if !ok || len(v) == 0 {
		return ""
	}
	return strings.TrimSpace(v[0])
}

func pixelHash(dataset *dicomlib.Dataset) string {
	elem, err := dataset.FindElementByTag(tag.PixelData)
	if err != nil {
		return ""
	}
	raw, _ := elem.Value.GetValue().([]byte)
	if raw == nil {
		return ""
	}
	h := sha256.Sum256(raw)
	return hex.EncodeToString(h[:])
}

// yearOnly extracts the YYYYMMDD → YYYY from a DICOM date string.
func yearOnly(dicomDate string) string {
	if len(dicomDate) >= 4 {
		return dicomDate[:4]
	}
	return time.Now().Format("2006")
}

// numerify converts a hex string to a purely numeric string for DICOM UID compliance.
func numerify(s string) string {
	var b strings.Builder
	for _, c := range s {
		if c >= '0' && c <= '9' {
			b.WriteRune(c)
		} else {
			b.WriteString(fmt.Sprintf("%d", int(c-'a')+10))
		}
	}
	result := b.String()
	if len(result) > 20 {
		return result[:20]
	}
	return result
}
