// SEWA XAI — Second Opinion Modal
import React, { useState } from 'react';
import { createSecondOpinion } from '../../services/apiClient';

const C = {
  bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

interface SecondOpinionModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  reportId?: string;
}

export function SecondOpinionModal({ isOpen, onClose, scanId, reportId }: SecondOpinionModalProps) {
  const [notes, setNotes] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createSecondOpinion({ scanId, reportId, notes, assignedToId: assignedToId || undefined });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert('Error requesting second opinion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000,
    }} onClick={onClose}>
      <div style={{
        background:C.bg1, borderRadius:16, border:`1px solid ${C.border}`,
        width:'100%', maxWidth:500, padding:24,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:20, fontWeight:800, color:C.textHi, fontFamily:C.F }}>Request Second Opinion</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMd, cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        {success ? (
          <div style={{ textAlign:'center', padding:20, color:C.brand }}>
            ✅ Second opinion requested successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F }}>Notes for Reviewer</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                style={{ width:'100%', height:120, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, color:C.textHi, fontFamily:C.F, fontSize:14 }}
                placeholder="Provide any additional context for the reviewer..."
              />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:10 }}>
              <button type="button" onClick={onClose}
                style={{ padding:'10px 18px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg3, color:C.textMd, cursor:'pointer', fontSize:14, fontFamily:C.F, fontWeight:600 }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                style={{ padding:'10px 18px', borderRadius:10, border:'none', background:C.brand, color:'white', cursor:'pointer', fontSize:14, fontFamily:C.F, fontWeight:700 }}>
                {loading ? 'Requesting...' : 'Request Second Opinion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
