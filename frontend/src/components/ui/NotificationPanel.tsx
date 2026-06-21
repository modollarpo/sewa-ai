// SEWA AI — NotificationPanel.tsx
// Slide-out notification drawer — grouped, urgency-aware, mark read, socket-driven
import React, { useEffect, useRef } from 'react';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B',
  critical:'#E03535', critBg:'#2A0A0A',
  urgent:'#E08A20',   urgBg:'#2A1800',
  normal:'#1DBF73',   normalBg:'#0A1F14',
  info:'#2A6EF2',     infoBg:'#0A1530',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: { scanId?:string; urgency?:string };
  urgency?: string;
  scanId?: string;
}

interface Props {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)   return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}

function notifStyle(n: Notification): { accent:string; bg:string } {
  const urgency = (n.urgency ?? n.data?.urgency ?? n.type ?? '').toUpperCase();
  if (urgency === 'CRITICAL' || n.type === 'critical_finding' || n.type === 'stroke_code') {
    return { accent:C.critical, bg:C.critBg };
  }
  if (urgency === 'URGENT') return { accent:C.urgent, bg:C.urgBg };
  if (n.type === 'report_signed' || n.type === 'scan_complete') return { accent:C.normal, bg:C.normalBg };
  if (n.type === 'system') return { accent:C.info, bg:C.infoBg };
  return { accent:C.brand, bg:`${C.brand}12` };
}

function notifIcon(type: string): string {
  const m: Record<string,string> = {
    critical_finding:'🚨', stroke_code:'⚡', urgent_finding:'⚠️',
    report_signed:'✅', scan_complete:'🩻', second_opinion:'💬',
    system:'ℹ️', billing:'💳',
  };
  return m[type] ?? '🔔';
}



export function NotificationPanel({ notifications: propNotifs, onClose, onMarkRead }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const notifications = propNotifs;
  const unread = notifications.filter(n => !n.read);
  const hasUnread = unread.length > 0;

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const markAllRead = () => unread.forEach(n => onMarkRead(n.id));

  return (
    <>
      {/* Backdrop */}
      <div style={{ position:'fixed', inset:0, zIndex:149, background:'rgba(0,0,0,0.3)' }} onClick={onClose}/>

      {/* Panel */}
      <div ref={panelRef} style={{
        position:'fixed', top:52, right:0, bottom:24, zIndex:150,
        width:380, background:C.bg1,
        borderLeft:`1px solid ${C.border}`,
        display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 32px rgba(0,0,0,0.5)',
        animation:'slideIn 200ms ease',
      }}>
        <style>{`@keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:none; opacity:1; } }`}</style>

        {/* Header */}
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14, fontWeight:700, color:C.textHi, fontFamily:C.F }}>Notifications</span>
            {hasUnread && (
              <span style={{ padding:'2px 7px', borderRadius:20, background:C.critical, color:'white', fontSize:10, fontWeight:700, fontFamily:C.FM }}>
                {unread.length}
              </span>
            )}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {hasUnread && (
              <button onClick={markAllRead} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:'transparent', color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.textMd, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Group: Unread critical */}
        {unread.filter(n => n.type === 'critical_finding' || n.type === 'stroke_code').length > 0 && (
          <div style={{ padding:'8px 12px 0', flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:600, color:C.critical, letterSpacing:'0.06em', marginBottom:6, fontFamily:C.F }}>
              🚨 CRITICAL ALERTS
            </div>
          </div>
        )}

        {/* Notification list */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:C.textLo, fontSize:13, fontFamily:C.F }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🔔</div>
              No notifications
            </div>
          ) : (
            notifications.map(n => {
              const { accent, bg } = notifStyle(n);
              return (
                <div key={n.id}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  style={{
                    padding:'12px 14px',
                    borderBottom:`1px solid ${C.border}`,
                    borderLeft:`3px solid ${n.read ? 'transparent' : accent}`,
                    background: n.read ? 'transparent' : `${bg}60`,
                    cursor: n.read ? 'default' : 'pointer',
                    transition:'background 120ms',
                    display:'flex', gap:10, alignItems:'flex-start',
                  }}>

                  {/* Icon */}
                  <div style={{
                    width:32, height:32, borderRadius:9, flexShrink:0,
                    background: `${accent}18`, border:`1px solid ${accent}30`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:15,
                  }}>
                    {notifIcon(n.type)}
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:12, fontWeight:n.read?400:700, color:n.read?C.textMd:C.textHi, fontFamily:C.F, lineHeight:1.3 }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <div style={{ width:7, height:7, borderRadius:'50%', background:accent, flexShrink:0, marginTop:3, boxShadow:`0 0 5px ${accent}` }}/>
                      )}
                    </div>
                    <p style={{ margin:0, fontSize:11, color:C.textLo, fontFamily:C.F, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                      {n.body}
                    </p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
                      <span style={{ fontSize:10, color:C.textLo, fontFamily:C.FM }}>
                        {fmtRelative(n.createdAt)}
                      </span>
                      {(n.scanId ?? n.data?.scanId) && (
                        <button style={{ fontSize:10, padding:'1px 7px', borderRadius:5, background:`${accent}18`, color:accent, border:`1px solid ${accent}30`, cursor:'pointer', fontFamily:C.F, fontWeight:600 }}>
                          View Scan →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
          <button style={{ width:'100%', padding:'8px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', color:C.textMd, fontSize:11, cursor:'pointer', fontFamily:C.F }}>
            View All Notifications
          </button>
        </div>
      </div>
    </>
  );
}
