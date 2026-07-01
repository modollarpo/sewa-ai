// SEWA XAI — Support & Feedback Page
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient, getFeedback } from '../../services/apiClient';
import { FeedbackModal } from '../../components/shared/FeedbackModal';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',
  normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',urgent:'#E08A20',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",
};

const CATEGORIES = ['billing','technical','clinical','general','feature_request'];
const PRIORITIES = ['low','medium','high','urgent'];
const TICKET_STATUSES = ['open','in_progress','waiting_on_customer','resolved','closed'];
const FEEDBACK_STATUSES = ['pending','reviewing','actioned','closed'];
const FEEDBACK_TYPES = ['feature_request','bug_report','satisfaction','usability','general'];

const inp: React.CSSProperties = {
  width:'100%', padding:'10px 14px', background:'#0C1D17',
  border:'1px solid #1B3028', borderRadius:9, color:'#D0ECE6',
  fontSize:13, fontFamily:C.F, boxSizing:'border-box', outline:'none',
};

const lbl: React.CSSProperties = {
  fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.06em',
  textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F
};

const priorityColor = (p:string) => {
  const m:Record<string,string> = { low:C.textMd, medium:C.info, high:C.urgent, urgent:C.critical };
  return m[p] || C.textLo;
};

const ticketStatusBadge = (s:string) => {
  const m:Record<string,[string,string]> = {
    open:['white', `${C.critical}30`],
    in_progress:['white', `${C.brand}30`],
    waiting_on_customer:[C.textMd, C.bg3],
    resolved:[C.normal, `${C.normal}20`],
    closed:[C.textLo, C.bg3],
  };
  const [color, bg] = m[s] || [C.textLo, C.bg3];
  return (
    <span style={{
      padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700, color, background:bg,
      border:`1px solid ${bg}`, textTransform:'uppercase'
    }}>{s.replace(/_/g,' ')}</span>
  );
};

const feedbackStatusBadge = (s:string) => {
  const m:Record<string,[string,string]> = {
    pending:['white', `${C.brand}30`],
    reviewing:['white', `${C.info}30`],
    actioned:[C.normal, `${C.normal}20`],
    closed:[C.textLo, C.bg3],
  };
  const [color, bg] = m[s] || [C.textLo, C.bg3];
  return (
    <span style={{
      padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700, color, background:bg,
      border:`1px solid ${bg}`, textTransform:'uppercase'
    }}>{s}</span>
  );
};

export function SupportTicketsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'tickets'|'feedback'>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showCreateFeedback, setShowCreateFeedback] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('');
  const [newTicket, setNewTicket] = useState({
    subject:'', description:'', category:'general', priority:'medium', tags:[] as string[]
  });

  const isAdmin = ['admin','superadmin'].includes(user?.role || '');

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (ticketStatusFilter) params.set('status', ticketStatusFilter);
      const res = await apiClient.get(`/support/tickets?${params.toString()}`);
      setTickets(res.data);
    } catch (e) { console.error('Failed to fetch tickets', e); }
    setLoadingTickets(false);
  };

  const fetchFeedbackList = async () => {
    try {
      const data = await getFeedback({ status: feedbackStatusFilter });
      setFeedback(data);
    } catch (e) { console.error('Failed to fetch feedback', e); }
    setLoadingFeedback(false);
  };

  useEffect(() => { fetchTickets(); }, [ticketStatusFilter]);
  useEffect(() => { fetchFeedbackList(); }, [feedbackStatusFilter]);

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) return;
    try {
      await apiClient.post('/support/tickets', newTicket);
      setShowCreateTicket(false);
      setNewTicket({ subject:'', description:'', category:'general', priority:'medium', tags:[] });
      fetchTickets();
    } catch (e) { console.error('Failed to create ticket', e); }
  };

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      {/* Content */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px 80px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, color:C.textHi, margin:0 }}>Support & Feedback</h1>
            <p style={{ fontSize:13, color:C.textMd, margin:'6px 0 0' }}>Submit support requests and share product feedback</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:24, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>
          {(['tickets','feedback'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding:'10px 20px',
                borderRadius:'8px 8px 0 0',
                background: activeTab === tab ? C.bg2 : 'transparent',
                border: activeTab === tab ? `1px solid ${C.border}` : '1px solid transparent',
                color: activeTab === tab ? C.textHi : C.textLo,
                fontSize:13,
                fontWeight: activeTab === tab ? 700 : 400,
                cursor:'pointer'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'tickets' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <select value={ticketStatusFilter} onChange={e=>setTicketStatusFilter(e.target.value)} style={inp}>
                <option value="">All statuses</option>
                {TICKET_STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <button onClick={()=>setShowCreateTicket(true)} style={{
                padding:'10px 20px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`,
                border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer'
              }}>+ New Ticket</button>
            </div>

            {loadingTickets ? <div style={{ color:C.textMd, fontSize:13 }}>Loading...</div> :
              tickets.length===0 ? <div style={{ textAlign:'center', padding:'60px 0', color:C.textMd }}>No tickets yet — create your first one!</div> :
              <div style={{ display:'grid', gap:16 }}>
                {tickets.map(t=>
                  <div key={t.id} style={{
                    padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <h3 style={{ fontSize:15, fontWeight:800, color:C.textHi, margin:0 }}>{t.subject}</h3>
                        <div style={{ fontSize:11, color:C.textLo, marginTop:6 }}>
                          {new Date(t.createdAt).toLocaleString()} · {t.category.replace(/_/g,' ')} · {isAdmin ? `From: ${t.user.firstName} ${t.user.lastName}` : ''}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:10, fontWeight:700, color:priorityColor(t.priority), textTransform:'uppercase' }}>{t.priority}</span>
                        {ticketStatusBadge(t.status)}
                      </div>
                    </div>
                    <p style={{ fontSize:13, color:C.textMd, lineHeight:1.7, margin:0, maxWidth:'80ch' }}>{t.description}</p>
                  </div>
                )}
              </div>
            }
          </>
        )}

        {activeTab === 'feedback' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <select value={feedbackStatusFilter} onChange={e=>setFeedbackStatusFilter(e.target.value)} style={inp}>
                <option value="">All statuses</option>
                {FEEDBACK_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={()=>setShowCreateFeedback(true)} style={{
                padding:'10px 20px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`,
                border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer'
              }}>+ Share Feedback</button>
            </div>

            {loadingFeedback ? <div style={{ color:C.textMd, fontSize:13 }}>Loading...</div> :
              feedback.length===0 ? <div style={{ textAlign:'center', padding:'60px 0', color:C.textMd }}>No feedback yet — share your first piece of feedback!</div> :
              <div style={{ display:'grid', gap:16 }}>
                {feedback.map(fb=>
                  <div key={fb.id} style={{
                    padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <h3 style={{ fontSize:15, fontWeight:800, color:C.textHi, margin:0 }}>{fb.subject || fb.feedbackType.replace('_',' ')}</h3>
                        <div style={{ fontSize:11, color:C.textLo, marginTop:6 }}>
                          {new Date(fb.createdAt).toLocaleString()} · {fb.category?.replace('_',' ') || 'General'}
                          {fb.score && <span style={{ marginLeft:12, fontWeight:700, color:C.textMd }}>Score: {fb.score}/5</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        {fb.prioritized && <span style={{ fontSize:10, fontWeight:700, color:C.urgent, textTransform:'uppercase', padding:'4px 10px', borderRadius:20, background:`${C.urgent}20` }}>Prioritized</span>}
                        {feedbackStatusBadge(fb.status)}
                      </div>
                    </div>
                    <p style={{ fontSize:13, color:C.textMd, lineHeight:1.7, margin:0, maxWidth:'80ch' }}>{fb.description}</p>
                  </div>
                )}
              </div>
            }
          </>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateTicket &&
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center',
          justifyContent:'center', padding:20, zIndex:1000
        }} onClick={()=>setShowCreateTicket(false)}>
          <div style={{
            width:'100%', maxWidth:600, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, padding:28
          }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h2 style={{ fontSize:20, fontWeight:900, color:C.textHi, margin:0 }}>New support ticket</h2>
              <button onClick={()=>setShowCreateTicket(false)} style={{ background:'none', border:'none', color:C.textLo, fontSize:20, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Subject *</label>
              <input value={newTicket.subject} onChange={e=>setNewTicket({...newTicket, subject:e.target.value})} style={inp} placeholder="Brief description of your issue"/>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Description *</label>
              <textarea value={newTicket.description} onChange={e=>setNewTicket({...newTicket, description:e.target.value})}
                rows={5} style={{...inp, resize:'vertical'}} placeholder="Provide details about your issue..."/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              <div>
                <label style={lbl}>Category</label>
                <select value={newTicket.category} onChange={e=>setNewTicket({...newTicket, category:e.target.value})} style={inp}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Priority</label>
                <select value={newTicket.priority} onChange={e=>setNewTicket({...newTicket, priority:e.target.value})} style={inp}>
                  {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
              <button onClick={()=>setShowCreateTicket(false)} style={{ padding:'10px 20px', background:'none', border:`1px solid ${C.border}`, borderRadius:9, color:C.textMd, fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleCreateTicket} disabled={!newTicket.subject || !newTicket.description} style={{ padding:'10px 20px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', opacity:(!newTicket.subject || !newTicket.description) ? 0.5 : 1 }}>Submit Ticket</button>
            </div>
          </div>
        </div>
      }

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showCreateFeedback}
        onClose={()=>setShowCreateFeedback(false)}
        onSubmitted={()=>{
          fetchFeedbackList();
        }}
      />
    </div>
  );
}
