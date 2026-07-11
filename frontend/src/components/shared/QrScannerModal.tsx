// SEWA XAI — QR Scanner Modal
import React, { useState, useRef, useEffect } from 'react';

import { dashboardColors as C } from '../../design-system/tokens';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

export function QrScannerModal({ 
  isOpen, 
  onClose, 
  onScan,
  title = 'Scan Universal Health ID'
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    startScanner();
    return () => stopScanner();
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setError('Camera access denied. Please use manual input.');
    }
  };

  const stopScanner = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  // Simulate QR scan for demo purposes
  const handleSimulateScan = () => {
    const demoIds = [
      'NHS-1234567890',
      'GH-NHIA-987654',
      'KE-NHIF-456789',
      'NG-NIN-123456789',
    ];
    const randomId = demoIds[Math.floor(Math.random() * demoIds.length)];
    onScan(randomId);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: C.bg1, borderRadius: 16, border: `1px solid ${C.border}`,
        width: '100%', maxWidth: 480, padding: 24,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textHi, fontFamily: C.F }}>
            {title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMd, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {error && (
          <div style={{
            background: `${C.critical}20`, border: `1px solid ${C.critical}40`,
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: C.critical, fontSize: 12, fontFamily: C.F,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Camera Preview */}
          <div style={{
            height: 260, background: C.bg2, borderRadius: 12,
            border: `2px dashed ${C.border}`, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {stream ? (
              <video 
                ref={videoRef} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                playsInline
              />
            ) : (
              <div style={{ textAlign: 'center', color: C.textLo, fontSize: 13, fontFamily: C.F }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>📷</div>
                {error || 'Camera initializing...'}
              </div>
            )}
            {/* Scan Overlay */}
            <div style={{
              position: 'absolute', inset: 20, border: `2px solid ${C.brand}`, borderRadius: 8,
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.5)`,
            }} />
          </div>

          {/* Manual Input */}
          <div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 10 }}>
              <input 
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ID manually..."
                style={{
                  flex: 1, background: C.bg2, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '12px 16px', color: C.textHi,
                  fontFamily: C.F, fontSize: 14,
                }}
              />
              <button type="submit" style={{
                padding: '12px 20px', borderRadius: 10, border: 'none',
                background: C.brand, color: 'white', cursor: 'pointer',
                fontFamily: C.F, fontWeight: 700, fontSize: 13,
              }}>Submit</button>
            </form>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSimulateScan} style={{
              flex:1, padding: '10px 16px', borderRadius:10,
              background: C.bg3, border: `1px solid ${C.border}`,
              color: C.brand, cursor: 'pointer', fontFamily:C.F,
              fontWeight: 600, fontSize:12,
            }}>
              🎲 Demo: Scan Test ID
            </button>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius:10,
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.textMd, cursor: 'pointer', fontFamily:C.F,
              fontWeight:600, fontSize:12,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
