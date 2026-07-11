// SEWA XAI — ReferralNetwork.tsx
// AI-powered specialist referral marketplace for cross-border telemedicine
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';

import { dashboardColors as C } from '../../design-system/tokens';

const PRIORITY_COLORS: Record<string, string> = {
  STAT: C.critical, URGENT: C.urgent, ROUTINE: C.brand,
};
const STATUS_COLORS: Record<string, string> = {
  pending: C.urgent, assigned: C.info, completed: C.normal, disagreement: C.purple, cancelled: C.textLo,
};
const REGION_FLAGS: Record<string, string> = {
  uk:'🇬🇧', eu:'🇪🇺', us:'🇺🇸', ng:'🇳🇬', ke:'🇰🇪', za:'🇿🇦', gh:'🇬🇭',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700,
      background: `${color}20`, color, border: `1px solid ${color}30`,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{label}</span>
  );
}

export function ReferralNetwork() {
  const [tab, setTab]                   = useState<'queue'|'specialists'|'stats'>('queue');
  const [referrals, setReferrals]       = useState<any[]>([]);
  const [specialists, setSpecialists]   = useState<any[]>([]);
  const [stats, setStats]               = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedRef, setSelectedRef]   = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 768);

  // New referral form state
  const [newForm, setNewForm] = useState({ scanId: '', reason: '', priority: 'ROUTINE', specialistId: '', billingType: 'patient' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState<{ type: 'ok'|'err'; msg: string }|null>(null);

  useEffect(() => {
    const r = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [refRes, spRes, stRes] = await Promise.all([
        apiClient.get(`/ai/referrals${filterStatus ? `?status=${filterStatus}` : ''}`),
        apiClient.get('/ai/referrals/specialists'),
        apiClient.get('/ai/referrals/stats'),
      ]);
      setReferrals(refRes.data || []);
      setSpecialists(spRes.data || []);
      setStats(stRes.data || null);
    } catch { /* silently handle */ }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll every 10s for live updates
  useEffect(() => {
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '8px 14px', fontSize: 12, fontWeight: tab === t ? 600 : 400,
    color: tab === t ? C.brand : C.textLo, background: 'none', border: 'none',
    borderBottom: `2px solid ${tab === t ? C.brand : 'transparent'}`,
    marginBottom: '-1px', cursor: 'pointer', fontFamily: C.F, whiteSpace: 'nowrap',
  });

  const handleSubmitReferral = async () => {
    if (!newForm.scanId || !newForm.reason) {
      setSubmitMsg({ type: 'err', msg: 'Scan ID and clinical reason are required.' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      await apiClient.post('/ai/referrals', newForm);
      setSubmitMsg({ type: 'ok', msg: 'Referral submitted successfully.' });
      setNewForm({ scanId: '', reason: '', priority: 'ROUTINE', specialistId: '', billingType: 'patient' });
      setTimeout(() => { setShowNewModal(false); setSubmitMsg(null); fetchAll(); }, 1500);
    } catch (e: any) {
      setSubmitMsg({ type: 'err', msg: e.response?.data?.error || 'Failed to submit referral.' });
    } finally { setSubmitting(false); }
  };

  const handleAccept = async (ref: any) => {
    try {
      await apiClient.patch(`/ai/referrals/${ref.id}`, { status: 'assigned' });
      fetchAll();
    } catch { /* ignore */ }
  };

  const handleComplete = async (ref: any, agreedWithAI: boolean) => {
    try {
      await apiClient.patch(`/ai/referrals/${ref.id}`, { status: 'completed', agreedWithAI });
      setSelectedRef(null);
      fetchAll();
    } catch { /* ignore */ }
  };

  const slaColor = (deadline: string) => {
    if (!deadline) return C.textLo;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return C.critical;
    if (diff < 3600000) return C.urgent;
    return C.normal;
  };

  const slaLabel = (deadline: string) => {
    if (!deadline) return 'No SLA';
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return `⚠ OVERDUE`;
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div style={{ padding: isMobile ? 16 : 24, background: C.bg1, minHeight: 'calc(100vh - 76px)', fontFamily: C.F }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: `${C.purple}18`, color: C.purple, border: `1px solid ${C.purple}30`, letterSpacing: '0.06em' }}>
              🔗 REFERRAL NETWORK
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.textHi }}>SEWA Specialist Referral Marketplace</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textMd }}>
            AI-matched cross-border specialist consultations · Secure DICOM sharing · SLA tracking
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)} style={{
          padding: '10px 20px', borderRadius: 10, background: C.brand, color: 'white',
          border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          + New Referral
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Referrals', value: stats.total, color: C.brand, icon: '🔗' },
            { label: 'Awaiting Specialist', value: stats.pending, color: C.urgent, icon: '⏳' },
            { label: 'Completed', value: stats.completed, color: C.normal, icon: '✅' },
            { label: 'SLA Breaches', value: stats.slaBreaches, color: stats.slaBreaches > 0 ? C.critical : C.normal, icon: '⚠️' },
          ].map(s => (
            <div key={s.label} style={{ padding: 16, background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: C.textMd, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                <span>{s.icon}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: C.FM }}>{loading ? '—' : s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 2, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button style={tabStyle('queue')} onClick={() => setTab('queue')}>📋 Referral Queue</button>
        <button style={tabStyle('specialists')} onClick={() => setTab('specialists')}>👩‍⚕️ Specialist Directory</button>
        <button style={tabStyle('stats')} onClick={() => setTab('stats')}>📊 SLA Analytics</button>
      </div>

      {/* Filter bar for queue */}
      {tab === 'queue' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['', 'pending', 'assigned', 'completed', 'disagreement'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '5px 13px', borderRadius: 8, fontSize: 11,
              background: filterStatus === s ? `${C.brand}22` : 'transparent',
              color: filterStatus === s ? C.brand : C.textLo,
              border: `1px solid ${filterStatus === s ? `${C.brand}50` : C.border}`,
              cursor: 'pointer', fontWeight: filterStatus === s ? 700 : 400,
            }}>{s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      )}

      {/* REFERRAL QUEUE */}
      {tab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textLo }}>Loading referrals...</div>
          ) : referrals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textMd }}>No referrals found</div>
              <div style={{ fontSize: 12, color: C.textLo, marginTop: 4 }}>Create a new referral using the button above.</div>
            </div>
          ) : referrals.map((ref: any) => (
            <div key={ref.id} onClick={() => setSelectedRef(ref)} style={{
              padding: 16, background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}`,
              cursor: 'pointer', transition: 'border-color 150ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.brand}50`)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <Badge label={ref.priority} color={PRIORITY_COLORS[ref.priority] || C.brand} />
                    <Badge label={ref.status} color={STATUS_COLORS[ref.status] || C.textLo} />
                    <span style={{ fontSize: 11, color: C.textLo, fontFamily: C.FM }}>#{ref.id.substring(0, 8)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi, marginBottom: 4 }}>
                    {ref.scan?.modality} · {ref.scan?.bodyPart}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMd, marginBottom: 6 }}>{ref.reason}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.textLo, flexWrap: 'wrap' }}>
                    <span>👤 From: <strong style={{ color: C.textMd }}>{ref.requester ? `${ref.requester.firstName} ${ref.requester.lastName}` : 'Unknown'}</strong></span>
                    {ref.assignedTo && <span>🩺 Assigned: <strong style={{ color: C.brand }}>{ref.assignedTo.firstName} {ref.assignedTo.lastName}</strong></span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: slaColor(ref.slaDeadline), fontFamily: C.FM }}>
                    {slaLabel(ref.slaDeadline)}
                  </div>
                  <div style={{ fontSize: 9, color: C.textLo, marginTop: 2 }}>SLA REMAINING</div>
                  <div style={{ fontSize: 10, color: C.textLo, marginTop: 8 }}>
                    {new Date(ref.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
              {/* SLA progress bar */}
              {ref.slaDeadline && (
                <div style={{ marginTop: 10, height: 3, background: C.bg3, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: slaColor(ref.slaDeadline),
                    width: `${Math.max(0, Math.min(100, ((new Date(ref.slaDeadline).getTime() - Date.now()) / (72 * 3600000)) * 100))}%`,
                  }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SPECIALIST DIRECTORY */}
      {tab === 'specialists' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textLo, gridColumn: '1/-1' }}>Loading specialists...</div>
          ) : specialists.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.textLo, gridColumn: '1/-1' }}>No specialists found in the network.</div>
          ) : specialists.map((sp: any) => (
            <div key={sp.id} style={{ padding: 16, background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${C.brand}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {sp.role === 'radiologist' ? '🩻' : '👨‍⚕️'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi }}>{sp.displayName || sp.email}</div>
                    <div style={{ fontSize: 10, color: C.textMd, textTransform: 'capitalize' }}>{sp.role} · {REGION_FLAGS[sp.region] || ''} {sp.region?.toUpperCase() || 'Unknown'}</div>
                  </div>
                </div>
                <Badge
                  label={sp.availability}
                  color={sp.availability === 'available' ? C.normal : sp.availability === 'busy' ? C.urgent : C.critical}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, padding: '8px 10px', background: C.bg3, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.textHi, fontFamily: C.FM }}>{sp.activeReferrals}</div>
                  <div style={{ fontSize: 9, color: C.textLo }}>Active Cases</div>
                </div>
                {sp.consultationFee && (
                  <div style={{ flex: 1, padding: '8px 10px', background: C.bg3, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.brand, fontFamily: C.FM }}>£{sp.consultationFee}</div>
                    <div style={{ fontSize: 9, color: C.textLo }}>Per Consult</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={sp.availability === 'full'}
                  onClick={() => { setNewForm(f => ({ ...f, specialistId: sp.id })); setShowNewModal(true); }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: sp.availability === 'full' ? C.bg3 : C.brand,
                    color: sp.availability === 'full' ? C.textLo : 'white',
                    border: 'none', cursor: sp.availability === 'full' ? 'default' : 'pointer',
                  }}>
                  {sp.availability === 'full' ? 'Unavailable' : 'Request Consult'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SLA ANALYTICS */}
      {tab === 'stats' && stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* Completion breakdown */}
            <div style={{ padding: 20, background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi, marginBottom: 16 }}>Referral Status Breakdown</div>
              {[
                { label: 'Completed', value: stats.completed, color: C.normal },
                { label: 'Pending Assignment', value: stats.pending, color: C.urgent },
                { label: 'SLA Breached', value: stats.slaBreaches, color: C.critical },
              ].map(r => (
                <div key={r.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: C.textMd }}>{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.color, fontFamily: C.FM }}>{r.value}</span>
                  </div>
                  <div style={{ height: 6, background: C.bg3, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${stats.total ? (r.value / stats.total) * 100 : 0}%`, background: r.color, borderRadius: 3 }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* SLA compliance */}
            <div style={{ padding: 20, background: C.bg2, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi, marginBottom: 16 }}>SLA Compliance</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120 }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: stats.slaBreaches === 0 ? C.normal : C.urgent, fontFamily: C.FM }}>
                  {stats.total ? Math.round(((stats.total - stats.slaBreaches) / stats.total) * 100) : 100}%
                </div>
                <div style={{ fontSize: 12, color: C.textLo, marginTop: 4 }}>Cases within SLA</div>
                <div style={{ fontSize: 11, color: C.textLo, marginTop: 8 }}>STAT: 2h · URGENT: 8h · ROUTINE: 72h</div>
              </div>
            </div>
          </div>

          {/* Africa impact note */}
          <div style={{ padding: 16, background: `${C.brand}0A`, borderRadius: 12, border: `1px solid ${C.brand}30` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.brand, marginBottom: 6 }}>🌍 Africa Impact</div>
            <div style={{ fontSize: 12, color: C.textMd, lineHeight: 1.7 }}>
              In Sub-Saharan Africa there is 1 radiologist per 1,000,000 people vs 1 per 10,000 in the UK.
              The SEWA Referral Network directly connects rural Nigerian hospitals with London or Johannesburg specialists within <strong style={{ color: C.brand }}>4 hours</strong>,
              with a 10% platform commission on all fees processed — creating a sustainable revenue stream while closing the access gap.
            </div>
          </div>
        </div>
      )}

      {/* NEW REFERRAL MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
          <div style={{ background: C.bg2, padding: 24, borderRadius: 16, width: '100%', maxWidth: 480, border: `1px solid ${C.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: C.textHi, fontSize: 16, fontWeight: 700 }}>New Specialist Referral</h3>
              <button onClick={() => { setShowNewModal(false); setSubmitMsg(null); }} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {[
              { label: 'Scan ID', key: 'scanId', placeholder: 'Paste the scan UUID...' },
              { label: 'Clinical Reason', key: 'reason', placeholder: 'Describe the clinical question or concern...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  value={(newForm as any)[f.key]}
                  onChange={e => setNewForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textHi, fontSize: 12, fontFamily: C.F, boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 4 }}>Priority</label>
              <select
                value={newForm.priority}
                onChange={e => setNewForm(p => ({ ...p, priority: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textHi, fontSize: 12, fontFamily: C.F }}
              >
                <option value="ROUTINE">ROUTINE (72h SLA)</option>
                <option value="URGENT">URGENT (8h SLA)</option>
                <option value="STAT">STAT (2h SLA)</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 4 }}>Billing Setup</label>
              <select
                value={newForm.billingType}
                onChange={e => setNewForm(p => ({ ...p, billingType: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textHi, fontSize: 12, fontFamily: C.F }}
              >
                <option value="patient">Patient Pays Out-of-Pocket ($150)</option>
                <option value="hospital">Hospital Invoice ($75 Platform Fee)</option>
              </select>
            </div>

            {specialists.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 4 }}>Assign to Specialist (optional)</label>
                <select
                  value={newForm.specialistId}
                  onChange={e => setNewForm(p => ({ ...p, specialistId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textHi, fontSize: 12, fontFamily: C.F }}
                >
                  <option value="">— Let AI match a specialist —</option>
                  {specialists.filter(s => s.availability !== 'full').map(s => (
                    <option key={s.id} value={s.id}>{s.displayName || s.email} · {s.role} · {s.region?.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}

            {submitMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: submitMsg.type === 'ok' ? `${C.normal}18` : `${C.critical}18`, color: submitMsg.type === 'ok' ? C.normal : C.critical, fontSize: 12, fontWeight: 600 }}>
                {submitMsg.type === 'ok' ? '✓' : '⚠'} {submitMsg.msg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => { setShowNewModal(false); setSubmitMsg(null); }} style={{ flex: 1, padding: 12, background: 'transparent', color: C.textLo, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              <button onClick={handleSubmitReferral} disabled={submitting} style={{ flex: 2, padding: 12, background: C.brand, color: 'white', border: 'none', borderRadius: 10, cursor: submitting ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Submitting...' : '🔗 Submit Referral'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFERRAL DETAIL MODAL */}
      {selectedRef && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
          <div style={{ background: C.bg2, padding: 24, borderRadius: 16, width: '100%', maxWidth: 520, border: `1px solid ${C.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: C.textHi, fontSize: 16, fontWeight: 700 }}>Referral #{selectedRef.id.substring(0, 8)}</h3>
              <button onClick={() => setSelectedRef(null)} style={{ background: 'none', border: 'none', color: C.textLo, cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Badge label={selectedRef.priority} color={PRIORITY_COLORS[selectedRef.priority] || C.brand} />
              <Badge label={selectedRef.status} color={STATUS_COLORS[selectedRef.status] || C.textLo} />
            </div>

            {[
              { label: 'Modality / Body Part', value: `${selectedRef.scan?.modality} · ${selectedRef.scan?.bodyPart}` },
              { label: 'Clinical Reason', value: selectedRef.reason },
              { label: 'Requested by', value: selectedRef.requester ? `${selectedRef.requester.firstName} ${selectedRef.requester.lastName}` : 'Unknown' },
              { label: 'Assigned Specialist', value: selectedRef.assignedTo ? `${selectedRef.assignedTo.firstName} ${selectedRef.assignedTo.lastName}` : 'Awaiting assignment' },
              { label: 'SLA Remaining', value: slaLabel(selectedRef.slaDeadline) },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: C.textLo, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                <div style={{ fontSize: 13, color: C.textHi }}>{f.value}</div>
              </div>
            ))}

            {selectedRef.status === 'pending' && (
              <button onClick={() => handleAccept(selectedRef)} style={{ width: '100%', padding: 12, background: C.brand, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>
                ✋ Accept & Assign to Me
              </button>
            )}

            {selectedRef.status === 'assigned' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => handleComplete(selectedRef, true)} style={{ flex: 1, padding: 12, background: C.normal, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                  ✅ Agree with AI
                </button>
                <button onClick={() => handleComplete(selectedRef, false)} style={{ flex: 1, padding: 12, background: `${C.critical}CC`, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>
                  ❌ Disagree with AI
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
