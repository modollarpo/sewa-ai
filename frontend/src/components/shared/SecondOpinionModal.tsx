// SEWA XAI — Second Opinion Modal
import React, { useState, useEffect } from 'react';
import { createSecondOpinion, getSpecialists } from '../../services/apiClient';

import { dashboardColors as C } from '../../design-system/tokens';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  speciality?: string;
  email: string;
}

interface SecondOpinionModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: string;
  reportId?: string;
}

export function SecondOpinionModal({ isOpen, onClose, scanId, reportId }: SecondOpinionModalProps) {
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<'STAT'|'URGENT'|'ROUTINE'>('ROUTINE');
  const [assignedToId, setAssignedToId] = useState('');
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getSpecialists().then(setSpecialists).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createSecondOpinion({ 
        scanId, 
        reportId, 
        notes, 
        reason,
        priority,
        assignedToId: assignedToId || undefined 
      });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      alert('Error requesting second opinion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="second-opinion-title" style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:1000,
    }} onClick={onClose}>
      <div style={{
        background:C.bg1, borderRadius:16, border:`1px solid ${C.border}`,
        width:'100%', maxWidth:600, padding:24, maxHeight:'90vh', overflowY:'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 id="second-opinion-title" style={{ margin:0, fontSize:20, fontWeight:800, color:C.textHi, fontFamily:C.F }}>Request Second Opinion</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textMd, cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        {success ? (
          <div style={{ textAlign:'center', padding:20, color:C.brand }}>
            ✅ Second opinion requested successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F }}>Priority</label>
              <div style={{ display:'flex', gap:10 }}>
                {(['STAT','URGENT','ROUTINE'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`1px solid ${priority === p ? (p === 'STAT' ? C.critical : p === 'URGENT' ? C.urgent : C.brand) : C.border}`,
                    background:priority === p ? (p === 'STAT' ? C.critical + '20' : p === 'URGENT' ? C.urgent + '20' : C.brand + '20') : C.bg2,
                    color:priority === p ? (p === 'STAT' ? C.critical : p === 'URGENT' ? C.urgent : C.brand) : C.textMd,
                    cursor:'pointer', fontSize:13, fontFamily:C.F, fontWeight:600 }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F }}>Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                style={{ width:'100%', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, color:C.textHi, fontFamily:C.F, fontSize:14 }}
                placeholder="Brief reason for second opinion..."
              />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F }}>Assign to Specialist (Optional)</label>
              <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}
                style={{ width:'100%', background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:12, color:C.textHi, fontFamily:C.F, fontSize:14 }}>
                <option value="">Auto-assign to best specialist</option>
                {specialists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.speciality || s.role}
                  </option>
                ))}
              </select>
            </div>
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
