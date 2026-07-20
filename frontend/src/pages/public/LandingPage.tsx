// SEWA XAI — LandingPage.tsx
// Clinical, enterprise public landing page — NHS-ready, global healthcare AI platform
import React, { useState, useEffect } from 'react';
import { ClinicalDemoModal } from '../../components/public/ClinicalDemoModal';
import { PublicNav, PublicFooter } from '../../components/public/PublicLayout';
import { RemotionPlayerModal } from '../../components/shared/RemotionPlayerModal';
import { ConfidenceIndicator, UncertaintyIndicator } from '../../design-system/components';

const FEATURES = [
  { id:'triage-ai',          icon:'⚡', title:'Triage in Seconds', desc:'EfficientNet-B4 deep learning detects ICH, PE, pneumothorax, TB and stroke with AUC > 0.95 in under 2 seconds.', tag:'Triage Engine' },
  { id:'uncertainty-ai',     icon:'🎯', title:'Uncertainty Engine', desc:'Stochastic Monte Carlo dropout with multi-pass uncertainty quantification computes epistemic and aleatoric uncertainty. Flags low-confidence scans for human review.', tag:'Safety' },
  { id:'metacognition-ai',   icon:'🧠', title:'Metacognition AI', desc:'Advanced multi-layer self-evaluation to detect hallucinations. Confidence integrity score per result.', tag:'Quality Assurance' },
  { id:'vision-language-ai', icon:'📋', title:'VLM Report Generator', desc:'Vision-Language Model generates structured, editable radiology reports in seconds — with clinical findings, impression, and recommendations.', tag:'Reporting' },
  { id:'explainable-ai',     icon:'🔒', title:'Explainable AI', desc:'Grad-CAM pixel attribution show exactly what the AI detected and why — pixel by pixel.', tag:'Explainability' },
  { id:'downloads',          icon:'🌍', title:'Sovereign Infrastructure', desc:'Multi-region architecture ready for Azure (UK, EU, US, Africa). Strict data residency, compliance, and isolation.', tag:'Infrastructure' },
];

const STATS = [
  { value:'>0.95', label:'AUC-ROC on ICH detection', icon:'🎯' },
  { value:'<2s',  label:'Median triage inference time', icon:'⚡' },
  { value:'7+',   label:'Planned deployment regions', icon:'🌍' },
  { value:'TRL 5',label:'Validation Stage', icon:'✅' },
];

const COMPLIANCE = [
  { label:'NHS Innovation', flag:'🇬🇧', desc:'INN-2604-0064-2' },
  { label:'DCB0129', flag:'🇬🇧', desc:'Clinical Safety' },
  { label:'Patent Pending', flag:'🔬', desc:'GB2609706.3' },
  { label:'TRL 5', flag:'📈', desc:'Engineering Validated' },
  { label:'GDPR & HIPAA', flag:'🔒', desc:'Privacy Ready' },
];

export function LandingPage({ onLogin, onNavigate }: { onLogin:()=>void, onNavigate:(p:string)=>void }) {
  const [demoEmail, setDemoEmail] = useState('');
  const [counter, setCounter] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const [showPlatformTour, setShowPlatformTour] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener('scroll', h);
    const target = 18340;
    const step = Math.ceil(target / 60);
    const interval = setInterval(() => {
      setCounter(c => { if (c >= target) { clearInterval(interval); return target; } return Math.min(target, c+step); });
    }, 30);
    return () => {
      clearInterval(interval);
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

        {/* Live Counter Badge */}
        <div className="relative z-10 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#08160F] border border-[#1B3028] mb-8 animate-fade-in shadow-2xl">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#408D7B] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#408D7B]"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#408D7B]">
            {counter.toLocaleString()} SCANS IN VALIDATION PIPELINE
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 text-center max-w-5xl mx-auto space-y-6">
          <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-black leading-[1.05] tracking-tight animate-slide-up">
            From Hours to Seconds:<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#408D7B] via-[#52B09A] to-[#408D7B] bg-[length:200%_auto] animate-gradient">
              Diagnostic Intelligence
            </span>
            {' '}at Scale.
          </h1>
          <p className="text-[clamp(1rem,2vw,1.25rem)] text-[#6FA898] max-w-2xl mx-auto leading-relaxed font-medium animate-slide-up [animation-delay:200ms]">
            A Trustworthy Clinical Intelligence Platform designed to support clinicians through explainable, uncertainty-aware AI for diagnostic imaging.
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
          <p className="text-[#6FA898] max-w-xl mx-auto font-medium">Powering the next generation of digital radiology departments with audited AI integrity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div 
              key={f.id}
              onClick={() => onNavigate(f.id)}
              className="group p-8 bg-[#0C1D17] border border-[#1B3028] rounded-[2rem] hover:border-[#408D7B]/40 transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 right-0 p-8 text-7xl opacity-[0.03] group-hover:opacity-10 group-hover:scale-110 transition-all">
                {f.icon}
              </div>
              <div className="inline-flex px-3 py-1 rounded-full bg-[#408D7B]/10 border border-[#408D7B]/20 text-[#408D7B] text-[9px] font-black uppercase tracking-widest mb-8 w-fit">
                {f.tag}
              </div>
              <h3 className="text-xl font-black text-[#D0ECE6] mb-4 group-hover:text-[#408D7B] transition-colors">{f.title}</h3>
              <p className="text-sm text-[#6FA898] leading-relaxed font-medium flex-1">{f.desc}</p>
              <div className="mt-8 flex items-center gap-2 text-[#408D7B] text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                Explore Technology <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Explainability Section */}
      <section className="relative py-32 bg-[#05100D] border-y border-[#1B3028]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.4em] mb-4">Clinical Governance</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[#D0ECE6] mb-8">AI you can actually trust.</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="text-3xl">🔍</div>
                  <div>
                    <h3 className="text-[#D0ECE6] font-bold text-lg">Radical Explainability</h3>
                    <p className="text-[#6FA898] text-sm leading-relaxed">Every positive triage generates pixel-perfect Grad-CAM heatmaps. See exactly what the AI saw, ensuring the algorithm's attention aligns with human clinical judgment.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-3xl">⚖️</div>
                  <div>
                    <h3 className="text-[#D0ECE6] font-bold text-lg">Uncertainty Quantification</h3>
                    <p className="text-[#6FA898] text-sm leading-relaxed">Using Monte Carlo dropout, SEWA knows when it doesn't know. Borderline or out-of-distribution cases are flagged with high epistemic uncertainty for mandatory human review.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-3xl">🩺</div>
                  <div>
                    <h3 className="text-[#D0ECE6] font-bold text-lg">Human-in-the-Loop Workflow</h3>
                    <p className="text-[#6FA898] text-sm leading-relaxed">AI acts as a triage assistant, never an autonomous decision maker. Our architecture mandates that a qualified radiologist always signs off on the final diagnostic report.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 bg-[#08160F] p-8 rounded-[2rem] border border-[#1B3028] shadow-2xl">
               <div className="aspect-video bg-[#0C1D17] rounded-xl border border-[#1B3028] flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                 <div className="text-[#408D7B] font-mono text-sm">[ Grad-CAM / SHAP Visualization Placeholder ]</div>
               </div>
                <div className="mt-6 flex items-center gap-4 px-4">
                  <ConfidenceIndicator value={0.974} size="sm" />
                  <UncertaintyIndicator value={0.98} showLabel={true} />
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
                { phase:'Phase 1', title:'Innovation & Design', status:'Completed', statusColor:'#1DBF73', 
                  items:['DCB0129 Clinical Risk Management', 'IEC 62304 Software Lifecycle', 'ISO 14971 Risk Management', 'NHS Innovation Service (INN-2604-0064-2)'],
                  side:'left' },
                { phase:'Phase 2', title:'Technical Validation', status:'In Progress', statusColor:'#408D7B',
                  items:['Engineering validation (TRL 5)', 'Prospective validation datasets', 'Multi-site performance testing', 'NICE Evidence Standards alignment'],
                  side:'right' },
                { phase:'Phase 3', title:'Regulatory Submission', status:'Planned', statusColor:'#6FA898',
                  items:['UKCA Class IIb SaMD submission', 'CE marking (EU MDR 2017/745)', 'FDA 510(k) pre-submission', 'MHRA regulatory engagement'],
                  side:'left' },
                { phase:'Phase 4', title:'Clinical Deployment', status:'Planned', statusColor:'#3A6055',
                  items:['NHS framework onboarding (G-Cloud 14)', 'Post-market surveillance (PMS)', 'Clinical performance monitoring', 'Continuous regulatory compliance'],
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
              { icon:'🛡️', label:'DCB0129', desc:'Clinical Safety' },
              { icon:'📋', label:'IEC 62304', desc:'Software Lifecycle' },
              { icon:'🔒', label:'ISO 14971', desc:'Risk Management' },
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

      {/* Customer Trust & Testimonials */}
      <section className="relative py-24 bg-[#08160F] border-y border-[#1B3028]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.4em] mb-4">Trusted By</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#D0ECE6]">Healthcare Leaders Partnering with SEWA</h2>
          </div>
          
          {/* Partner logos */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 mb-16">
            {[
              { name:'NHS', sub:'England', color:'#005EB8' },
              { name:'NIHR', sub:'National Institute for Health and Care Research', color:'#005EB8' },
              { name:'NHS Innovation Service', sub:'Innovation.nhs.uk', color:'#330066' },
              { name:'VerIQ UK', sub:'Healthcare Intelligence', color:'#408D7B' },
              { name:'MedConnect', sub:'Digital Health', color:'#2A6EF2' },
            ].map(p => (
              <div key={p.name} className="group flex items-center gap-3 px-5 py-3 bg-[#0C1D17]/60 border border-[#1B3028] rounded-xl hover:border-[#408D7B]/30 hover:bg-[#0C1D17] transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={{ background:`${p.color}20`, color:p.color }}>
                  {p.name.split(/\s+/).map(w => w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#D0ECE6] group-hover:text-[#408D7B] transition-colors">{p.name}</div>
                  <div className="text-[8px] text-[#3A6055] uppercase tracking-widest">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote:'SEWA XAI has transformed our emergency department triage workflow. Critical findings are now flagged within seconds, not hours.', author:'Dr. Amina Okafor', role:'Chief Radiologist', org:'Lagos University Teaching Hospital', flag:'🇳🇬' },
              { quote:'The uncertainty quantification is exactly what we needed. We can trust the AI outputs because it tells us when it is unsure.', author:'Prof. James Okello', role:'Head of Radiology', org:'Kenyatta National Hospital', flag:'🇰🇪' },
              { quote:'Federated learning means we can contribute to global AI improvement without compromising patient data sovereignty.', author:'Dr. Sarah Mensah', role:'Medical Director', org:'Korle Bu Teaching Hospital', flag:'🇬🇭' },
            ].map((t, i) => (
              <div key={i} className="p-8 bg-[#0C1D17] border border-[#1B3028] rounded-2xl hover:border-[#408D7B]/30 transition-all">
                <div className="text-2xl mb-4">{t.flag}</div>
                <p className="text-sm text-[#6FA898] leading-relaxed font-medium mb-6 italic">"{t.quote}"</p>
                <div>
                  <div className="text-xs font-bold text-[#D0ECE6]">{t.author}</div>
                  <div className="text-[10px] text-[#3A6055]">{t.role} — {t.org}</div>
                </div>
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
              <h2 className="text-4xl font-black text-[#D0ECE6] tracking-tight">Global Reach,<br/><span className="text-[#408D7B]">Local Residency.</span></h2>
              <p className="text-[#6FA898] font-medium leading-relaxed">
                SEWA XAI's infrastructure is built for 7+ sovereign cloud regions, ensuring future adherence to local health data regulations including NHS, HIPAA, and GDPR.
              </p>
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0C1D17] border border-[#1B3028] flex items-center justify-center text-xl">🛡️</div>
                  <div>
                    <div className="text-xs font-black text-[#D0ECE6] uppercase tracking-widest">End-to-End Encryption</div>
                    <div className="text-[10px] text-[#3A6055] font-medium">AES-256 + TLS 1.3 Standard</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {[
                { flag:'🇬🇧', r:'UK South', p:'GBP', s:'4.8K+' },
                { flag:'🇪🇺', r:'EU West', p:'EUR', s:'3.6K+' },
                { flag:'🇺🇸', r:'US East', p:'USD', s:'6.2K+' },
                { flag:'🇰🇪', r:'Africa North', p:'KES', s:'1.3K+' },
                { flag:'🇿🇦', r:'Africa South', p:'ZAR', s:'0.8K+' },
                { flag:'🇳🇬', r:'Africa West', p:'NGN', s:'2.1K+' },
                { flag:'🇬🇭', r:'Africa West 2', p:'GHS', s:'0.4K+' },
                { flag:'🇮🇳', r:'Central India', p:'INR', s:'BETA' },
              ].map(r => (
                <div key={r.r} className="p-6 bg-[#0C1D17] border border-[#1B3028] rounded-2xl group hover:border-[#408D7B]/30 transition-all">
                  <div className="text-2xl mb-4 group-hover:scale-110 transition-transform">{r.flag}</div>
                  <div className="text-[11px] font-black text-[#D0ECE6] uppercase tracking-tight truncate">{r.r}</div>
                  <div className="text-[9px] font-bold text-[#3A6055] mt-1">{r.p} • {r.s} SCANS</div>
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
          <h2 className="text-3xl md:text-4xl font-black text-[#D0ECE6] mb-6">Ready to Modernize Your Clinical Node?</h2>
          <p className="text-[#6FA898] text-lg font-medium mb-10 max-w-xl mx-auto">
            Join the clinical validation network to partner with SEWA on our pre-clinical R&D phase.
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
