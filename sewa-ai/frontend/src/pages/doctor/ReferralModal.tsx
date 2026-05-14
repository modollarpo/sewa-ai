// SEWA AI — ReferralModal.tsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

const C = {
  bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', critical:'#E03535',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028', F:"'IBM Plex Sans',system-ui,sans-serif",
};

const HOSPITALS = [
  { id: 'LUTH-01', name: 'Lagos University Teaching Hospital', region: 'Nigeria', type: 'Tertiary' },
  { id: 'KNH-01', name: 'Kenyatta National Hospital', region: 'Kenya', type: 'Referral' },
  { id: 'GUYS-01', name: 'Guys & St Thomas NHS Trust', region: 'UK', type: 'Specialist' },
  { id: 'SEWA-SN', name: 'SEWA Specialist Network', region: 'Global', type: 'Private' },
];

export function ReferralModal({ scanId, onClose }: { scanId: string; onClose: () => void }) {
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await apiClient.post('/referrals', { scanId, targetTenantId: selected, clinicalNote: note });
      setStatus({ msg: 'Referral successfully dispatched.', type: 'ok' });
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      setStatus({ msg: 'Referral failed. Institutional firewall may be blocking the transfer.', type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(5,15,12,0.9)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:C.F }}>
      <div style={{ width:'100%', maxWidth:480, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:24, padding:32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.textHi }}>Refer Out Case</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textLo, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {status && (
          <div style={{ padding:'10px 14px', background: status.type==='ok'?`${C.brand}14`:`${C.critical}14`, border:`1px solid ${status.type==='ok'?C.brand:C.critical}40`, borderRadius:10, color: status.type==='ok'?C.brand:C.critical, fontSize:12, marginBottom:20 }}>
            {status.type === 'ok' ? '✓' : '⚠'} {status.msg}
          </div>
        )}

        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textLo, marginBottom:8, textTransform:'uppercase' }}>Target Institution</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {HOSPITALS.map(h => (
              <div 
                key={h.id} 
                onClick={() => setSelected(h.id)}
                style={{ 
                  padding:14, borderRadius:12, border:`1px solid ${selected === h.id ? C.brand : C.border}`, 
                  background: selected === h.id ? `${C.brand}10` : C.bg2, cursor:'pointer' 
                }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.textHi }}>{h.name}</div>
                <div style={{ fontSize:11, color:C.textLo, marginTop:2 }}>{h.type} · {h.region}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textLo, marginBottom:8, textTransform:'uppercase' }}>Clinical Handover Note</label>
          <textarea 
            value={note} 
            onChange={e => setNote(e.target.value)}
            placeholder="Reason for referral, specific findings to review..."
            style={{ width:'100%', height:100, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:12, padding:12, color:C.textHi, fontSize:13, resize:'none', outline:'none', boxSizing:'border-box' }}
          />
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={loading || !selected}
          style={{ 
            width:'100%', padding:14, background:C.brand, color:'white', border:'none', 
            borderRadius:14, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 12px ${C.brand}40` 
          }}>
          {loading ? 'Dispatching...' : 'Confirm Referral →'}
        </button>
      </div>
    </div>
  );
}
