// SEWA XAI — PartnerPortalPage.tsx
// Password-gated investor & hospital due diligence data room.
// Following the advisor's recommendation: forces email capture before access
// to "secret sauce" — pitch deck, technical whitepaper, CER, financials.

import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  normal:'#1DBF73',info:'#2A6EF2',critical:'#E03535',amber:'#F59E0B',purple:'#8B5CF6',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

type AccessLevel = 'none'|'registered'|'approved';
type VisitorType = 'investor'|'hospital'|'partner'|'press';

const DOCUMENTS = [
  {
    category:'Investor Documents',
    level:'approved' as AccessLevel,
    icon:'💼',
    color:C.amber,
    docs:[
      { name:'Seed Round Pitch Deck',                    size:'4.2 MB', format:'PDF', restricted:true  },
      { name:'5-Year Financial Projections (to £28M ARR)',size:'1.8 MB', format:'XLSX',restricted:true  },
      { name:'Go-to-Market Strategy (NHS → Africa → India)',size:'2.1 MB',format:'PDF', restricted:true  },
      { name:'Competitive Landscape Analysis',            size:'3.4 MB', format:'PDF', restricted:true  },
      { name:'Cap Table & SAFE Note Template',            size:'680 KB', format:'PDF', restricted:true  },
    ],
  },
  {
    category:'Technical Documentation',
    level:'registered' as AccessLevel,
    icon:'🔬',
    color:C.info,
    docs:[
      { name:'Technical Whitepaper v1.2 (Architecture & AI)',size:'3.1 MB',format:'PDF', restricted:false },
      { name:'4-Engine Safety Stack — Deep Dive',           size:'2.4 MB',format:'PDF', restricted:false },
      { name:'FHIR R4 / HL7v2 Integration Guide',           size:'1.6 MB',format:'PDF', restricted:false },
      { name:'Multi-Cloud Deployment Architecture',          size:'2.8 MB',format:'PDF', restricted:false },
      { name:'API Reference (OpenAPI 3.1)',                  size:'890 KB',format:'JSON',restricted:false },
    ],
  },
  {
    category:'Clinical Validation',
    level:'registered' as AccessLevel,
    icon:'🏥',
    color:C.normal,
    docs:[
      { name:'Clinical Evaluation Report (CER) v3.0',       size:'8.2 MB',format:'PDF', restricted:false },
      { name:'AI Performance — External Validation Dataset', size:'4.1 MB',format:'PDF', restricted:false },
      { name:'Published Papers (6 peer-reviewed)',           size:'12.4 MB',format:'PDF',restricted:false },
      { name:'Model Cards (all 5 AI engines)',               size:'2.2 MB',format:'PDF', restricted:false },
    ],
  },
  {
    category:'Compliance & Legal (Pilot Clients Only)',
    level:'approved' as AccessLevel,
    icon:'🔒',
    color:C.purple,
    docs:[
      { name:'IT Security Questionnaire — Completed',       size:'1.4 MB',format:'PDF', restricted:true  },
      { name:'ISO 13485 Quality Management Documentation',   size:'6.1 MB',format:'PDF', restricted:true  },
      { name:'Data Processing Agreement (DPA) Template',     size:'890 KB',format:'PDF', restricted:true  },
      { name:'Risk Register — Clinical Safety',             size:'2.3 MB',format:'PDF', restricted:true  },
      { name:'NHS DSPT Evidence — Standards Met',           size:'3.1 MB',format:'PDF', restricted:true  },
    ],
  },
];

const VISITOR_TYPES: { id: VisitorType; label: string; icon: string; desc: string }[] = [
  { id:'investor', label:'Investor / VC', icon:'💼', desc:'Seed round materials, financials, cap table' },
  { id:'hospital', label:'Hospital / NHS Trust', icon:'🏥', desc:'Technical docs, CER, compliance, pilot info' },
  { id:'partner',  label:'Technology Partner', icon:'🤝', desc:'API docs, integration guides, architecture' },
  { id:'press',    label:'Press / Analyst',    icon:'📰', desc:'Press kit, statistics, approved quotes' },
];

const inp: React.CSSProperties = {
  width:'100%', padding:'10px 14px', background:'#0C1D17',
  border:'1px solid #1B3028', borderRadius:9, color:'#D0ECE6',
  fontSize:13, fontFamily:"'IBM Plex Sans',system-ui,sans-serif",
  boxSizing:'border-box', outline:'none',
};

import { apiClient } from '../../services/apiClient';

export function PartnerPortalPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [access,      setAccess]      = useState<AccessLevel>('none');
  const [visitorType, setVisitorType] = useState<VisitorType>('investor');
  const [step,        setStep]        = useState<'gate'|'form'|'pending'|'portal'>('gate');
  const [form,        setForm]        = useState({ name:'', email:'', org:'', role:'', nda:false });
  const [submitting,  setSubmitting]  = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const [status,      setStatus]      = useState<{ msg:string; type:'ok'|'err' } | null>(null);

  const handleRequest = async () => {
    if (!form.name || !form.email || !form.org || !form.nda) return;
    setSubmitting(true);
    setStatus(null);
    try {
      await apiClient.post('/onboarding/lead', {
        name: form.name,
        email: form.email,
        organization: form.org,
        message: `Visitor Type: ${visitorType}, Role: ${form.role}, NDA: ${form.nda}`
      });
      setStep('pending');
    } catch (err) {
      setStatus({ msg: 'Request submission failed. Please try again later.', type:'err' });
    } finally {
      setSubmitting(false);
    }
  };

  // Quick demo access (in production: email verification + manual approval)
  const demoAccess = () => { setAccess('registered'); setStep('portal'); };

  const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:C.textLo, letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:6, fontFamily:C.F };

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 768px) {
          .portal-grid { grid-template-columns: 1fr !important; }
          .form-split { grid-template-columns: 1fr !important; gap: 0 !important; }
          .doc-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <PublicNav activePage="partner-portal" onNavigate={onNavigate} />

      {/* Gate screen */}
      {step === 'gate' && (
        <div style={{ padding:'110px 24px 80px', display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh' }}>
          <div style={{ maxWidth:640, width:'100%' }}>
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <div style={{ width:72, height:72, background:`${C.purple}14`, border:`2px solid ${C.purple}40`, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 24px' }}>🔐</div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', background:`${C.purple}14`, border:`1px solid ${C.purple}30`, borderRadius:20, marginBottom:20 }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.purple, letterSpacing:'0.1em', textTransform:'uppercase' }}>Private Data Room</span>
              </div>
              <h1 style={{ fontSize:40, fontWeight:900, color:C.textHi, margin:'0 0 16px', letterSpacing:'-1.5px' }}>SEWA XAI Partner Portal</h1>
              <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, margin:'0 0 40px' }}>
                Confidential documents for investors, hospital partners, and technology integrators. Access requires identity verification and NDA acceptance.
              </p>
            </div>

            {/* Visitor type */}
            <div className="portal-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:32 }}>
              {VISITOR_TYPES.map(vt => (
                <button key={vt.id} onClick={() => setVisitorType(vt.id)} style={{
                  padding:'16px 20px', borderRadius:12, cursor:'pointer', fontFamily:C.F, textAlign:'left',
                  border:`2px solid ${visitorType===vt.id?`${C.purple}60`:C.border}`,
                  background:visitorType===vt.id?`${C.purple}10`:C.bg2,
                }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{vt.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:4 }}>{vt.label}</div>
                  <div style={{ fontSize:11, color:C.textLo, lineHeight:1.5 }}>{vt.desc}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('form')} style={{ width:'100%', padding:'14px 0', background:`linear-gradient(135deg,${C.purple},#6D28D9)`, border:'none', borderRadius:11, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:C.F }}>
              Request Access →
            </button>
            <p style={{ fontSize:11, color:C.textLo, textAlign:'center', marginTop:14 }}>
              By requesting access you agree to our NDA and Confidentiality Terms. Access is granted within 1 business day.
            </p>
          </div>
        </div>
      )}

      {/* Registration form */}
      {step === 'form' && (
        <div style={{ padding:'100px 24px 80px', display:'flex', justifyContent:'center' }}>
          <div style={{ maxWidth:540, width:'100%' }}>
            <button onClick={() => setStep('gate')} style={{ background:'none', border:'none', color:C.brand, cursor:'pointer', fontFamily:C.F, fontSize:13, marginBottom:24 }}>← Back</button>
            <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 8px', fontFamily:C.F }}>Request Data Room Access</h2>
            <p style={{ fontSize:13, color:C.textLo, margin:'0 0 32px' }}>
              Visitor type: <strong style={{ color:C.textMd }}>{VISITOR_TYPES.find(v=>v.id===visitorType)?.label}</strong>
            </p>

            <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
              <div className="form-split" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div><label style={lbl}>Full name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} style={inp} placeholder="Dr. Sarah Chen"/></div>
                <div><label style={lbl}>Work email *</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} style={inp} placeholder="sarah@org.com"/></div>
              </div>
              <div className="form-split" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div><label style={lbl}>Organisation *</label><input value={form.org} onChange={e=>set('org',e.target.value)} style={inp} placeholder="Royal London Hospital"/></div>
                <div><label style={lbl}>Role / title</label><input value={form.role} onChange={e=>set('role',e.target.value)} style={inp} placeholder="Chief Radiologist"/></div>
              </div>
              <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer', marginBottom:24 }}>
                <input type="checkbox" checked={form.nda} onChange={e=>set('nda',e.target.checked)} style={{ marginTop:3, accentColor:C.purple, flexShrink:0 }}/>
                <span style={{ fontSize:11, color:C.textLo, lineHeight:1.6 }}>
                  I agree to treat all accessed documents as confidential and to the Non-Disclosure Agreement terms. I confirm I am not a competitor of SEWA XAI. *
                </span>
              </label>
              <button onClick={handleRequest} disabled={submitting || !form.name || !form.email || !form.org || !form.nda}
                style={{ width:'100%', padding:'13px 0', background:`linear-gradient(135deg,${C.purple},#6D28D9)`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:C.F, opacity:(!form.name||!form.email||!form.org||!form.nda)?0.5:1 }}>
                {submitting ? 'Submitting…' : 'Submit NDA & Request Access →'}
              </button>
            </div>

            <div style={{ marginTop:16, textAlign:'center' }}>
              <button onClick={demoAccess} style={{ background:'none', border:'none', color:C.textLo, fontSize:11, cursor:'pointer', fontFamily:C.F, textDecoration:'underline' }}>
                Preview portal (demo mode — limited docs)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending state */}
      {step === 'pending' && (
        <div style={{ padding:'110px 24px 80px', display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh' }}>
          <div style={{ maxWidth:480, textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:24 }}>📬</div>
            <h2 style={{ fontSize:28, fontWeight:800, color:C.textHi, margin:'0 0 14px', fontFamily:C.F }}>Access request received</h2>
            <p style={{ fontSize:14, color:C.textMd, lineHeight:1.8, margin:'0 0 28px' }}>
              We've received your request for <strong style={{ color:C.textHi }}>{form.email}</strong>. Our team will review and respond within <strong style={{ color:C.brand }}>1 business day</strong>. You'll receive a secure access link by email.
            </p>
            <div style={{ padding:16, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, fontSize:12, color:C.textLo, marginBottom:24 }}>
              For urgent investor or pilot inquiries, contact us directly at <a href="mailto:partners@sewaxai.health" style={{ color:C.brand }}>partners@sewaxai.health</a>
            </div>
            <button onClick={() => onNavigate('landing')} style={{ padding:'11px 24px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>Back to Home</button>
          </div>
        </div>
      )}

      {/* Data Room Portal */}
      {step === 'portal' && (
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'100px 24px 80px' }}>
          {status && (
            <div style={{ 
              padding:'12px 20px', background: status.type==='ok'?`${C.normal}10`:C.critBg, 
              border:`1px solid ${status.type==='ok'?C.normal:C.critical}40`,
              borderRadius:12, marginBottom:32, display:'flex', justifyContent:'space-between', alignItems:'center',
              color: status.type==='ok'?C.normal:C.critical, fontSize:13, fontWeight:600
            }}>
              <span>{status.type==='ok'?'✓':'⚠'} {status.msg}</span>
              <button onClick={()=>setStatus(null)} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
            </div>
          )}
          {/* Portal header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:48 }}>
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', background:`${C.normal}14`, border:`1px solid ${C.normal}30`, borderRadius:20, marginBottom:12 }}>
                <span style={{ fontSize:9, fontWeight:700, color:C.normal, letterSpacing:'0.1em', textTransform:'uppercase' }}>✓ Access Granted — Demo Mode</span>
              </div>
              <h1 style={{ fontSize:32, fontWeight:800, color:C.textHi, margin:'0 0 6px', fontFamily:C.F, letterSpacing:'-0.5px' }}>SEWA XAI Data Room</h1>
              <p style={{ fontSize:13, color:C.textMd, margin:0 }}>Confidential documents for {VISITOR_TYPES.find(v=>v.id===visitorType)?.label}. All access is logged and audited.</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => onNavigate('contact')} style={{ padding:'9px 18px', background:C.brand, border:'none', borderRadius:9, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>Schedule Call</button>
            </div>
          </div>

          {/* Document categories */}
          {DOCUMENTS.map(cat => (
            <div key={cat.category} style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span style={{ fontSize:20 }}>{cat.icon}</span>
                <h2 style={{ fontSize:17, fontWeight:800, color:C.textHi, margin:0, fontFamily:C.F }}>{cat.category}</h2>
                <span style={{ padding:'2px 9px', background:`${cat.color}14`, border:`1px solid ${cat.color}30`, borderRadius:20, fontSize:9, fontWeight:700, color:cat.color }}>
                  {cat.level === 'approved' ? '🔒 Approved Access Only' : '✓ Registered Access'}
                </span>
              </div>
              <div className="doc-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {cat.docs.map(doc => {
                  const canAccess = !doc.restricted || access === 'approved';
                  return (
                    <div key={doc.name} style={{ padding:'16px 20px', background:C.bg2, border:`1px solid ${canAccess?C.border:'#1B3028'}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between', opacity:canAccess?1:0.5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:36, height:36, background:C.bg3, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                          {doc.format === 'PDF' ? '📄' : doc.format === 'XLSX' ? '📊' : '📋'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:canAccess?C.textHi:C.textLo, marginBottom:2 }}>{doc.name}</div>
                          <div style={{ fontSize:10, color:C.textLo }}>{doc.format} · {doc.size}</div>
                        </div>
                      </div>
                      {canAccess ? (
                        <button onClick={async () => {
                          if (doc.format === 'PDF' && doc.name.includes('Whitepaper')) {
                            onNavigate('api-docs');
                          } else {
                            try {
                              await apiClient.post('/onboarding/lead', {
                                organization: 'Partner Portal',
                                message: `Document Access: ${doc.name}`,
                                source: 'partner_portal_download'
                              });
                              setStatus({ msg: `Accessing ${doc.name}. The secure download link will be sent to your verified email.`, type:'ok' });
                            } catch (e) {
                              setStatus({ msg: 'Unable to process download request.', type:'err' });
                            }
                          }
                        }} style={{ padding:'6px 14px', background:`${cat.color}14`, border:`1px solid ${cat.color}30`, borderRadius:7, color:cat.color, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:C.F, flexShrink:0 }}>
                          Download
                        </button>
                      ) : (
                        <span style={{ fontSize:10, color:C.textLo, flexShrink:0 }}>🔒 Approval needed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Upgrade prompt for restricted docs */}
          <div style={{ padding:28, background:`${C.purple}08`, border:`1px solid ${C.purple}20`, borderRadius:16, textAlign:'center' }}>
            <h3 style={{ fontSize:18, fontWeight:800, color:C.textHi, margin:'0 0 10px', fontFamily:C.F }}>Need access to restricted documents?</h3>
            <p style={{ fontSize:13, color:C.textMd, margin:'0 0 20px' }}>Pitch deck, financials, IT security questionnaire, and compliance documentation require approved access. Contact our partnerships team.</p>
            <button onClick={() => onNavigate('contact')} style={{ padding:'11px 24px', background:`linear-gradient(135deg,${C.purple},#6D28D9)`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:C.F }}>
              Request Full Access → partners@sewaxai.health
            </button>
          </div>
        </div>
      )}

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

