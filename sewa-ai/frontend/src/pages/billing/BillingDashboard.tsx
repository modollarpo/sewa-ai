// SEWA AI — BillingDashboard.tsx
// Region-aware billing: Stripe (UK/EU/US), Paystack (NG/ZA/GH), M-Pesa (KE), Flutterwave (GH)
import React, { useState } from 'react';
import { useBillingData } from '../../hooks/useDashboardData';
import { useAuthStore } from '../../store/authStore';

const C = {
  bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A', bg4:'#162821',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', urgent:'#E08A20', normal:'#1DBF73', normalBg:'#0A1F14',
  info:'#2A6EF2',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const S = `
  @media (max-width: 900px) {
    .billing-header { flex-direction: column !important; gap: 16px !important; }
    .plan-banner { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
    .stats-grid { grid-template-columns: 1fr !important; }
    .plans-grid { grid-template-columns: 1fr !important; }
    .history-table-wrapper { overflow-x: auto !important; }
  }
`;

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

// Fallbacks handled in hook

function UsageBar({ used, total, label, color=C.brand }:{ used:number; total:number; label:string; color?:string }) {
  const pct = total > 0 ? Math.min(100, (used/total)*100) : 0;
  const barColor = pct > 90 ? C.critical : pct > 75 ? C.urgent : color;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, color:C.textMd, fontFamily:C.F }}>{label}</span>
        <span style={{ fontSize:11, fontFamily:C.FM, color:C.textHi }}>
          {used.toLocaleString()} / {total > 999999 ? '∞' : total.toLocaleString()}
        </span>
      </div>
      <div style={{ height:5, background:C.bg4, borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:barColor, borderRadius:3, transition:'width 600ms', boxShadow:`0 0 6px ${barColor}60` }}/>
      </div>
    </div>
  );
}

export function BillingDashboard() {
  const { user } = useAuthStore();
  const { stats, history, loading } = useBillingData();
  const region = user?.region ?? 'uk';
  const [tab, setTab] = useState<'overview'|'plans'|'payment'|'history'>('overview');
  const [selectedPlan, setSelectedPlan] = useState<string|null>(null);
  const plans = PLANS[region] ?? PLANS.uk;
  const gateways = PAYMENT_GATEWAYS[region] ?? PAYMENT_GATEWAYS.uk;

  const tabStyle = (t:string): React.CSSProperties => ({
    padding:'8px 16px', fontSize:12, fontWeight:tab===t?600:400,
    color:tab===t?C.brand:C.textLo, background:'none', border:'none',
    borderBottom:`2px solid ${tab===t?C.brand:'transparent'}`,
    marginBottom:'-1px', cursor:'pointer', fontFamily:C.F, whiteSpace:'nowrap',
  });

  return (
    <div style={{ padding:24, background:C.bg1, minHeight:'calc(100vh - 76px)', fontFamily:C.F }}>
      <style>{S}</style>

      {/* Header */}
      <div className="billing-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.textHi }}>Billing & Payments</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:C.textMd }}>
            Region: {region.toUpperCase()} · Payment via {gateways[0]?.name} · Currency: {gateways[0]?.currencies[0]}
          </p>
        </div>
        <button style={{ padding:'8px 16px', background:C.brand, border:'none', borderRadius:8, color:'white', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
          Download Invoice
        </button>
      </div>

      {/* Current plan banner */}
      <div className="plan-banner" style={{ padding:'16px 20px', background:`${C.brand}14`, borderRadius:14, border:`1px solid ${C.brand}40`, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:11, color:C.textMd, marginBottom:3 }}>Current Plan</div>
          <div style={{ fontSize:18, fontWeight:800, color:C.brand }}>
            NHS Enterprise  <span style={{ fontSize:13, fontWeight:400, color:C.textMd }}>· {gateways[0]?.currencies[0]} — Billed monthly</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ padding:'7px 14px', background:'transparent', border:`1px solid ${C.brand}`, borderRadius:8, color:C.brand, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
            Change Plan
          </button>
          <button style={{ padding:'7px 14px', background:C.brand, border:'none', borderRadius:8, color:'white', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:C.F }}>
            Renew Now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:`1px solid ${C.border}`, display:'flex', gap:2, marginBottom:20 }}>
        {(['overview','plans','payment','history'] as const).map(t=>(
          <button key={t} style={tabStyle(t)} onClick={()=>setTab(t)}>
            {t==='overview'&&'📊 '}{t==='plans'&&'📦 '}{t==='payment'&&'💳 '}{t==='history'&&'📋 '}
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Usage meters */}
          <div style={{ padding:20, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:16 }}>Current Usage & Quota</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <UsageBar label="Monthly Active Scans" used={loading ? 0 : 4820} total={999999} color={C.brand}/>
              <UsageBar label="AI Reports Generated" used={loading ? 0 : 4820} total={999999} color={C.brandLt}/>
              <UsageBar label="Storage (GB)" used={loading ? 0 : 2457} total={10240} color={C.info}/>
              <UsageBar label="Active Users" used={loading ? 0 : 34} total={100} color={C.normal}/>
            </div>
          </div>

          {/* Cost summary */}
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12 }}>
            {[
              { label:'Current Bill', value: loading ? '...' : (gateways[0]?.currencies[0] === 'NGN' ? '₦480K' : '£2,400'), sub:'Standard flat rate', color:C.brand },
              { label:'Pending', value: loading ? '...' : (gateways[0]?.currencies[0] === 'NGN' ? '₦0' : '£0'), sub:'Next bill: 1 Apr 2026', color:C.textHi },
              { label:'Last Payment', value: loading ? '...' : (gateways[0]?.currencies[0] === 'NGN' ? '₦480K' : '£2,400'), sub:'Paid on 1 Mar 2026', color:C.textMd },
            ].map(s=>(
              <div key={s.label} style={{ padding:16, background:C.bg2, borderRadius:12, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:11, color:C.textLo, marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:C.FM }}>{s.value}</div>
                <div style={{ fontSize:10, color:C.textLo, marginTop:6 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Usage forecast */}
          <div style={{ padding:18, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.textHi, marginBottom:12 }}>Usage Forecast — Next 30 Days</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80, marginBottom:8 }}>
              {[2400,2520,2680,2750,2820,2900,2950,3000,3050,3100,3150,3200].map((v,i)=>(
                <div key={i} style={{ flex:1 }}>
                  <div style={{ width:'100%', height:`${(v/3200)*80}px`, background: i>=9?`${C.urgent}80`:`${C.brand}80`, borderRadius:'2px 2px 0 0', minHeight:4 }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:9, color:C.textLo, fontFamily:C.FM }}>Today</span>
              <span style={{ fontSize:9, color:C.textLo, fontFamily:C.FM }}>+30 days</span>
            </div>
            <div style={{ marginTop:10, padding:'8px 12px', background:`${C.urgent}0A`, borderRadius:8, border:`1px solid ${C.urgent}30`, fontSize:11, color:C.urgent }}>
              ⚠ Scan volume trending 18% above plan. Consider upgrading to avoid overage charges.
            </div>
          </div>
        </div>
      )}

      {/* PLANS */}
      {tab==='plans' && (
        <div className="plans-grid" style={{ display:'grid', gridTemplateColumns:`repeat(auto-fit, minmax(280px, 1fr))`, gap:14 }}>
          {plans.map(plan=>(
            <div key={plan.label} style={{
              padding:24, borderRadius:16,
              background: plan.highlight ? `${C.brand}12` : C.bg2,
              border:`2px solid ${plan.highlight ? C.brand : C.border}`,
              display:'flex', flexDirection:'column', gap:12, position:'relative',
            }}>
              {plan.highlight && (
                <div style={{ position:'absolute', top:-11, left:'50%', transform:'translateX(-50%)', padding:'2px 14px', background:C.brand, borderRadius:20, fontSize:10, fontWeight:700, color:'white', whiteSpace:'nowrap', fontFamily:C.F }}>
                  MOST POPULAR
                </div>
              )}
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:C.textHi }}>{plan.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color: plan.highlight?C.brand:C.textHi, fontFamily:C.FM, lineHeight:1.1, marginTop:6 }}>
                  {plan.price}<span style={{ fontSize:13, fontWeight:400, color:C.textMd }}>{plan.period}</span>
                </div>
                <div style={{ fontSize:10, color:C.textLo, marginTop:6 }}>{plan.compliance}</div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {[
                  { icon:'🩻', label:`${plan.scans} scans/mo` },
                  { icon:'👥', label:`${plan.users} users` },
                  { icon:'💾', label:`${plan.storage} storage` },
                  { icon:'🛟', label:plan.support },
                ].map(item=>(
                  <div key={item.label} style={{ display:'flex', gap:7, fontSize:12, color:C.textMd }}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, display:'flex', flexDirection:'column', gap:5 }}>
                {plan.features.map(f=>(
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:6, fontSize:11, color:C.textMd }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2.5} style={{ flexShrink:0, marginTop:1 }}><path d="m5 12 5 5L20 7"/></svg>
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={()=>setSelectedPlan(plan.label)}
                style={{
                  padding:'10px', borderRadius:10, cursor:'pointer', fontFamily:C.F, fontSize:13, fontWeight:700, marginTop:'auto',
                  background: plan.highlight ? `linear-gradient(135deg,${C.brand},${C.brandDk})` : C.bg3,
                  color: plan.highlight ? 'white' : C.textMd,
                  border: plan.highlight ? 'none' : `1px solid ${C.border}`,
                  boxShadow: plan.highlight ? `0 4px 14px ${C.brand}40` : 'none',
                }}>
                {plan.price==='Custom' ? 'Contact Sales' : selectedPlan===plan.label ? '✓ Selected' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PAYMENT */}
      {tab==='payment' && (
        <div style={{ maxWidth:560, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:18, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:14 }}>Payment Method</div>
            {gateways.map(gw=>(
              <div key={gw.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:C.bg3, borderRadius:10, border:`1px solid ${C.brand}40` }}>
                <span style={{ fontSize:24 }}>{gw.logo}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textHi }}>{gw.name}</div>
                  <div style={{ fontSize:11, color:C.textMd }}>{gw.method} · {gw.currencies.join(', ')}</div>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:C.normalBg, color:C.normal, border:'1px solid #0D2A1A', fontFamily:C.F }}>
                  ✓ Active
                </span>
              </div>
            ))}
            <button style={{ width:'100%', marginTop:12, padding:'9px', borderRadius:9, background:'transparent', border:`1px solid ${C.border}`, color:C.textMd, fontSize:12, cursor:'pointer', fontFamily:C.F }}>
              Update Payment Method
            </button>
          </div>

          <div style={{ padding:18, background:C.bg2, borderRadius:14, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.textHi, marginBottom:12 }}>Billing Contact</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Billing email',   value:'finance@royallondon.nhs.uk' },
                { label:'PO Number',       value:'PO-2025-0147' },
                { label:'VAT / Tax ID',    value:'GB 123 456 789' },
                { label:'Billing address', value:'Royal London Hospital, Whitechapel Road, E1 1BB' },
              ].map(row=>(
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', background:C.bg3, borderRadius:8 }}>
                  <span style={{ fontSize:11, color:C.textMd }}>{row.label}</span>
                  <span style={{ fontSize:11, color:C.textHi }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab==='history' && (
        <div className="history-table-wrapper" style={{ background:C.bg2, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.textHi }}>Transaction History</span>
            <button style={{ padding:'5px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:7, color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
              Export CSV
            </button>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.bg3 }}>
                {['Date','Description','Amount','Method','Status','Receipt'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:C.textLo, letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:C.F }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={6} style={{padding:40,textAlign:'center',color:C.textLo}}>{loading ? 'Loading history...' : 'No transaction record found.'}</td></tr>
              ) : history.map((tx:any,i:number)=>(
                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:'12px 14px', fontSize:11, color:C.textLo, fontFamily:C.FM, whiteSpace:'nowrap' }}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:C.textHi }}>{tx.planName || 'Monthly Subscription'}</td>
                  <td style={{ padding:'12px 14px', fontSize:13, fontWeight:700, color:C.textHi, fontFamily:C.FM }}>{tx.amount} {tx.currency}</td>
                  <td style={{ padding:'12px 14px', fontSize:11, color:C.textMd }}>{tx.paymentMethod || gateways[0]?.name}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:C.normalBg, color:C.normal, border:'1px solid #0D2A1A', fontFamily:C.F }}>
                      ✓ {tx.status || 'paid'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <button style={{ padding:'3px 8px', borderRadius:6, background:'transparent', border:`1px solid ${C.border}`, color:C.brand, fontSize:10, cursor:'pointer', fontFamily:C.F }}>
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
