// SEWA AI — AppointmentsPage.tsx
// Full end-to-end appointment booking: monthly calendar, availability grid,
// book modal, list/calendar toggle, cancel, iCal download, role-aware views

import React, { useState, useEffect, useCallback } from 'react';
import { useAppointmentData } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';

const STATUS_CFG: Record<string,{color:string;bg:string;label:string}> = {
  scheduled:  { color:'#408D7B', bg:'bg-[#408D7B]/10', label:'Scheduled' },
  confirmed:  { color:'#1DBF73', bg:'bg-[#1DBF73]/10', label:'Confirmed' },
  cancelled:  { color:'#E03535', bg:'bg-[#E03535]/10', label:'Cancelled' },
  completed:  { color:'#6FA898', bg:'bg-[#1B3028]',     label:'Completed' },
  no_show:    { color:'#E08A20', bg:'bg-[#E08A20]/10', label:'No Show' },
  rescheduled:{ color:'#8B5CF6', bg:'bg-[#8B5CF6]/10', label:'Rescheduled' },
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#05100D]/90 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#08160F] border border-[#1B3028] rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#408D7B]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#1B3028] flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-[#D0ECE6] tracking-tight">Clinical Dispatch</h3>
            <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest mt-1">
              {step === 'details' ? 'Node Initiation' : step === 'slots' ? 'Protocol Timing' : 'Final Validation'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#3A6055] hover:text-[#D0ECE6] text-xl transition-colors">×</button>
        </div>

        <div className="p-8">
          {step === 'details' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Procedure Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value:'consultation', label:'Consult', icon:'🩺' },
                    { value:'follow_up',    label:'Follow-up', icon:'📋' },
                    { value:'imaging',      label:'Imaging', icon:'🔬' },
                    { value:'telemedicine', label:'Video', icon:'💻' },
                  ].map(t => (
                    <button key={t.value} onClick={() => setType(t.value)} className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                      type === t.value ? 'bg-[#408D7B]/20 border-[#408D7B] text-[#D0ECE6]' : 'bg-[#0C1D17] border-[#1B3028] text-[#3A6055] hover:border-[#408D7B]/30'
                    }`}>
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {patients.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Patient Subject</label>
                    <select value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] outline-none">
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Assign Clinician</label>
                  <select value={doctorId} onChange={e => setDoctorId(e.target.value)} className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] outline-none">
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Target Date</label>
                <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest ml-1">Clinical Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Symptom summary or referral notes..." className="w-full bg-[#0C1D17] border border-[#1B3028] rounded-xl px-4 py-3 text-sm focus:border-[#408D7B] outline-none resize-none" />
              </div>

              <button 
                onClick={() => { loadSlots(selectedDate); setStep('slots'); }}
                disabled={!selectedDate || !doctorId}
                className="w-full py-4 rounded-2xl bg-[#408D7B] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#52B09A] transition-all disabled:opacity-30 shadow-xl shadow-[#408D7B]/20"
              >
                Scan Available Slots →
              </button>
            </div>
          )}

          {step === 'slots' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div className="text-sm font-bold text-[#D0ECE6]">{new Date(selectedDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</div>
                <button onClick={() => setStep('details')} className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest hover:underline">← Change date</button>
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-4 border-[#408D7B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-[10px] text-[#3A6055] font-black uppercase tracking-widest">Polling availability matrix...</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
                  {slots.map(slot => (
                    <button 
                      key={slot.datetime} 
                      disabled={!slot.available}
                      onClick={() => { setSelectedSlot(slot); setStep('confirm'); }}
                      className={`p-3 rounded-xl border text-[11px] font-mono transition-all ${
                        !slot.available ? 'bg-[#08160F] border-[#1B3028] text-[#1B3028] cursor-not-allowed' : 'bg-[#0C1D17] border-[#1B3028] text-[#D0ECE6] hover:border-[#408D7B]/50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && selectedSlot && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-[1.5rem] space-y-4">
                <h4 className="text-xs font-black text-[#408D7B] uppercase tracking-widest">Protocol Summary</h4>
                <div className="grid gap-3">
                  {[
                    { label:'Procedure', val: type.replace('_',' ').toUpperCase() },
                    { label:'Target', val: `${selectedDate} @ ${selectedSlot.time}` },
                    { label:'Clinician', val: `Dr. ${doctors.find(d=>d.id===doctorId)?.lastName}` },
                    { label:'Subject', val: patients.find(p=>p.id===patientId)?.name || 'N/A' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center border-b border-[#1B3028] pb-2">
                      <span className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest">{row.label}</span>
                      <span className="text-xs font-bold text-[#D0ECE6]">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="p-3 rounded-xl bg-[#E03535]/10 border border-[#E03535]/20 text-[#E03535] text-[10px] font-black uppercase tracking-widest text-center">{error}</div>}

              <div className="flex gap-4">
                <button onClick={() => setStep('slots')} className="flex-1 py-4 rounded-2xl border border-[#1B3028] text-[#3A6055] text-[10px] font-black uppercase tracking-widest hover:text-[#D0ECE6] transition-all">Back</button>
                <button 
                  onClick={handleBook} 
                  disabled={loading}
                  className="flex-[2] py-4 rounded-2xl bg-[#408D7B] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#52B09A] transition-all shadow-xl shadow-[#408D7B]/20"
                >
                  {loading ? 'Initializing...' : '✅ Finalize Dispatch'}
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

  const loadCalendar = useCallback(async () => {
    setDataLoading(true);
    try {
      const { data } = await apiClient.get(`/appointments/calendar/${year}/${month}`);
      setCalData(data.appointments ?? {});
    } catch { setCalData({}); }
    setDataLoading(false);
  }, [year, month]);

  const loadList = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/appointments?limit=50');
      setAppointments(data.appointments ?? []);
    } catch { setAppointments([]); }
  }, []);

  useEffect(() => { loadCalendar(); loadList(); }, [loadCalendar, loadList]);

  const [cancelId, setCancelId] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await apiClient.patch(`/appointments/${cancelId}`, { status:'cancelled', cancelReason:'Cancelled by user' });
      setCancelId(null);
      loadCalendar(); loadList();
    } catch {}
  };

  const downloadIcal = (id: string) => {
    window.open(`/api/v1/appointments/${id}/ical`, '_blank');
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#05100D] overflow-hidden font-sans text-[#D0ECE6]">
      
      {/* Header Bar */}
      <header className="px-8 h-20 border-b border-[#1B3028] bg-[#08160F] flex items-center justify-between z-20">
        <div>
          <h2 className="text-2xl font-black text-[#D0ECE6] tracking-tighter">Clinical Schedule</h2>
          <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-[0.2em] mt-0.5">Procedure Management Node</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#0C1D17] p-1 rounded-xl border border-[#1B3028] flex gap-1">
            {[
              { id: 'calendar', label: 'Matrix', icon: '📅' },
              { id: 'list', label: 'Index', icon: '☰' }
            ].map(v => (
              <button 
                key={v.id} 
                onClick={() => setView(v.id as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  view === v.id ? 'bg-[#408D7B] text-white shadow-lg' : 'text-[#3A6055] hover:text-[#6FA898]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowBook(true)}
            className="px-6 py-3 rounded-xl bg-[#408D7B] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#52B09A] transition-all shadow-xl shadow-[#408D7B]/20"
          >
            + New Dispatch
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 overflow-y-auto p-8 scrollbar-thin">
        <div className="max-w-7xl mx-auto">
          
          {view === 'calendar' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Month Nav */}
              <div className="flex items-center gap-6">
                <div className="flex gap-2">
                  <button onClick={() => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0C1D17] border border-[#1B3028] hover:border-[#408D7B]/50 transition-all text-[#D0ECE6]">‹</button>
                  <button onClick={() => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0C1D17] border border-[#1B3028] hover:border-[#408D7B]/50 transition-all text-[#D0ECE6]">›</button>
                </div>
                <h3 className="text-xl font-black text-[#D0ECE6] min-w-[180px] text-center">{MONTHS[month-1]} {year}</h3>
                <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()+1); }} className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest hover:underline">Today</button>
              </div>

              {/* Grid System */}
              <div className="bg-[#08160F] border border-[#1B3028] rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="grid grid-cols-7 border-b border-[#1B3028] bg-[#0C1D17]/50">
                  {DAYS.map(d => (
                    <div key={d} className="py-4 text-center text-[10px] font-black text-[#3A6055] uppercase tracking-[0.2em]">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {cells.map((day, i) => {
                    const dateKey = day ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
                    const dayAppts = dateKey ? calData[dateKey] ?? [] : [];
                    const isToday = day === new Date().getDate() && month === new Date().getMonth()+1 && year === new Date().getFullYear();

                    return (
                      <div key={i} className={`min-h-[140px] p-3 border-r border-b border-[#1B3028] group transition-all hover:bg-[#111F1A]/30 ${!day ? 'bg-[#05100D]/50' : ''}`}>
                        {day && (
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-black font-mono ${isToday ? 'text-[#408D7B]' : 'text-[#3A6055]'}`}>{day}</span>
                            {dayAppts.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#408D7B] shadow-[0_0_8px_#408D7B]" />}
                          </div>
                        )}
                        <div className="space-y-1">
                          {dayAppts.map(a => (
                            <div 
                              key={a.id} 
                              onClick={() => setSelected(a)}
                              className={`p-2 rounded-lg text-[9px] font-black uppercase tracking-widest truncate cursor-pointer transition-all hover:scale-[1.02] border ${STATUS_CFG[a.status]?.bg} border-[#408D7B]/10`}
                              style={{ color: STATUS_CFG[a.status]?.color }}
                            >
                              {TYPE_ICONS[a.type]} {a.type.split('_')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* List View */
            <div className="bg-[#08160F] border border-[#1B3028] rounded-[2rem] overflow-hidden shadow-2xl animate-fade-in">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0C1D17]/50">
                    {['Dispatch Time','Protocol','Subject','Clinician','Node Status','Ops'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black text-[#3A6055] uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B3028]">
                  {appointments.map(a => {
                    const cfg = STATUS_CFG[a.status] || STATUS_CFG.scheduled;
                    const dt = new Date(a.scheduledDate);
                    return (
                      <tr key={a.id} className="hover:bg-[#111F1A]/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-xs font-bold text-[#D0ECE6]">{dt.toLocaleDateString('en-GB')}</div>
                          <div className="text-[10px] font-mono text-[#3A6055]">{dt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{TYPE_ICONS[a.type]}</span>
                            <span className="text-[10px] font-black text-[#6FA898] uppercase tracking-widest">{a.type.replace('_',' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[#D0ECE6]">{a.patient?.user ? `${a.patient.user.firstName} ${a.patient.user.lastName}` : 'N/A'}</td>
                        <td className="px-6 py-4 text-xs text-[#6FA898]">Dr. {a.doctor?.lastName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg}`} style={{ color: cfg.color, borderColor: `${cfg.color}30` }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {a.videoUrl && <a href={a.videoUrl} className="p-2 rounded-lg bg-[#2A6EF2]/10 text-[#2A6EF2] border border-[#2A6EF2]/20 hover:bg-[#2A6EF2] hover:text-white transition-all text-xs">💻</a>}
                            <button onClick={() => downloadIcal(a.id)} className="p-2 rounded-lg bg-[#1B3028] text-[#3A6055] hover:text-[#D0ECE6] transition-all text-xs">📅</button>
                            {!['cancelled','completed'].includes(a.status) && (
                              <button onClick={() => setCancelId(a.id)} className="p-2 rounded-lg bg-[#E03535]/10 text-[#E03535] hover:bg-[#E03535] hover:text-white transition-all text-xs">✕</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Details Slide-out */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[#08160F] border-l border-[#1B3028] shadow-2xl z-50 p-8 animate-slide-right flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-[#D0ECE6] tracking-tighter">Node Insights</h3>
            <button onClick={() => setSelected(null)} className="text-[#3A6055] hover:text-[#D0ECE6] text-2xl transition-colors">×</button>
          </div>
          
          <div className="flex-1 space-y-6">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit ${STATUS_CFG[selected.status]?.bg}`} style={{ color: STATUS_CFG[selected.status]?.color, borderColor: `${STATUS_CFG[selected.status]?.color}30` }}>
              {STATUS_CFG[selected.status]?.label}
            </div>

            <div className="grid gap-4">
              {[
                { label: 'Procedure', val: selected.type.replace('_',' ').toUpperCase(), icon: '📋' },
                { label: 'Date', val: new Date(selected.scheduledDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }), icon: '📅' },
                { label: 'Timing', val: new Date(selected.scheduledDate).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), icon: '🕐' },
                { label: 'Clinician', val: `Dr. ${selected.doctor?.firstName} ${selected.doctor?.lastName}`, icon: '👨‍⚕️' },
                { label: 'Facility', val: selected.location || 'Central Imaging Unit', icon: '🏥' }
              ].map(row => (
                <div key={row.label} className="p-4 bg-[#0C1D17] border border-[#1B3028] rounded-2xl group hover:border-[#408D7B]/30 transition-all">
                  <div className="text-[10px] text-[#3A6055] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <span>{row.icon}</span> {row.label}
                  </div>
                  <div className="text-sm font-bold text-[#D0ECE6]">{row.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-[#1B3028] space-y-3">
            {selected.videoUrl && (
              <a href={selected.videoUrl} target="_blank" rel="noreferrer" className="block w-full py-4 rounded-xl bg-[#2A6EF2] text-white text-center text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#2A6EF2]/20">
                Join Tele-Consultation
              </a>
            )}
            <button onClick={() => downloadIcal(selected.id)} className="w-full py-4 rounded-xl bg-[#0C1D17] border border-[#1B3028] text-[#D0ECE6] text-[10px] font-black uppercase tracking-widest hover:bg-[#111F1A]">
              Export iCal Protocol
            </button>
            {!['cancelled','completed'].includes(selected.status) && (
              <button onClick={() => { setCancelId(selected.id); setSelected(null); }} className="w-full py-4 rounded-xl bg-[#E03535]/10 text-[#E03535] text-[10px] font-black uppercase tracking-widest hover:bg-[#E03535] hover:text-white transition-all border border-[#E03535]/20">
                Cancel Procedure
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showBook && (
        <BookModal
          onClose={() => setShowBook(false)}
          onBooked={() => { setShowBook(false); loadCalendar(); loadList(); }}
          doctors={doctors}
          patients={patients}
        />
      )}

      {cancelId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#05100D]/95 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0C1D17] border border-[#E03535]/30 rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[#E03535]/5 pointer-events-none" />
            <div className="text-5xl mb-6">⚠️</div>
            <h3 className="text-xl font-black text-[#D0ECE6] tracking-tighter mb-4">Decommission Dispatch?</h3>
            <p className="text-xs text-[#6FA898] leading-relaxed mb-8 font-medium">Are you sure you want to terminate this clinical procedure? This action will trigger immediate notifications to all assigned nodes.</p>
            <div className="flex gap-4">
              <button onClick={() => setCancelId(null)} className="flex-1 py-4 rounded-xl border border-[#1B3028] text-[#3A6055] text-[10px] font-black uppercase tracking-widest hover:text-[#D0ECE6] transition-all">Abort</button>
              <button onClick={handleCancel} className="flex-1 py-4 rounded-xl bg-[#E03535] text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#E03535]/20">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
