// SEWA XAI — frontend/src/design-system/components.tsx
// Atomic component library — every UI primitive used across SEWA.
// All components use inline styles tied to design tokens for portability.

import React, { useState, forwardRef } from 'react';
import { colors, typography, radius, shadows, transitions, urgencyStyles } from './tokens';

// ── cn helper (no clsx dependency) ────────────────────────────
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?:    'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?:    React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconRight, fullWidth, children, disabled, style, 'aria-label': ariaLabel, ...props }, ref) => {
    const [hovered, setHovered] = useState(false);

    const base: React.CSSProperties = {
      display:        'inline-flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '6px',
      fontFamily:     typography.fontBase,
      fontWeight:     typography.weight.medium,
      borderRadius:   radius.md,
      border:         '1px solid transparent',
      cursor:         disabled || loading ? 'not-allowed' : 'pointer',
      opacity:        disabled || loading ? 0.5 : 1,
      transition:     `all ${transitions.base}`,
      whiteSpace:     'nowrap',
      width:          fullWidth ? '100%' : undefined,
      outline:        'none',
      letterSpacing:  '0.01em',
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      xs: { height: '24px', padding: '0 8px',  fontSize: typography.size.xs },
      sm: { height: '30px', padding: '0 12px', fontSize: typography.size.sm },
      md: { height: '36px', padding: '0 16px', fontSize: typography.size.base },
      lg: { height: '44px', padding: '0 24px', fontSize: typography.size.md },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: hovered ? colors.brandDark : colors.brand,
        color:      colors.textInverse,
        boxShadow:  hovered ? shadows.brand : 'none',
      },
      secondary: {
        background: hovered ? colors.bg4 : colors.bg3,
        color:      colors.textHigh,
        border:     `1px solid ${colors.bgBorder}`,
      },
      ghost: {
        background: hovered ? colors.bg4 : 'transparent',
        color:      colors.textMed,
      },
      danger: {
        background: hovered ? '#B02020' : colors.critical,
        color:      colors.white,
      },
      outline: {
        background: 'transparent',
        color:      colors.brand,
        border:     `1px solid ${colors.brand}`,
        boxShadow:  hovered ? shadows.brand : 'none',
      },
    };

    return (
      <button
        ref={ref}
        {...props}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-disabled={disabled || loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ ...base, ...sizeStyles[size], ...variantStyles[variant], ...style }}
      >
        {loading ? <Spinner size={14} color="currentColor" /> : icon}
        {children}
        {iconRight}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ─────────────────────────────────────────────────────────────
// BADGE / PILL
// ─────────────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'brand' | 'critical' | 'urgent' | 'normal' | 'info' | 'warning';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function Badge({ variant = 'default', children, dot, size = 'sm', style }: BadgeProps) {
  const variantMap: Record<BadgeVariant, React.CSSProperties> = {
    default:  { background: colors.bg3, color: colors.textMed, border: `1px solid ${colors.bgBorder}` },
    brand:    { background: `${colors.brand}20`, color: colors.brandLight, border: `1px solid ${colors.brand}40` },
    critical: { background: colors.criticalBg, color: colors.critical, border: `1px solid ${colors.criticalMuted}` },
    urgent:   { background: colors.urgentBg,   color: colors.urgent,   border: `1px solid #3A2000` },
    normal:   { background: colors.normalBg,   color: colors.normal,   border: `1px solid #0D2A1A` },
    info:     { background: colors.infoBg,     color: colors.info,     border: `1px solid #152040` },
    warning:  { background: colors.warningBg,  color: colors.warning,  border: `1px solid #2A1800` },
  };

  const dotColors: Record<BadgeVariant, string> = {
    default:  colors.textLow, brand:  colors.brand,
    critical: colors.critical, urgent: colors.urgent,
    normal:   colors.normal,   info:   colors.info, warning: colors.warning,
  };

  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '4px',
      padding:      size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: radius.full,
      fontSize:     size === 'sm' ? typography.size.xs : typography.size.sm,
      fontWeight:   typography.weight.medium,
      fontFamily:   typography.fontBase,
      letterSpacing:'0.02em',
      ...variantMap[variant],
      ...style,
    }}>
      {dot && (
        <span style={{
          width: '5px', height: '5px',
          borderRadius: '50%',
          background: dotColors[variant],
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// URGENCY PILL — clinical severity indicator
// ─────────────────────────────────────────────────────────────
export function UrgencyPill({ urgency }: { urgency: string }) {
  const u = (urgency || 'ROUTINE').toUpperCase() as keyof typeof urgencyStyles;
  const s = urgencyStyles[u] ?? urgencyStyles.ROUTINE;
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          '5px',
      padding:      '3px 10px',
      borderRadius: radius.full,
      fontSize:     typography.size.xs,
      fontWeight:   typography.weight.bold,
      fontFamily:   typography.fontBase,
      letterSpacing:'0.06em',
      textTransform:'uppercase' as const,
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: `0 0 4px ${s.dot}` }} />
      {urgency || 'ROUTINE'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// CONFIDENCE BAR
// ─────────────────────────────────────────────────────────────
export function ConfidenceBar({ value, size = 'md', showLabel = true }: {
  value: number; // 0–1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? colors.normal : pct >= 65 ? colors.warning : colors.critical;
  const heights = { sm: 3, md: 5, lg: 8 };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1,
        height: `${heights[size]}px`,
        background: colors.bg3,
        borderRadius: radius.full,
        overflow: 'hidden',
        border: `1px solid ${colors.bgBorder}`,
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: radius.full,
          transition: 'width 600ms ease',
          boxShadow: `0 0 6px ${color}60`,
        }} />
      </div>
      {showLabel && (
        <span style={{
          fontSize: typography.size.xs,
          fontFamily: typography.fontMono,
          fontWeight: typography.weight.bold,
          color,
          minWidth: '34px',
          textAlign: 'right',
        }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = colors.brand }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'sewa-spin 0.8s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes sewa-spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?:  string;
  icon?:  React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{
            fontSize:   typography.size.sm,
            fontWeight: typography.weight.medium,
            color:      colors.textMed,
            fontFamily: typography.fontBase,
          }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <span style={{ position: 'absolute', left: '10px', color: colors.textLow, display: 'flex' }}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            {...props}
            onFocus={e => { setFocused(true); props.onFocus?.(e); }}
            onBlur={e => { setFocused(false); props.onBlur?.(e); }}
            style={{
              width:        '100%',
              height:       '36px',
              padding:      `0 ${iconRight ? '36px' : '12px'} 0 ${icon ? '34px' : '12px'}`,
              background:   colors.bg2,
              border:       `1px solid ${error ? colors.critical : focused ? colors.brand : colors.bgBorder}`,
              borderRadius: radius.md,
              color:        colors.textHigh,
              fontSize:     typography.size.base,
              fontFamily:   typography.fontBase,
              outline:      'none',
              transition:   `border-color ${transitions.fast}`,
              boxShadow:    focused ? (error ? shadows.critical : shadows.brand) : 'none',
              ...style,
            }}
          />
          {iconRight && (
            <span style={{ position: 'absolute', right: '10px', color: colors.textLow, display: 'flex' }}>
              {iconRight}
            </span>
          )}
        </div>
        {error && <p style={{ fontSize: typography.size.xs, color: colors.critical, fontFamily: typography.fontBase }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: typography.size.xs, color: colors.textLow, fontFamily: typography.fontBase }}>{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─────────────────────────────────────────────────────────────
// SELECT
// ─────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, style, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: typography.size.sm, fontWeight: typography.weight.medium, color: colors.textMed, fontFamily: typography.fontBase }}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        {...props}
        style={{
          height:       '36px',
          padding:      '0 12px',
          background:   colors.bg2,
          border:       `1px solid ${colors.bgBorder}`,
          borderRadius: radius.md,
          color:        colors.textHigh,
          fontSize:     typography.size.base,
          fontFamily:   typography.fontBase,
          outline:      'none',
          cursor:       'pointer',
          ...style,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ background: colors.bg2 }}>{o.label}</option>)}
      </select>
    </div>
  )
);
Select.displayName = 'Select';

// ─────────────────────────────────────────────────────────────
// TOGGLE SWITCH
// ─────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, size = 'md' }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const w = size === 'sm' ? 28 : 36;
  const h = size === 'sm' ? 16 : 20;
  const knob = size === 'sm' ? 10 : 14;

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width:        `${w}px`,
          height:       `${h}px`,
          borderRadius: radius.full,
          background:   checked ? colors.brand : colors.bg4,
          border:       `1px solid ${checked ? colors.brand : colors.bgBorder}`,
          position:     'relative',
          transition:   `background ${transitions.base}`,
          flexShrink:   0,
          boxShadow:    checked ? shadows.brand : 'none',
        }}
      >
        <div style={{
          position:   'absolute',
          top:        `${(h - knob) / 2 - 1}px`,
          left:       checked ? `${w - knob - 3}px` : '2px',
          width:      `${knob}px`,
          height:     `${knob}px`,
          borderRadius:'50%',
          background: colors.white,
          transition: `left ${transitions.base}`,
          boxShadow:  shadows.sm,
        }} />
      </div>
      {label && (
        <span style={{ fontSize: typography.size.sm, color: colors.textMed, fontFamily: typography.fontBase }}>
          {label}
        </span>
      )}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, trend, icon, color = colors.brand, critical
}: {
  label: string; value: string | number; sub?: string;
  trend?: { direction: 'up' | 'down'; value: string; positive?: boolean };
  icon?: React.ReactNode; color?: string; critical?: boolean;
}) {
  return (
    <div style={{
      background:   critical ? colors.criticalBg : colors.bg2,
      border:       `1px solid ${critical ? colors.criticalMuted : colors.bgBorder}`,
      borderRadius: radius.xl,
      padding:      '20px',
      display:      'flex',
      flexDirection:'column',
      gap:          '12px',
      boxShadow:    critical ? shadows.critical : shadows.sm,
      transition:   `transform ${transitions.base}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: typography.size.sm, color: colors.textMed, fontFamily: typography.fontBase }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: '32px', height: '32px', borderRadius: radius.md,
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <div style={{
          fontSize:   typography.size['3xl'],
          fontWeight: typography.weight.bold,
          color:      critical ? colors.critical : colors.textHigh,
          fontFamily: typography.fontBase,
          lineHeight: typography.lineHeight.tight,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: typography.size.xs, color: colors.textLow, marginTop: '4px', fontFamily: typography.fontBase }}>
            {sub}
          </div>
        )}
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            fontSize: typography.size.xs,
            color:    trend.positive ? colors.normal : trend.direction === 'up' ? colors.critical : colors.normal,
            fontWeight: typography.weight.medium,
          }}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
          </span>
          <span style={{ fontSize: typography.size.xs, color: colors.textLow }}>vs last period</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD
// ─────────────────────────────────────────────────────────────
export function Card({
  children, padding = '20px', style, onClick, hoverable
}: {
  children: React.ReactNode; padding?: string | number;
  style?: React.CSSProperties; onClick?: () => void; hoverable?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const computePadding = (p: string | number) => {
    if (typeof p === 'number') {
      return `${p}px`;
    }
    return p;
  };
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   colors.bg2,
        border:       `1px solid ${hovered && hoverable ? colors.brand + '60' : colors.bgBorder}`,
        borderRadius: radius.xl,
        padding:      computePadding(padding),
        transition:   `all ${transitions.base}`,
        cursor:       onClick ? 'pointer' : undefined,
        boxShadow:    hovered && hoverable ? shadows.brand : shadows.sm,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────
export function Divider({ label, vertical }: { label?: string; vertical?: boolean }) {
  if (vertical) return <div style={{ width: '1px', background: colors.bgBorder, alignSelf: 'stretch' }} />;
  if (!label) return <div style={{ height: '1px', background: colors.bgBorder }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: 1, height: '1px', background: colors.bgBorder }} />
      <span style={{ fontSize: typography.size.xs, color: colors.textLow, fontFamily: typography.fontBase }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: colors.bgBorder }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ALERT BANNER
// ─────────────────────────────────────────────────────────────
export function AlertBanner({ type = 'info', title, body, onDismiss }: {
  type?: 'info' | 'warning' | 'critical' | 'success';
  title: string; body?: string; onDismiss?: () => void;
}) {
  const styles = {
    info:     { bg: colors.infoBg,     border: '#152040', icon: 'ℹ', color: colors.info },
    warning:  { bg: colors.warningBg,  border: '#2A1800', icon: '⚠', color: colors.warning },
    critical: { bg: colors.criticalBg, border: colors.criticalMuted, icon: '🚨', color: colors.critical },
    success:  { bg: colors.normalBg,   border: '#0D2A1A', icon: '✓',  color: colors.normal },
  };
  const s = styles[type];

  return (
    <div style={{
      display:      'flex',
      alignItems:   'flex-start',
      gap:          '12px',
      padding:      '14px 16px',
      background:   s.bg,
      border:       `1px solid ${s.border}`,
      borderRadius: radius.lg,
      borderLeft:   `3px solid ${s.color}`,
    }}>
      <span style={{ fontSize: '14px', lineHeight: 1 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: s.color, margin: 0, fontFamily: typography.fontBase }}>{title}</p>
        {body && <p style={{ fontSize: typography.size.xs, color: colors.textMed, marginTop: '4px', margin: 0, fontFamily: typography.fontBase }}>{body}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: colors.textLow, cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '14px' }}>✕</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────
export function Skeleton({ width, height, radius: r = 8 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div style={{
      width:        width || '100%',
      height:       `${height || 16}px`,
      borderRadius: `${r}px`,
      background:   `linear-gradient(90deg, ${colors.bg2} 25%, ${colors.bg3} 50%, ${colors.bg2} 75%)`,
      backgroundSize: '200% 100%',
      animation:    'sewa-shimmer 1.5s infinite',
    }}>
      <style>{`@keyframes sewa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; badge?: string | number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '2px', borderBottom: `1px solid ${colors.bgBorder}` }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding:      '10px 16px',
            fontSize:     typography.size.sm,
            fontWeight:   tab.id === active ? typography.weight.semibold : typography.weight.regular,
            color:        tab.id === active ? colors.brand : colors.textLow,
            background:   'none',
            border:       'none',
            borderBottom: `2px solid ${tab.id === active ? colors.brand : 'transparent'}`,
            marginBottom: '-1px',
            cursor:       'pointer',
            fontFamily:   typography.fontBase,
            transition:   `all ${transitions.fast}`,
            display:      'flex',
            alignItems:   'center',
            gap:          '6px',
            whiteSpace:   'nowrap',
          }}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span style={{
              padding: '1px 6px', borderRadius: radius.full,
              fontSize: typography.size.xs,
              background: tab.id === active ? `${colors.brand}30` : colors.bg3,
              color: tab.id === active ? colors.brand : colors.textLow,
            }}>{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder, onClear }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; onClear?: () => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <svg style={{ position: 'absolute', left: '10px', color: colors.textLow }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        style={{
          width: '100%', height: '34px',
          padding: '0 32px 0 32px',
          background: colors.bg2,
          border: `1px solid ${colors.bgBorder}`,
          borderRadius: radius.full,
          color: colors.textHigh,
          fontSize: typography.size.sm,
          fontFamily: typography.fontBase,
          outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={onClear}
          style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: colors.textLow, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REGION INDICATOR
// ─────────────────────────────────────────────────────────────
export function RegionBadge({ region }: { region: string }) {
  const map: Record<string, { flag: string; label: string }> = {
    uk: { flag: '🇬🇧', label: 'UK' }, eu: { flag: '🇪🇺', label: 'EU' },
    us: { flag: '🇺🇸', label: 'US' }, ng: { flag: '🇳🇬', label: 'NG' },
    ke: { flag: '🇰🇪', label: 'KE' }, za: { flag: '🇿🇦', label: 'ZA' },
    in: { flag: '🇮🇳', label: 'IN' },
  };
  const r = map[region] || { flag: '🌐', label: region.toUpperCase() };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: radius.full,
      fontSize: typography.size.xs, fontFamily: typography.fontBase,
      background: colors.bg3, color: colors.textMed,
      border: `1px solid ${colors.bgBorder}`,
    }}>
      {r.flag} {r.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(5,15,12,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      animation: 'sewa-fadeIn 150ms ease',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <style>{`@keyframes sewa-fadeIn { from { opacity:0; } to { opacity:1; } }`}</style>
      <div style={{
        width: '100%', maxWidth: `${width}px`,
        background: colors.bg2,
        border: `1px solid ${colors.bgBorder}`,
        borderRadius: radius['2xl'],
        boxShadow: shadows.lg,
        animation: 'sewa-slideUp 200ms ease',
      }}>
        <style>{`@keyframes sewa-slideUp { from { transform:translateY(12px); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${colors.bgBorder}` }}>
          <h2 id="modal-title" style={{ margin: 0, fontSize: typography.size.xl, fontWeight: typography.weight.semibold, color: colors.textHigh, fontFamily: typography.fontBase }}>{title}</h2>
          <button onClick={onClose} aria-label="Close modal" style={{ background: 'none', border: 'none', color: colors.textLow, cursor: 'pointer', padding: '4px', borderRadius: radius.md, display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────
interface TableProps {
  columns: { key: string; header: string; render?: (row: any, index: number) => React.ReactNode }[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
}

export function Table({ columns, data, loading, emptyMessage = 'No data' }: TableProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={40} />)}
      </div>
    );
  }
  if (!data.length) {
    return <div style={{ padding: '40px', textAlign: 'center', color: colors.textLow, fontSize: typography.size.sm, fontFamily: typography.fontBase }}>{emptyMessage}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: typography.fontBase }} role="grid">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderBottom: `1px solid ${colors.bgBorder}`,
                fontSize: typography.size.xs,
                fontWeight: typography.weight.semibold,
                color: colors.textMed,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: `1px solid ${colors.bgBorder}`, transition: `background ${transitions.fast}` }}>
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '12px',
                  fontSize: typography.size.sm,
                  color: colors.textHigh,
                }}>
                  {col.render ? col.render(row, idx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CHART (simple line/bar)
// ─────────────────────────────────────────────────────────────
interface ChartProps {
  type: 'line' | 'bar';
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function Chart({ type = 'bar', data, color = colors.brand, height = 160 }: ChartProps) {
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div style={{ width: '100%', height }}>
      {type === 'bar' ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 'calc(100% - 24px)' }}>
          {data.map((d, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: 'calc(100% / 8)', minWidth: '36px' }}>
              <div style={{
                width: '100%',
                height: `${(d.value / maxVal) * 100}%`,
                background: `linear-gradient(180deg, ${color}, ${color}60)`,
                borderRadius: `${radius.sm} ${radius.sm} 0 0`,
                transition: `height ${transitions.slow}`,
              }} />
              <span style={{ fontSize: typography.size.xs, color: colors.textLow, fontFamily: typography.fontBase }}>{d.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={data.map((d, idx) => {
              const x = (idx / (data.length - 1)) * 100;
              const y = 100 - (d.value / maxVal) * 100;
              return `${x},${y}`;
            }).join(' ')}
          />
          {data.map((d, idx) => {
            const x = (idx / (data.length - 1)) * 100;
            const y = 100 - (d.value / maxVal) * 100;
            return <circle key={idx} cx={x} cy={y} r="2" fill={color} />;
          })}
        </svg>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOAST / NOTIFICATION
// ─────────────────────────────────────────────────────────────
interface ToastProps {
  type?: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message?: string;
  onClose?: () => void;
  autoClose?: number;
}

export function Toast({ type = 'info', title, message, onClose, autoClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 150);
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const styles = {
    info:     { bg: colors.infoBg,     border: '#152040', color: colors.info },
    success:  { bg: colors.normalBg,   border: '#0D2A1A', color: colors.normal },
    warning:  { bg: colors.warningBg,  border: '#2A1800', color: colors.warning },
    critical: { bg: colors.criticalBg, border: colors.criticalMuted, color: colors.critical },
  };
  const s = styles[type];

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex', gap: '12px',
      padding: '14px 16px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderLeft: `3px solid ${s.color}`,
      borderRadius: radius.lg,
      boxShadow: shadows.lg,
      animation: 'sewa-toastIn 200ms ease',
    }}>
      <style>{`@keyframes sewa-toastIn { from { transform: translateX(12px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <span style={{ fontSize: '14px', lineHeight: 1 }}>
        {type === 'critical' ? '🚨' : type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: s.color, margin: 0, fontFamily: typography.fontBase }}>{title}</p>
        {message && <p style={{ fontSize: typography.size.xs, color: colors.textMed, marginTop: '4px', margin: 0, fontFamily: typography.fontBase }}>{message}</p>}
      </div>
      {onClose && (
        <button onClick={() => { setVisible(false); setTimeout(onClose, 150); }} aria-label="Close notification" style={{ background: 'none', border: 'none', color: colors.textLow, cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '14px' }}>✕</button>
      )}
    </div>
  );
}
