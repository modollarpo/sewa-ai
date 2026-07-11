// SEWA XAI — LongitudinalTracking.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

import { dashboardColors as C } from '../../design-system/tokens';

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
  const [patients, setPatients] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    // Fetch unique patients from recent scans
    apiClient.get('/scans').then(res => {
      const allScans = Array.isArray(res.data) ? res.data : (res.data?.scans || []);
      const uniquePatients = new Map();
      allScans.forEach((s: any) => {
        if (s.patientId && s.patient) {
          uniquePatients.set(s.patientId, `${s.patient.firstName} ${s.patient.lastName}`);
        }
      });
      setPatients(Array.from(uniquePatients.entries()).map(([id, name]) => ({ id, name })));
    }).catch(() => { /* patient list unavailable */ });
  }, []);

  const fetchScans = async (patientId: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/longitudinal/patient/${patientId}`);
      setScans(res.data);
    } catch {
      // Longitudinal scans load failed — UI shows empty state
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
    } catch {
      // Prior scan load failed — non-critical
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
          Select a patient to view their longitudinal scan history:
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {patients.length > 0 ? patients.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPatientId(p.id);
                fetchScans(p.id);
              }}
              style={{
                padding: '8px 16px', background: selectedPatientId === p.id ? C.brand : C.bg3, border: `1px solid ${selectedPatientId === p.id ? C.brand : C.border}`,
                borderRadius: 8, color: selectedPatientId === p.id ? 'white' : C.textMd, fontSize: 13, fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {p.name}
            </button>
          )) : (
            <div style={{ fontSize: 13, color: C.textMd }}>No patients with scan history found.</div>
          )}
        </div>
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
                  <div style={{ fontSize: 13, color: C.textHi, marginBottom: 8 }}>
                    {selectedCurrentScan.aiResult.primaryFinding}
                  </div>
                  {(selectedCurrentScan as any).longitudinalRecords?.[0]?.tumorVolumeCm3 && (
                    <div style={{ fontSize: 12, color: C.textMd }}>
                      Tumor Volume: {(selectedCurrentScan as any).longitudinalRecords[0].tumorVolumeCm3} cm³
                    </div>
                  )}
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
                    <div style={{ fontSize: 13, color: C.textHi, marginBottom: 8 }}>
                      {priorScan.aiResult.primaryFinding}
                    </div>
                    {(priorScan as any).longitudinalRecords?.[0]?.tumorVolumeCm3 && (
                      <div style={{ fontSize: 12, color: C.textMd }}>
                        Tumor Volume: {(priorScan as any).longitudinalRecords[0].tumorVolumeCm3} cm³
                      </div>
                    )}
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
