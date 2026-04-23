// SEWA AI — AppointmentsPage.tsx
// Full end-to-end appointment booking: monthly calendar, availability grid,
// book modal, list/calendar toggle, cancel, iCal download, role-aware views

import React, { useState, useEffect, useCallback } from 'react';
import { useAppointmentData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', critBg:'#2A0A0A',
  urgent:'#E08A20',   urgBg:'#2A1800',
  normal:'#1DBF73',   normalBg:'#0A1F14',
  info:'#2A6EF2',
  purple:'#8B5CF6',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const STATUS_CFG: Record<string,{color:string;bg:string;label:string}> = {
  scheduled:  { color:C.brand,   bg:`${C.brand}14`,   label:'Scheduled' },
  confirmed:  { color:C.normal,  bg:C.normalBg,       label:'Confirmed' },
  cancelled:  { color:C.critical,bg:C.critBg,         label:'Cancelled' },
  completed:  { color:C.textLo,  bg:C.bg3,            label:'Completed' },
  no_show:    { color:C.urgent,  bg:C.urgBg,          label:'No Show' },
  rescheduled:{ color:C.purple,  bg:`${C.purple}14`,  label:'Rescheduled' },
};

const TYPE_ICONS: Record<string,string> = {
  consultation:'🩺', follow_up:'📋', imaging:'🔬',
  telemedicine:'💻', second_opinion:'👥',
};

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Appointment {
  id: string;
  type: string;
  status: string;
  scheduledDate: string;
  durationMins: number;
  location?: string;
  notes?: string;
  videoUrl?: string;
  doctor?: { firstName: string; lastName: string; speciality?: string };
  patient?: { user: { firstName: string; lastName: string } };
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
  datetime: string;
}

// ── Booking modal ──────────────────────────────────────────────
function BookModal({
  onClose, onBooked, doctors, patients
}: {
  onClose: () => void;
  onBooked: () => void;
  doctors: { id: string; firstName: string; lastName: string; speciality?: string }[];
  patients: { id: string; name: string }[];
}) {
  const [step, setStep]           = useState<'details'|'slots'|'confirm'>('details');
  const [doctorId, setDoctorId]   = useState(doctors[0]?.id ?? '');
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [type, setType]           = useState('consultation');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots]         = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const loadSlots = async (date: string) => {
    if (!doctorId || !date) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/appointments/availability?doctorId=${doctorId}&date=${date}&duration=30`);
      setSlots(data.slots);
    } catch { setSlots([]); }
    setLoading(false);
  };

  const handleBook = async () => {
    if (!selectedSlot || !patientId || !doctorId) return;
    setLoading(true); setError('');
    try {
      await apiClient.post('/appointments', {
        patientId, doctorId,
        scheduledDate: selectedSlot.datetime,
        type, notes, durationMins: 30,
      });
      onBooked();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Booking failed');
    }
    setLoading(false);
  };

  const inp: React.CSSProperties = {
    width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`,
    borderRadius:8, color:C.textHi, fontSize:13, fontFamily:C.F, boxSizing:'border-box' as const,
    outline:'none',
  };
  const lbl: React.CSSProperties = { fontSize:11, color:C.textLo, marginBottom:5, display:'block' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:520, background:C.bg1, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.textHi }}>Book Appointment</div>
            <div style={{ fontSize:11, color:C.textLo, marginTop:2 }}>
              {step === 'details' ? 'Step 1: Select details' : step === 'slots' ? 'Step 2: Choose time' : 'Step 3: Confirm'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.textLo, cursor:'pointer', fontSize:18 }}>×</button>
        </div>

        <div style={{ padding:20 }}>
          {step === 'details' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={lbl}>Appointment Type</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { value:'consultation', label:'Consultation', icon:'🩺' },
                    { value:'follow_up',    label:'Follow-up',    icon:'📋' },
                    { value:'imaging',      label:'Imaging',      icon:'🔬' },
                    { value:'telemedicine', label:'Telemedicine', icon:'💻' },
                  ].map(t => (
                    <button key={t.value} onClick={() => setType(t.value)} style={{
                      padding:'10px 12px', borderRadius:8, cursor:'pointer',
                      border:`1px solid ${type===t.value?C.brand:C.border}`,
                      background:type===t.value?`${C.brand}14`:C.bg3,
                      color:type===t.value?C.brand:C.textMd, fontFamily:C.F, fontSize:12, fontWeight:type===t.value?600:400,
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                      <span>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {patients.length > 0 && (
                <div>
                  <label style={lbl}>Patient</label>
                  <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inp}>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={lbl}>Doctor</label>
                <select value={doctorId} onChange={e => setDoctorId(e.target.value)} style={inp}>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}{d.speciality ? ` — ${d.speciality}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={lbl}>Preferred Date</label>
                <input type="date" value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={inp}/>
              </div>

              <div>
                <label style={lbl}>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Reason for visit..."
                  style={{ ...inp, resize:'vertical' as const }}/>
              </div>

              <button onClick={() => { loadSlots(selectedDate); setStep('slots'); }}
                disabled={!selectedDate || !doctorId}
                style={{ padding:'11px 0', background:C.brand, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F, opacity: (!selectedDate||!doctorId)?0.5:1 }}>
                See Available Slots →
              </button>
            </div>
          )}

          {step === 'slots' && (
            <div>
              <div style={{ marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.textHi }}>{selectedDate}</div>
                <button onClick={() => setStep('details')} style={{ fontSize:11, color:C.brand, background:'none', border:'none', cursor:'pointer', fontFamily:C.F }}>← Change date</button>
              </div>
              {loading ? (
                <div style={{ textAlign:'center', padding:30, color:C.textLo }}>Loading slots…</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, maxHeight:280, overflowY:'auto' }}>
                  {slots.map(slot => (
                    <button key={slot.datetime} disabled={!slot.available}
                      onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
                      style={{
                        padding:'8px 4px', borderRadius:7, cursor:slot.available?'pointer':'not-allowed',
                        border:`1px solid ${selectedSlot?.datetime===slot.datetime?C.brand:slot.available?C.border:'transparent'}`,
                        background: selectedSlot?.datetime===slot.datetime ? `${C.brand}20` : slot.available ? C.bg3 : C.bg4,
                        color: slot.available ? C.textHi : C.textLo,
                        fontSize:11, fontFamily:C.FM, opacity:slot.available?1:0.4,
                      }}>
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && selectedSlot && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:12 }}>Appointment Summary</div>
                {[
                  { label:'Type',     value: `${TYPE_ICONS[type] ?? ''} ${type.replace('_',' ')}` },
                  { label:'Date',     value: selectedDate },
                  { label:'Time',     value: selectedSlot.time },
                  { label:'Doctor',   value: `Dr. ${doctors.find(d=>d.id===doctorId)?.firstName ?? ''} ${doctors.find(d=>d.id===doctorId)?.lastName ?? ''}` },
                  ...(notes ? [{ label:'Notes', value: notes }] : []),
                  ...(type==='telemedicine' ? [{ label:'Format', value: '💻 Video call link will be emailed' }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <span style={{ width:60, fontSize:11, color:C.textLo, flexShrink:0 }}>{row.label}</span>
                    <span style={{ fontSize:12, color:C.textHi }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding:10, background:`${C.brand}0A`, borderRadius:8, border:`1px solid ${C.brand}30`, fontSize:11, color:C.textMd }}>
                📧 Confirmation will be sent by email and WhatsApp (if registered)
              </div>

              {error && <div style={{ color:C.critical, fontSize:12, padding:'8px 12px', background:C.critBg, borderRadius:7 }}>{error}</div>}

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setStep('slots')} style={{ flex:1, padding:11, background:'none', border:`1px solid ${C.border}`, borderRadius:9, color:C.textMd, fontFamily:C.F, cursor:'pointer' }}>
                  ← Back
                </button>
                <button onClick={handleBook} disabled={loading} style={{ flex:2, padding:11, background:C.brand, border:'none', borderRadius:9, color:'white', fontWeight:700, fontFamily:C.F, cursor:'pointer', fontSize:13 }}>
                  {loading ? 'Booking…' : '✅ Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export function AppointmentsPage() {
  const { doctors, patients, loading: usersLoading } = useAppointmentData();
  const [view, setView]               = useState<'calendar'|'list'>('calendar');
  const [year, setYear]               = useState(new Date().getFullYear());
  const [month, setMonth]             = useState(new Date().getMonth() + 1);
  const [calData, setCalData]         = useState<Record<string, Appointment[]>>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showBook, setShowBook]       = useState(false);
  const [selected, setSelected]       = useState<Appointment | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Live data now handled by hook

  const loadCalendar = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data } = await apiClient.get(`/appointments/calendar/${year}/${month}`);
      setCalData(data.appointments ?? {});
    } catch {
      setCalData({});
    }
    setDataLoading(false);
  }, [year, month]);

  const loadList = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/appointments?limit=50');
      setAppointments(data.appointments ?? []);
    } catch {
      setAppointments([]);
    }
  }, []);

  useEffect(() => { loadCalendar(); loadList(); }, [loadCalendar, loadList]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await apiClient.patch(`/appointments/${id}`, { status:'cancelled', cancelReason:'Cancelled by user' });
      loadCalendar(); loadList();
    } catch {}
  };

  const downloadIcal = (id: string) => {
    window.open(`/api/v1/appointments/${id}/ical`, '_blank');
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding:'5px 14px', fontSize:11, fontWeight:active?600:400, borderRadius:20,
    border:`1px solid ${active?C.brand:C.border}`, background:active?`${C.brand}14`:'transparent',
    color:active?C.brand:C.textLo, cursor:'pointer', fontFamily:C.F,
  });

  return (
    <div style={{ padding:24, background:C.bg1, minHeight:'calc(100vh - 76px)', fontFamily:C.F }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.textHi }}>Appointments</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:C.textMd }}>Book, manage and track clinical appointments</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={btnStyle(view==='calendar')} onClick={() => setView('calendar')}>📅 Calendar</button>
          <button style={btnStyle(view==='list')}     onClick={() => setView('list')}>☰ List</button>
          <button onClick={() => setShowBook(true)} style={{
            padding:'7px 16px', background:C.brand, border:'none', borderRadius:9,
            color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F,
          }}>
            + Book Appointment
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
            <button onClick={() => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); }}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`, background:C.bg3, color:C.textHi, cursor:'pointer', fontSize:14 }}>‹</button>
            <span style={{ fontSize:16, fontWeight:700, color:C.textHi, minWidth:160, textAlign:'center' }}>
              {MONTHS[month-1]} {year}
            </span>
            <button onClick={() => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); }}
              style={{ width:32, height:32, borderRadius:8, border:`1px solid ${C.border}`, background:C.bg3, color:C.textHi, cursor:'pointer', fontSize:14 }}>›</button>
            <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()+1); }}
              style={{ padding:'4px 12px', fontSize:11, border:`1px solid ${C.border}`, background:'none', borderRadius:7, color:C.brand, cursor:'pointer', fontFamily:C.F }}>
              Today
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600, color:C.textLo, padding:'6px 0', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ minHeight:80, background:C.bg0, borderRadius:8 }}/>;
              const dateKey = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayAppts = calData[dateKey] ?? [];
              const today    = new Date();
              const isToday  = day === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear();

              return (
                <div key={i} style={{
                  minHeight:80, background:isToday?`${C.brand}10`:C.bg2,
                  borderRadius:8, padding:6,
                  border:`1px solid ${isToday?`${C.brand}40`:C.border}`,
                }}>
                  <div style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?C.brand:C.textMd, marginBottom:4 }}>
                    {day}
                  </div>
                  {dayAppts.map(a => {
                    const sc = STATUS_CFG[a.status] ?? STATUS_CFG.scheduled;
                    return (
                      <div key={a.id} onClick={() => setSelected(a)}
                        style={{ padding:'2px 5px', borderRadius:4, marginBottom:2, cursor:'pointer',
                          background:sc.bg, border:`1px solid ${sc.color}30`, fontSize:9,
                          color:sc.color, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                        {TYPE_ICONS[a.type] ?? '•'} {new Date(a.scheduledDate).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} {a.type}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div style={{ background:C.bg0, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:C.bg3 }}>
              <tr>
                {['Date & Time','Type','Patient','Doctor','Status','Duration','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:9, fontWeight:600, color:C.textLo, letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:C.F }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(appointments.length ? appointments : Object.values(calData).flat()).map(a => {
                const sc = STATUS_CFG[a.status] ?? STATUS_CFG.scheduled;
                const dt = new Date(a.scheduledDate);
                return (
                  <tr key={a.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.textHi }}>{dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                      <div style={{ fontSize:11, color:C.textLo, fontFamily:C.FM }}>{dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textMd }}>
                      {TYPE_ICONS[a.type] ?? '•'} {a.type.replace('_',' ')}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textHi }}>
                      {a.patient?.user ? `${a.patient.user.firstName} ${a.patient.user.lastName}` : '—'}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textHi }}>
                      {a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : '—'}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:sc.bg, color:sc.color, fontFamily:C.F }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:sc.color }}/>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:11, color:C.textLo, fontFamily:C.FM }}>{a.durationMins}m</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {a.videoUrl && (
                          <a href={a.videoUrl} target="_blank" rel="noreferrer"
                            style={{ padding:'3px 8px', fontSize:10, background:`${C.info}14`, border:`1px solid ${C.info}30`, borderRadius:6, color:C.info, textDecoration:'none', fontFamily:C.F }}>
                            💻 Join
                          </a>
                        )}
                        <button onClick={() => downloadIcal(a.id)}
                          style={{ padding:'3px 8px', fontSize:10, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, color:C.textMd, cursor:'pointer', fontFamily:C.F }}>
                          📅 iCal
                        </button>
                        {!['cancelled','completed'].includes(a.status) && (
                          <button onClick={() => handleCancel(a.id)}
                            style={{ padding:'3px 8px', fontSize:10, background:C.critBg, border:`1px solid #3A1515`, borderRadius:6, color:C.critical, cursor:'pointer', fontFamily:C.F }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!appointments.length && !Object.values(calData).flat().length && (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:C.textLo, fontSize:13 }}>
                  No appointments found. <button onClick={() => setShowBook(true)} style={{ color:C.brand, background:'none', border:'none', cursor:'pointer', fontFamily:C.F, fontSize:13 }}>Book one now →</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail slide-out */}
      {selected && (
        <div style={{ position:'fixed', top:0, right:0, width:360, height:'100vh', background:C.bg1, borderLeft:`1px solid ${C.border}`, zIndex:50, padding:20, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:15, fontWeight:700, color:C.textHi }}>Appointment Details</span>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.textLo, cursor:'pointer', fontSize:18 }}>×</button>
          </div>
          {(() => {
            const sc = STATUS_CFG[selected.status] ?? STATUS_CFG.scheduled;
            const dt = new Date(selected.scheduledDate);
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color, width:'fit-content' }}>
                  {sc.label}
                </span>
                {[
                  { icon:'📋', label:'Type',     value:`${TYPE_ICONS[selected.type]??''} ${selected.type.replace('_',' ')}` },
                  { icon:'📅', label:'Date',     value:dt.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) },
                  { icon:'🕐', label:'Time',     value:dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) },
                  { icon:'⏱', label:'Duration', value:`${selected.durationMins} minutes` },
                  { icon:'👨‍⚕️', label:'Doctor',  value:selected.doctor ? `Dr. ${selected.doctor.firstName} ${selected.doctor.lastName}${selected.doctor.speciality?` · ${selected.doctor.speciality}`:''}` : '—' },
                  { icon:'🏥', label:'Location', value:selected.location ?? 'TBC' },
                  ...(selected.notes ? [{ icon:'📝', label:'Notes', value:selected.notes }] : []),
                ].map(row => (
                  <div key={row.label} style={{ padding:'10px 12px', background:C.bg2, borderRadius:9, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10, color:C.textLo, marginBottom:4 }}>{row.icon} {row.label}</div>
                    <div style={{ fontSize:12, color:C.textHi }}>{row.value}</div>
                  </div>
                ))}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  {selected.videoUrl && (
                    <a href={selected.videoUrl} target="_blank" rel="noreferrer"
                      style={{ padding:'10px 0', background:`${C.info}14`, border:`1px solid ${C.info}30`, borderRadius:9, color:C.info, textDecoration:'none', textAlign:'center', fontWeight:700, fontSize:13, fontFamily:C.F }}>
                      💻 Join Video Call
                    </a>
                  )}
                  <button onClick={() => downloadIcal(selected.id)} style={{ padding:'9px 0', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:9, color:C.textMd, cursor:'pointer', fontFamily:C.F, fontSize:12 }}>
                    📅 Add to Calendar (.ics)
                  </button>
                  {!['cancelled','completed'].includes(selected.status) && (
                    <button onClick={() => { handleCancel(selected.id); setSelected(null); }}
                      style={{ padding:'9px 0', background:C.critBg, border:`1px solid #3A1515`, borderRadius:9, color:C.critical, cursor:'pointer', fontFamily:C.F, fontSize:12 }}>
                      Cancel Appointment
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Book modal */}
      {showBook && (
        <BookModal
          onClose={() => setShowBook(false)}
          onBooked={() => { setShowBook(false); loadCalendar(); loadList(); }}
          doctors={doctors}
          patients={patients}
        />
      )}
    </div>
  );
}
