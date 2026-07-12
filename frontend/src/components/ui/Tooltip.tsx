// SEWA XAI — Tooltip.tsx
// Accessible tooltip with WCAG 2.2 AA keyboard support and clinical helper text.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React, { useState, useRef, useId } from 'react';

const C = {
  bg: '#0C1D17', border: '#1B3028',
  text: '#D0ECE6', textSub: '#6FA898',
  F: "'IBM Plex Sans',system-ui,sans-serif",
};

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  clinical?: boolean;     // clinical mode: adds ℹ️ icon and amber border
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', maxWidth = 280, clinical = false, delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  const posStyle: React.CSSProperties = (() => {
    switch (position) {
      case 'bottom': return { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
      case 'left':   return { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' };
      case 'right':  return { left: 'calc(100% + 8px)',  top: '50%', transform: 'translateY(-50%)' };
      default:       return { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
    }
  })();

  return (
    <span
      ref={anchorRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      {children}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            ...posStyle,
            zIndex: 9000,
            maxWidth,
            background: C.bg,
            border: `1px solid ${clinical ? '#F59E0B60' : C.border}`,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            lineHeight: 1.65,
            color: C.text,
            fontFamily: C.F,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            whiteSpace: 'normal',
            pointerEvents: 'none',
          }}
        >
          {clinical && (
            <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              ℹ Clinical Note
            </span>
          )}
          {content}
        </div>
      )}
    </span>
  );
}

// Helper text component (appears below a field, always visible)
export function HelperText({ children, error = false, warning = false }: {
  children: React.ReactNode;
  error?: boolean;
  warning?: boolean;
}) {
  const color = error ? '#E03535' : warning ? '#F59E0B' : '#6FA898';
  return (
    <div style={{ fontSize: 11, color, marginTop: 4, lineHeight: 1.5, fontFamily: C.F }}>
      {error && '⚠ '}{warning && '⚠ '}{children}
    </div>
  );
}

// Field label with optional required indicator and tooltip
export function FieldLabel({ label, required, tooltip, htmlFor }: {
  label: string; required?: boolean; tooltip?: string; htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#D0ECE6', fontFamily: C.F }}>
      {label}
      {required && <span style={{ color: '#E03535', fontSize: 12 }}>*</span>}
      {tooltip && (
        <Tooltip content={tooltip} position="right">
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#1B3028', color: '#6FA898', fontSize: 10, cursor: 'help', flexShrink: 0 }}>?</span>
        </Tooltip>
      )}
    </label>
  );
}
