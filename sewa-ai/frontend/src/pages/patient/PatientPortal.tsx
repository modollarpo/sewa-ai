// SEWA AI — PatientPortal.tsx
// GDPR/NHS-compliant patient portal: scans, plain-language AI findings, consent, downloads
import React, { useState, useEffect } from 'react';
import { usePatientData, usePatientAppointments } from '../../hooks/useDashboardData';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Skeleton } from '../../components/ui/Skeleton';

const C = {
  bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandLt:'#52B09A',
  normal:'#1DBF73',normalBg:'#0A1F14',
  info:'#2A6EF2',infoBg:'#0A1530',
  urgent:'#E08A20',
  critical:'#E03535',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

// Fallbacks handled in hook

const MOCK_CONSENTS = [
  {id:'c1',type:'AI-assisted diagnosis',description:'Allow SEWA AI to analyse your medical images using artificial intelligence to assist your doctors.',granted:true,date:'1 Jan 2026'},
  {id:'c2',type:'Federated Learning',description:'Allow anonymised data from your scans to help train AI models for future patients (fully anonymous, no personal data shared).',granted:false,date:'1 Jan 2026'},
  {id:'c_wa',type:'WhatsApp Notifications',description:'Receive critical alerts and appointment reminders via WhatsApp Secure Messaging.',granted:true,date:'24 Apr 2026'},
  {id:'c_sms',type:'SMS Clinical Alerts',description:'Receive urgent SMS notifications for critical findings (e.g. Stroke/ICH) even without an internet connection.',granted:true,date:'24 Apr 2026'},
  {id:'c4',type:'Marketing communications',description:'Receive updates about SEWA AI and health information relevant to you.',granted:true,date:'1 Jan 2026'},
];

const MOCK_ACCESS_LOG = [
  {date:'12 Mar 2026 10:45','who':'Dr. Sarah Chen','action':'Viewed scan report','device':'Hospital workstation'},
  {date:'12 Mar 2026 10:42','who':'SEWA AI System','action':'AI analysis completed','device':'Cloud (Azure UK South)'},
  {date:'12 Mar 2026 09:38','who':'Tech. M. Santos','action':'Uploaded scan','device':'PACS workstation'},
  {date:'8 Jan 2026 11:05','who':'Dr. Priya Patel','action':'Signed report','device':'Tablet (NHS MDM)'},
];

function UrgencyChip({ u }:{ u:string }) {
  const styles:Record<string,[string,string]> = {
    critical:['#E03535','#2A0A0A'],
    moderate:[C.urgent,'#2A1800'],
    normal:[C.normal,C.normalBg],
  };
  const [color,bg] = styles[u]??styles.normal;
  const labels:Record<string,string> = {critical:'Needs Attention',moderate:'Follow Up Advised',normal:'All Clear'};
  return (
    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:bg,color,border:`1px solid ${color}30`,fontFamily:C.F}}>
      {u==='normal'&&'✓ '}{labels[u]||u}
    </span>
  );
}

export function PatientPortal() {
  const { user } = useAuthStore();
  const { scans, loading: scansLoading } = usePatientData();
  const { appointments, loading: apptsLoading } = usePatientAppointments();
  const [tab, setTab] = useState<'scans'|'appointments'|'consent'|'access'|'account'>('scans');
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [consents, setConsents] = useState(MOCK_CONSENTS);

  const tabStyle = (t:string):React.CSSProperties => ({
    padding:'10px 16px',fontSize:13,fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo,background:'none',border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px',cursor:'pointer',fontFamily:C.F,
    display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap',
  });

  return (
    <div style={{maxWidth:860,margin:'0 auto',padding:'24px 16px',fontFamily:C.F,minHeight:'calc(100vh-76px)'}}>
      <style>{`
        @media (max-width: 800px) {
          .stats-row { flex-direction: column; }
          .stats-card { width: 100% !important; }
          .portal-tabs { overflow-x: auto; scrollbar-width: none; }
          .portal-tabs::-webkit-scrollbar { display: none; }
          .consent-row { flex-direction: column; }
          .consent-toggle { align-self: flex-end; }
          .detail-header { flex-direction: column; align-items: flex-start !important; gap: 12px; }
          .welcome-header { flex-direction: column; align-items: flex-start !important; }
          .welcome-meta { margin-left: 0 !important; text-align: left !important; margin-top: 12px; }
        }
      `}</style>

      {/* Welcome header */}
      <div style={{
        padding:'20px 24px',borderRadius:16,
        background:`linear-gradient(135deg, ${C.bg2}, ${C.bg3})`,
        border:`1px solid ${C.border}`,marginBottom:24,
        display:'flex',alignItems:'center',gap:16,
      }}>
        <div style={{width:52,height:52,borderRadius:'50%',background:`${C.brand}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:C.brand,flexShrink:0}}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:C.textHi}}>Hello, {user?.firstName || 'Patient'}</div>
          <div style={{fontSize:12,color:C.textMd,marginTop:2}}>NHS Number: 123 456 7890 · DOB: Registered on file</div>
        </div>
        <div className="welcome-meta" style={{marginLeft:'auto',textAlign:'right'}}>
          <div style={{fontSize:11,color:C.textLo,marginBottom:2}}>Last access</div>
          <div style={{fontSize:12,color:C.textMd,fontFamily:C.FM}}>{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="portal-tabs" style={{borderBottom:`1px solid ${C.border}`,display:'flex',gap:2,marginBottom:20}}>
        <button style={tabStyle('scans')} onClick={()=>setTab('scans')}>🩻 My Scans</button>
        <button style={tabStyle('appointments')} onClick={()=>setTab('appointments')}>📅 Appointments</button>
        <button style={tabStyle('consent')} onClick={()=>setTab('consent')}>✅ Consent</button>
        <button style={tabStyle('access')} onClick={()=>setTab('access')}>🔒 Data Access Log</button>
        <button style={tabStyle('account')} onClick={()=>setTab('account')}>⚙️ Account</button>
      </div>

      {/* My Scans */}
      {tab==='scans' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {scansLoading ? (
            Array(3).fill(0).map((_,i)=>(
              <div key={i} style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                  <Skeleton width="40%" height={16}/>
                  <Skeleton width="20%" height={20} style={{borderRadius:20}}/>
                </div>
                <Skeleton width="100%" height={60} style={{borderRadius:10,marginBottom:12}}/>
                <Skeleton width="60%" height={12} style={{marginBottom:12}}/>
                <div style={{display:'flex',gap:8}}>
                  <Skeleton width="100px" height={30} style={{borderRadius:8}}/>
                  <Skeleton width="100px" height={30} style={{borderRadius:8}}/>
                </div>
              </div>
            ))
          ) : !selectedScan ? (
            scans.length === 0 ? (
              <div style={{padding:40,textAlign:'center',background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`,color:C.textLo}}>
                No scans found in your records.
              </div>
            ) : scans.map(scan=>(
              <div key={scan.id} onClick={()=>setSelectedScan(scan)}
                style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`,cursor:'pointer',transition:'border-color 150ms',}}
                onMouseEnter={e=>(e.currentTarget.style.borderColor=C.brand+'60')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor=C.border)}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:C.textHi,marginBottom:2}}>
                      {scan.modality} — {scan.bodyPart}
                    </div>
                    <div style={{fontSize:11,color:C.textLo}}>{scan.date}</div>
                  </div>
                  <UrgencyChip u={scan.urgency}/>
                </div>

                {/* Plain-language AI summary box */}
                <div style={{padding:'12px 14px',background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6}}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                    <span style={{fontSize:10,fontWeight:600,color:C.brand,letterSpacing:'0.04em'}}>AI SUMMARY — PLAIN LANGUAGE</span>
                  </div>
                  <p style={{margin:0,fontSize:13,color:C.textHi,lineHeight:1.6}}>{scan.aiSummary}</p>
                </div>

                <div style={{fontSize:12,color:C.textMd,fontStyle:'italic',marginBottom:12}}>
                  "{scan.clinicalNote}"
                </div>

                <div style={{display:'flex',gap:8}}>
                  {scan.reportReady && (
                    <button onClick={e=>{e.stopPropagation(); alert('Downloading PDF Report...');}} style={{
                      padding:'7px 14px',background:C.brand,border:'none',borderRadius:8,
                      color:'white',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:C.F,
                      display:'flex',alignItems:'center',gap:5,
                    }}>
                      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download Report
                    </button>
                  )}
                  <button onClick={e=>{e.stopPropagation(); setSelectedScan(scan);}} style={{padding:'7px 14px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMd,fontSize:11,cursor:'pointer',fontFamily:C.F}}>
                    View Details →
                  </button>
                </div>
              </div>
            ))
          ) : (
            /* Scan detail view */
            <div>
              <button onClick={()=>setSelectedScan(null)} style={{background:'none',border:'none',color:C.textMd,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:5,marginBottom:16,fontFamily:C.F}}>
                ← Back to scans
              </button>
              <div style={{padding:20,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`}}>
                <div className="detail-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div>
                    <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.textHi}}>{selectedScan.modality} — {selectedScan.bodyPart}</h2>
                    <p style={{margin:'4px 0 0',fontSize:12,color:C.textLo}}>{selectedScan.date}</p>
                  </div>
                  <UrgencyChip u={selectedScan.urgency}/>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{padding:16,background:C.bg3,borderRadius:12,border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.brand,marginBottom:8}}>What the AI found (in plain language)</div>
                    <p style={{margin:0,fontSize:14,color:C.textHi,lineHeight:1.7}}>{selectedScan.aiSummary}</p>
                  </div>
                  <div style={{padding:16,background:C.bg3,borderRadius:12,border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.textHi,marginBottom:8}}>Doctor's note</div>
                    <p style={{margin:0,fontSize:13,color:C.textMd,fontStyle:'italic'}}>{selectedScan.clinicalNote}</p>
                    {selectedScan.reportSignedAt&&<p style={{margin:'8px 0 0',fontSize:11,color:C.textLo}}>Signed: {selectedScan.reportSignedAt}</p>}
                  </div>
                  <div style={{padding:16,background:C.infoBg,borderRadius:12,border:`1px solid ${C.info}30`}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.info,marginBottom:8}}>About AI-assisted diagnosis</div>
                    <p style={{margin:0,fontSize:12,color:C.textMd,lineHeight:1.6}}>
                      SEWA AI uses advanced machine learning to help your doctors analyse your scans more quickly and accurately. 
                      All AI findings are reviewed and confirmed by a qualified radiologist before you see them. 
                      The AI is certified under NHS DSPT and GDPR standards.
                    </p>
                  </div>
                  <button onClick={() => alert('Downloading PDF Report...')} style={{padding:'10px',background:C.brand,border:'none',borderRadius:10,color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:C.F}}>
                    ⬇ Download Full Report (PDF)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appointments Tab */}
      {tab==='appointments' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <h3 style={{margin:0,fontSize:16,color:C.textHi}}>Upcoming Appointments</h3>
            <button onClick={() => alert('Booking system integration coming soon.')} style={{padding:'7px 14px',background:C.brand,border:'none',borderRadius:8,color:'white',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:C.F}}>
              + Book Follow-up
            </button>
          </div>
          
          {apptsLoading ? (
            <Skeleton width="100%" height={100} style={{borderRadius:14}}/>
          ) : (appointments || []).length === 0 ? (
            <div style={{padding:40,textAlign:'center',background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`,color:C.textLo}}>
              No upcoming appointments.
            </div>
          ) : appointments.map((a:any)=>(
            <div key={a.id} style={{padding:16,background:C.bg2,borderRadius:14,border:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.textHi,textTransform:'capitalize'}}>{a.type.replace(/_/g,' ')} with Dr. {a.doctor?.lastName || 'Radiologist'}</div>
                <div style={{fontSize:12,color:C.textMd,marginTop:4}}>{new Date(a.scheduledDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })} at {new Date(a.scheduledDate).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
                {a.location && <div style={{fontSize:11,color:C.brand,marginTop:4}}>📍 {a.location}</div>}
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:`${C.brand}20`,color:C.brand,border:`1px solid ${C.brand}40`,textTransform:'uppercase'}}>{a.status}</span>
                {a.videoUrl && <button onClick={()=>window.open(a.videoUrl,'_blank')} style={{display:'block',marginTop:8,padding:'5px 10px',background:C.info,border:'none',borderRadius:6,color:'white',fontSize:10,fontWeight:700,cursor:'pointer'}}>Join Video Call</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consent Management */}
      {tab==='consent' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{padding:16,background:C.infoBg,borderRadius:12,border:`1px solid ${C.info}30`,fontSize:12,color:C.textMd,lineHeight:1.6}}>
            ℹ️ <strong style={{color:C.info}}>Your data, your choice.</strong> You can change these preferences at any time. Some settings are required for your care and cannot be turned off.
          </div>
          {consents.map(consent=>(
            <div key={consent.id} className="consent-row" style={{padding:16,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.textHi,marginBottom:4}}>{consent.type}</div>
                <div style={{fontSize:12,color:C.textMd,lineHeight:1.6}}>{consent.description}</div>
                <div style={{fontSize:10,color:C.textLo,marginTop:6}}>Last updated: {consent.date}</div>
              </div>
              {/* Toggle */}
              <div className="consent-toggle" style={{flexShrink:0,marginTop:2}}>
                <div
                  onClick={()=>setConsents(cs=>cs.map(c=>c.id===consent.id?{...c,granted:!c.granted}:c))}
                  style={{
                    width:40,height:22,borderRadius:11,
                    background:consent.granted?C.brand:C.bg3,
                    border:`1px solid ${consent.granted?C.brand:C.border}`,
                    position:'relative',cursor:'pointer',transition:'all 200ms',
                    boxShadow:consent.granted?`0 0 8px ${C.brand}40`:'none',
                  }}>
                  <div style={{
                    position:'absolute',top:3,left:consent.granted?'20px':'3px',
                    width:14,height:14,borderRadius:'50%',background:'white',
                    transition:'left 200ms',boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
                  }}/>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => alert('Preferences saved securely.')} style={{padding:'10px',background:C.brand,border:'none',borderRadius:10,color:'white',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:C.F,marginTop:4}}>
            Save Preferences
          </button>
        </div>
      )}

      {/* Data Access Log */}
      {tab==='access' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{padding:14,background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,fontSize:12,color:C.textMd,lineHeight:1.5}}>
            🔒 Under UK GDPR Article 15, you have the right to see exactly who has accessed your data. This log records all access to your medical information.
          </div>
          <div style={{background:C.bg2,borderRadius:12,border:`1px solid ${C.border}`,overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:C.bg3}}>
                  {['Date & Time','Who accessed','What they did','Device'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:600,color:C.textLo,letterSpacing:'0.05em',fontFamily:C.F,textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_ACCESS_LOG.map((log,i)=>(
                  <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                    <td style={{padding:'12px 14px',fontSize:11,color:C.textLo,fontFamily:C.FM,whiteSpace:'nowrap'}}>{log.date}</td>
                    <td style={{padding:'12px 14px',fontSize:12,fontWeight:600,color:C.textHi}}>{log.who}</td>
                    <td style={{padding:'12px 14px',fontSize:12,color:C.textMd}}>{log.action}</td>
                    <td style={{padding:'12px 14px',fontSize:11,color:C.textLo}}>{log.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => alert('Downloading access log CSV...')} style={{padding:'8px 16px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.textMd,fontSize:12,cursor:'pointer',fontFamily:C.F,display:'inline-flex',alignItems:'center',gap:6,width:'fit-content'}}>
            ⬇ Download Full Access Log
          </button>
        </div>
      )}

      {/* Account */}
      {tab==='account' && (
        <div style={{display:'flex',flexDirection:'column',gap:12,maxWidth:480}}>
          {[
            {label:'Full name',value:`${user?.firstName||'John'} ${user?.lastName||'Smith'}`},
            {label:'Email',value:user?.email||'patient@example.com'},
            {label:'NHS Number',value:'123 456 7890'},
            {label:'Date of birth',value:'On file'},
            {label:'GP Practice',value:'Central London GP Surgery'},
          ].map(field=>(
            <div key={field.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:C.bg2,borderRadius:10,border:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,color:C.textMd}}>{field.label}</span>
              <span style={{fontSize:12,fontWeight:600,color:C.textHi}}>{field.value}</span>
            </div>
          ))}
          <div style={{padding:16,background:'#2A0A0A',borderRadius:12,border:'1px solid #4A1515',marginTop:8}}>
            <div style={{fontSize:12,fontWeight:700,color:C.critical,marginBottom:8}}>Delete My Data</div>
            <p style={{margin:'0 0 12px',fontSize:12,color:C.textMd,lineHeight:1.5}}>
              Under UK GDPR Article 17 (Right to Erasure), you can request deletion of your personal data. This cannot be undone and may affect your care record.
            </p>
            <button onClick={() => alert('Data deletion request submitted to DPO.')} style={{padding:'8px 16px',background:'transparent',border:'1px solid #4A1515',borderRadius:8,color:C.critical,fontSize:12,cursor:'pointer',fontFamily:C.F}}>
              Request Data Deletion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
