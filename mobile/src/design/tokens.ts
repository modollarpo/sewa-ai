// SEWA XAI Mobile — Design Tokens
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
export const C = {
  bg0: '#050F0C', bg1: '#08160F', bg2: '#0C1D17', bg3: '#111F1A',
  brand: '#408D7B', brandDark: '#2E6B5E', brandLight: '#52B09A',
  textHigh: '#E8F5F2', textMed: '#A8D5CC', textLow: '#6FA898',
  border: '#1B3028',
  critical: '#EF4444', criticalBg: '#3F0A0A',
  urgent: '#F97316', urgentBg: '#3F1A0A',
  normal: '#22C55E', normalBg: '#0A2F0A',
  info: '#3B82F6', white: '#FFFFFF',
} as const;
export const FS = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, '3xl': 30 } as const;
export const FW = { normal: '400', medium: '500', semibold: '600', bold: '700', black: '900' } as const;
export const SP = [0,4,8,12,16,20,24,32,40,48,64,96] as const;
export const R = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 } as const;
export const SHADOW = { sm: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.15, shadowRadius:2, elevation:2 }, md: { shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.2, shadowRadius:4, elevation:4 } };
