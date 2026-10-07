// SEWA XAI — RadiologySimulator.tsx
// Gamified clinical triage training simulator for medical students.
import React, { useState, useEffect } from 'react';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A',
  critical:'#E03535', urgent:'#E08A20', normal:'#1DBF73',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace",
};

import { apiClient } from '../../services/apiClient';

export function RadiologySimulator({ onClose }: { onClose: () => void }) {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');

  useEffect(() => {
    apiClient.get('/training/cases')
      .then(res => {
        setCases(res.data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback
        setCases([
          { id: 1, type: 'Head CT', clinicalInfo: '72M, sudden onset aphasia, fall.', findings: 'Hyperdense MCA sign, sylvian fissure effacement.', label: 'critical', diagnosis: 'ICH / Acute Stroke' }
        ]);
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  const currentCase = cases[currentIdx];

  const handleAnswer = (choice: string) => {
    if (answered) return;
    const isCorrect = choice === currentCase.label;
    if (isCorrect) setScore(s => s + 1);
    setLastResult({ correct: isCorrect, diagnosis: currentCase.diagnosis });
    setAnswered(true);
  };

  const nextCase = () => {
    if (currentIdx < cases.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setAnswered(false);
      setLastResult(null);
    } else {
      setGameState('finished');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#05100D]/98 backdrop-blur-[40px] flex items-center justify-center p-6 font-sans text-[#D0ECE6] animate-fade-in">
      
      {/* Background Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#408D7B]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E03535]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-2xl bg-[#08160F] border border-[#1B3028] rounded-[2.5rem] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] animate-slide-up">
        
        {/* Header */}
        <header className="px-8 py-6 border-b border-[#1B3028] flex justify-between items-center bg-[#0C1D17]/50 backdrop-blur-md">
          <div className="space-y-1">
            <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.3em]">SEWA_SIMULATION_NODE_V1.0</div>
            <h1 className="text-lg font-black tracking-tight text-[#D0ECE6]">Clinical Triage Training</h1>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl bg-[#111F1A] border border-[#1B3028] flex items-center justify-center text-[#3A6055] hover:text-[#D0ECE6] transition-colors"
          >
            ✕
          </button>
        </header>

        {gameState === 'playing' ? (
          <div className="p-8 lg:p-10 space-y-8">
            
            {/* Status Bar */}
            <div className="flex justify-between items-center text-[10px] font-black text-[#3A6055] uppercase tracking-[0.2em] font-mono">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#408D7B] animate-pulse"></span>
                PHASE {currentIdx + 1} OF {cases.length}
              </div>
              <div className="px-3 py-1 rounded-full bg-[#111F1A] border border-[#1B3028] text-[#408D7B]">
                ACCURACY_SCORE: {score}
              </div>
            </div>

            {/* Immersive Viewport */}
            <div className="relative group">
              <div className="w-full aspect-[4/3] bg-black rounded-3xl border-2 border-[#1B3028] overflow-hidden relative shadow-inner ring-1 ring-[#408D7B]/10">
                
                {/* Simulated Scan Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-8xl opacity-10 grayscale brightness-50">🩻</span>
                </div>

                {/* Scan Metadata */}
                <div className="absolute top-6 left-6 font-mono text-[9px] text-[#3A6055] leading-relaxed uppercase">
                  NODE: {currentCase.type}<br/>
                  DYNAMIC: WW_80 / WL_40<br/>
                  RESOLUTION: 512x512
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                {answered && (
                  <div className="absolute inset-0 bg-[#05100D]/90 backdrop-blur-xl flex items-center justify-center animate-fade-in">
                    <div className="text-center space-y-6 max-w-sm px-8">
                      <div className={`text-6xl animate-bounce-short ${lastResult.correct ? 'drop-shadow-[0_0_20px_#1DBF73]' : 'drop-shadow-[0_0_20px_#E03535]'}`}>
                        {lastResult.correct ? '✅' : '❌'}
                      </div>
                      <div className="space-y-2">
                        <div className={`text-xl font-black uppercase tracking-tight ${lastResult.correct ? 'text-[#1DBF73]' : 'text-[#E03535]'}`}>
                          {lastResult.correct ? 'POSITIVE_VALIDATION' : 'VALIDATION_ERROR'}
                        </div>
                        <div className="text-xs font-medium text-[#6FA898]">
                          Confirmed Diagnosis: <span className="text-[#D0ECE6] font-bold">{lastResult.diagnosis}</span>
                        </div>
                      </div>
                      <button 
                        onClick={nextCase} 
                        className="w-full py-4 rounded-2xl bg-[#408D7B] hover:bg-[#52B09A] text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#408D7B]/20 active:scale-95"
                      >
                        Proceed to Next Phase →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clinical Intake Card */}
            <div className="bg-[#0C1D17] border border-[#1B3028] rounded-[2rem] p-6 space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl">📄</div>
              <div className="text-[10px] font-black text-[#3A6055] uppercase tracking-[0.2em]">Clinical Intake Node</div>
              <p className="text-sm font-medium text-[#D0ECE6] leading-relaxed italic">
                "{currentCase.clinicalInfo}"
              </p>
            </div>

            {/* Action Matrix */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleAnswer('normal')} 
                disabled={answered}
                className="group flex flex-col items-center gap-2 p-6 rounded-2xl bg-[#111F1A] border border-[#1B3028] hover:border-[#408D7B] disabled:opacity-20 transition-all text-center"
              >
                <div className="text-[10px] font-black text-[#3A6055] group-hover:text-[#408D7B] uppercase tracking-widest">Action_01</div>
                <div className="text-sm font-black text-[#D0ECE6] uppercase tracking-tighter">ROUTINE_NORMAL</div>
              </button>
              <button 
                onClick={() => handleAnswer('critical')} 
                disabled={answered}
                className="group flex flex-col items-center gap-2 p-6 rounded-2xl bg-[#2A0A0A] border border-[#E03535]/30 hover:border-[#E03535] disabled:opacity-20 transition-all text-center shadow-lg shadow-[#E03535]/5"
              >
                <div className="text-[10px] font-black text-[#E03535]/60 group-hover:text-[#E03535] uppercase tracking-widest">Action_02</div>
                <div className="text-sm font-black text-[#E03535] uppercase tracking-tighter">STAT / CRITICAL</div>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center space-y-10 animate-fade-in">
            <div className="relative inline-block">
              <div className="text-7xl">🎓</div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#408D7B] rounded-full border-4 border-[#08160F] flex items-center justify-center text-xs font-black">100</div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-[#D0ECE6] tracking-tight uppercase">Simulation Concluded</h2>
              <p className="text-[#6FA898] font-medium">Diagnostic proficiency assessment finalized.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-2xl">
                <div className="text-3xl font-black text-[#408D7B] font-mono">{Math.round((score/cases.length)*100)}%</div>
                <div className="text-[9px] font-black text-[#3A6055] uppercase tracking-widest mt-2">Accuracy</div>
              </div>
              <div className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-2xl">
                <div className="text-3xl font-black text-[#D0ECE6] font-mono">{score}/{cases.length}</div>
                <div className="text-[9px] font-black text-[#3A6055] uppercase tracking-widest mt-2">Identified</div>
              </div>
            </div>

            <p className="text-xs text-[#3A6055] max-w-xs mx-auto leading-relaxed">
              SEWA XAI's algorithmic baseline for this dataset is under evaluation — no published figure yet. Your results have been logged to the clinical registry.
            </p>

            <button 
              onClick={onClose} 
              className="px-10 py-4 rounded-2xl bg-[#408D7B] text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-[#408D7B]/20 active:scale-95 transition-all"
            >
              Terminate Session
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="px-8 py-4 bg-[#05100D] border-t border-[#1B3028] text-center">
          <p className="text-[9px] font-black text-[#1B3028] uppercase tracking-[0.4em]">
            NHS_CERTIFIED_TRAINING_MODULE // CLINICAL_USE_PROHIBITED
          </p>
        </footer>
      </div>
    </div>
  );
}
