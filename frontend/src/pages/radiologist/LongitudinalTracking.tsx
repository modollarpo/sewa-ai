// SEWA XAI — LongitudinalTracking.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg1: '#08160F', bg2: '#0C1D17', bg3: '#111F1A',
  brand: '#408D7B', brandLt: '#52B09A',
  normal: '#1DBF73', urgent: '#E08A20', critical: '#E03535',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028',
  F: "'IBM Plex Sans',system-ui,sans-serif",
  FM: "'IBM Plex Mono',monospace",
};

interface Scan {
  id: string;
  modality: string;
  bodyPart: string;
  createdAt: string;
  aiResult: {
    primaryFinding: string;
    urgency: string;
    confidence: number;
  };
}

export function LongitudinalTracking({ onSelectScan }: { onSelectScan?: (scanId: string) => void }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCurrentScan, setSelectedCurrentScan] = useState<Scan | null>(null);
  const [priorScan, setPriorScan] = useState<Scan | null>(null);

  const fetchScans = async (patientId: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/longitudinal/patient/${patientId}`);
      setScans(res.data);
    } catch (e) {
      console.error('[LONGITUDINAL] Failed to load scans:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCurrent = async (scan: Scan) => {
    setSelectedCurrentScan(scan);
    try {
      const res = await apiClient.get(`/longitudinal/prior/${scan.id}`);
      if (res.data.priorScan) {
        const fullPrior = scans.find(s => s.id === res.data.priorScan.id);
        setPriorScan(fullPrior || null);
      } else {
        setPriorScan(null);
      }
    } catch (e) {
      console.error('[LONGITUDINAL] Failed to load prior:', e);
    }
  };

  return (
    <div style={{
      padding: 24, background: C.bg1,
      minHeight: 'calc(100vh - 76px)', fontFamily: C.F
    }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: C.textHi, fontSize: 22, fontWeight: 800 }}>
          📈 Longitudinal Patient Tracking
        </h1>
        <p style={{ margin: '8px 0', color: C.textMd, fontSize: 13 }}>
          Compare prior scans to track progression over time
        </p>
      </div>

      {/* Patient selector placeholder (would integrate with patient list) */}
      <div style={{
        padding: 20, background: C.bg2,
        borderRadius: 16, border: `1px solid ${C.border}`,
        marginBottom: 20
      }}>
        <h3 style={{ margin: '0 0 12px', color: C.textHi, fontSize: 14, fontWeight: 700 }}>
          Select Patient
        </h3>
        <p style={{ margin: '0 0 16px', color: C.textMd, fontSize: 12 }}>
          (In production: integrates with patient worklist)
        </p>
        <button
          onClick={() => {
            // Demo: use first available patient id from scan store
            const fakePatientId = 'demo-patient-123';
            setSelectedPatientId(fakePatientId);
            fetchScans(fakePatientId);
          }}
          style={{
            padding: '10px 20px', background: C.brand, border: 'none',
            borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Load Demo Patient Scans
        </button>
      </div>

      {/* Scan Timeline */}
      {scans.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: Timeline */}
          <div style={{
            padding: 20, background: C.bg2,
            borderRadius: 16, border: `1px solid ${C.border}`
          }}>
            <h3 style={{ margin: '0 0 20px', color: C.textHi, fontSize: 16, fontWeight: 700 }}>
              Scan Timeline ({scans.length} scans)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scans.map((scan, idx) => (
                <div
                  key={scan.id}
                  onClick={() => handleSelectCurrent(scan)}
                  style={{
                    padding: 16, borderRadius: 12,
                    border: `1px solid ${selectedCurrentScan?.id === scan.id ? C.brand : C.border}`,
                    background: selectedCurrentScan?.id === scan.id ? `${C.brand}12` : C.bg3,
                    cursor: 'pointer', transition: 'all 150ms'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: C.brand, fontWeight: 700 }}>
                      {new Date(scan.createdAt).toLocaleDateString('en-GB')} • {scan.modality} • {scan.bodyPart}
                    </div>
                    <span style={{
                      fontSize: 10, padding: '4px 8px',
                      borderRadius: 20, fontWeight: 700,
                      background: scan.aiResult.urgency === 'CRITICAL' ? C.critBg
                        : scan.aiResult.urgency === 'URGENT' ? C.urgBg
                          : C.normalBg,
                      color: scan.aiResult.urgency === 'CRITICAL' ? C.critical
                        : scan.aiResult.urgency === 'URGENT' ? C.urgent
                          : C.normal,
                      border: `1px solid ${scan.aiResult.urgency === 'CRITICAL' ? C.critical
                        : scan.aiResult.urgency === 'URGENT' ? C.urgent
                          : C.normal}30`
                    }}>
                      {scan.aiResult.urgency}
                    </span>
                  </div>
                  <div style={{
                    marginTop: 8, fontSize: 13, color: C.textHi,
                    fontWeight: 600
                  }}>
                    {scan.aiResult.primaryFinding}
                  </div>
                  <div style={{
                    marginTop: 6, fontSize: 11, color: C.textMd
                  }}>
                    Confidence: {Math.round(scan.aiResult.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Comparison */}
          <div style={{
            padding: 20, background: C.bg2,
            borderRadius: 16, border: `1px solid ${C.border}`
          }}>
            <h3 style={{ margin: '0 0 20px', color: C.textHi, fontSize: 16, fontWeight: 700 }}>
              Comparison View
            </h3>
            {selectedCurrentScan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Current Scan */}
                <div style={{
                  padding: 16, borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: C.bg3
                }}>
                  <h4 style={{ margin: '0 0 8px', color: C.brandLt, fontSize: 14, fontWeight: 700 }}>
                    Current Scan ({new Date(selectedCurrentScan.createdAt).toLocaleDateString('en-GB')})
                  </h4>
                  <div style={{ fontSize: 13, color: C.textHi }}>
                    {selectedCurrentScan.aiResult.primaryFinding}
                  </div>
                </div>

                {/* Prior Scan (if available) */}
                {priorScan ? (
                  <div style={{
                    padding: 16, borderRadius: 12,
                    border: `1px solid ${C.border}`,
                    background: C.bg3
                  }}>
                    <h4 style={{ margin: '0 0 8px', color: C.textMd, fontSize: 14, fontWeight: 700 }}>
                      Prior Scan ({new Date(priorScan.createdAt).toLocaleDateString('en-GB')})
                    </h4>
                    <div style={{ fontSize: 13, color: C.textHi }}>
                      {priorScan.aiResult.primaryFinding}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: 20, borderRadius: 12,
                    border: `1px dashed ${C.textLo}`,
                    background: C.bg3, textAlign: 'center', color: C.textLo
                  }}>
                    No prior scans of the same modality/body part
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: 40, textAlign: 'center',
                color: C.textLo
              }}>
                Select a scan from the timeline to compare
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
