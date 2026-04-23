// SEWA AI — SolutionsPage.tsx
import React, { useState } from 'react';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';

const C = {
  bg0:'#050F0C',bg1:'#08160F',bg2:'#0C1D17',bg3:'#111F1A',
  brand:'#408D7B',brandDk:'#2E6B5E',brandLt:'#52B09A',
  critical:'#E03535',normal:'#1DBF73',info:'#2A6EF2',purple:'#8B5CF6',amber:'#F59E0B',
  textHi:'#D0ECE6',textMd:'#6FA898',textLo:'#3A6055',
  border:'#1B3028',F:"'IBM Plex Sans',system-ui,sans-serif",FM:"'IBM Plex Mono',monospace",
};

const ENGINES = [
  {
    id:'triage', icon:'⚡', label:'Triage Engine', color:C.critical, port:8000,
    headline:'Critical conditions detected in under 2 seconds',
    description:'Our EfficientNet-B4 deep learning model analyses CT, MRI, and X-ray scans at 94% accuracy across 14 pathology classes. The triage engine fires before a radiologist opens a case — ensuring critical findings reach the right clinician immediately.',
    conditions:['Intracranial Haemorrhage (ICH)','Large Vessel Occlusion (LVO) / Stroke','Pulmonary Embolism (PE)','Pneumothorax','Aortic Dissection','Rib Fractures','Pleural Effusion','Pneumonia / COVID-19','Tuberculosis','Spinal Cord Compression','Liver Lesions','Renal Calculi','Appendicitis','Bowel Obstruction'],
    metrics:[
      { label:'AUC-ROC (ICH)', value:'>0.97' },
      { label:'Sensitivity (PE)', value:'94.2%' },
      { label:'Inference time', value:'<2s' },
      { label:'Modalities', value:'CT · MRI · XR' },
    ],
    pipeline:'DICOM → Preprocessing → EfficientNet-B4 → Multi-label classifier → Priority score → Worklist sort',
  },
  {
    id:'uncertainty', icon:'🎯', label:'Uncertainty Engine', color:C.amber, port:8002,
    headline:'Know when to trust the AI — and when not to',
    description:'SEWA AI is the only clinical AI platform that quantifies its own uncertainty. Using Monte Carlo Dropout with 20 forward passes, we compute both epistemic (model) and aleatoric (data) uncertainty — flagging borderline cases for mandatory human review.',
    conditions:['Low-quality DICOM inputs (motion artefact, noise)','Rare or out-of-distribution pathologies','Multi-pathology overlapping findings','Paediatric anatomy (OOD vs adult training)','Post-surgical anatomy','Contrast vs non-contrast ambiguity'],
    metrics:[
      { label:'Uncertainty method', value:'MC-Dropout ×20' },
      { label:'Calibration (ECE)', value:'<0.04' },
      { label:'OOD detection rate', value:'89.1%' },
      { label:'False positive reduction', value:'31%' },
    ],
    pipeline:'AI Result → MC-Dropout ×20 → Epistemic variance → Aleatoric variance → Confidence score → Flag/Pass',
  },
  {
    id:'metacognition', icon:'🧠', label:'Metacognition Engine', color:C.purple, port:8003,
    headline:'AI that checks its own work before you see it',
    description:'Our 9-layer metacognition pipeline evaluates every AI result before it reaches a clinician. It checks internal consistency, cross-references against clinical rules, detects hallucinations, and assigns a Confidence Integrity Score (CIS) to every output.',
    conditions:['Anatomical hallucinations (findings in wrong location)','Physiologically impossible combinations','Contradictions with prior scans','Clinical rule violations (e.g. ICH without hyperdensity)','Report-finding misalignment','Uncertainty-confidence contradiction'],
    metrics:[
      { label:'Hallucination catch rate', value:'96.3%' },
      { label:'False escalation reduction', value:'28%' },
      { label:'CIS score range', value:'0–100' },
      { label:'Avg latency added', value:'180ms' },
    ],
    pipeline:'AI Result → Anatomical consistency → Clinical rules → Prior comparison → CIS scoring → Pass/Flag/Block',
  },
  {
    id:'vlm', icon:'📋', label:'VLM Report Generator', color:C.info, port:8001,
    headline:'Structured radiology reports in seconds, not hours',
    description:'Our Vision-Language Model combines the DICOM image, AI findings, patient history, and clinical context to generate a fully-structured, editable radiology report. Radiologists review, edit, and sign — reducing reporting time by 60–70%.',
    conditions:['Structured findings section (per organ system)','Impression with differential diagnosis','Clinical recommendations (urgent/routine)','Comparison with prior studies','Laterality, size, and HU measurements','ICD-10 coding suggestions','DICOM SR structured report output'],
    metrics:[
      { label:'Report generation time', value:'<8s' },
      { label:'Radiologist edit rate', value:'23%' },
      { label:'BLEU-4 vs expert', value:'0.71' },
      { label:'Languages', value:'8' },
    ],
    pipeline:'DICOM + AI findings + EHR → VLM prompt → Structured report → Radiologist review → Sign & FHIR export',
  },
  {
    id:'xai', icon:'🔍', label:'Explainability (XAI)', color:C.normal, port:8000,
    headline:'See exactly what the AI saw — pixel by pixel',
    description:'Every SEWA AI result comes with a Grad-CAM heatmap overlaid on the DICOM image and SHAP feature attribution values. Clinicians can inspect precisely which regions drove the diagnosis — building trust and enabling faster, more confident decisions.',
    conditions:['Grad-CAM activation maps (pixel-level attribution)','SHAP feature importance (per clinical variable)','Attention rollout for transformer layers','Contrastive explanations (why NOT another class)','Interactive threshold adjustment','PDF export for audit and legal records'],
    metrics:[
      { label:'Localisation accuracy', value:'91.4%' },
      { label:'Radiologist trust score', value:'+47%' },
      { label:'Heatmap render time', value:'<500ms' },
      { label:'Export formats', value:'PNG · DICOM SR · PDF' },
    ],
    pipeline:'AI Result → Grad-CAM backward pass → SHAP TreeExplainer → Heatmap overlay → DICOM viewer render',
  },
];

const ROLES = [
  { role:'Radiologist', icon:'🩻', color:C.info,
    solutions:['AI pre-reads worklist by priority','Grad-CAM shows exactly what AI detected','VLM draft reports cut reporting time by 65%','Uncertainty flags push borderline cases for extra review','Second opinion workflow for complex cases','Voice dictation with medical terminology'],
  },
  { role:'Emergency Physician', icon:'🏥', color:C.critical,
    solutions:['Stroke Code auto-trigger on ICH/LVO detection','Critical alert push to mobile in <3 seconds','Patient-at-risk dashboard with real-time AI feed','NIHSS and tPA window calculations','CT-to-needle time tracking','Escalation pathway integration'],
  },
  { role:'Hospital Admin', icon:'📊', color:C.brand,
    solutions:['Scan volume and turnaround analytics','AI performance monitoring dashboards','Radiologist productivity metrics','Compliance and audit log access','Multi-site and department management','Billing and subscription management'],
  },
  { role:'Patient', icon:'👤', color:C.normal,
    solutions:['Report notifications via app, email, and WhatsApp','Secure report access with medical glossary','Appointment booking and reminders','Consent management and data rights portal','Messaging with care team','PDF download and GP sharing'],
  },
];

export function SolutionsPage({ onNavigate }: { onNavigate:(p:string)=>void }) {
  const [active, setActive] = useState('triage');
  const engine = ENGINES.find(e => e.id === active)!;

  const Tag = ({ label, color }: { label:string; color:string }) => (
    <span style={{ padding:'2px 9px', background:`${color}14`, border:`1px solid ${color}30`, borderRadius:20, fontSize:10, color, fontWeight:600, fontFamily:C.F }}>
      {label}
    </span>
  );

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', fontFamily:C.F }}>
      <style>{`
        @media (max-width: 900px) {
          .engine-detail-grid { grid-template-columns: 1fr !important; }
          .roles-grid { grid-template-columns: 1fr !important; }
          .integrations-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sub-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .integrations-grid { grid-template-columns: 1fr !important; }
          .hero-h1 { fontSize: 36px !important; }
          .hero-btns { flex-direction: column !important; }
          .hero-btns > button { width: 100% !important; }
        }
      `}</style>
      <PublicNav activePage="solutions" onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ padding:'clamp(80px, 15vh, 120px) 24px 70px', background:`linear-gradient(180deg,${C.bg1},${C.bg0})`, textAlign:'center' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <Tag label="Clinical AI Platform" color={C.brand} />
          <h1 className="hero-h1" style={{ fontSize:'clamp(32px, 8vw, 52px)', fontWeight:900, color:C.textHi, margin:'20px 0 18px', letterSpacing:'-0.04em', lineHeight:1.1, fontFamily:C.F }}>
            Five AI engines.<br/>One clinical platform.
          </h1>
          <p style={{ fontSize:15, color:C.textMd, lineHeight:1.8, margin:'0 0 36px' }}>
            SEWA AI is not a single model — it is a layered clinical intelligence pipeline. Each engine is independently validated, explainable, and designed to improve patient outcomes at every step of the diagnostic workflow.
          </p>
          <div className="hero-btns" style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => onNavigate('contact')} style={{ padding:'12px 28px', background:`linear-gradient(135deg,${C.brand},${C.brandDk})`, border:'none', borderRadius:10, color:'white', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:C.F }}>Request Demo →</button>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:'12px 22px', background:'none', border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:14, cursor:'pointer', fontFamily:C.F }}>Clinical Evidence</button>
          </div>
        </div>
      </div>

      {/* Engine explorer */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* Engine tab selector */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:12, marginBottom:40, scrollbarWidth:'none' }}>
          {ENGINES.map(e => (
            <button key={e.id} onClick={() => setActive(e.id)} style={{
              display:'flex', alignItems:'center', gap:8, padding:'10px 18px', whiteSpace:'nowrap',
              borderRadius:10, border:`1px solid ${active===e.id ? `${e.color}50`:C.border}`,
              background:active===e.id?`${e.color}10`:C.bg2, color:active===e.id?e.color:C.textLo,
              fontWeight:active===e.id?700:400, fontSize:13, cursor:'pointer', fontFamily:C.F,
              transition:'all 0.15s',
            }}>
              <span style={{ fontSize:16 }}>{e.icon}</span>{e.label}
            </button>
          ))}
        </div>

        {/* Engine detail panel */}
        <div className="engine-detail-grid" style={{ display:'grid', gridTemplateColumns:'1fr 400px', gap:32, marginBottom:80 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:48, height:48, background:`${engine.color}14`, border:`1px solid ${engine.color}30`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{engine.icon}</div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:engine.color, letterSpacing:'0.08em', textTransform:'uppercase' }}>{engine.label}</div>
                <div style={{ fontSize:9, color:C.textLo, fontFamily:C.FM }}>AI Service :{engine.port}</div>
              </div>
            </div>
            <h2 style={{ fontSize:'clamp(24px, 5vw, 30px)', fontWeight:800, color:C.textHi, margin:'0 0 16px', letterSpacing:'-0.5px', fontFamily:C.F }}>{engine.headline}</h2>
            <p style={{ fontSize:14, color:C.textMd, lineHeight:1.8, margin:'0 0 24px' }}>{engine.description}</p>

            {/* Pipeline and Deep Dive */}
            <div className="sub-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              <div style={{ padding:16, background:C.bg3, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Processing Pipeline</div>
                <div style={{ fontSize:11, color:engine.color, fontFamily:C.FM, lineHeight:1.8 }}>
                  {engine.pipeline.split(' → ').map((step, i, arr) => (
                    <span key={i}>{step}{i < arr.length-1 && <span style={{ color:C.textLo }}> → </span>}</span>
                  ))}
                </div>
              </div>
              <div style={{ padding:16, background:`${engine.color}14`, borderRadius:12, border:`1px solid ${engine.color}40`, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
                <div style={{ fontSize:12, fontWeight:700, color:engine.color, marginBottom:4 }}>Dedicated Engine Page</div>
                <button onClick={() => onNavigate(engine.id === 'triage' ? 'triage-ai' : engine.id === 'uncertainty' ? 'uncertainty-ai' : engine.id === 'metacognition' ? 'metacognition-ai' : engine.id === 'vlm' ? 'vision-language-ai' : 'explainable-ai')} style={{ background:engine.color, border:'none', borderRadius:6, color:'white', fontSize:10, fontWeight:700, padding:'6px 12px', cursor:'pointer' }}>
                  Full Technical Breakdown →
                </button>
              </div>
            </div>

            {/* Conditions / capabilities */}
            <div style={{ fontSize:10, fontWeight:700, color:C.textLo, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
              {engine.id === 'xai' ? 'Capabilities' : engine.id === 'metacognition' ? 'What it catches' : engine.id === 'uncertainty' ? 'Risk factors flagged' : 'Conditions detected'}
            </div>
            <div className="sub-grid-2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {engine.conditions.map(c => (
                <div key={c} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:C.textMd, padding:'4px 0' }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:engine.color, flexShrink:0 }}/>
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* Metrics sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10 }}>
              {engine.metrics.map(m => (
                <div key={m.label} style={{ padding:20, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14 }}>
                  <div style={{ fontSize:22, fontWeight:900, color:engine.color, fontFamily:C.FM }}>{m.value}</div>
                  <div style={{ fontSize:11, color:C.textLo, marginTop:4 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:20, background:`${engine.color}08`, border:`1px solid ${engine.color}20`, borderRadius:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:engine.color, marginBottom:8 }}>Validated on</div>
              <div style={{ fontSize:12, color:C.textMd, lineHeight:1.8 }}>CheXpert (224K) · NIH Chest X-ray · RSNA MICCAI · TCGA Pathology · NHS de-identified dataset · LUTH Nigeria dataset</div>
            </div>
            <button onClick={() => onNavigate('clinical-validation')} style={{ padding:14, background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:12, cursor:'pointer', fontFamily:C.F }}>
              📄 View clinical validation data →
            </button>
          </div>
        </div>

        {/* Roles section */}
        <div style={{ marginBottom:80 }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:34, fontWeight:800, color:C.textHi, margin:'0 0 12px', letterSpacing:'-1px', fontFamily:C.F }}>Built for every role in the care pathway</h2>
            <p style={{ fontSize:14, color:C.textMd, margin:0 }}>SEWA AI adapts its interface, alerts, and workflow to each clinical role.</p>
          </div>
          <div className="roles-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
            {ROLES.map(r => (
              <div key={r.role} style={{ padding:28, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <div style={{ width:44, height:44, background:`${r.color}14`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{r.icon}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.textHi }}>{r.role}</div>
                </div>
                {r.solutions.map(s => (
                  <div key={s} style={{ display:'flex', gap:8, padding:'5px 0', fontSize:12, color:C.textMd, borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:r.color, fontSize:10, flexShrink:0, marginTop:1 }}>✓</span>{s}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Integration section */}
        <div style={{ padding:40, background:C.bg2, border:`1px solid ${C.border}`, borderRadius:20 }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <h2 style={{ fontSize:26, fontWeight:800, color:C.textHi, margin:'0 0 10px', fontFamily:C.F }}>Integrates with your existing stack</h2>
            <p style={{ fontSize:13, color:C.textMd }}>SEWA AI connects to any PACS, EHR, or hospital system via standard clinical protocols.</p>
          </div>
          <div className="integrations-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {[
              { label:'FHIR R4', desc:'Bi-directional patient and scan data', icon:'🏥' },
              { label:'HL7 v2.x', desc:'ORM/ORU message processing', icon:'📡' },
              { label:'DICOM / PACS', desc:'WADO-RS, C-FIND, C-STORE', icon:'🖥️' },
              { label:'NHS Spine', desc:'PDS, ODS, NEMS integration', icon:'🇬🇧' },
              { label:'Epic / Cerner', desc:'SMART on FHIR CDS Hooks', icon:'📋' },
              { label:'Stripe / Paystack', desc:'Multi-currency billing', icon:'💳' },
              { label:'WhatsApp / FCM', desc:'Clinical alert delivery', icon:'🔔' },
              { label:'Azure / AWS / GCP', desc:'Multi-cloud deployment', icon:'☁️' },
            ].map(item => (
              <div key={item.label} style={{ padding:16, background:C.bg3, borderRadius:12, textAlign:'center' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{item.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:11, color:C.textLo, lineHeight:1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}

