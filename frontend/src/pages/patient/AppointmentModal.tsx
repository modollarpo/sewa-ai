// SEWA XAI — AppointmentModal.tsx
import React, { useState } from 'react';
import { apiClient } from '../../services/apiClient';

import { dashboardColors as C } from '../../design-system/tokens';

export function AppointmentModal({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('follow_up');
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  const handleSubmit = async () => {
    if (!date || !time) return;
    setLoading(true);
    setStatus(null);
    try {
      const scheduledDate = new Date(`${date}T${time}`).toISOString();
      await apiClient.post('/appointments', { scheduledDate, type });
      setStatus({ msg: 'Appointment request submitted. The clinic will confirm shortly.', type: 'ok' });
      setTimeout(onClose, 2000);
    } catch (e) {
      setStatus({ msg: 'Request failed. Please ensure the date/time is in the future.', type: 'err' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(5,15,12,0.9)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:C.F }}>
      <div style={{ width:'100%', maxWidth:400, background:C.bg1, border:`1px solid ${C.border}`, borderRadius:24, padding:32 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.textHi }}>Book Follow-up</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textLo, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {status && (
          <div style={{ padding:14, borderRadius:12, marginBottom:20, background:status.type==='ok'?`${C.brand}15`:C.bg3, border:`1px solid ${status.type==='ok'?C.brand:C.textLo}40`, color:status.type==='ok'?C.brand:C.textHi, fontSize:12, fontWeight:600 }}>
            {status.type==='ok'?'✓':'⚠'} {status.msg}
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:24 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textLo, marginBottom:8 }}>APPOINTMENT TYPE</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              <option value="follow_up">Scan Review (Follow-up)</option>
              <option value="consultation">Specialist Consultation</option>
              <option value="routine">Routine Check</option>
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textLo, marginBottom:8 }}>DATE</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textLo, marginBottom:8 }}>TIME</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={loading || !date || !time}
          style={{ 
            width:'100%', padding:14, background:C.brand, color:'white', border:'none', 
            borderRadius:14, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 12px ${C.brand}40` 
          }}>
          {loading ? 'Requesting...' : 'Request Appointment →'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:'100%', height:44, padding:'0 14px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:12,
  color:C.textHi, fontSize:13, fontFamily:C.F, outline:'none', boxSizing:'border-box'
};
