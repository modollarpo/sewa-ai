// SEWA XAI — LandingPage.tsx
// Clinical, enterprise public landing page — NHS-ready, global healthcare AI platform
import React, { useState, useEffect } from 'react';
import { ClinicalDemoModal } from '../../components/public/ClinicalDemoModal';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';
import { RemotionPlayerModal } from '../../components/shared/RemotionPlayerModal';
import { ConfidenceIndicator, UncertaintyIndicator } from '../../design-system/components';

type EvidenceStatus = 'validated' | 'engineering' | 'research';

const STATUS_STYLE: Record<EvidenceStatus, { label:string; color:string; bg:string }> = {
  validated:   { label:'Validated',              color:'#1DBF73', bg:'rgba(29,191,115,0.10)' },
  engineering: { label:'Engineering-validated',   color:'#F59E0B', bg:'rgba(245,158,11,0.10)' },
  research:    { label:'Research-stage',          color:'#9CA8A3', bg:'rgba(156,168,163,0.10)' },
};

const FEATURES: { id:string; icon:string; title:string; desc:string; tag:string; status:EvidenceStatus }[] = [
  { id:'triage-ai',        icon:'⚡', title:'ICH Triage & Subtype Engine', desc:'Non-contrast head CT. Study-level AUROC 0.807 (RSNA) and 0.7596 external (CQ500 with test-time AdaBN). Test J confirms 100% sensitivity on acute epidural and intraparenchymal haemorrhages under Split Conformal Risk Control (FNR ≤ 5%).', tag:'Triage Engine', status:'validated' },
  { id:'uncertainty-ai',   icon:'🎯', title:'Dual Epistemic/Aleatoric Safety', desc:'Monte Carlo dropout confidence estimation stress-tested under physical radiation noise and motion blur (Test K). Epistemic uncertainty increases monotonically (Spearman rs = 0.9000), escalating degraded scans to human review.', tag:'Safety', status:'validated' },
  { id:'explainable-ai',   icon:'🔍', title:'Masked HiResCAM Explainability', desc:'Replacing skull bone artifacts with anatomically masked HiResCAM (Test E.2). Achieved 43.83% pointing hit rate against 6,283 radiologist bounding boxes (62.16% on chronic bleeds).', tag:'Explainability', status:'validated' },
  { id:'metacognition-ai', icon:'🧠', title:'Metacognitive Negation Engine', desc:'Layer 6 report contradiction safety gate tested on 7,265 real radiologist reports (Test D). 95.78% contradiction recall, 100.0% specificity across active emergency reports in 1.04ms on standard CPU.', tag:'Safety Gate', status:'validated' },
  { id:'specialized-ai',   icon:'🔬', title:'Production INT8 Multimodal Backbones', desc:'Mammography and Retinal services running real EfficientNet-B0 INT8 quantized convolutional backbones (4.17MB and 4.16MB, Test I, demo_mode: false). PTX, TB, and PE safety pipelines pre-registered (Tests L–N).', tag:'Multimodal AI', status:'engineering' },
  { id:'prospective-pilot', icon:'🏥', title:'SEWA-SHADOW-1 Prospective Study', desc:'IRB/REC-ready protocol (v2.0) for 1,200-patient prospective shadow-mode evaluation across West Midlands acute NHS trusts. 4-step deployment pathway (Caldicott, DCB0129/0160, HIWM, Edge Gateway) complete.', tag:'Clinical Pilot', status:'validated' },
];

const ARCHITECTURE_NOTES = [
  { icon:'🔗', title:'Federated Learning & Continuous Learning', note:'Microservices implemented with differential privacy; no clinical multi-site outcomes measured.' },
  { icon:'🌍', title:'Sovereign Multi-Region Infrastructure', note:'Containerised for Azure AKS (UK South, EU, US, Africa); zero PHI egress architecture.' },
];

const STATS = [
  { value:'0.7596', label:'External CQ500 AUROC (Zero-Label AdaBN)', icon:'🎯' },
  { value:'FNR ≤ 5%', label:'Split Conformal Risk Bound (λ=0.0298)', icon:'🛡️' },
  { value:'100.0%', label:'Epidural & IPH Sensitivity (Test J)',     icon:'⚡' },
  { value:'rs = 0.90', label:'Noise Uncertainty Monotonicity (Test K)', icon:'🔬' },
  { value:'1.04ms', label:'Sub-1.5s CPU Execution (No GPU Barrier)', icon:'⏱️' },
  { value:'1,200',  label:'Scans in SEWA-SHADOW-1 NHS Protocol',     icon:'🏥' },
];

const COMPLIANCE = [
  { label:'NHS Innovation', flag:'🇬🇧', desc:'INN-2604-0064-2' },
  { label:'DCB0129', flag:'🇬🇧', desc:'Aligned / in preparation' },
  { label:'Patent Pending', flag:'🔬', desc:'GB2609706.3' },
  { label:'TRL 5', flag:'📈', desc:'Pre-clinical R&D' },
  { label:'GDPR & HIPAA', flag:'🔒', desc:'Privacy controls (GDPR-aligned)' },
];

export function LandingPage({ onLogin, onNavigate }: { onLogin:()=>void, onNavigate:(p:string)=>void }) {
  const [demoEmail, setDemoEmail] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showPlatformTour, setShowPlatformTour] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener('scroll', h);
    return () => {
      window.removeEventListener('scroll', h);
    };
  }, []);

  return (
    <div className="bg-[#05100D] text-[#D0ECE6] font-sans selection:bg-[#408D7B] selection:text-white overflow-x-hidden">
      
      <PublicNav activePage="landing" onNavigate={onNavigate} />

      {/* Hero Section */}
      <main id="main-content" className="relative min-h-[95vh] flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden">
        
        {/* Immersive Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#408D7B]/10 rounded-full blur-[160px] opacity-50" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#408D7B 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
        </div>

        {/* Pre-clinical status badge */}
        <div className="relative z-10 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#08160F] border border-[#1B3028] mb-8 animate-fade-in shadow-2xl">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#408D7B] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#408D7B]"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#408D7B]">
            Pre-clinical • TRL 5 • Research use only
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 text-center max-w-5xl mx-auto space-y-6">
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-black leading-[1.05] tracking-tight animate-slide-up">
            From Hours to Seconds:<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#408D7B] via-[#52B09A] to-[#408D7B] bg-[length:200%_auto] animate-gradient">
              Diagnostic Intelligence
            </span>
            {' '}by Design.
          </h1>
          <p className="text-[clamp(1rem,2vw,1.25rem)] text-[#6FA898] max-w-2xl mx-auto leading-relaxed font-medium animate-slide-up [animation-delay:200ms]">
            A research-stage clinical intelligence platform designed to support clinicians through explainable, uncertainty-aware AI for diagnostic imaging.
          </p>
        </div>

        {/* CTAs */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 mt-12 w-full sm:w-auto px-4 sm:px-0 animate-slide-up [animation-delay:400ms]">
          <button 
            onClick={onLogin}
            className="group w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#408D7B] hover:bg-[#52B09A] text-white text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-[#408D7B]/20 active:scale-95 flex items-center justify-center gap-3"
          >
            Enter Platform
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button 
            onClick={() => onNavigate('onboarding-specialist')}
            className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-[#0C1D17] border border-[#1B3028] hover:border-[#408D7B] text-[#D0ECE6] text-sm font-black uppercase tracking-[0.2em] transition-all active:scale-95"
          >
            Join Network
          </button>
          <button 
            onClick={() => setShowDemo(true)}
            className="flex items-center justify-center gap-3 px-6 py-4 text-[#3A6055] hover:text-[#D0ECE6] transition-colors text-xs font-black uppercase tracking-widest w-full sm:w-auto"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#111F1A] border border-[#1B3028]">▶</span>
            Watch Clinical Demo
          </button>
        </div>

        {showPlatformTour && (
          <RemotionPlayerModal
            isOpen={showPlatformTour}
            onClose={() => setShowPlatformTour(false)}
            composition="PlatformIntro"
            title="SEWA XAI Platform Overview"
          />
        )}

        {/* Hero Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-20 mt-24 animate-fade-in [animation-delay:600ms]">
          {STATS.map(s => (
            <div key={s.label} className="text-center group">
              <div className="text-3xl md:text-4xl font-black font-mono text-[#408D7B] mb-2 group-hover:scale-110 transition-transform">
                {s.value}
              </div>
              <div className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest leading-relaxed">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-center text-[10px] text-[#3A6055] max-w-2xl mx-auto mt-8 uppercase tracking-widest">
          Study-level ICH triage results on public datasets. Feasibility on public data — not clinical evidence.
        </p>
      </main>

      {/* Compliance Ribbon */}
      <section className="relative z-20 py-12 bg-[#08160F] border-y border-[#1B3028] overflow-hidden group/compliance">
        <div className="flex animate-scroll whitespace-nowrap gap-12 items-center hover:[animation-play-state:paused] cursor-grab active:cursor-grabbing w-max">
          {[...COMPLIANCE, ...COMPLIANCE].map((c, i) => (
            <div key={i} className="flex items-center gap-4 px-8 py-3 rounded-2xl bg-[#0C1D17] border border-[#1B3028] text-[12px] font-black text-[#6FA898] uppercase tracking-widest shadow-sm hover:border-[#408D7B]/40 transition-all hover:scale-105">
              <span className="text-2xl">{c.flag}</span>
              <span className="text-[#D0ECE6]">{c.label}</span>
              <span className="text-[#3A6055] font-bold"> • {c.desc}</span>
            </div>
          ))}
        </div>
        {/* Soft edge masking for smooth transition */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#08160F] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#08160F] to-transparent z-10 pointer-events-none" />
      </section>

      {/* Feature Grid */}
      <section className="relative py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-20">
          <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.4em]">Proprietary Stack</div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#D0ECE6]">Institutional-Grade Intelligence</h2>
          <p className="text-[#6FA898] max-w-xl mx-auto font-medium">Designed to support the next generation of digital radiology workflows, with evidence status shown for every capability.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => {
            const st = STATUS_STYLE[f.status];
            return (
              <div
                key={f.id}
                onClick={() => onNavigate(f.id)}
                className="group p-8 bg-[#0C1D17] border border-[#1B3028] rounded-[2rem] hover:border-[#408D7B]/40 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 p-8 text-7xl opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all">
                  {f.icon}
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="inline-flex px-3 py-1 rounded-full bg-[#408D7B]/10 border border-[#408D7B]/20 text-[#408D7B] text-[9px] font-black uppercase tracking-widest w-fit">
                    {f.tag}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}40` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
                    {st.label}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#D0ECE6] mb-4 group-hover:text-[#408D7B] transition-colors">{f.title}</h3>
                <p className="text-sm text-[#6FA898] leading-relaxed font-medium flex-1">{f.desc}</p>
                <div className="mt-8 flex items-center gap-2 text-[#408D7B] text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  Explore Technology <span>→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Microservices & Infrastructure Implementation Status */}
        <div className="mt-20">
          <div className="text-center space-y-3 mb-10">
            <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.4em]">Architecture Implementation</div>
            <h3 className="text-2xl md:text-3xl font-black text-[#D0ECE6]">Implemented microservices &amp; infrastructure</h3>
            <p className="text-[#6FA898] max-w-xl mx-auto text-sm font-medium">All microservices are implemented in code; clinical outcomes and multi-site deployments are unmeasured / pre-clinical (TRL 5).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {ARCHITECTURE_NOTES.map(r => (
              <div key={r.title} className="p-6 bg-[#0C1D17]/50 border border-[#1B3028] rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl opacity-70">{r.icon}</span>
                  <span className="px-2 py-0.5 rounded-full border border-[#408D7B]/40 bg-[#408D7B]/10 text-[8px] font-black uppercase tracking-widest text-[#408D7B]">Implemented Code</span>
                </div>
                <div className="text-sm font-bold text-[#D0ECE6] mb-1">{r.title}</div>
                <div className="text-[11px] text-[#6FA898]">{r.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Explainability Section */}
      <section className="relative py-32 bg-[#05100D] border-y border-[#1B3028]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.4em] mb-4">Clinical Governance</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#D0ECE6] mb-8">Designed for clinical scrutiny.</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="text-3xl">🔍</div>
                  <div>
                    <h3 className="text-[#D0ECE6] font-bold text-lg">Explainability by default</h3>
                    <p className="text-[#6FA898] text-sm leading-relaxed">Grad-CAM heatmaps visualise the regions influencing a model output, so reviewers can inspect whether the model's attention aligns with expected anatomy. Engineering-validated; clinical utility not yet measured.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-3xl">⚖️</div>
                  <div>
                    <h3 className="text-[#D0ECE6] font-bold text-lg">Uncertainty Quantification</h3>
                    <p className="text-[#6FA898] text-sm leading-relaxed">Using Monte Carlo dropout, the system estimates when a case is uncertain. Borderline or out-of-distribution cases can be flagged for human review; the clinical benefit of this gating has not yet been demonstrated.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-3xl">🩺</div>
                  <div>
                    <h3 className="text-[#D0ECE6] font-bold text-lg">Human-in-the-Loop Workflow</h3>
                    <p className="text-[#6FA898] text-sm leading-relaxed">AI is designed as a triage assistant, never an autonomous decision maker. A qualified radiologist is required to sign off on the final diagnostic report.</p>
                  </div>
                </div>
              </div>
            </div>
<div className="lg:w-1/2 bg-[#08160F] p-8 rounded-[2rem] border border-[#1B3028] shadow-2xl">
                <div className="aspect-video bg-[#0C1D17] rounded-xl border border-[#1B3028] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                  <svg viewBox="0 0 600 340" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="8" />
                      </filter>
                      <radialGradient id="heatmapCore" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FF0000" stopOpacity="0.9" />
                        <stop offset="30%" stopColor="#FF4000" stopOpacity="0.7" />
                        <stop offset="60%" stopColor="#FFD700" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="brainBase" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0A1A14" />
                        <stop offset="50%" stopColor="#0C1D17" />
                        <stop offset="100%" stopColor="#08160F" />
                      </linearGradient>
                    </defs>
                    
                    {/* Base brain MRI silhouette */}
                    <ellipse cx="300" cy="170" rx="220" ry="140" fill="url(#brainBase)" stroke="#1B3028" strokeWidth="3" filter="url(#blur)" />
                    <ellipse cx="300" cy="170" rx="210" ry="130" fill="none" stroke="#1B3028" strokeWidth="1.5" opacity="0.6" />
                    
                    {/* Ventricle / sulci hints */}
                    <ellipse cx="260" cy="140" rx="35" ry="25" fill="none" stroke="#1B3028" strokeWidth="1" opacity="0.4" />
                    <ellipse cx="340" cy="140" rx="35" ry="25" fill="none" stroke="#1B3028" strokeWidth="1" opacity="0.4" />
                    <path d="M220 180 Q250 160 280 170" fill="none" stroke="#1B3028" strokeWidth="1" opacity="0.3" />
                    <path d="M320 170 Q350 160 380 170" fill="none" stroke="#1B3028" strokeWidth="1" opacity="0.3" />
                    
                    {/* Grad-CAM Heatmap Overlay - right frontal region */}
                    <ellipse cx="360" cy="130" rx="55" ry="45" fill="url(#heatmapCore)" filter="url(#blur)" opacity="0.85" />
                    <ellipse cx="360" cy="130" rx="65" ry="55" fill="url(#heatmapCore)" filter="url(#blur)" opacity="0.4" />
                    <ellipse cx="360" cy="130" rx="80" ry="70" fill="url(#heatmapCore)" filter="url(#blur)" opacity="0.15" />
                    
                    {/* Secondary attention region */}
                    <ellipse cx="220" cy="200" rx="25" ry="20" fill="url(#heatmapCore)" filter="url(#blur)" opacity="0.3" />
                    
                    {/* Attention indicator lines */}
                    <line x1="360" y1="50" x2="360" y2="80" stroke="#FF4000" strokeWidth="2" strokeDasharray="8,4" opacity="0.8" />
                    <text x="360" y="40" textAnchor="middle" fill="#FFD700" fontSize="11" fontWeight="bold" fontFamily="monospace">HIGHEST ATTENTION</text>
                    
                    <line x1="220" y1="280" x2="220" y2="310" stroke="#FFD700" strokeWidth="1.5" strokeDasharray="6,6" opacity="0.6" />
                    <text x="220" y="320" textAnchor="middle" fill="#FFD700" fontSize="9" fontWeight="600" fontFamily="monospace" opacity="0.7">SECONDARY</text>
                    
                    {/* Color legend */}
                    <g transform="translate(40, 240)">
                      <rect x="0" y="0" width="140" height="60" rx="6" fill="#08160F" stroke="#1B3028" strokeWidth="1" opacity="0.95" />
                      <text x="70" y="14" textAnchor="middle" fill="#D0ECE6" fontSize="10" fontWeight="bold" fontFamily="monospace">ATTENTION MAP</text>
<linearGradient id="legendGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                          <stop offset="20%" stopColor="#FFD700" stopOpacity="0.3" />
                          <stop offset="50%" stopColor="#FF4000" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#FF0000" stopOpacity="0.9" />
                      </linearGradient>
                      <rect x="20" y="20" width="12" height="30" fill="url(#legendGrad)" />
                      <text x="10" y="55" textAnchor="middle" fill="#6FA898" fontSize="7" fontFamily="monospace">LOW</text>
                      <text x="36" y="55" textAnchor="middle" fill="#FFD700" fontSize="7" fontWeight="bold" fontFamily="monospace">HIGH</text>
                    </g>
                    
                    {/* SHAP feature bars - bottom right */}
                    <g transform="translate(420, 200)">
                      <rect x="0" y="0" width="140" height="110" rx="6" fill="#08160F" stroke="#1B3028" strokeWidth="1" opacity="0.9" />
                      <text x="70" y="16" textAnchor="middle" fill="#408D7B" fontSize="9" fontWeight="bold" fontFamily="monospace">SHAP VALUES</text>
                      <g fontSize="8" fontFamily="monospace" fill="#6FA898">
                        <text x="10" y="34">Texture variance ████████████ 0.31</text>
                        <text x="10" y="48">Edge density    ██████████   0.27</text>
                        <text x="10" y="62">Intensity skew  ████████     0.22</text>
                        <text x="10" y="76">Symmetry dev.   ██████       0.18</text>
                        <text x="10" y="90">Ventricle size  ████         0.14</text>
                      </g>
                      <text x="130" y="100" textAnchor="end" fill="#408D7B" fontSize="7" fontFamily="monospace">Σ = 1.12</text>
                    </g>
                  </svg>
                </div>
                 <div className="mt-6 flex flex-col gap-3 px-4">
                   <div className="flex items-center gap-4">
                     <ConfidenceIndicator value={0.974} size="sm" />
                     <UncertaintyIndicator value={0.98} showLabel={true} />
                   </div>
                   <p className="text-[10px] text-[#3A6055]">Illustrative visualisation — not a measured clinical case.</p>
                 </div>
             </div>
          </div>
        </div>
      </section>

      {/* Regulatory Journey Section */}
      <section className="relative py-32 bg-[#05100D] border-y border-[#1B3028]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.4em] mb-4">Regulatory Pathway</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#D0ECE6] mb-6">Clearing the Path for<br/>Clinical AI Adoption</h2>
            <p className="text-[#6FA898] max-w-2xl mx-auto font-medium">A structured regulatory journey from innovation to validated clinical deployment, aligned with global health authority requirements.</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#408D7B] via-[#1B3028] to-transparent hidden md:block" />
            
            <div className="space-y-12 md:space-y-0">
              {[
                { phase:'Phase 1', title:'Innovation & Clinical Safety', status:'Completed', statusColor:'#1DBF73',
                  items:['DCB0129 Clinical Safety Case Report & Hazard Log (HAZ-001 to 007)', 'DPIA & Model Data Sharing Agreement drafted (UK GDPR Art 6/9)', 'NHS Innovation Service registered (INN-2604-0064-2)', 'Patent Application GB2609706.3 filed'],
                  side:'left' },
                { phase:'Phase 2', title:'Technical Validation (Tests A–O)', status:'Validated (TRL 6)', statusColor:'#408D7B',
                  items:['15 Pre-registered empirical feasibility tests (Tests A–O)', 'CQ500 Zero-Label AdaBN AUROC 0.7596 (ADR 004)', 'Test J ICH Subtypes: 100% Epidural & IPH sensitivity', 'Test K Physics Noise & Motion Monotonicity (rs=0.90)'],
                  side:'right' },
                { phase:'Phase 3', title:'Prospective NHS Shadow-Mode', status:'Ready for Deployment', statusColor:'#2A6EF2',
                  items:['SEWA-SHADOW-1 Protocol v2.0 frozen (1,200 head CTs)', '4-Step NHS Deployment Pathway Playbook complete', '3-Consultant Neuroradiology Adjudication Panel SOP', 'NICE Evidence Standards Framework (ESF) Tier C mapped'],
                  side:'left' },
                { phase:'Phase 4', title:'Adoption & Commercialisation', status:'In Progress', statusColor:'#F59E0B',
                  items:['Health Innovation West Midlands (HIWM) partnership', 'SBRI Healthcare Phase 1 (£100k) application blueprint', 'Edge Gateway DICOM C-STORE SCP appliance containerised', 'G-Cloud 14 & NHS Shared Services onboarding'],
                  side:'right' },
              ].map((item, i) => (
                <div key={i} className={`relative flex flex-col md:flex-row items-center gap-8 md:gap-16 ${item.side === 'right' ? 'md:flex-row-reverse' : ''} mb-16`}>
                  {/* Timeline dot */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-[#05100D] z-10 hidden md:block" style={{ background:item.statusColor }} />
                  
                  {/* Content */}
                  <div className={`md:w-1/2 ${item.side === 'right' ? 'md:text-right' : ''}`}>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color:item.statusColor }}>{item.phase}</div>
                    <h3 className="text-2xl font-black text-[#D0ECE6] mb-3">{item.title}</h3>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4" style={{ borderColor:`${item.statusColor}40`, background:`${item.statusColor}10` }}>
                      <span className="w-2 h-2 rounded-full" style={{ background:item.statusColor }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:item.statusColor }}>{item.status}</span>
                    </div>
                    <div className="space-y-2">
                      {item.items.map((itm, j) => (
                        <div key={j} className={`flex items-center gap-3 text-sm text-[#6FA898] ${item.side === 'right' ? 'md:justify-end' : ''}`}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:`${item.statusColor}60` }} />
                          {itm}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Spacer for other side */}
                  <div className="hidden md:block md:w-1/2" />
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory Certifications */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon:'🏥', label:'NHS Innovation Service', desc:'INN-2604-0064-2' },
              { icon:'🛡️', label:'DCB0129', desc:'Aligned / in preparation' },
              { icon:'📋', label:'IEC 62304', desc:'Aligned / in preparation' },
              { icon:'🔒', label:'ISO 14971', desc:'Aligned / in preparation' },
            ].map(c => (
              <div key={c.label} className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-2xl text-center group hover:border-[#408D7B]/30 transition-all">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{c.icon}</div>
                <div className="text-xs font-black text-[#D0ECE6] uppercase tracking-tight">{c.label}</div>
                <div className="text-[9px] text-[#3A6055] mt-1">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Map Section */}
      <section className="relative py-32 bg-[#08160F] border-y border-[#1B3028]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/3 space-y-6">
              <h2 className="text-4xl font-black text-[#D0ECE6] tracking-tight">Planned Global<br/><span className="text-[#408D7B]">Residency.</span></h2>
              <p className="text-[#6FA898] font-medium leading-relaxed">
                The architecture is planned for 7+ sovereign cloud regions, with the aim of supporting local health data regulations including NHS, HIPAA, and GDPR. No live deployments, throughput, or customers are implied.
              </p>
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0C1D17] border border-[#1B3028] flex items-center justify-center text-xl">🛡️</div>
                  <div>
                    <div className="text-xs font-black text-[#D0ECE6] uppercase tracking-widest">Planned Controls</div>
                    <div className="text-[10px] text-[#3A6055] font-medium">AES-256 + TLS 1.3 (target)</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {[
                { flag:'🇬🇧', r:'UK South', p:'GBP' },
                { flag:'🇪🇺', r:'EU West', p:'EUR' },
                { flag:'🇺🇸', r:'US East', p:'USD' },
                { flag:'🇰🇪', r:'Africa North', p:'KES' },
                { flag:'🇿🇦', r:'Africa South', p:'ZAR' },
                { flag:'🇳🇬', r:'Africa West', p:'NGN' },
                { flag:'🇬🇭', r:'Africa West 2', p:'GHS' },
                { flag:'🇮🇳', r:'Central India', p:'INR' },
              ].map(r => (
                <div key={r.r} className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-2xl group hover:border-[#408D7B]/30 transition-all">
                  <div className="text-2xl mb-4 group-hover:scale-110 transition-transform">{r.flag}</div>
                  <div className="text-[11px] font-black text-[#D0ECE6] uppercase tracking-tight truncate">{r.r}</div>
                  <div className="text-[9px] font-bold text-[#3A6055] mt-1">{r.p} • PLANNED REGION</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Section */}
      <section className="relative py-32 overflow-hidden px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-[#0C1D17] to-[#08160F] border border-[#1B3028] rounded-[3rem] p-12 md:p-20 text-center relative">
          <div className="absolute top-0 right-0 p-20 opacity-5 text-9xl">⚡</div>
          <h2 className="text-3xl md:text-4xl font-black text-[#D0ECE6] mb-6">Join the Clinical Validation Network</h2>
          <p className="text-[#6FA898] text-lg font-medium mb-10 max-w-xl mx-auto">
            Partner with SEWA on our pre-clinical R&amp;D phase. No clinical deployment is offered or implied.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <input 
              type="email" 
              value={demoEmail}
              onChange={e=>setDemoEmail(e.target.value)}
              placeholder="Institutional Email"
              className="w-full sm:w-80 px-6 py-4 rounded-2xl bg-[#05100D] border border-[#1B3028] text-sm text-[#D0ECE6] outline-none focus:border-[#408D7B] transition-all"
            />
            <button className="w-full sm:w-fit px-10 py-4 rounded-2xl bg-[#408D7B] text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-[#408D7B]/20">
              Request Access
            </button>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <div className="h-px w-16 bg-[#1B3028] hidden sm:block" />
            <span className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest">or</span>
            <div className="h-px w-16 bg-[#1B3028] hidden sm:block" />
          </div>
          <button 
            onClick={() => setShowDemo(true)}
            className="mt-6 px-12 py-5 rounded-2xl border-2 border-[#408D7B] text-[#408D7B] hover:bg-[#408D7B] hover:text-white text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95"
          >
            Book a Live Demo
          </button>
        </div>
      </section>

      <PublicFooter onNavigate={onNavigate} />

      {/* Scroll to Top */}
      {scrolled && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-10 right-10 z-[100] w-14 h-14 rounded-full bg-[#0C1D17]/80 backdrop-blur-xl border border-[#1B3028] text-[#408D7B] flex items-center justify-center shadow-2xl hover:scale-110 transition-all animate-fade-in"
        >
          ↑
        </button>
      )}

      {showDemo && <ClinicalDemoModal onClose={() => setShowDemo(false)} />}
    </div>
  );
}
