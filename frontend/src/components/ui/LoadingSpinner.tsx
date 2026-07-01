// SEWA XAI — LoadingSpinner.tsx
// Consistent loading states across the platform.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React from 'react';

interface SpinnerProps {
  size?: number;
  message?: string;
  fullscreen?: boolean;
  clinical?: boolean; // clinical mode — more prominent for patient-safety contexts
}

export function LoadingSpinner({ size = 36, message, fullscreen = false, clinical = false }: SpinnerProps) {
  const color = clinical ? '#F59E0B' : '#408D7B';
  const content = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{
        width: size, height: size,
        border: `3px solid #1B3028`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'sewa-spin 0.75s linear infinite',
      }} />
      {message && (
        <div style={{ fontSize: 13, color: '#6FA898', fontFamily:"'IBM Plex Sans',system-ui,sans-serif" }}>
          {message}
        </div>
      )}
      <style>{`@keyframes sewa-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (fullscreen) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(5,15,12,0.85)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
        {content}
      </div>
    );
  }

  return content;
}

// Skeleton loader for content areas
export function SkeletonBlock({ height = 20, width = '100%', borderRadius = 8 }: {
  height?: number; width?: number | string; borderRadius?: number;
}) {
  return (
    <div style={{
      height, width, borderRadius,
      background: 'linear-gradient(90deg, #0C1D17 25%, #111F1A 50%, #0C1D17 75%)',
      backgroundSize: '200% 100%',
      animation: 'sewa-shimmer 1.5s infinite',
    }}>
      <style>{`@keyframes sewa-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}
