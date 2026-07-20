// SEWA XAI — App.tsx (COMPLETE — all pages wired, full public routing)
// Routes: Public site (~45 pages) → Login → 11 role workspaces with sub-navigation
// Socket.IO real-time, critical alert banner, notification panel, cookie banner

import React, { useState, useEffect } from 'react';
import { useAuthStore }              from './store/authStore';
import { useSettingsStore }          from './store/settingsStore';
import { useScanStore }              from './store/scanStore';
import { useNotificationStore }      from './store/notificationStore';
import { useTranslation }            from './i18n/I18nContext';
import { TranslationKey }            from './i18n/translations';
import {
  ChevronLeft, ChevronRight, LayoutDashboard, Brain, Map, 
  Lock, CreditCard, Activity, Rocket, Calendar, Settings2, Network
} from 'lucide-react';

// Clinical pages
import { LoginPage }                 from './pages/auth/LoginPage';
import { RegisterPage }              from './pages/auth/RegisterPage';
import { AcceptInvitePage }          from './pages/auth/AcceptInvitePage';
import { ResetPasswordPage }         from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage }           from './pages/auth/VerifyEmailPage';
import { RadiologistWorkspace }      from './pages/radiologist/RadiologistWorkspace';
import { TrainingSimulator }         from './pages/radiologist/TrainingSimulator';
import { PeerReviewWorkspace }       from './pages/radiologist/PeerReviewWorkspace';
import { DoctorDashboard }           from './pages/doctor/DoctorDashboard';
import { PatientPortal }             from './pages/patient/PatientPortal';
import { TechnicianWorkspace }       from './pages/technician/TechnicianWorkspace';
import { HospitalAdminDashboard }    from './pages/admin/HospitalAdminDashboard';
import { AIPerformanceDashboard }    from './pages/admin/AIPerformanceDashboard';
import { PopulationHealthDashboard } from './pages/admin/PopulationHealthDashboard';
import { SuperAdminDashboard }       from './pages/admin/SuperAdminDashboard';
import { ComplianceDashboard }       from './pages/compliance/ComplianceDashboard';
import { BillingDashboard }          from './pages/billing/BillingDashboard';
import { OnboardingWizard }          from './pages/onboarding/OnboardingWizard';
import { SpecialistOnboarding }     from './pages/onboarding/SpecialistOnboarding';
import { RoadmapPage }               from './pages/roadmap/RoadmapPage';
import { AppointmentsPage }          from './pages/appointments/AppointmentsPage';
import { ReferralNetwork }           from './pages/referral/ReferralNetwork';
import { ProfileSettings }         from './pages/settings/ProfileSettings';
import { SupportTicketsPage }   from './pages/user/SupportTicketsPage';
import { PatientProfile }            from './pages/patient/PatientProfile';
import { RoadmapOrchestrator }       from './pages/admin/RoadmapOrchestrator';
import { EuAiActPortal }             from './pages/admin/EuAiActPortal';
import { LongitudinalTracking }      from './pages/radiologist/LongitudinalTracking';

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
import { ClinicalRulesDashboard }    from './pages/admin/ClinicalRulesDashboard';
import { ClinicalEvidencePage }      from './pages/public/ClinicalEvidencePage';
import { AISafetyPage }              from './pages/public/AISafetyPage';
import { GovernancePage }            from './pages/public/GovernancePage';
import { PublicationsPage }          from './pages/public/PublicationsPage';
import { ResearchPortal }            from './pages/public/ResearchPortal';
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
import { PathologyAI }              from './pages/public/products/PathologyAI';
import { MammographyAI }            from './pages/public/products/MammographyAI';
import { RetinalAI }                 from './pages/public/products/RetinalAI';
import { RegulatoryPage }           from './pages/public/RegulatoryPage';
import { DevelopersPage }           from './pages/public/DevelopersPage';
import { AfricaPricingPage } from './pages/public/AfricaPricingPage';
import { NHSProcurementPage } from './pages/public/NHSProcurementPage';
import { SpecializedAI } from './pages/public/products/SpecializedAI';
import { NHSDSPTCompliancePage } from './pages/public/NHSDSPTCompliancePage';
import { TrustCenterPage } from './pages/public/TrustCenterPage';

// Layout & components
import { TopNav }                    from './components/layout/TopNav';
import { CriticalAlertBanner }       from './components/ui/CriticalAlertBanner';
import { NotificationPanel }         from './components/ui/NotificationPanel';
import { CookieBanner }              from './components/public/CookieBanner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { socketService }             from './services/socketService';
import { analytics }                 from './services/analytics';

// ── Design tokens ─────────────────────────────────────────────
import { dashboardColors as C } from './design-system/tokens';

// ── Sub-nav configs ────────────────────────────────────────────
const ADMIN_NAV = [
  { id:'overview',          labelKey:'overview' as TranslationKey,           icon:<LayoutDashboard size={16}/> },
  { id:'ai-performance',    labelKey:'aiPerformance' as TranslationKey,      icon:<Brain size={16}/> },
  { id:'population-health', labelKey:'populationHealth' as TranslationKey,   icon:<Map size={16}/> },
  { id:'clinical-rules',    labelKey:'clinicalRules' as TranslationKey,      icon:<Settings2 size={16}/> },
  { id:'referrals',         labelKey:'referrals' as TranslationKey,          icon:<Activity size={16}/> },
  { id:'appointments',      labelKey:'appointments' as TranslationKey,       icon:<Calendar size={16}/> },
  { id:'compliance',        labelKey:'compliance' as TranslationKey,         icon:<Lock size={16}/> },
  { id:'billing',           labelKey:'billing' as TranslationKey,            icon:<CreditCard size={16}/> },
  { id:'onboarding',        labelKey:'onboarding' as TranslationKey,         icon:<Rocket size={16}/> },
  { id:'roadmap',           labelKey:'roadmap' as TranslationKey,            icon:<Map size={16}/> },
  { id:'advanced-orchestrator', labelKey:'advancedOrchestration' as TranslationKey, icon:<Network size={16}/> },
  { id:'eu-ai-act', labelKey:'euAiAct' as TranslationKey, icon:<Lock size={16}/> },
  { id:'longitudinal', labelKey:'longitudinalTracking' as TranslationKey, icon:<Activity size={16}/> },
] as const;

const SUPER_NAV = [
  { id:'platform',       labelKey:'platform' as TranslationKey,       icon:<LayoutDashboard size={16}/> },
  { id:'ai-performance', labelKey:'aiPerformance' as TranslationKey,  icon:<Brain size={16}/> },
  { id:'compliance',     labelKey:'compliance' as TranslationKey,     icon:<Lock size={16}/> },
  { id:'billing',        labelKey:'billing' as TranslationKey,        icon:<CreditCard size={16}/> },
  { id:'roadmap',        labelKey:'roadmap' as TranslationKey,        icon:<Map size={16}/> },
] as const;

const RADIOLOGIST_NAV = [
  { id:'workspace',   labelKey:'worklist' as TranslationKey,   icon:<LayoutDashboard size={16}/> },
  { id:'peer-review', labelKey:'peerReview' as TranslationKey, icon:<Activity size={16}/> },
] as const;

type AdminPage      = typeof ADMIN_NAV[number]['id'];
type SuperPage      = typeof SUPER_NAV[number]['id'];
type RadiologistPage = typeof RADIOLOGIST_NAV[number]['id'];

// ── AI service status names ────────────────────────────────────
const SERVICES = ['Triage AI','VLM','Uncertainty','Metacognition','Pathology','Mammography','Retinal','FL','CL','FHIR R4','HL7v2','PACS','Socket.IO','Stripe','Paystack'];

// ── Sub-nav sidebar ────────────────────────────────────────────
function SubNav({ items, active, onChange, collapsed, onToggle }: {
  items: readonly { id:string; labelKey:TranslationKey; icon:string|React.ReactNode }[];
  active: string;
  onChange: (id:string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const r = () => {
      const m = window.innerWidth < 1024;
      setIsMobile(m);
      if (!m) setIsOpen(false);
    };
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          .subnav-container {
            position: fixed !important; top: 0; left: -200px; bottom: 0;
            z-index: 1000 !important; width: 200px !important;
            transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .subnav-container.mobile-open { transform: translateX(200px); }
          .subnav-overlay { 
            display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 900; 
            opacity: 0; pointer-events: none; transition: opacity 300ms;
          }
          .subnav-overlay.open { opacity: 1; pointer-events: auto; }
          .mobile-trigger {
            display: flex !important; position: fixed; left: 16px; bottom: 40px; 
            width: 44px; height: 44px; background: ${C.brand}; border-radius: 50%;
            z-index: 800; align-items: center; justify-content: center; color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: none; cursor: pointer;
          }
        }
      `}</style>

      {isMobile && <div className={`subnav-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} />}
      {isMobile && (
        <button className="mobile-trigger" onClick={() => setIsOpen(true)} style={{ display: 'none' }}>
          <LayoutDashboard size={20} />
        </button>
      )}

      <div className={`subnav-container ${isOpen ? 'mobile-open' : ''}`} style={{
        width: collapsed ? 64 : 200, flexShrink:0, background:C.bg1,
        borderRight:`1px solid ${C.border}`,
        padding:'10px 8px', display:'flex', flexDirection:'column', gap:2,
        overflowY:'auto', transition:'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}>
        {!isMobile && (
          <button onClick={onToggle} style={{
            position: 'absolute', top: 12, right: collapsed ? 20 : 8,
            background: C.bg3, border: `1px solid ${C.border}`, color: C.textMd,
            width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
          }}>
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        )}

        {isMobile && (
          <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: 10, fontWeight: 900, color: C.brand }}>NAVIGATE</span>
             <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: C.textLo }}>✕</button>
          </div>
        )}

        <div style={{ height: isMobile ? 10 : 40 }} /> {/* Spacer for toggle */}

        {items.map(item => (
          <button key={item.id} onClick={() => { onChange(item.id); if (isMobile) setIsOpen(false); }} title={collapsed ? t(item.labelKey) : undefined} style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'8px 12px', borderRadius:9, cursor:'pointer',
            border:`1px solid ${active===item.id ? `${C.brand}30` : 'transparent'}`,
            background: active===item.id ? `${C.brand}14` : 'transparent',
            color: active===item.id ? C.brand : C.textLo,
            fontFamily:C.F, fontSize:12,
            fontWeight: active===item.id ? 600 : 400,
            textAlign:'left', transition:'all 120ms',
            justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
            overflow: 'hidden'
          }}>
            <span style={{ fontSize:13, flexShrink:0 }}>{item.icon}</span>
            {(!collapsed || isMobile) && <span style={{ whiteSpace: 'nowrap' }}>{t(item.labelKey)}</span>}
          </button>
        ))}
      </div>
    </>
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
    <footer role="status" aria-live="polite" aria-label="System status" style={{
      position:'fixed', bottom:0, left:0, right:0, height:24, zIndex:50,
      background:C.bg2, borderTop:`1px solid ${C.border}`,
      display:'flex', alignItems:'center', gap:8, padding:'0 12px', overflow:'hidden',
    }}>
      <span style={{ fontSize:9, color:C.textLo, fontFamily:C.FM, flexShrink:0 }}>SEWA XAI v2.4.1</span>
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
  const { user, token, isAuthenticated, logout }  = useAuthStore();
  const { criticalAlerts, fetchWorklist } = useScanStore();
  const { notifications, markRead }       = useNotificationStore();
  const { region, setLang, setRegion } = useSettingsStore();
  const { isLoaded }                   = useTenant();
  const { isRTL }                         = useTranslation();

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [settingsPage, setSettingsPage] = useState(false);
  const [supportPage, setSupportPage] = useState(false);
  const [adminPage,   setAdminPage]   = useState<AdminPage>('overview');
  const [superPage,   setSuperPage]   = useState<SuperPage>('platform');
  const [radiologistPage, setRadiologistPage] = useState<RadiologistPage>('workspace');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Detect staff invite link: /auth/accept-invite?token=...
  const inviteToken = (() => {
    const p = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    return (path === '/auth/accept-invite' || path.includes('accept-invite')) ? p.get('token') : null;
  })();

  // Detect password reset link: /reset-password?token=...
  const resetToken = (() => {
    const p = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    return (path === '/reset-password' || path.includes('reset-password')) ? p.get('token') : null;
  })();

  // Detect email verification link: /verify-email?token=...
  const verifyToken = (() => {
    const p = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    return (path === '/verify-email' || path.includes('verify-email')) ? p.get('token') : null;
  })();
  const [publicPage,   setPublicPage]   = useState<'landing'|'login'|'register'|'onboarding'|'onboarding-specialist'|'solutions'|'research'|'regulatory'|'clinical-validation'|'clinical-evidence'|'ai-safety'|'governance'|'publications'|'pricing'|'africa-pricing'|'nhs-procurement'|'specialized-ai'|'nhs-dspt-compliance'|'api-docs'|'about'|'contact'|'careers'|'press'|'status'|'privacy-policy'|'terms'|'cookie-policy'|'security'|'accessibility'|'downloads'|'triage-ai'|'uncertainty-ai'|'vision-language-ai'|'metacognition-ai'|'explainable-ai'|'pathology-ai'|'mammography-ai'|'retinal-ai'|'partner-portal'|'whitepaper'|'blog'|'sitemap'|'docs'|'changelog'|'developers'|'training'|'trust'>('landing');

  // Universal navigation handler for public site
  const navigate = (page: string) => {
    if (page === 'login') { setPublicPage('login'); return; }
    if (page === 'register') { setPublicPage('register'); return; }
    setPublicPage(page as typeof publicPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    analytics.pageView(`/public/${page}`, `SEWA XAI - ${page}`);
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/onboarding') setPublicPage('onboarding');
    else if (path === '/onboarding/specialist') setPublicPage('onboarding-specialist');
    else if (path === '/register') setPublicPage('register');
    else if (path === '/login') setPublicPage('login');
  }, []);

  useEffect(() => {
    analytics.init();
    analytics.consentDenied();
  }, []);

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
      (window as unknown as { __sewa_hide_splash?: () => void }).__sewa_hide_splash?.();
    };
    hide();
  }, [isLoaded]);

  // Socket.IO connection
  useEffect(() => {
    if (!isAuthenticated || !token || !user) return;
    socketService.connect(token, user.tenantId);

    socketService.on('ai:result', (data: { urgency: string; primaryFinding: string; scanId: string; confidence: number }) => {
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
    socketService.on('scan:updated', (d: { scanId: string; status: string }) => useScanStore.getState().updateScanStatus(d.scanId, d.status));

    return () => socketService.disconnect();
  }, [isAuthenticated, token, user, fetchWorklist]);

  // Sync region/lang from user profile
  useEffect(() => {
    if (user?.region)   setRegion(user.region);
    if (user?.language) setLang(user.language);
  }, [user, setLang, setRegion]);

  if (!isLoaded) return null; // Or a high-fidelity spinner

  // ── Staff invite link — intercept before any auth check ─────
  if (inviteToken) {
    return <AcceptInvitePage token={inviteToken} onLogin={() => navigate('login')} />;
  }

  // ── Password reset link — intercept before any auth check ────
  if (resetToken) {
    return <ResetPasswordPage token={resetToken} onLogin={() => navigate('login')} />;
  }

  // ── Email verification link — intercept before any auth check ─
  if (verifyToken) {
    return <VerifyEmailPage token={verifyToken} onLogin={() => navigate('login')} />;
  }

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
        <RegisterPage onLogin={() => navigate('login')} onInstitutionalOnboarding={() => navigate('onboarding')} />
        <CookieBanner onNavigate={navigate} />
      </>
    );
    if (publicPage === 'onboarding-specialist') return (
      <>
        <SpecialistOnboarding />
        <CookieBanner onNavigate={navigate} />
      </>
    );
    if (publicPage === 'onboarding') return (
      <>
        <OnboardingWizard />
        <CookieBanner onNavigate={navigate} />
      </>
    );
    // Full public site router
    const navProps = { onNavigate: navigate };
    return (
      <>
        {publicPage === 'landing'             && <LandingPage onLogin={() => navigate('login')} onNavigate={navigate} />}
        {publicPage === 'pricing'             && <PricingPage {...navProps} />}
        {publicPage === 'africa-pricing'      && <AfricaPricingPage {...navProps} />}
        {publicPage === 'nhs-procurement'    && <NHSProcurementPage {...navProps} />}
        {publicPage === 'specialized-ai'     && <SpecializedAI {...navProps} />}
        {publicPage === 'nhs-dspt-compliance' && <NHSDSPTCompliancePage {...navProps} />}
        {publicPage === 'solutions'           && <SolutionsPage {...navProps} />}
        {publicPage === 'about'              && <AboutPage {...navProps} />}
        {publicPage === 'contact'             && <ContactPage {...navProps} />}
        {publicPage === 'downloads'           && <DownloadsPage {...navProps} />}
        {publicPage === 'privacy-policy'      && <PrivacyPolicyPage {...navProps} />}
        {publicPage === 'terms'               && <TermsPage {...navProps} />}
        {publicPage === 'cookie-policy'       && <CookiePolicyPage {...navProps} />}
        {publicPage === 'security'            && <SecurityPage {...navProps} />}
        {publicPage === 'clinical-validation' && <ClinicalValidationPage {...navProps} />}
        {publicPage === 'clinical-evidence'   && <ClinicalEvidencePage {...navProps} />}
        {publicPage === 'ai-safety'           && <AISafetyPage {...navProps} />}
        {publicPage === 'governance'          && <GovernancePage {...navProps} />}
        {publicPage === 'publications'        && <PublicationsPage {...navProps} />}
        {publicPage === 'research'            && <ResearchPortal {...navProps} />}
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
        {publicPage === 'pathology-ai'       && <PathologyAI {...navProps} />}
        {publicPage === 'mammography-ai'     && <MammographyAI {...navProps} />}
        {publicPage === 'retinal-ai'         && <RetinalAI {...navProps} />}
        {publicPage === 'regulatory'         && <RegulatoryPage {...navProps} />}
        {publicPage === 'api-docs'           && <ApiDocsPage {...navProps} />}
        {publicPage === 'developers'         && <DevelopersPage {...navProps} />}
        {publicPage === 'trust'              && <TrustCenterPage {...navProps} />}
        {/* Fallback for unmapped routes */}
        {!['landing','login','register','onboarding','onboarding-specialist','pricing','africa-pricing','nhs-procurement','specialized-ai','nhs-dspt-compliance','solutions','research','about','contact','downloads','privacy-policy','terms','cookie-policy','security','clinical-validation','clinical-evidence','ai-safety','governance','publications','partner-portal','whitepaper','blog','careers','press','accessibility','sitemap','docs','status','changelog','triage-ai','uncertainty-ai','metacognition-ai','vision-language-ai','explainable-ai','pathology-ai','mammography-ai','retinal-ai','regulatory','api-docs','developers','training','trust'].includes(publicPage) && (
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

    if (publicPage === 'training') {
      return (
        <div>
          <button onClick={() => setPublicPage('landing')} style={{ margin:'20px 20px 0', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer', fontFamily: C.F }}>← Back to Workspace</button>
          <TrainingSimulator />
        </div>
      );
    }

    if (selectedPatientId) {
      return <ErrorBoundary name="Patient Profile"><PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} /></ErrorBoundary>;
    }

    if (role === 'radiologist') return (
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav
          items={RADIOLOGIST_NAV}
          active={radiologistPage}
          onChange={id => setRadiologistPage(id as RadiologistPage)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div style={{ flex:1, overflowY:'auto' }}>
          {radiologistPage === 'workspace'   && <ErrorBoundary name="Radiologist Workspace"><RadiologistWorkspace onNavigate={navigate} /></ErrorBoundary>}
          {radiologistPage === 'peer-review' && <ErrorBoundary name="Peer Review Workspace"><PeerReviewWorkspace /></ErrorBoundary>}
        </div>
      </div>
    );
    if (role === 'doctor')      return <ErrorBoundary name="Doctor Dashboard"><DoctorDashboard onLogout={logout} /></ErrorBoundary>;
    if (role === 'patient')     return <ErrorBoundary name="Patient Portal"><PatientPortal /></ErrorBoundary>;
    if (role === 'technician')  return <ErrorBoundary name="Technician Workspace"><TechnicianWorkspace /></ErrorBoundary>;

    if (role === 'admin') return (
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav 
          items={ADMIN_NAV} 
          active={adminPage} 
          onChange={id => setAdminPage(id as AdminPage)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div style={{ flex:1, overflowY:'auto' }}>
          {adminPage === 'overview'          && <ErrorBoundary name="Hospital Admin Dashboard"><HospitalAdminDashboard /></ErrorBoundary>}
          {adminPage === 'ai-performance'    && <ErrorBoundary name="AI Performance"><AIPerformanceDashboard /></ErrorBoundary>}
          {adminPage === 'population-health' && <ErrorBoundary name="Population Health"><PopulationHealthDashboard /></ErrorBoundary>}
          {adminPage === 'referrals'         && <ErrorBoundary name="Referral Network"><ReferralNetwork /></ErrorBoundary>}
          {adminPage === 'appointments'      && <ErrorBoundary name="Appointments"><AppointmentsPage /></ErrorBoundary>}
          {adminPage === 'compliance'        && <ErrorBoundary name="Compliance"><ComplianceDashboard /></ErrorBoundary>}
          {adminPage === 'billing'           && <ErrorBoundary name="Billing"><BillingDashboard /></ErrorBoundary>}
          {adminPage === 'onboarding'        && <ErrorBoundary name="Onboarding"><OnboardingWizard /></ErrorBoundary>}
          {adminPage === 'roadmap'           && <ErrorBoundary name="Roadmap"><RoadmapPage /></ErrorBoundary>}
          {adminPage === 'advanced-orchestrator' && <ErrorBoundary name="Advanced Orchestration"><RoadmapOrchestrator /></ErrorBoundary>}
          {adminPage === 'eu-ai-act'            && <ErrorBoundary name="EU AI Act Portal"><EuAiActPortal /></ErrorBoundary>}
          {adminPage === 'clinical-rules'        && <ErrorBoundary name="Clinical Rules"><ClinicalRulesDashboard /></ErrorBoundary>}
          {adminPage === 'longitudinal'          && <ErrorBoundary name="Longitudinal Tracking"><LongitudinalTracking /></ErrorBoundary>}
        </div>
      </div>
    );

    if (role === 'superadmin') return (
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav 
          items={SUPER_NAV} 
          active={superPage} 
          onChange={id => setSuperPage(id as SuperPage)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div style={{ flex:1, overflowY:'auto' }}>
          {superPage === 'platform'       && <ErrorBoundary name="Platform Stats"><SuperAdminDashboard /></ErrorBoundary>}
          {superPage === 'ai-performance' && <ErrorBoundary name="AI Performance"><AIPerformanceDashboard /></ErrorBoundary>}
          {superPage === 'compliance'     && <ErrorBoundary name="Compliance"><ComplianceDashboard /></ErrorBoundary>}
          {superPage === 'billing'        && <ErrorBoundary name="Billing"><BillingDashboard /></ErrorBoundary>}
          {superPage === 'roadmap'        && <ErrorBoundary name="Roadmap"><RoadmapPage /></ErrorBoundary>}
        </div>
      </div>
    );

    return <RadiologistWorkspace onNavigate={navigate} />;
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, fontFamily:C.F }} dir={isRTL ? 'rtl' : 'ltr'}>

      <a href="#main-content" className="sewa-sr-only">Skip to main content</a>

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
        onNavigate={(p:string)=> { 
          if (p === 'support') setSupportPage(true); 
          else if (p.startsWith('public/')) navigate(p.replace('public/', ''));
          else navigate(p); 
        }}
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
      <main id="main-content" style={fullbleed ? {} : { maxWidth:1440, margin:'0 auto' }}>
        {settingsPage ? (
          <div>
            <button onClick={()=>setSettingsPage(false)} style={{ margin:'20px', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer' }}>← Back to Dashboard</button>
            <ProfileSettings />
          </div>
        ) : supportPage ? (
          <div>
            <button onClick={()=>setSupportPage(false)} style={{ margin:'20px', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer' }}>← Back to Dashboard</button>
            <SupportTicketsPage />
          </div>
        ) : renderContent()}
      </main>

      {/* Fixed status bar at bottom */}
      <StatusBar region={region} role={role} />
    </div>
  );
}
