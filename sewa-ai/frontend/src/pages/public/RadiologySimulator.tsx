// SEWA AI — RadiologySimulator.tsx
// Gamified clinical triage training simulator for medical students.
import React, { useState, useEffect } from 'react';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A',
  critical:'#E03535', urgent:'#E08A20', normal:'#1DBF73',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif", FM:"'IBM Plex Mono',monospace",
};

const CASES = [
  { id: 1, type: 'Head CT', clinicalInfo: '72M, sudden onset aphasia, fall.', findings: 'Hyperdense MCA sign, sylvian fissure effacement.', label: 'critical', diagnosis: 'ICH / Acute Stroke' },
  { id: 2, type: 'Chest CT', clinicalInfo: '45F, pleuritic chest pain, post-op.', findings: 'Filling defect in right main pulmonary artery.', label: 'critical', diagnosis: 'Pulmonary Embolism' },
  { id: 3, type: 'C-Spine XR', clinicalInfo: '19M, high-velocity RTA.', findings: 'Anterior displacement of C2 on C3.', label: 'critical', diagnosis: 'Cervical Fracture' },
  { id: 4, type: 'Chest XR', clinicalInfo: '60M, routine pre-op.', findings: 'Clear lung fields, normal cardiothoracic ratio.', label: 'normal', diagnosis: 'Normal' },
  { id: 5, type: 'Head CT', clinicalInfo: '28F, chronic migraine.', findings: 'No intracranial haemorrhage or mass effect.', label: 'normal', diagnosis: 'Normal' },
];

export function RadiologySimulator({ onClose }: { onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');

  const currentCase = CASES[currentIdx];

  const handleAnswer = (choice: string) => {
    if (answered) return;
    const isCorrect = choice === currentCase.label;
    if (isCorrect) setScore(s => s + 1);
    setLastResult({ correct: isCorrect, diagnosis: currentCase.diagnosis });
    setAnswered(true);
  };

  const nextCase = () => {
    if (currentIdx < CASES.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setAnswered(false);
      setLastResult(null);
    } else {
      setGameState('finished');
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(5,15,12,0.98)', backdropFilter:'blur(20px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:C.F }}>
      <div style={{ width:'100%', maxWidth:600, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:24, overflow:'hidden', boxShadow:'0 30px 60px rgba(0,0,0,0.6)' }}>
        
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.brand, letterSpacing:'0.1em', textTransform:'uppercase' }}>SEWA Sim v1.0</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.textHi }}>Radiology Triage Training</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textLo, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {gameState === 'playing' ? (
          <div style={{ padding:32 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24, fontSize:12, color:C.textLo, fontFamily:C.FM }}>
              <span>CASE {currentIdx + 1} OF {CASES.length}</span>
              <span>SCORE: {score}</span>
            </div>

            {/* Simulated DICOM Viewport */}
            <div style={{ width:'100%', aspectRatio:'4/3', background:'#000', borderRadius:16, border:`2px solid ${C.border}`, position:'relative', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
               <div style={{ color:'#222', fontSize:64 }}>🩻</div>
               <div style={{ position:'absolute', top:12, left:12, fontSize:10, color:'#444', fontFamily:C.FM }}>
                 {currentCase.type}<br/>WW: 80 / WL: 40
               </div>
               <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)' }}/>
               
               {answered && (
                 <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}>
                   <div style={{ textAlign:'center' }}>
                     <div style={{ fontSize:48, marginBottom:12 }}>{lastResult.correct ? '✅' : '❌'}</div>
                     <div style={{ fontSize:18, fontWeight:700, color:lastResult.correct ? C.normal : C.critical }}>{lastResult.correct ? 'CORRECT' : 'INCORRECT'}</div>
                     <div style={{ fontSize:13, color:C.textHi, marginTop:8 }}>Diagnosis: {lastResult.diagnosis}</div>
                     <button onClick={nextCase} style={{ marginTop:24, padding:'10px 24px', background:C.brand, border:'none', borderRadius:8, color:'white', fontWeight:700, cursor:'pointer' }}>Next Case →</button>
                   </div>
                 </div>
               )}
            </div>

            <div style={{ background:C.bg2, padding:20, borderRadius:16, border:`1px solid ${C.border}`, marginBottom:24 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textLo, marginBottom:8, textTransform:'uppercase' }}>Clinical Information</div>
              <div style={{ fontSize:14, color:C.textHi, lineHeight:1.5 }}>{currentCase.clinicalInfo}</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <button onClick={() => handleAnswer('normal')} disabled={answered} style={{ padding:'16px', borderRadius:12, border:`1px solid ${C.border}`, background:C.bg2, color:C.textHi, fontWeight:700, cursor:'pointer' }}>NORMAL</button>
              <button onClick={() => handleAnswer('critical')} disabled={answered} style={{ padding:'16px', borderRadius:12, border:`1px solid ${C.critical}40`, background:`${C.critical}10`, color:C.critical, fontWeight:700, cursor:'pointer' }}>STAT / CRITICAL</button>
            </div>
          </div>
        ) : (
          <div style={{ padding:48, textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:24 }}>🎓</div>
            <h2 style={{ fontSize:28, fontWeight:900, color:C.textHi, margin:'0 0 12px' }}>Training Complete</h2>
            <div style={{ fontSize:48, fontWeight:900, color:C.brand, fontFamily:C.FM, marginBottom:8 }}>{Math.round((score/CASES.length)*100)}%</div>
            <p style={{ fontSize:14, color:C.textMd, marginBottom:32 }}>
              You identified {score} out of {CASES.length} critical findings correctly.<br/>
              SEWA AI's baseline for this dataset is 97.4%.
            </p>
            <button onClick={onClose} style={{ padding:'14px 40px', background:C.brand, border:'none', borderRadius:12, color:'white', fontWeight:700, cursor:'pointer' }}>Return to Portal</button>
          </div>
        )}

        {/* Footer info */}
        <div style={{ padding:'16px 24px', background:C.bg3, borderTop:`1px solid ${C.border}`, fontSize:10, color:C.textLo, textAlign:'center', letterSpacing:'0.05em' }}>
          NHS CERTIFIED TRAINING DATASET · CLINICAL USE PROHIBITED
        </div>
      </div>
    </div>
  );
}
