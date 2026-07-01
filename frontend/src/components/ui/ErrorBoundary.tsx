// SEWA XAI — ErrorBoundary.tsx
// React error boundary — prevents white screen of death in clinical environments.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React, { Component, ErrorInfo, ReactNode } from 'react';

const C = {
  bg0: '#050F0C', bg1: '#08160F', bg2: '#0C1D17',
  critical: '#E03535', brand: '#408D7B', brandLt: '#52B09A',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  border: '#1B3028', F: "'IBM Plex Sans',system-ui,sans-serif",
};

interface Props { children: ReactNode; name?: string; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Report to Sentry in production
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    }
    console.error(`[SEWA ErrorBoundary] ${this.props.name || 'Unknown'}:`, error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:320, padding:32, background:C.bg0, fontFamily:C.F }}>
        <div style={{ maxWidth:560, background:C.bg1, borderRadius:16, padding:32, border:`1px solid ${C.critical}40` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <span style={{ fontSize:24 }}>⚠</span>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#FF8080' }}>
                {this.props.name ? `${this.props.name} — ` : ''}Component Error
              </div>
              <div style={{ fontSize:12, color:C.textMd, marginTop:2 }}>
                This section encountered an unexpected error. Patient safety is not affected.
              </div>
            </div>
          </div>
          <div style={{ background:C.bg2, borderRadius:10, padding:'10px 14px', marginBottom:20, fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.textMd, overflowX:'auto' }}>
            {this.state.error?.message}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={() => this.setState({ hasError:false, error:null, errorInfo:null })}
              style={{ padding:'9px 20px', background:C.brand, border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:C.F }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding:'9px 20px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:13, cursor:'pointer', fontFamily:C.F }}
            >
              Reload Page
            </button>
            <a
              href="mailto:support@sewaxai.health?subject=SEWA XAI Error Report"
              style={{ padding:'9px 20px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:10, color:C.textMd, fontSize:13, textDecoration:'none', display:'inline-flex', alignItems:'center', fontFamily:C.F }}
            >
              Report to Support
            </a>
          </div>
        </div>
      </div>
    );
  }
}
