// SEWA AI — BillingDashboard.tsx
// Region-aware billing: Stripe (UK/EU/US), Paystack (NG/ZA/GH), M-Pesa (KE), Flutterwave (GH)
import React, { useState } from 'react';
import { useBillingData } from '../../hooks/useDashboardData';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/apiClient';

const PLANS: Record<string, {
  label:string; price:string; currency:string; period:string;
  scans:string; users:string; storage:string; support:string; compliance:string;
  features:string[]; highlight?:boolean;
}[]> = {
  uk: [
    { label:'Starter', price:'£499', currency:'GBP', period:'/month', scans:'500', users:'10', storage:'500 GB', support:'Email', compliance:'GDPR · NHS DSPT', features:['CT/MRI/X-Ray triage','AI reports (100/mo)','Basic analytics','2-day support SLA'] },
    { label:'Pro', price:'£1,499', currency:'GBP', period:'/month', scans:'2,000', users:'30', storage:'2 TB', support:'Priority + SLA', compliance:'GDPR · NHS DSPT', features:['Unlimited modalities','Unlimited AI reports','Population health dashboard','PACS & FHIR integration','4-hour support SLA'], highlight:true },
    { label:'Enterprise', price:'Custom', currency:'GBP', period:'', scans:'Unlimited', users:'Unlimited', storage:'Unlimited', support:'24/7 + CSM', compliance:'Full GDPR · NHS · MDR', features:['Custom SLAs','Dedicated Azure region','Federated learning','Priority model updates','Compliance reporting','On-site training'] },
  ],
  us: [
    { label:'Starter', price:'$699', currency:'USD', period:'/month', scans:'500', users:'10', storage:'500 GB', support:'Email', compliance:'HIPAA', features:['CT/MRI/X-Ray triage','AI reports (100/mo)','Basic analytics','BAA included'] },
    { label:'Pro', price:'$1,999', currency:'USD', period:'/month', scans:'2,000', users:'30', storage:'2 TB', support:'Priority + SLA', compliance:'HIPAA', features:['Unlimited modalities','Unlimited AI reports','Population health','PACS & FHIR','4-hour SLA','BAA included'], highlight:true },
    { label:'Enterprise', price:'Custom', currency:'USD', period:'', scans:'Unlimited', users:'Unlimited', storage:'Unlimited', support:'24/7 + CSM', compliance:'HIPAA · FDA 510(k)', features:['Custom SLAs','Dedicated infra','Federated learning','FDA compliance package'] },
  ],
  ng: [
    { label:'Impact', price:'₦120,000', currency:'NGN', period:'/month', scans:'Unlimited', users:'Unlimited', storage:'1 TB', support:'Priority', compliance:'NDPR · ISO 13485', features:['Full triage suite','AI reports','Paystack billing','NDPR compliance','Offline-capable'],  highlight:true },
    { label:'Impact+', price:'₦250,000', currency:'NGN', period:'/month', scans:'Unlimited', users:'Unlimited', storage:'5 TB', support:'24/7', compliance:'NDPR · ISO 13485', features:['Everything in Impact','Multi-site support','Advanced analytics','Dedicated support'] },
  ],
  ke: [
    { label:'Impact', price:'KES 18,000', currency:'KES', period:'/month', scans:'Unlimited', users:'Unlimited', storage:'1 TB', support:'Priority', compliance:'DPA 2019', features:['Full triage suite','M-Pesa billing','DPA 2019 compliant','Offline support'], highlight:true },
  ],
};

const PAYMENT_GATEWAYS: Record<string,{name:string;logo:string;currencies:string[];method:string}[]> = {
  uk: [{name:'Stripe',logo:'💳',currencies:['GBP','EUR','USD'],method:'Card / Direct Debit'}],
  eu: [{name:'Stripe',logo:'💳',currencies:['EUR'],method:'Card / SEPA'}],
  us: [{name:'Stripe',logo:'💳',currencies:['USD'],method:'Card / ACH'}],
  ng: [{name:'Paystack',logo:'🟢',currencies:['NGN'],method:'Card / Bank Transfer'}],
  ke: [{name:'M-Pesa',logo:'📱',currencies:['KES'],method:'M-Pesa STK Push'}],
  za: [{name:'Paystack',logo:'🟢',currencies:['ZAR'],method:'Card / EFT'}],
  gh: [{name:'Flutterwave',logo:'🦋',currencies:['GHS'],method:'Card / Mobile Money'}],
  in: [{name:'Stripe',logo:'💳',currencies:['INR'],method:'Card / UPI'}],
};

function UsageBar({ used, total, label, color="#408D7B" }:{ used:number; total:number; label:string; color?:string }) {
  const pct = total > 0 ? Math.min(100, (used/total)*100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="text-[#3A6055]">{label}</span>
        <span className="text-[#D0ECE6] font-mono">{used.toLocaleString()} / {total > 999999 ? '∞' : total.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-[#111F1A] rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-1000 shadow-[0_0_8px_rgba(64,141,123,0.5)]" 
          style={{ width: `${pct}%`, backgroundColor: color }} 
        />
      </div>
    </div>
  );
}

export function BillingDashboard() {
  const { user } = useAuthStore();
  const { stats, history, loading } = useBillingData();
  const region = user?.region ?? 'uk';
  const [tab, setTab] = useState<'overview'|'plans'|'payment'|'history'>('overview');
  const [status, setStatus] = useState<{ msg:string; type:'ok'|'err' } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string|null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const plans = PLANS[region] ?? PLANS.uk;
  const gateways = PAYMENT_GATEWAYS[region] ?? PAYMENT_GATEWAYS.uk;

  const handleUpgrade = async (plan: string) => {
    try {
      const res = await apiClient.post('/payments/subscription', { plan: plan.toLowerCase() });
      if (res.data.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else if (res.data.paymentLink) {
        window.location.href = res.data.paymentLink;
      } else {
        setStatus({ msg: `Successfully switched to ${plan} plan.`, type: 'ok' });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      setStatus({ msg: `Upgrade failed: ${err.response?.data?.message || err.message}`, type: 'err' });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#05100D] overflow-hidden font-sans text-[#D0ECE6]">
      
      {/* Header Bar */}
      <header className={`px-6 lg:px-8 ${isMobile ? 'h-auto py-5 flex-col items-start gap-4' : 'h-20 flex-row items-center justify-between'} border-b border-[#1B3028] bg-[#08160F] z-20`}>
        <div>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-black text-[#D0ECE6] tracking-tighter`}>Billing Terminal</h2>
          <p className="text-[10px] text-[#3A6055] font-bold uppercase tracking-[0.2em] mt-0.5">
            Region: {region.toUpperCase()} <span className="mx-2 opacity-30">•</span> {gateways[0]?.name} Gateway
          </p>
        </div>
        
        <button 
          onClick={async () => {
            try {
              await apiClient.post('/payments/audit-invoice', { region });
              setStatus({ msg: 'Audit invoice dispatched to clinical email.', type: 'ok' });
            } catch { setStatus({ msg: 'Audit service unavailable.', type: 'err' }); }
          }}
          className={`${isMobile ? 'w-full' : ''} px-6 py-3 rounded-xl bg-[#408D7B] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#52B09A] transition-all shadow-xl shadow-[#408D7B]/20`}
        >
          Export Audit Invoice
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {status && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-black uppercase tracking-widest animate-fade-in ${
              status.type === 'ok' ? 'bg-[#1DBF73]/10 border-[#1DBF73]/20 text-[#1DBF73]' : 'bg-[#E03535]/10 border-[#E03535]/20 text-[#E03535]'
            }`}>
              <span>{status.type === 'ok' ? '✓' : '⚠'} {status.msg}</span>
              <button onClick={() => setStatus(null)}>✕</button>
            </div>
          )}

          {/* Plan Banner */}
          <div className={`${isMobile ? 'p-6' : 'p-8'} bg-[#408D7B]/5 border border-[#408D7B]/30 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden shadow-2xl`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#408D7B]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[10px] font-black text-[#408D7B] uppercase tracking-[0.3em]">Active Tier</span>
              <h3 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-black text-[#D0ECE6] tracking-tight flex items-baseline justify-center md:justify-start gap-3`}>
                {loading ? '...' : (stats.plan?.toUpperCase() || 'PRO')}
                <span className="text-xs font-bold text-[#6FA898]">{gateways[0]?.currencies[0]} / {stats.subscriptionStatus || 'Active'}</span>
              </h3>
            </div>
            <div className={`flex gap-3 ${isMobile ? 'flex-col w-full' : ''}`}>
              <button onClick={() => setTab('plans')} className="flex-1 px-6 py-3.5 rounded-xl border border-[#408D7B]/30 text-[#408D7B] text-[10px] font-black uppercase tracking-widest hover:bg-[#408D7B] hover:text-white transition-all shadow-lg">Change Protocol</button>
              <button onClick={() => handleUpgrade(stats.plan || 'pro')} className="flex-1 px-6 py-3.5 rounded-xl bg-[#408D7B] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#52B09A] transition-all shadow-xl shadow-[#408D7B]/20">Renew Node</button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 border-b border-[#1B3028] overflow-x-auto scrollbar-none">
            {[
              { id: 'overview', label: 'Telemetry', icon: '📊' },
              { id: 'plans', label: 'Tiers', icon: '📦' },
              { id: 'payment', label: 'Node', icon: '💳' },
              { id: 'history', label: 'Audit', icon: '📋' }
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id as any)}
                className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${
                  tab === t.id ? 'border-[#408D7B] text-[#D0ECE6] bg-[#408D7B]/5' : 'border-transparent text-[#3A6055] hover:text-[#6FA898]'
                }`}
              >
                <span className="mr-2">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="animate-fade-in">
            
            {tab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Usage Matrix */}
                <div className="p-8 bg-[#08160F] border border-[#1B3028] rounded-[2rem] space-y-6 shadow-xl">
                  <h4 className="text-sm font-black text-[#D0ECE6] uppercase tracking-widest border-b border-[#1B3028] pb-4">Quota Utilization</h4>
                  <div className="space-y-8">
                    <UsageBar label="Monthly AI Inferences" used={loading ? 0 : (stats.quota?.used || 0)} total={stats.quota?.monthly || 1000} />
                    <UsageBar label="Patient Data Nodes" used={loading ? 0 : 2457} total={5000} color="#2A6EF2" />
                    <UsageBar label="Storage Objects (GB)" used={loading ? 0 : 1820} total={2048} color="#E08A20" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'Accrued Bill', val: loading ? '...' : `${gateways[0]?.currencies[0]} ${Number(stats.currentBill || 0).toFixed(2)}`, sub: 'Next cycle: 01 Jun', col: '#408D7B' },
                    { label: 'Pending Auth', val: loading ? '...' : `${gateways[0]?.currencies[0]} ${Number(stats.pendingAmount || 0).toFixed(2)}`, sub: 'Direct Debit / ACH', col: '#D0ECE6' },
                    { label: 'Previous Cycle', val: loading ? '...' : `${gateways[0]?.currencies[0]} ${Number(stats.lastPaymentAmount || 0).toFixed(2)}`, sub: 'Paid 30 Apr', col: '#6FA898' },
                    { label: 'Burst Capacity', val: 'Active', sub: 'Overage protection: ON', col: '#1DBF73' }
                  ].map(s => (
                    <div key={s.label} className="p-6 bg-[#08160F] border border-[#1B3028] rounded-[2rem] shadow-xl group hover:border-[#408D7B]/30 transition-all">
                      <div className="text-[10px] font-black text-[#3A6055] uppercase tracking-widest mb-2">{s.label}</div>
                      <div className="text-2xl font-black font-mono tracking-tighter mb-1" style={{ color: s.col }}>{s.val}</div>
                      <div className="text-[9px] text-[#3A6055] font-bold uppercase tracking-widest">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'plans' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                  <div key={plan.label} className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col gap-6 relative shadow-2xl ${
                    plan.highlight ? 'bg-[#408D7B]/10 border-[#408D7B]' : 'bg-[#08160F] border-[#1B3028] hover:border-[#408D7B]/30'
                  }`}>
                    {plan.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#408D7B] text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Master Tier</span>
                    )}
                    <div>
                      <h4 className="text-lg font-black text-[#D0ECE6] tracking-tight">{plan.label}</h4>
                      <div className="text-3xl font-black font-mono tracking-tighter mt-2 text-[#408D7B]">{plan.price}<span className="text-sm font-normal text-[#6FA898]">{plan.period}</span></div>
                      <p className="text-[9px] text-[#3A6055] font-black uppercase tracking-widest mt-2">{plan.compliance}</p>
                    </div>
                    <div className="space-y-3 border-y border-[#1B3028] py-6">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-center gap-3 text-[10px] font-bold text-[#6FA898] uppercase tracking-widest">
                          <span className="text-[#408D7B]">✓</span> {f}
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleUpgrade(plan.label)}
                      className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        plan.highlight ? 'bg-[#408D7B] text-white shadow-xl shadow-[#408D7B]/20' : 'bg-[#0C1D17] border border-[#1B3028] text-[#D0ECE6] hover:bg-[#111F1A]'
                      }`}
                    >
                      {plan.price === 'Custom' ? 'Contact Logistics' : 'Deploy Protocol'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'payment' && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="p-8 bg-[#08160F] border border-[#1B3028] rounded-[2rem] space-y-6 shadow-xl">
                  <h4 className="text-sm font-black text-[#D0ECE6] uppercase tracking-widest border-b border-[#1B3028] pb-4">Auth Source Node</h4>
                  {gateways.map(gw => (
                    <div key={gw.name} className="p-6 bg-[#0C1D17] border border-[#408D7B]/30 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{gw.logo}</span>
                        <div>
                          <div className="text-sm font-bold text-[#D0ECE6]">{gw.name} Terminal</div>
                          <div className="text-[10px] text-[#3A6055] font-bold uppercase tracking-widest mt-0.5">{gw.method} · {gw.currencies.join(', ')}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#1DBF73]/10 text-[#1DBF73] text-[9px] font-black uppercase tracking-widest border border-[#1DBF73]/20">Active</span>
                    </div>
                  ))}
                  <button className="w-full py-4 rounded-xl border border-[#1B3028] text-[#3A6055] text-[10px] font-black uppercase tracking-widest hover:text-[#D0ECE6] transition-all">Update Source Node</button>
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-4">
                {isMobile ? (
                  history.length === 0 ? (
                    <div className="py-20 text-center text-[#3A6055] font-black uppercase tracking-widest bg-[#08160F] border border-[#1B3028] rounded-[2rem]">No audit history found</div>
                  ) : history.map((tx:any, i:number) => (
                    <div key={i} className="p-6 bg-[#08160F] border border-[#1B3028] rounded-2xl shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] font-mono text-[#6FA898] mb-1">{new Date(tx.createdAt).toLocaleDateString('en-GB')}</div>
                          <div className="text-xs font-bold text-[#D0ECE6]">{tx.planName || 'Monthly Node Subscription'}</div>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-[#1DBF73]/10 text-[#1DBF73] text-[9px] font-black uppercase tracking-widest border border-[#1DBF73]/20">✓ Paid</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-[#1B3028]">
                        <div className="text-sm font-black font-mono text-[#D0ECE6]">{tx.amount} {tx.currency}</div>
                        <button className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest">PDF Node</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#08160F] border border-[#1B3028] rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0C1D17]/50">
                          {['Sync Date','Description','Protocol Value','Status','Receipt'].map(h => (
                            <th key={h} className="px-6 py-4 text-[10px] font-black text-[#3A6055] uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1B3028]">
                        {history.length === 0 ? (
                          <tr><td colSpan={5} className="py-20 text-center text-[#3A6055] font-black uppercase tracking-widest">No audit history found</td></tr>
                        ) : history.map((tx:any, i:number) => (
                          <tr key={i} className="hover:bg-[#111F1A]/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-[#6FA898]">{new Date(tx.createdAt).toLocaleDateString('en-GB')}</td>
                            <td className="px-6 py-4 text-xs font-bold text-[#D0ECE6]">{tx.planName || 'Monthly Node Subscription'}</td>
                            <td className="px-6 py-4 text-xs font-black font-mono text-[#D0ECE6]">{tx.amount} {tx.currency}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded-full bg-[#1DBF73]/10 text-[#1DBF73] text-[9px] font-black uppercase tracking-widest border border-[#1DBF73]/20">✓ {tx.status || 'Paid'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <button className="text-[10px] font-black text-[#408D7B] uppercase tracking-widest hover:underline">PDF Node</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Terminal Footer */}
      <footer className="h-10 bg-[#050F0C] border-t border-[#1B3028] px-8 flex items-center justify-between text-[9px] font-mono text-[#2E5048] font-bold">
        <div className="flex gap-6 uppercase tracking-widest">
          <span className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#408D7B]" /> Region_Node: {region.toUpperCase()}</span>
          <span className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#1DBF73]" /> Billing_Sync: Stable</span>
        </div>
        <div className="flex gap-4">
          <span>Billing_OS v2.4.0</span>
          <span className="text-[#3A6055]">ENCRYPTED_SESSION</span>
        </div>
      </footer>
    </div>
  );
}
