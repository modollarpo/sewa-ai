// SEWA XAI — App.tsx (React Router — COMPLETE)
// Routes: Public site (~45 pages) → Login → 11 role workspaces with sub-navigation
// Socket.IO real-time, critical alert banner, notification panel, cookie banner

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
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
import { RoleGuard }                 from './components/auth/RoleGuard';
import { ErrorBoundary }             from './components/ui/ErrorBoundary';
import { TopNav }                    from './components/layout/TopNav';
import { CriticalAlertBanner }       from './components/ui/CriticalAlertBanner';
import { NotificationPanel }         from './components/ui/NotificationPanel';
import { CookieBanner }              from './components/public/CookieBanner';
import { socketService }             from './services/socketService';
import { analytics }                 from './services/analytics';
import { dashboardColors as C }      from './design-system/tokens';
import { initClinicalPushNotifications } from './services/pushRegistration';

// Lazy-loaded pages for code splitting
const LoginPage              = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage           = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const AcceptInvitePage       = lazy(() => import('./pages/auth/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));
const ResetPasswordPage      = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage        = lazy(() => import('./pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const RadiologistWorkspace   = lazy(() => import('./pages/radiologist/RadiologistWorkspace').then(m => ({ default: m.RadiologistWorkspace })));
const TrainingSimulator      = lazy(() => import('./pages/radiologist/TrainingSimulator').then(m => ({ default: m.TrainingSimulator })));
const PeerReviewWorkspace    = lazy(() => import('./pages/radiologist/PeerReviewWorkspace').then(m => ({ default: m.PeerReviewWorkspace })));
const DoctorDashboard        = lazy(() => import('./pages/doctor/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const PatientPortal          = lazy(() => import('./pages/patient/PatientPortal').then(m => ({ default: m.PatientPortal })));
const PatientProfile         = lazy(() => import('./pages/patient/PatientProfile').then(m => ({ default: m.PatientProfile })));
const TechnicianWorkspace    = lazy(() => import('./pages/technician/TechnicianWorkspace').then(m => ({ default: m.TechnicianWorkspace })));
const SuperAdminDashboard    = lazy(() => import('./pages/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const HospitalAdminDashboard = lazy(() => import('./pages/admin/HospitalAdminDashboard').then(m => ({ default: m.HospitalAdminDashboard })));
const AIPerformanceDashboard = lazy(() => import('./pages/admin/AIPerformanceDashboard').then(m => ({ default: m.AIPerformanceDashboard })));
const PopulationHealthDashboard = lazy(() => import('./pages/admin/PopulationHealthDashboard').then(m => ({ default: m.PopulationHealthDashboard })));
const ClinicalRulesDashboard = lazy(() => import('./pages/admin/ClinicalRulesDashboard').then(m => ({ default: m.ClinicalRulesDashboard })));
const ComplianceDashboard    = lazy(() => import('./pages/compliance/ComplianceDashboard').then(m => ({ default: m.ComplianceDashboard })));
const BillingDashboard       = lazy(() => import('./pages/billing/BillingDashboard').then(m => ({ default: m.BillingDashboard })));
const OnboardingWizard       = lazy(() => import('./pages/onboarding/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const SpecialistOnboarding   = lazy(() => import('./pages/onboarding/SpecialistOnboarding').then(m => ({ default: m.SpecialistOnboarding })));
const AppointmentsPage       = lazy(() => import('./pages/appointments/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const ReferralNetwork        = lazy(() => import('./pages/referral/ReferralNetwork').then(m => ({ default: m.ReferralNetwork })));
const ProfileSettings        = lazy(() => import('./pages/settings/ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const SupportTicketsPage     = lazy(() => import('./pages/user/SupportTicketsPage').then(m => ({ default: m.SupportTicketsPage })));
const RoadmapPage            = lazy(() => import('./pages/roadmap/RoadmapPage').then(m => ({ default: m.RoadmapPage })));
const RoadmapOrchestrator    = lazy(() => import('./pages/admin/RoadmapOrchestrator').then(m => ({ default: m.RoadmapOrchestrator })));
const EuAiActPortal          = lazy(() => import('./pages/admin/EuAiActPortal').then(m => ({ default: m.EuAiActPortal })));
const LongitudinalTracking   = lazy(() => import('./pages/radiologist/LongitudinalTracking').then(m => ({ default: m.LongitudinalTracking })));
const LandingPage            = lazy(() => import('./pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const PricingPage            = lazy(() => import('./pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const AfricaPricingPage      = lazy(() => import('./pages/public/AfricaPricingPage').then(m => ({ default: m.AfricaPricingPage })));
const NHSProcurementPage     = lazy(() => import('./pages/public/NHSProcurementPage').then(m => ({ default: m.NHSProcurementPage })));
const NHSDSPTCompliancePage  = lazy(() => import('./pages/public/NHSDSPTCompliancePage').then(m => ({ default: m.NHSDSPTCompliancePage })));
const SolutionsPage          = lazy(() => import('./pages/public/SolutionsPage').then(m => ({ default: m.SolutionsPage })));
const AboutPage              = lazy(() => import('./pages/public/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage            = lazy(() => import('./pages/public/ContactPage').then(m => ({ default: m.ContactPage })));
const DownloadsPage          = lazy(() => import('./pages/public/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
const PrivacyPolicyPage      = lazy(() => import('./pages/public/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage              = lazy(() => import('./pages/public/TermsPage').then(m => ({ default: m.TermsPage })));
const CookiePolicyPage       = lazy(() => import('./pages/public/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));
const SecurityPage           = lazy(() => import('./pages/public/SecurityPage').then(m => ({ default: m.SecurityPage })));
const AccessibilityPage      = lazy(() => import('./pages/public/AccessibilityPage').then(m => ({ default: m.AccessibilityPage })));
const ClinicalValidationPage = lazy(() => import('./pages/public/ClinicalValidationPage').then(m => ({ default: m.ClinicalValidationPage })));
const ClinicalEvidencePage   = lazy(() => import('./pages/public/ClinicalEvidencePage').then(m => ({ default: m.ClinicalEvidencePage })));
const AISafetyPage           = lazy(() => import('./pages/public/AISafetyPage').then(m => ({ default: m.AISafetyPage })));
const GovernancePage         = lazy(() => import('./pages/public/GovernancePage').then(m => ({ default: m.GovernancePage })));
const PublicationsPage       = lazy(() => import('./pages/public/PublicationsPage').then(m => ({ default: m.PublicationsPage })));
const ResearchPortal         = lazy(() => import('./pages/public/ResearchPortal').then(m => ({ default: m.ResearchPortal })));
const PartnerPortalPage      = lazy(() => import('./pages/public/PartnerPortalPage').then(m => ({ default: m.PartnerPortalPage })));
const CareersPage            = lazy(() => import('./pages/public/CareersPage').then(m => ({ default: m.CareersPage })));
const PressPage              = lazy(() => import('./pages/public/PressPage').then(m => ({ default: m.PressPage })));
const ChangelogPage          = lazy(() => import('./pages/public/ChangelogPage').then(m => ({ default: m.ChangelogPage })));
const SitemapPage            = lazy(() => import('./pages/public/SitemapPage').then(m => ({ default: m.SitemapPage })));
const DocsPage               = lazy(() => import('./pages/public/DocsPage').then(m => ({ default: m.DocsPage })));
const StatusPage             = lazy(() => import('./pages/public/StatusPage').then(m => ({ default: m.StatusPage })));
const TechnicalWhitepaperPage = lazy(() => import('./pages/public/TechnicalWhitepaperPage').then(m => ({ default: m.TechnicalWhitepaperPage })));
const ApiDocsPage            = lazy(() => import('./pages/public/ApiDocsPage').then(m => ({ default: m.ApiDocsPage })));
const TriageAI               = lazy(() => import('./pages/public/products/TriageAI').then(m => ({ default: m.TriageAI })));
const UncertaintyAI          = lazy(() => import('./pages/public/products/UncertaintyAI').then(m => ({ default: m.UncertaintyAI })));
const MetacognitionAI        = lazy(() => import('./pages/public/products/MetacognitionAI').then(m => ({ default: m.MetacognitionAI })));
const VisionLanguageAI       = lazy(() => import('./pages/public/products/VisionLanguageAI').then(m => ({ default: m.VisionLanguageAI })));
const ExplainableAI          = lazy(() => import('./pages/public/products/ExplainableAI').then(m => ({ default: m.ExplainableAI })));
const PathologyAI            = lazy(() => import('./pages/public/products/PathologyAI').then(m => ({ default: m.PathologyAI })));
const MammographyAI          = lazy(() => import('./pages/public/products/MammographyAI').then(m => ({ default: m.MammographyAI })));
const RetinalAI              = lazy(() => import('./pages/public/products/RetinalAI').then(m => ({ default: m.RetinalAI })));
const SpecializedAI          = lazy(() => import('./pages/public/products/SpecializedAI').then(m => ({ default: m.SpecializedAI })));
const RegulatoryPage         = lazy(() => import('./pages/public/RegulatoryPage').then(m => ({ default: m.RegulatoryPage })));
const DevelopersPage         = lazy(() => import('./pages/public/DevelopersPage').then(m => ({ default: m.DevelopersPage })));
const TrustCenterPage        = lazy(() => import('./pages/public/TrustCenterPage').then(m => ({ default: m.TrustCenterPage })));

// ── Design tokens ─────────────────────────────────────────────
const SERVICES = ['Triage AI','VLM','Uncertainty','Metacognition','Pathology','Mammography','Retinal','FL','CL','FHIR R4','HL7v2','PACS','Socket.IO','Stripe','Paystack'];

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
  { id:'population-health', labelKey:'populationHealth' as TranslationKey, icon:<Map size={16}/> },
  { id:'clinical-rules', labelKey:'clinicalRules' as TranslationKey, icon:<Settings2 size={16}/> },
  { id:'referrals',      labelKey:'referrals' as TranslationKey,      icon:<Activity size={16}/> },
  { id:'compliance',     labelKey:'compliance' as TranslationKey,     icon:<Lock size={16}/> },
  { id:'billing',        labelKey:'billing' as TranslationKey,        icon:<CreditCard size={16}/> },
  { id:'roadmap',        labelKey:'roadmap' as TranslationKey,        icon:<Map size={16}/> },
  { id:'tenant-onboarding', labelKey:'onboarding' as TranslationKey,  icon:<Rocket size={16}/> },
  { id:'eu-ai-act',      labelKey:'euAiAct' as TranslationKey,        icon:<Lock size={16}/> },
  { id:'edge',           labelKey:'edgeAI' as TranslationKey,         icon:<Network size={16}/> },
] as const;

const RADIOLOGIST_NAV = [
  { id:'workspace',   labelKey:'worklist' as TranslationKey,   icon:<LayoutDashboard size={16}/> },
  { id:'peer-review', labelKey:'peerReview' as TranslationKey, icon:<Activity size={16}/> },
] as const;

const TECHNICIAN_NAV = [
  { id:'upload',    labelKey:'scanUpload' as TranslationKey,    icon:<LayoutDashboard size={16}/> },
  { id:'queue',     labelKey:'worklist' as TranslationKey,      icon:<Activity size={16}/> },
  { id:'schedule',  labelKey:'procedures' as TranslationKey,    icon:<Calendar size={16}/> },
  { id:'pacs',      labelKey:'pacsStatus' as TranslationKey,    icon:<Network size={16}/> },
  { id:'stats',     labelKey:'analytics' as TranslationKey,     icon:<Brain size={16}/> },
] as const;

type AdminPage      = typeof ADMIN_NAV[number]['id'];
type SuperPage      = typeof SUPER_NAV[number]['id'];
type RadiologistPage = typeof RADIOLOGIST_NAV[number]['id'];
type TechnicianPage = typeof TECHNICIAN_NAV[number]['id'];

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
            position: 'absolute', top: 12, right: collapsed ? 16 : 8,
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

        <div style={{ height: isMobile ? 10 : 40 }} />

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

// ── Authenticated layout ────────────────────────────────────────
function AuthenticatedLayout() {
  const { user, token, logout } = useAuthStore();
  const { criticalAlerts } = useScanStore();
  const { notifications, markRead } = useNotificationStore();
  const { region } = useSettingsStore();
  const { isRTL } = useTranslation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsPage, setSettingsPage] = useState(false);
  const [supportPage, setSupportPage] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user || !token) return <Navigate to="/login" />;

  const role = user.role;
  const unreadCount = notifications.filter(n => !n.read).length;
  const fullbleed = ['radiologist','technician','doctor'].includes(role);

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, fontFamily:C.F }} dir={isRTL ? 'rtl' : 'ltr'}>
      <a href="#main-content" className="sewa-sr-only">Skip to main content</a>
      {criticalAlerts.length > 0 && <CriticalAlertBanner alerts={criticalAlerts} />}
      <TopNav
        user={user}
        unreadCount={unreadCount}
        onNotifClick={() => setNotifOpen(o => !o)}
        onProfileClick={() => setSettingsPage(true)}
        onNavigate={(p: string) => {
          if (p === 'support') setSupportPage(true);
          else if (p.startsWith('public/')) navigate('/' + p.replace('public/', ''));
          else navigate('/' + p);
        }}
      />
      {notifOpen && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
          onMarkRead={markRead}
        />
      )}
      <main id="main-content" style={fullbleed ? {} : { maxWidth:1440, margin:'0 auto' }}>
        {settingsPage ? (
          <div>
            <button onClick={() => setSettingsPage(false)} style={{ margin:'20px', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer' }}>← Back to Dashboard</button>
            <ProfileSettings />
          </div>
        ) : supportPage ? (
          <div>
            <button onClick={() => setSupportPage(false)} style={{ margin:'20px', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer' }}>← Back to Dashboard</button>
            <SupportTicketsPage />
          </div>
        ) : (
          <RoleBasedRouter role={role} user={user} navigate={navigate} sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
        )}
      </main>
      <StatusBar region={region} role={role} />
    </div>
  );
}

// ── Role-based content router ──────────────────────────────────
function RoleBasedRouter({ role, user, navigate, sidebarCollapsed, setSidebarCollapsed }: {
  role: string; user: any; navigate: (p: string) => void;
  sidebarCollapsed: boolean; setSidebarCollapsed: (v: boolean) => void;
}) {
  const [adminPage, setAdminPage] = useState<AdminPage>('overview');
  const [superPage, setSuperPage] = useState<SuperPage>('platform');
  const [radiologistPage, setRadiologistPage] = useState<RadiologistPage>('workspace');
  const [technicianPage, setTechnicianPage] = useState<TechnicianPage>('upload');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const { publicPage } = usePublicPageStore();

  if (publicPage === 'training') {
    return (
      <div>
        <button onClick={() => navigate('/')} style={{ margin:'20px 20px 0', padding:'8px 16px', background:C.bg3, border:`1px solid ${C.border}`, color:C.textMd, borderRadius:8, cursor:'pointer', fontFamily: C.F }}>← Back to Workspace</button>
        <TrainingSimulator />
      </div>
    );
  }

  if (selectedPatientId) {
    return <ErrorBoundary name="Patient Profile"><PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} /></ErrorBoundary>;
  }

  if (role === 'radiologist') return (
    <RoleGuard roles={['radiologist','admin','superadmin']}>
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav items={RADIOLOGIST_NAV} active={radiologistPage} onChange={id => setRadiologistPage(id as RadiologistPage)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div style={{ flex:1, overflowY:'auto' }}>
          {radiologistPage === 'workspace'   && <ErrorBoundary name="Radiologist Workspace"><RadiologistWorkspace onNavigate={navigate} /></ErrorBoundary>}
          {radiologistPage === 'peer-review' && <ErrorBoundary name="Peer Review Workspace"><PeerReviewWorkspace /></ErrorBoundary>}
        </div>
      </div>
    </RoleGuard>
  );

  if (role === 'doctor') return (
    <RoleGuard roles={['doctor','admin','superadmin']}>
      <DoctorDashboard onLogout={() => {}} />
    </RoleGuard>
  );

  if (role === 'patient') return (
    <RoleGuard roles={['patient']}>
      <PatientPortal />
    </RoleGuard>
  );

  if (role === 'technician') return (
    <RoleGuard roles={['technician','admin','superadmin']}>
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav items={TECHNICIAN_NAV} active={technicianPage} onChange={id => setTechnicianPage(id as TechnicianPage)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div style={{ flex:1, overflowY:'auto' }}>
          {technicianPage === 'upload'   && <ErrorBoundary name="Technician Workspace"><TechnicianWorkspace tab="upload" /></ErrorBoundary>}
          {technicianPage === 'queue'    && <ErrorBoundary name="Technician Queue"><TechnicianWorkspace tab="queue" /></ErrorBoundary>}
          {technicianPage === 'schedule' && <ErrorBoundary name="Technician Schedule"><TechnicianWorkspace tab="schedule" /></ErrorBoundary>}
          {technicianPage === 'pacs'     && <ErrorBoundary name="PACS Status"><TechnicianWorkspace tab="pacs" /></ErrorBoundary>}
          {technicianPage === 'stats'    && <ErrorBoundary name="Analytics"><TechnicianWorkspace tab="stats" /></ErrorBoundary>}
        </div>
      </div>
    </RoleGuard>
  );

  if (role === 'admin') return (
    <RoleGuard roles={['admin']}>
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav items={ADMIN_NAV} active={adminPage} onChange={id => setAdminPage(id as AdminPage)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div style={{ flex:1, overflowY:'auto' }}>
          {adminPage === 'overview'          && <ErrorBoundary name="Hospital Admin Dashboard"><HospitalAdminDashboard /></ErrorBoundary>}
          {adminPage === 'ai-performance'    && <ErrorBoundary name="AI Performance"><AIPerformanceDashboard /></ErrorBoundary>}
          {adminPage === 'population-health' && <ErrorBoundary name="Population Health"><PopulationHealthDashboard /></ErrorBoundary>}
          {adminPage === 'clinical-rules'    && <ErrorBoundary name="Clinical Rules"><ClinicalRulesDashboard /></ErrorBoundary>}
          {adminPage === 'referrals'         && <ErrorBoundary name="Referral Network"><ReferralNetwork /></ErrorBoundary>}
          {adminPage === 'appointments'      && <ErrorBoundary name="Appointments"><AppointmentsPage /></ErrorBoundary>}
          {adminPage === 'compliance'        && <ErrorBoundary name="Compliance"><ComplianceDashboard /></ErrorBoundary>}
          {adminPage === 'billing'           && <ErrorBoundary name="Billing"><BillingDashboard /></ErrorBoundary>}
          {adminPage === 'onboarding'        && <ErrorBoundary name="Onboarding"><OnboardingWizard /></ErrorBoundary>}
          {adminPage === 'roadmap'           && <ErrorBoundary name="Roadmap"><RoadmapPage /></ErrorBoundary>}
          {adminPage === 'advanced-orchestrator' && <ErrorBoundary name="Advanced Orchestration"><RoadmapOrchestrator /></ErrorBoundary>}
          {adminPage === 'eu-ai-act'         && <ErrorBoundary name="EU AI Act Portal"><EuAiActPortal /></ErrorBoundary>}
          {adminPage === 'longitudinal'      && <ErrorBoundary name="Longitudinal Tracking"><LongitudinalTracking /></ErrorBoundary>}
        </div>
      </div>
    </RoleGuard>
  );

  if (role === 'superadmin') return (
    <RoleGuard roles={['superadmin']}>
      <div style={{ display:'flex', height:'calc(100vh - 52px - 24px)', overflow:'hidden' }}>
        <SubNav items={SUPER_NAV} active={superPage} onChange={id => setSuperPage(id as SuperPage)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div style={{ flex:1, overflowY:'auto' }}>
          {superPage === 'platform'           && <ErrorBoundary name="Platform Stats"><SuperAdminDashboard tab="overview" /></ErrorBoundary>}
          {superPage === 'ai-performance'     && <ErrorBoundary name="AI Performance"><AIPerformanceDashboard /></ErrorBoundary>}
          {superPage === 'population-health'  && <ErrorBoundary name="Population Health"><PopulationHealthDashboard /></ErrorBoundary>}
          {superPage === 'clinical-rules'     && <ErrorBoundary name="Clinical Rules"><ClinicalRulesDashboard /></ErrorBoundary>}
          {superPage === 'referrals'          && <ErrorBoundary name="Referral Network"><ReferralNetwork /></ErrorBoundary>}
          {superPage === 'compliance'         && <ErrorBoundary name="Compliance"><ComplianceDashboard /></ErrorBoundary>}
          {superPage === 'billing'            && <ErrorBoundary name="Billing"><BillingDashboard /></ErrorBoundary>}
          {superPage === 'roadmap'            && <ErrorBoundary name="Roadmap"><RoadmapPage /></ErrorBoundary>}
          {superPage === 'tenant-onboarding'  && <ErrorBoundary name="Tenant Onboarding"><OnboardingWizard /></ErrorBoundary>}
          {superPage === 'eu-ai-act'          && <ErrorBoundary name="EU AI Act Portal"><EuAiActPortal /></ErrorBoundary>}
          {superPage === 'edge'               && <ErrorBoundary name="Edge AI"><SuperAdminDashboard tab="edge" /></ErrorBoundary>}
        </div>
      </div>
    </RoleGuard>
  );

  return <RadiologistWorkspace onNavigate={navigate} />;
}

// ── Public site router ─────────────────────────────────────────
import { create } from 'zustand';

interface PublicPageStore {
  publicPage: string;
  setPublicPage: (p: string) => void;
}

export const usePublicPageStore = create<PublicPageStore>((set) => ({
  publicPage: 'landing',
  setPublicPage: (p) => set({ publicPage: p }),
}));

function PublicSite() {
  const { publicPage, setPublicPage } = usePublicPageStore();
  const navigate = useNavigate();

  const handleNavigate = (page: string) => {
    if (page === 'login') { navigate('/login'); return; }
    if (page === 'register') { navigate('/register'); return; }
    setPublicPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    analytics.pageView(`/public/${page}`, `SEWA XAI - ${page}`);
  };

  const navProps = { onNavigate: handleNavigate };

  return (
    <>
      {publicPage === 'landing'             && <LandingPage onLogin={() => navigate('/login')} onNavigate={handleNavigate} />}
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
      {publicPage === 'accessibility'       && <AccessibilityPage {...navProps} />}
      {publicPage === 'clinical-validation' && <ClinicalValidationPage {...navProps} />}
      {publicPage === 'clinical-evidence'   && <ClinicalEvidencePage {...navProps} />}
      {publicPage === 'ai-safety'           && <AISafetyPage {...navProps} />}
      {publicPage === 'governance'          && <GovernancePage {...navProps} />}
      {publicPage === 'publications'        && <PublicationsPage {...navProps} />}
      {publicPage === 'research'            && <ResearchPortal {...navProps} />}
      {publicPage === 'partner-portal'      && <PartnerPortalPage {...navProps} />}
      {publicPage === 'whitepaper'          && <TechnicalWhitepaperPage {...navProps} />}
      {publicPage === 'careers'             && <CareersPage {...navProps} />}
      {publicPage === 'press'               && <PressPage {...navProps} />}
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
      {!['landing','login','register','onboarding','onboarding-specialist','pricing','africa-pricing','nhs-procurement','specialized-ai','nhs-dspt-compliance','solutions','research','about','contact','downloads','privacy-policy','terms','cookie-policy','security','clinical-validation','clinical-evidence','ai-safety','governance','publications','partner-portal','whitepaper','careers','press','accessibility','sitemap','docs','status','changelog','triage-ai','uncertainty-ai','metacognition-ai','vision-language-ai','explainable-ai','pathology-ai','mammography-ai','retinal-ai','regulatory','api-docs','developers','training','trust'].includes(publicPage) && (
        <LandingPage onLogin={() => navigate('/login')} onNavigate={handleNavigate} />
      )}
      <CookieBanner onNavigate={handleNavigate} />
    </>
  );
}

// ── Root Redirect ──────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const roleRoutes: Record<string, string> = {
      radiologist: '/dashboard/radiologist',
      doctor: '/dashboard/doctor',
      patient: '/dashboard/patient',
      technician: '/dashboard/technician',
      admin: '/dashboard/admin',
      superadmin: '/dashboard/superadmin',
    };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }
  return <PublicSite />;
}

// ── Auth routes ─────────────────────────────────────────────────
function LoginRoute() { return <LoginPage onNavigate={(p) => {}} />; }
function RegisterRoute() { return <RegisterPage onLogin={() => {}} onInstitutionalOnboarding={() => {}} />; }
function AcceptInviteRoute() {
  const params = useParams();
  return <AcceptInvitePage token={params.token || ''} onLogin={() => {}} />;
}
function ResetPasswordRoute() {
  const params = useParams();
  return <ResetPasswordPage token={params.token || ''} onLogin={() => {}} />;
}
function VerifyEmailRoute() {
  const params = useParams();
  return <VerifyEmailPage token={params.token || ''} onLogin={() => {}} />;
}

// ── Loading fallback ────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg0 }}>
      <div style={{ color:C.textLo, fontSize:12, fontFamily:C.FM }}>Loading...</div>
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────────
import { useTenant } from './hooks/useTenant';

function AppShell() {
  const { isAuthenticated, token, user } = useAuthStore();
  const { fetchWorklist } = useScanStore();
  const { isLoaded } = useTenant();
  const { setLang, setRegion } = useSettingsStore();
  const { isRTL } = useTranslation();

  useEffect(() => {
    analytics.init();
    analytics.consentDenied();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const hide = () => {
      ['splash', 'loading-splash'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.opacity = '0';
          setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
        }
      });
      (window as unknown as { __sewa_hide_splash?: () => void }).__sewa_hide_splash?.();
    };
    hide();
  }, [isLoaded]);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) return;
    socketService.connect(token, user.tenantId);
    socketService.on('ai:result', (data: { urgency: string; primaryFinding: string; scanId: string; confidence: number }) => {
      useScanStore.getState().handleAIResult(data);
      if (data.urgency === 'CRITICAL' || data.urgency === 'URGENT') {
        useNotificationStore.getState().addNotification({
          type: data.urgency === 'CRITICAL' ? 'critical_finding' : 'urgent_finding',
          title: `${data.urgency}: ${data.primaryFinding}`,
          body: `Scan ${data.scanId} — ${(data.confidence * 100).toFixed(1)}% confidence`,
          scanId: data.scanId,
          urgency: data.urgency,
        });
      }
    });
    socketService.on('scan:new', () => fetchWorklist());
    socketService.on('scan:updated', (d: { scanId: string; status: string }) => useScanStore.getState().updateScanStatus(d.scanId, d.status));
    return () => socketService.disconnect();
  }, [isAuthenticated, token, user, fetchWorklist]);

  // ── Initialize Clinical Push Notifications ──
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const clinicalRoles = ['radiologist', 'doctor', 'technician', 'admin', 'superadmin'];
    if (!clinicalRoles.includes(user.role)) return;
    initClinicalPushNotifications().catch(() => {});
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (user?.region) setRegion(user.region);
    if (user?.language) setLang(user.language);
  }, [user, setLang, setRegion]);

  if (!isLoaded) return null;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/onboarding/specialist" element={<SpecialistOnboarding />} />
        <Route path="/auth/accept-invite" element={<AcceptInviteRoute />} />
        <Route path="/reset-password" element={<ResetPasswordRoute />} />
        <Route path="/verify-email" element={<VerifyEmailRoute />} />

        {/* Public site pages */}
        <Route path="/public/*" element={<PublicSite />} />

        {/* Authenticated dashboard routes */}
        <Route path="/dashboard/radiologist" element={<RoleGuard roles={['radiologist','admin','superadmin']}><AuthenticatedLayout /></RoleGuard>} />
        <Route path="/dashboard/doctor" element={<RoleGuard roles={['doctor','admin','superadmin']}><AuthenticatedLayout /></RoleGuard>} />
        <Route path="/dashboard/patient" element={<RoleGuard roles={['patient']}><AuthenticatedLayout /></RoleGuard>} />
        <Route path="/dashboard/technician" element={<RoleGuard roles={['technician','admin','superadmin']}><AuthenticatedLayout /></RoleGuard>} />
        <Route path="/dashboard/admin" element={<RoleGuard roles={['admin']}><AuthenticatedLayout /></RoleGuard>} />
        <Route path="/dashboard/superadmin" element={<RoleGuard roles={['superadmin']}><AuthenticatedLayout /></RoleGuard>} />

        {/* Deep-linkable patient profile */}
        <Route path="/patient/:id" element={<RoleGuard roles={['radiologist','doctor','admin','superadmin']}><PatientProfileWrapper /></RoleGuard>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function PatientProfileWrapper() {
  const { id } = useParams();
  return <PatientProfile patientId={id || ''} onBack={() => window.history.back()} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
