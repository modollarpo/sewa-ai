// SEWA AI — App.tsx (COMPLETE — all pages wired, full public routing)
// Routes: Public site (10 pages) → Login → 11 role workspaces with sub-navigation
// Socket.IO real-time, critical alert banner, notification panel, cookie banner

import React, { useState, useEffect } from 'react';
import { useAuthStore }              from './store/authStore';
import { useSettingsStore }          from './store/settingsStore';
import { useScanStore }              from './store/scanStore';
import { useNotificationStore }      from './store/notificationStore';

// Clinical pages
import { LoginPage }                 from './pages/auth/LoginPage';
import { RegisterPage }              from './pages/auth/RegisterPage';
import { RadiologistWorkspace }      from './pages/radiologist/RadiologistWorkspace';
import { DoctorDashboard }           from './pages/doctor/DoctorDashboard';
import { PatientPortal }             from './pages/patient/PatientPortal';
import { TechnicianWorkspace }       from './pages/technician/TechnicianWorkspace';
import { HospitalAdminDashboard }    from './pages/admin/HospitalAdminDashboard';
import { AIPerformanceDashboard }    from './pages/admin/AIPerformanceDashboard';
import { PopulationHealthDashboard } from './pages/admin/PopulationHealthDashboard';
import { SuperAdminDashboard }       from './pages/admin/SuperAdminDashboard';
import { AIMonitoringDashboard }     from './pages/ai-monitoring/AIMonitoringDashboard';
import { ComplianceDashboard }       from './pages/compliance/ComplianceDashboard';
import { BillingDashboard }          from './pages/billing/BillingDashboard';
import { OnboardingWizard }          from './pages/onboarding/OnboardingWizard';
import { RoadmapPage }               from './pages/roadmap/RoadmapPage';
import { AppointmentsPage }          from './pages/appointments/AppointmentsPage';
import { ProfileSettings }         from './pages/settings/ProfileSettings';

// Public pages
import { LandingPage }               from './pages/public/LandingPage';
import { PricingPage }               from './pages/public/PricingPage';
import { SolutionsPage }             from './pages/public/SolutionsPage';
import { AboutPage }                 from './pages/public/AboutPage';
import { ContactPage }               from './pages/public/ContactPage';
import { DownloadsPage }             from './pages/public/DownloadsPage';
import { PrivacyPolicyPage }         from './pages/public/PrivacyPolicyPage';
import { TermsPage }                 from './pages/public/TermsPage';
import { CookiePolicyPage }          from './pages/public/CookiePolicyPage';
import { SecurityPage }              from './pages/public/SecurityPage';
import { ClinicalValidationPage }    from './pages/public/ClinicalValidationPage';
import { PartnerPortalPage }         from './pages/public/PartnerPortalPage';
import { BlogPage }             from './pages/public/BlogPage';
import { CareersPage }          from './pages/public/CareersPage';
import { PressPage }            from './pages/public/PressPage';
import { AccessibilityPage }    from './pages/public/AccessibilityPage';
import { DocsPage }          from './pages/public/DocsPage';
import { StatusPage }        from './pages/public/StatusPage';
import { ChangelogPage }     from './pages/public/ChangelogPage';
import { SitemapPage }          from './pages/public/SitemapPage';
import { TechnicalWhitepaperPage }   from './pages/public/TechnicalWhitepaperPage';
import { ApiDocsPage }               from './pages/public/ApiDocsPage';
import { TriageAI }                 from './pages/public/products/TriageAI';
import { UncertaintyAI }            from './pages/public/products/UncertaintyAI';
import { MetacognitionAI }          from './pages/public/products/MetacognitionAI';
import { VisionLanguageAI }         from './pages/public/products/VisionLanguageAI';
import { ExplainableAI }            from './pages/public/products/ExplainableAI';
import { RegulatoryPage }           from './pages/public/RegulatoryPage';
import { DevelopersPage }           from './pages/public/DevelopersPage';

// Layout & components
import { TopNav }                    from './components/layout/TopNav';
import { CriticalAlertBanner }       from './components/ui/CriticalAlertBanner';
import { NotificationPanel }         from './components/ui/NotificationPanel';
import { CookieBanner }              from './components/public/CookieBanner';
import { PWAInstallPrompt } from './components/ui/PWAInstallPrompt';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { socketService }             from './services/socketService';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3: '#111F1A',
  brand:'#408D7B', normal:'#1DBF73',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055', border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

// ── Sub-nav configs ────────────────────────────────────────────
const ADMIN_NAV = [
  { id:'overview',          label:'Overview',           icon:'📊' },
  { id:'ai-performance',    label:'AI Performance',     icon:'🧠' },
  { id:'population-health', label:'Population Health',  icon:'📍' },
  { id:'ai-monitoring',     label:'AI Live Monitor',    icon:'📡' },
  { id:'appointments',      label:'Appointments',       icon:'📅' },
  { id:'compliance',        label:'Compliance',         icon:'🔒' },
  { id:'billing',           label:'Billing',            icon:'💳' },
  { id:'onboarding',        label:'Onboarding',         icon:'🚀' },
  { id:'roadmap',           label:'Roadmap',            icon:'🗺️' },
] as const;

const SUPER_NAV = [
  { id:'platform',       label:'Platform Overview',  icon:'🌍' },
  { id:'ai-monitoring',  label:'AI Live Monitor',    icon:'📡' },
  { id:'ai-performance', label:'AI Performance',     icon:'🧠' },
  { id:'compliance',     label:'Compliance',         icon:'🔒' },
  { id:'billing',        label:'Global Billing',     icon:'💳' },
  { id:'roadmap',        label:'Roadmap',            icon:'🗺️' },
] as const;

type AdminPage = typeof ADMIN_NAV[number]['id'];
type SuperPage = typeof SUPER_NAV[number]['id'];

// ── AI service status names ────────────────────────────────────
const SERVICES = ['Triage AI','VLM','Uncertainty','Metacognition','FL','CL','FHIR R4','HL7v2','PACS','Socket.IO','Stripe','Paystack'];

// ── Sub-nav sidebar ────────────────────────────────────────────
function SubNav({ items, active, onChange }: {
  items: readonly { id:string; label:string; icon:string }[];
  active: string;
  onChange: (id:string) => void;
}) {
  return (
    <div style={{
      width:200, flexShrink:0, background:C.bg1,
      borderRight:`1px solid ${C.border}`,
      padding:'10px 8px', display:'flex', flexDirection:'column', gap:2,
      overflowY:'auto',
    }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onChange(item.id)} style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'8px 12px', borderRadius:9, cursor:'pointer',
          border:`1px solid ${active===item.id ? `${C.brand}30` : 'transparent'}`,
          background: active===item.id ? `${C.brand}14` : 'transparent',
          color: active===item.id ? C.brand : C.textLo,
          fontFamily:C.F, fontSize:12,
          fontWeight: active===item.id ? 600 : 400,
          textAlign:'left', transition:'all 120ms',
        }}>
          <span style={{ fontSize:13 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── Status bar clock ───────────────────────────────────────────
function StatusBar({ region, role }: { region:string; role:string }) {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer style={{
      position:'fixed', bottom:0, left:0, right:0, height:24, zIndex:50,
      background:C.bg2, borderTop:`1px solid ${C.border}`,
      display:'flex', alignItems:'center', gap:8, padding:'0 12px', overflow:'hidden',
    }}>
      <span style={{ fontSize:9, color:C.textLo, fontFamily:C.FM, flexShrink:0 }}>SEWA AI v2.4.1</span>
      <div style={{ width:1, height:12, background:C.border, flexShrink:0 }}/>

      <div style={{ display:'flex', gap:8, flex:1, overflow:'hidden' }}>
        {SERVICES.map(s => (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
            <div style={{
              width:4, height:4, borderRadius:'50%', background:C.normal,
              animation:'sbPulse 3s infinite',
            }}/>
            <style>{`@keyframes sbPulse{0%,100%{opacity:.7}50%{opacity:1}}`}</style>
            <span style={{ fontSize:8, color:C.textLo, fontFamily:C.FM }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <span style={{ fontSize:8, color:C.textLo, fontFamily:C.FM }}>
          {region.toUpperCase()} · {role.toUpperCase()}
        </span>
        <div style={{ width:1, height:12, background:C.border }}/>
        <span style={{ fontSize:8, color:C.textLo, fontFamily:C.FM }}>{clock}</span>
      </div>
    </footer>
  );
}

// ── Main App ───────────────────────────────────────────
import { useTenant } from './hooks/useTenant';

export default function App() {
  const { user, token, isAuthenticated }  = useAuthStore();
  const { criticalAlerts, fetchWorklist } = useScanStore();
  const { notifications, markRead }       = useNotificationStore();
  const { lang, region, setLang, setRegion } = useSettingsStore();
  const { tenantSlug, isLoaded }          = useTenant();

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [settingsPage, setSettingsPage] = useState(false);
  const [adminPage,   setAdminPage]   = useState<AdminPage>('overview');
  const [superPage,   setSuperPage]   = useState<SuperPage>('platform');
  const [publicPage,  setPublicPage]  = useState<'landing'|'login'|'register'|'solutions'|'regulatory'|'clinical-validation'|'pricing'|'api-docs'|'about'|'contact'|'careers'|'press'|'status'|'privacy-policy'|'terms'|'cookie-policy'|'security'|'accessibility'|'downloads'|'triage-ai'|'uncertainty-ai'|'vision-language-ai'|'metacognition-ai'|'explainable-ai'|'partner-portal'|'whitepaper'|'blog'|'sitemap'|'docs'|'changelog'|'developers'>('landing');

  // Universal navigation handler for public site
  const navigate = (page: string) => {
    if (page === 'login') { setPublicPage('login'); return; }
    if (page === 'register') { setPublicPage('register'); return; }
    setPublicPage(page as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isLoaded) return;
    
    // Robust splash removal helper
    const hide = () => {
      ['splash', 'loading-splash'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.opacity = '0';
          setTimeout(() => { 
            if (el.parentNode) el.parentNode.removeChild(el); 
          }, 800);
        }
      });
      (window as any).__sewa_hide_splash?.();
    };
    hide();
  }, [isLoaded]);

  // Socket.IO connection
  useEffect(() => {
    if (!isAuthenticated || !token || !user) return;
    socketService.connect(token, user.tenantId);

    socketService.on('ai:result', (data: any) => {
      useScanStore.getState().handleAIResult(data);
      if (data.urgency === 'CRITICAL' || data.urgency === 'URGENT') {
        useNotificationStore.getState().addNotification({
          type:    data.urgency === 'CRITICAL' ? 'critical_finding' : 'urgent_finding',
          title:   `${data.urgency}: ${data.primaryFinding}`,
          body:    `Scan ${data.scanId} — ${(data.confidence * 100).toFixed(1)}% confidence`,
          scanId:  data.scanId,
          urgency: data.urgency,
        });
      }
    });
    socketService.on('scan:new',     () => fetchWorklist());
    socketService.on('scan:updated', (d: any) => useScanStore.getState().updateScanStatus(d.scanId, d.status));

    return () => socketService.disconnect();
  }, [isAuthenticated, token, user]);

  // Sync region/lang from user profile
  useEffect(() => {
    if (user?.region)   setRegion(user.region);
    if (user?.language) setLang(user.language);
  }, [user]);

  if (!isLoaded) return null; // Or a high-fidelity spinner

  // ── Unauthenticated ──────────────────────────────────────────
  if (!isAuthenticated) {
    if (publicPage === 'login') return (
      <>
        <LoginPage onNavigate={navigate} />
        <CookieBanner onNavigate={navigate} />
      </>
    );
    if (publicPage === 'register') return (
      <>
        <RegisterPage onLogin={() => navigate('login')} />
        <CookieBanner onNavigate={navigate} />
      </>
    );
    // Full public site router
    const navProps = { onNavigate: navigate };
    return (
      <>
        {publicPage === 'landing'             && <LandingPage onLogin={() => navigate('login')} onNavigate={navigate} />}
        {publicPage === 'pricing'             && <PricingPage {...navProps} />}
        {publicPage === 'solutions'           && <SolutionsPage {...navProps} />}
        {publicPage === 'about'              && <AboutPage {...navProps} />}
        {publicPage === 'contact'             && <ContactPage {...navProps} />}
        {publicPage === 'downloads'           && <DownloadsPage {...navProps} />}
        {publicPage === 'privacy-policy'      && <PrivacyPolicyPage {...navProps} />}
        {publicPage === 'terms'               && <TermsPage {...navProps} />}
        {publicPage === 'cookie-policy'       && <CookiePolicyPage {...navProps} />}
        {publicPage === 'security'            && <SecurityPage {...navProps} />}
        {publicPage === 'clinical-validation' && <ClinicalValidationPage {...navProps} />}
        {publicPage === 'partner-portal'      && <PartnerPortalPage {...navProps} />}
        {publicPage === 'whitepaper'          && <TechnicalWhitepaperPage {...navProps} />}
        {publicPage === 'blog'                && <BlogPage {...navProps} />}
        {publicPage === 'careers'             && <CareersPage {...navProps} />}
        {publicPage === 'press'               && <PressPage {...navProps} />}
        {publicPage === 'accessibility'       && <AccessibilityPage {...navProps} />}
        {publicPage === 'sitemap'             && <SitemapPage {...navProps} />}
        {publicPage === 'docs'               && <DocsPage {...navProps} />}
        {publicPage === 'status'             && <StatusPage {...navProps} />}
        {publicPage === 'changelog'          && <ChangelogPage {...navProps} />}
        {publicPage === 'triage-ai'          && <TriageAI {...navProps} />}
        {publicPage === 'uncertainty-ai'     && <UncertaintyAI {...navProps} />}
        {publicPage === 'metacognition-ai'   && <MetacognitionAI {...navProps} />}
        {publicPage === 'vision-language-ai' && <VisionLanguageAI {...navProps} />}
        {publicPage === 'explainable-ai'     && <ExplainableAI {...navProps} />}
        {publicPage === 'regulatory'         && <RegulatoryPage {...navProps} />}
        {publicPage === 'api-docs'           && <ApiDocsPage {...navProps} />}
        {publicPage === 'developers'         && <DevelopersPage {...navProps} />}
        {/* Fallback for unmapped routes */}
        {!['landing','login','register','pricing','solutions','about','contact','downloads','privacy-policy','terms','cookie-policy','security','clinical-validation','partner-portal','whitepaper','blog','careers','press','accessibility','sitemap','docs','status','changelog','triage-ai','uncertainty-ai','metacognition-ai','vision-language-ai','explainable-ai','regulatory','api-docs','developers'].includes(publicPage) && (
          <LandingPage onLogin={() => navigate('login')} onNavigate={navigate} />
        )}
        <CookieBanner onNavigate={navigate} />
      </>
    );
  }

  const role = user!.role;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Whether to render edge-to-edge (no max-width)
  const fullbleed = ['radiologist','technician','doctor'].includes(role);

  // ── Content resolver ─────────────────────────────────────────
  const renderContent = () => {

    if (role === 'radiologist') return <ErrorBoundary name="Radiologist Workspace"><RadiologistWorkspace /></ErrorBoundary>;
    if (role === 'doctor')      return <DoctorDashboard />;
    if (role === 'patient')     return <PatientPortal />;
    if (role === 'technician')  return <TechnicianWorkspace />;

    if (role === 'admin') return (
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav items={ADMIN_NAV} active={adminPage} onChange={id => setAdminPage(id as AdminPage)}/>
        <div style={{ flex:1, overflowY:'auto' }}>
          {adminPage === 'overview'          && <HospitalAdminDashboard />}
          {adminPage === 'ai-performance'    && <AIPerformanceDashboard />}
          {adminPage === 'population-health' && <PopulationHealthDashboard />}
          {adminPage === 'ai-monitoring'     && <AIMonitoringDashboard />}
          {adminPage === 'appointments'      && <AppointmentsPage />}
          {adminPage === 'compliance'        && <ComplianceDashboard />}
          {adminPage === 'billing'           && <BillingDashboard />}
          {adminPage === 'onboarding'        && <OnboardingWizard />}
          {adminPage === 'roadmap'           && <RoadmapPage />}
        </div>
      </div>
    );

    if (role === 'superadmin') return (
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav items={SUPER_NAV} active={superPage} onChange={id => setSuperPage(id as SuperPage)}/>
        <div style={{ flex:1, overflowY:'auto' }}>
          <ErrorBoundary name="SuperAdmin Dashboard">
            {superPage === 'platform'       && <SuperAdminDashboard />}
            {superPage === 'ai-monitoring'  && <AIMonitoringDashboard />}
            {superPage === 'ai-performance' && <AIPerformanceDashboard />}
            {superPage === 'compliance'     && <ComplianceDashboard />}
            {superPage === 'billing'        && <BillingDashboard />}
            {superPage === 'roadmap'        && <RoadmapPage />}
          </ErrorBoundary>
        </div>
      </div>
    );

    return <RadiologistWorkspace />;
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, fontFamily:C.F }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* STAT / CRITICAL alert banner — above everything */}
      {criticalAlerts.length > 0 && (
        <CriticalAlertBanner alerts={criticalAlerts} />
      )}

      {/* Top navigation bar */}
      <TopNav
        user={user!}
        unreadCount={unreadCount}
        onNotifClick={() => setNotifOpen(o => !o)}
        onProfileClick={() => setSettingsPage(true)}
      />

      {/* Slide-out notification drawer */}
      {notifOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
          onMarkRead={markRead}
        />
      )}

      {/* Main content area */}
      <main style={fullbleed ? {} : { maxWidth:1440, margin:'0 auto' }}>
        {settingsPage ? (
          <div>
            <button onClick={()=>setSettingsPage(false)} style={{ margin:'20px', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer' }}>← Back to Dashboard</button>
            <ProfileSettings />
          </div>
        ) : renderContent()}
      </main>

      {/* Fixed status bar at bottom */}
      <StatusBar region={region} role={role} />
    </div>
  );
}
