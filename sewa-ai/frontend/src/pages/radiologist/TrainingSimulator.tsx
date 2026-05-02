// SEWA AI — TrainingSimulator.tsx
// Gamified Simulation Mode for medical students and junior radiologists using anonymized historical scans
import React, { useState, useEffect } from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
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

interface Case {
  id: string;
  modality: string;
  bodyPart: string;
  groundTruth: string;
  options: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation: string;
}

export function TrainingSimulator() {
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    apiClient.get('/training/cases')
      .then(res => {
        setCases(res.data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback for demo if API fails
        setCases([
          {
            id: 'case-1',
            modality: 'CT',
            bodyPart: 'HEAD',
            groundTruth: 'Acute Intracranial Hemorrhage',
            options: ['Normal', 'Acute Intracranial Hemorrhage', 'Ischemic Stroke', 'Tumor'],
            difficulty: 'MEDIUM',
            explanation: 'The hyperdense area in the left basal ganglia indicates acute bleeding.'
          }
        ]);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ padding: 40, background: C.bg1, minHeight: '100vh' }}>
      <Skeleton width="100%" height={400} />
    </div>
  );

  if (currentIndex >= cases.length) {
    return (
      <div style={{ padding: 40, background: C.bg1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', background: C.bg2, padding: 40, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 24, color: C.textHi, marginBottom: 16 }}>Simulation Complete!</h2>
          <div style={{ fontSize: 48, fontWeight: 800, color: C.brand, marginBottom: 16 }}>
            {score} / {cases.length}
          </div>
          <p style={{ color: C.textMd, marginBottom: 24 }}>You correctly diagnosed {(score / cases.length) * 100}% of the anonymised cases.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: C.brand, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            Restart Simulation
          </button>
        </div>
      </div>
    );
  }

  const currentCase = cases[currentIndex];

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    if (option === currentCase.groundTruth) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowResult(false);
    setCurrentIndex(i => i + 1);
  };

  return (
    <div style={{ padding: 24, background: C.bg1, minHeight: '100vh', fontFamily: C.F, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, color: C.textHi, margin: 0 }}>🧠 SEWA Radiology Simulation</h1>
        <div style={{ padding: '8px 16px', background: C.bg2, borderRadius: 20, border: `1px solid ${C.border}`, color: C.brand, fontWeight: 700 }}>
          Score: {score} / {cases.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1 }}>
        {/* Left: DICOM Viewer Placeholder */}
        <div style={{ flex: 2, background: 'black', borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ color: C.textLo, fontSize: 14 }}>Anonymised DICOM Viewer</div>
          <div style={{ position: 'absolute', top: 16, left: 16, color: 'white', fontSize: 12, opacity: 0.5 }}>
            {currentCase.modality} {currentCase.bodyPart}
          </div>
          <div style={{ position: 'absolute', top: 16, right: 16, padding: '4px 8px', background: C.bg2, borderRadius: 4, color: C.urgent, fontSize: 10, fontWeight: 700, border: `1px solid ${C.border}` }}>
            {currentCase.difficulty}
          </div>
        </div>

        {/* Right: Quiz Interface */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 20, background: C.bg2, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 16, color: C.textHi, margin: '0 0 16px' }}>What is your primary diagnosis?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentCase.options.map(opt => {
                let bgColor = C.bg3;
                let borderColor = C.border;
                if (showResult) {
                  if (opt === currentCase.groundTruth) {
                    bgColor = `${C.normal}20`;
                    borderColor = C.normal;
                  } else if (opt === selectedOption) {
                    bgColor = `${C.critical}20`;
                    borderColor = C.critical;
                  }
                } else if (selectedOption === opt) {
                  borderColor = C.brand;
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: 16, textAlign: 'left', background: bgColor,
                      border: `1px solid ${borderColor}`, borderRadius: 12,
                      color: C.textHi, fontSize: 14, cursor: showResult ? 'default' : 'pointer',
                      transition: 'all 200ms'
                    }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {showResult && (
            <div style={{ padding: 20, background: selectedOption === currentCase.groundTruth ? `${C.normal}10` : `${C.urgent}10`, borderRadius: 16, border: `1px solid ${selectedOption === currentCase.groundTruth ? C.normal : C.urgent}30` }}>
              <h4 style={{ margin: '0 0 8px', color: selectedOption === currentCase.groundTruth ? C.normal : C.urgent }}>
                {selectedOption === currentCase.groundTruth ? '✅ Correct' : '❌ Incorrect'}
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: C.textHi, lineHeight: 1.5 }}>
                {currentCase.explanation}
              </p>
              <button onClick={handleNext} style={{ marginTop: 16, width: '100%', padding: 12, background: C.brand, border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                {currentIndex === cases.length - 1 ? 'Finish Simulation' : 'Next Case →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
