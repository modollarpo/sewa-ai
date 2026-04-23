// SEWA AI — ProfileSettings.tsx
// Management of Clinical Persona, Notification Rules, and Security
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A', brandDk:'#2E6B5E',
  critical:'#E03535', normal:'#1DBF73', info:'#2A6EF2',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F: "'IBM Plex Sans', system-ui, sans-serif",
};

const S = `
  @media (max-width: 768px) {
    .settings-layout { flex-direction: column !important; }
    .settings-sidebar { width: 100% !important; flex-direction: row !important; overflow-x: auto; padding-bottom: 8px; }
    .settings-sidebar button { white-space: nowrap; flex: 1; text-align: center !important; }
    .settings-content { padding: 24px !important; }
    .form-row { flex-direction: column !important; gap: 0 !important; }
  }
`;

export function ProfileSettings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile'|'security'|'notifications'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  const inputStyle = {
    width:'100%', padding:'12px 14px', background:C.bg3, border:`1px solid ${C.border}`,
    borderRadius:10, color:C.textHi, fontSize:14, fontFamily:C.F, outline:'none', marginBottom:16
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Clinical profile updated successfully.');
    }, 1000);
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', fontFamily: C.F }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: C.textHi, fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Account Settings</h1>
        <p style={{ color: C.textMd, margin: 0, fontSize: 14 }}>Manage your clinical identity and platform preferences.</p>
      </div>

      <style>{S}</style>
      <div className="settings-layout" style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar */}
        <div className="settings-sidebar" style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {['profile', 'security', 'notifications'].map((t: any) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '12px 16px', textAlign: 'left', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === t ? `${C.brand}20` : 'transparent',
              color: activeTab === t ? C.brandLt : C.textLo,
              fontWeight: activeTab === t ? 700 : 400,
              fontSize: 14, transition: 'all 200ms'
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content" style={{ flex: 1, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, overflow: 'hidden' }}>
          {activeTab === 'profile' && (
            <div>
              <h2 style={{ color: C.textHi, fontSize: 18, margin: '0 0 20px' }}>Personal Information</h2>
              <div className="form-row" style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 6 }}>FIRST NAME</label>
                  <input defaultValue={user?.firstName} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 6 }}>LAST NAME</label>
                  <input defaultValue={user?.lastName} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 6 }}>CLINICAL EMAIL</label>
                <input defaultValue={user?.email} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textLo, display: 'block', marginBottom: 6 }}>CLINICAL ROLE</label>
                <input defaultValue={user?.role?.toUpperCase()} disabled style={{ ...inputStyle, opacity: 0.6 }} />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 style={{ color: C.textHi, fontSize: 18, margin: '0 0 20px' }}>Security & Authentication</h2>
              <div style={{ padding: 20, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: C.textHi, fontSize: 14, fontWeight: 700 }}>Two-Factor Authentication</div>
                    <div style={{ color: C.textLo, fontSize: 12 }}>Enabled via Google Authenticator</div>
                  </div>
                  <button style={{ padding: '8px 16px', background: C.bg2, border: `1px solid ${C.border}`, color: C.textMd, borderRadius: 8, cursor: 'pointer' }}>Manage</button>
                </div>
              </div>
              <button style={{ padding: '12px 20px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textHi, borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>Change Password</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 style={{ color: C.textHi, fontSize: 18, margin: '0 0 20px' }}>Notification Preferences</h2>
              {[
                { label: 'STAT Scan Alerts', desc: 'Real-time desktop notifications for critical findings.', active: true },
                { label: 'Worklist Updates', desc: 'Email digest of daily scan volumes and statuses.', active: false },
                { label: 'System Announcements', desc: 'New feature updates and maintenance notices.', active: true }
              ].map((n, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                  <div>
                    <div style={{ color: C.textHi, fontSize: 14, fontWeight: 600 }}>{n.label}</div>
                    <div style={{ color: C.textLo, fontSize: 12 }}>{n.desc}</div>
                  </div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: n.active ? C.brand : C.bg3, border: `1px solid ${C.border}`, cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} disabled={isSaving} style={{
              padding: '12px 32px', background: C.brand, color: 'white', border: 'none', borderRadius: 10,
              fontWeight: 700, cursor: 'pointer', fontSize: 14, opacity: isSaving ? 0.6 : 1
            }}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
