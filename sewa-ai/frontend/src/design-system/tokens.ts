// SEWA AI — frontend/src/design-system/tokens.ts
// Single source of truth for all design decisions.
// Clinical, trustworthy, modern — inspired by Aidoc, Philips, DeepMind Health.

// ── Colour Palette ─────────────────────────────────────────────
export const colors = {
  // Brand
  brand:        '#408D7B',   // SEWA clinical green — primary CTA, active states
  brandDark:    '#2E6B5E',
  brandLight:   '#52B09A',
  brandMuted:   '#1A3028',

  // Backgrounds (dark clinical theme)
  bg0:          '#050F0C',   // deepest — modal overlays
  bg1:          '#08160F',   // app base
  bg2:          '#0C1D17',   // cards
  bg3:          '#111F1A',   // elevated cards
  bg4:          '#162821',   // hover states
  bgBorder:     '#1B3028',

  // Text
  textHigh:     '#D0ECE6',   // headings, primary content
  textMed:      '#6FA898',   // body, labels
  textLow:      '#3A6055',   // captions, disabled
  textInverse:  '#050F0C',

  // Severity — clinical signal colours
  critical:     '#E03535',   // ICH, PE, stroke
  criticalBg:   '#2A0A0A',
  criticalMuted:'#4A1515',
  urgent:       '#E08A20',   // elevated priority
  urgentBg:     '#2A1800',
  normal:       '#1DBF73',   // routine / clear
  normalBg:     '#0A1F14',

  // Functional
  info:         '#2A6EF2',   // radiology blue
  infoBg:       '#0A1530',
  warning:      '#FFB74D',
  warningBg:    '#1F1200',
  success:      '#1DBF73',

  // Neutrals
  white:        '#FFFFFF',
  black:        '#000000',
  overlay:      'rgba(5,15,12,0.85)',
} as const;

// ── Typography ─────────────────────────────────────────────────
export const typography = {
  // IBM Plex Sans — medical precision + legibility at small sizes
  fontBase:     "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
  fontMono:     "'IBM Plex Mono', 'Fira Code', monospace",

  // Scale (rem)
  size: {
    xs:   '0.6875rem',  // 11px — labels, tags
    sm:   '0.75rem',    // 12px — captions
    base: '0.875rem',   // 14px — body
    md:   '1rem',       // 16px — UI text
    lg:   '1.125rem',   // 18px — section headers
    xl:   '1.25rem',    // 20px — card titles
    '2xl':'1.5rem',     // 24px — page titles
    '3xl':'2rem',       // 32px — hero text
    '4xl':'2.5rem',     // 40px — landing display
    '5xl':'3.5rem',     // 56px — hero display
  },

  weight: {
    regular: '400',
    medium:  '500',
    semibold:'600',
    bold:    '700',
  },

  lineHeight: {
    tight:  '1.2',
    snug:   '1.35',
    normal: '1.5',
    relaxed:'1.65',
  },
} as const;

// ── Spacing ────────────────────────────────────────────────────
export const spacing = {
  0.5: '2px',
  1:   '4px',
  2:   '8px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  8:   '32px',
  10:  '40px',
  12:  '48px',
  16:  '64px',
  20:  '80px',
} as const;

// ── Border Radius ──────────────────────────────────────────────
export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  '2xl':'20px',
  full: '9999px',
} as const;

// ── Shadows ────────────────────────────────────────────────────
export const shadows = {
  sm:       '0 1px 3px rgba(0,0,0,0.4)',
  md:       '0 4px 16px rgba(0,0,0,0.5)',
  lg:       '0 8px 32px rgba(0,0,0,0.6)',
  brand:    `0 0 0 1px ${colors.brand}40, 0 4px 16px rgba(64,141,123,0.2)`,
  critical: `0 0 0 1px ${colors.critical}60, 0 4px 16px rgba(224,53,53,0.25)`,
  glow:     `0 0 20px rgba(64,141,123,0.3)`,
} as const;

// ── Transitions ────────────────────────────────────────────────
export const transitions = {
  fast:   '120ms ease',
  base:   '200ms ease',
  slow:   '350ms ease',
  spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ── Z-index layers ─────────────────────────────────────────────
export const zIndex = {
  base:    0,
  raised:  10,
  dropdown:100,
  sticky:  200,
  overlay: 300,
  modal:   400,
  toast:   500,
  critical:600,
} as const;

// ── Breakpoints ────────────────────────────────────────────────
export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl':'1536px',
} as const;

// ── Convenience: urgency → style mapping ──────────────────────
export const urgencyStyles = {
  CRITICAL: { color: colors.critical, bg: colors.criticalBg, border: colors.criticalMuted, dot: '#FF4444' },
  URGENT:   { color: colors.urgent,   bg: colors.urgentBg,   border: '#3A2000',            dot: '#FF9900' },
  MODERATE: { color: colors.warning,  bg: '#1A1400',         border: '#2A2000',            dot: '#FFB74D' },
  NORMAL:   { color: colors.normal,   bg: colors.normalBg,   border: '#0D2A1A',            dot: '#1DBF73' },
  ROUTINE:  { color: colors.textMed,  bg: colors.bg2,        border: colors.bgBorder,      dot: '#6FA898' },
} as const;

// ── Region config ──────────────────────────────────────────────
export const regions = {
  uk: { label: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', compliance: 'NHS DSPT · GDPR' },
  eu: { label: 'European Union', flag: '🇪🇺', currency: 'EUR', compliance: 'MDR · EU AI Act' },
  us: { label: 'North America',  flag: '🇺🇸', currency: 'USD', compliance: 'HIPAA · FDA 510(k)' },
  ng: { label: 'Nigeria',        flag: '🇳🇬', currency: 'NGN', compliance: 'NDPR · ISO 13485' },
  ke: { label: 'Kenya',          flag: '🇰🇪', currency: 'KES', compliance: 'DPA 2019' },
  za: { label: 'South Africa',   flag: '🇿🇦', currency: 'ZAR', compliance: 'POPIA' },
  in: { label: 'India',          flag: '🇮🇳', currency: 'INR', compliance: 'DPDP 2023' },
} as const;
