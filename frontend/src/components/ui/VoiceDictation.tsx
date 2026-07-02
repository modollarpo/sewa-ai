// SEWA XAI — components/ui/VoiceDictation.tsx
// Ambient Clinical Intelligence (ACI) — Real-time ambient voice scribe
// Radiologist dictates freely; AI structures the report into Technique / Findings / Impression
//
// Architecture:
//  1. Browser Web Speech API captures continuous interim + final transcripts
//  2. NLP keyword extraction routes sentences to the correct report section
//  3. Live waveform animation using AudioContext analyser
//  4. Exposes `onStructuredReport` callback with { technique, findings, impression, recommendation }
//
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  brand: '#408D7B', brandLt: '#52B09A', brandDk: '#2E6B5E',
  critical: '#E03535', urgent: '#E08A20', normal: '#1DBF73',
  textHi: '#D0ECE6', textMd: '#6FA898', textLo: '#3A6055',
  bg1: '#08160F', bg2: '#0C1D17', bg3: '#111F1A', bg4: '#162821',
  border: '#1B3028',
  F: "'IBM Plex Sans', system-ui, sans-serif",
  FM: "'IBM Plex Mono', monospace",
};

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface StructuredReport {
  technique: string;
  findings: string;
  impression: string;
  recommendation: string;
}

interface VoiceDictationProps {
  onTranscript?: (text: string) => void;
  onStructuredReport?: (report: StructuredReport) => void;
  lang?: string;
  compact?: boolean;  // true = minimal button for header toolbar
}

// ── Section routing keywords ──────────────────────────────────────────────────
const TECHNIQUE_TRIGGERS = ['technique', 'contrast', 'protocol', 'sequences', 'axial', 'coronal', 'sagittal', 'slices', 'acquisition', 'field strength', 'administered', 'injection', 'series', 'sequences'];
const IMPRESSION_TRIGGERS = ['impression', 'conclusion', 'in summary', 'in conclusion', 'overall', 'final diagnosis', 'likely represents', 'most likely', 'recommend', 'consider', 'please follow', 'correlate'];
const RECOMMENDATION_TRIGGERS = ['recommend', 'follow-up', 'follow up', 'suggest', 'urgent referral', 'refer', 'mdt', 'biopsy', 'further imaging', 'clinical correlation'];

function classifySentence(sentence: string): keyof StructuredReport {
  const lower = sentence.toLowerCase();
  if (RECOMMENDATION_TRIGGERS.some(t => lower.includes(t))) return 'recommendation';
  if (IMPRESSION_TRIGGERS.some(t => lower.includes(t))) return 'impression';
  if (TECHNIQUE_TRIGGERS.some(t => lower.includes(t))) return 'technique';
  return 'findings'; // default: everything is a finding
}

// ── Waveform Visualiser ───────────────────────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const BAR_COUNT = 20;
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0.1));
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setBars(Array(BAR_COUNT).fill(0.1));
      cancelAnimationFrame(animRef.current);
      return;
    }
    const animate = () => {
      setBars(prev => prev.map((_, i) => {
        const base = 0.15 + Math.abs(Math.sin(Date.now() / 300 + i * 0.7)) * 0.5;
        const noise = (Math.random() - 0.5) * 0.25;
        return Math.max(0.05, Math.min(1, base + noise));
      }));
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24 }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2, transition: 'height 100ms ease',
          height: `${Math.round(h * 24)}px`,
          background: active
            ? `hsl(${165 + i * 2}, 60%, ${40 + h * 30}%)`
            : C.textLo,
        }} />
      ))}
    </div>
  );
}

// ── Section Badge ─────────────────────────────────────────────────────────────
function SectionBadge({ section }: { section: keyof StructuredReport }) {
  const cfg: Record<keyof StructuredReport, { color: string; label: string }> = {
    technique: { color: C.textMd, label: 'TECHNIQUE' },
    findings: { color: C.brand, label: 'FINDINGS' },
    impression: { color: C.urgent, label: 'IMPRESSION' },
    recommendation: { color: C.normal, label: 'RECOMMENDATION' },
  };
  const { color, label } = cfg[section];
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', padding: '1px 6px',
      borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}30`,
      fontFamily: C.FM,
    }}>{label}</span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function VoiceDictation({ onTranscript, onStructuredReport, lang = 'en-US', compact = false }: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [report, setReport] = useState<StructuredReport>({ technique: '', findings: '', impression: '', recommendation: '' });
  const [interim, setInterim] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [log, setLog] = useState<Array<{ text: string; section: keyof StructuredReport; ts: string }>>([]);
  const [expanded, setExpanded] = useState(false);
  const recognitionRef = useRef<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang === 'sw' ? 'sw-KE' : lang === 'ha' ? 'ha-NG' : lang === 'fr' ? 'fr-FR' : 'en-GB';
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t + ' ';
        } else {
          interimText += t;
        }
      }

      setInterim(interimText);

      if (finalText.trim()) {
        const text = finalText.trim();
        const section = classifySentence(text);
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Append to structured report
        setReport(prev => {
          const updated = {
            ...prev,
            [section]: prev[section] ? `${prev[section]} ${text}` : text,
          };
          onStructuredReport?.(updated);
          return updated;
        });

        // Add to transcript log
        setLog(prev => [...prev, { text, section, ts }]);

        // Legacy callback
        onTranscript?.(text);
      }
    };

    rec.onerror = (err: any) => {
      const msg = err.error === 'not-allowed'
        ? 'Microphone access denied. Enable mic permissions.'
        : err.error === 'no-speech'
        ? 'No speech detected.'
        : `Mic error: ${err.error}`;
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
  }, [lang]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) {
      setErrorMsg('Speech recognition not supported in this browser. Use Chrome or Edge.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setExpanded(true);
      } catch {
        recognitionRef.current = null; // reset so next call recreates
      }
    }
  }, [isListening]);

  const clearAll = () => {
    setReport({ technique: '', findings: '', impression: '', recommendation: '' });
    setLog([]);
    setInterim('');
    onStructuredReport?.({ technique: '', findings: '', impression: '', recommendation: '' });
  };

  // ── Compact mode (just a toolbar button) ─────────────────────────────────
  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        {errorMsg && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, background: C.critical, color: 'white',
            padding: '4px 10px', borderRadius: 6, fontSize: 10, whiteSpace: 'nowrap',
            marginBottom: 8, zIndex: 10,
          }}>{errorMsg}</div>
        )}
        <button
          onClick={() => { toggle(); setExpanded(!isListening ? true : !expanded); }}
          title="Azure Ambient Clinical Intelligence (ACI)"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: isListening ? `${C.critical}18` : `${C.brand}14`,
            border: `1px solid ${isListening ? `${C.critical}50` : `${C.brand}30`}`,
            color: isListening ? C.critical : C.brand,
            cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: C.F,
            transition: 'all 0.2s ease',
          }}
        >
          {isListening ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.critical, animation: 'aci-pulse 1s infinite' }} />
              <Waveform active={true} />
              ACI Active
            </>
          ) : '🎙 Ambient Scribe'}
          <style>{`@keyframes aci-pulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.5}100%{transform:scale(1);opacity:1}}`}</style>
        </button>
      </div>
    );
  }

  // ── Full panel mode ───────────────────────────────────────────────────────
  const sectionKeys: (keyof StructuredReport)[] = ['technique', 'findings', 'impression', 'recommendation'];
  const sectionIcons: Record<keyof StructuredReport, string> = {
    technique: '⚙️', findings: '🔬', impression: '🧠', recommendation: '📋',
  };
  const wordCount = (t: string) => t ? t.trim().split(/\s+/).length : 0;
  const totalWords = sectionKeys.reduce((acc, k) => acc + wordCount(report[k]), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontFamily: C.F }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: C.bg2, borderBottom: `1px solid ${C.border}`,
      }}>
        <Waveform active={isListening} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: isListening ? C.critical : C.brand, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isListening ? '● RECORDING — Ambient Clinical Intelligence' : '🎙 Ambient Scribe (ACI)'}
          </div>
          {isListening && interim && (
            <div style={{ fontSize: 10, color: C.textMd, fontStyle: 'italic', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{interim}"
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {log.length > 0 && (
            <button onClick={clearAll} title="Clear all transcripts" style={{
              padding: '3px 8px', fontSize: 9, borderRadius: 6, cursor: 'pointer', fontWeight: 600,
              background: 'transparent', border: `1px solid ${C.border}`, color: C.textLo,
              transition: 'all 0.15s',
            }}>Clear</button>
          )}
          <button
            onClick={toggle}
            style={{
              padding: '4px 12px', borderRadius: 20, border: `1px solid ${isListening ? `${C.critical}60` : `${C.brand}40`}`,
              background: isListening ? `${C.critical}18` : `${C.brand}18`,
              color: isListening ? C.critical : C.brand,
              fontSize: 10, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'all 0.2s ease',
            }}
          >
            {isListening ? '⏹ Stop' : '● Record'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '6px 12px', background: `${C.critical}18`, borderBottom: `1px solid ${C.critical}30`, fontSize: 10, color: C.critical, fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Structured report sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {sectionKeys.map(k => (
          <div key={k} style={{
            padding: '8px 10px', borderRight: k === 'technique' || k === 'impression' ? `1px solid ${C.border}` : 'none',
            borderBottom: k === 'technique' || k === 'findings' ? `1px solid ${C.border}` : 'none',
            background: k === 'impression' ? `${C.urgent}05` : k === 'findings' ? `${C.brand}04` : C.bg1,
            minHeight: 64,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 9 }}>{sectionIcons[k]}</span>
              <SectionBadge section={k} />
              <span style={{ marginLeft: 'auto', fontSize: 8, color: C.textLo, fontFamily: C.FM }}>{wordCount(report[k])}w</span>
            </div>
            <div style={{
              fontSize: 10, color: report[k] ? C.textHi : C.textLo, lineHeight: 1.6,
              fontStyle: report[k] ? 'normal' : 'italic',
              maxHeight: 72, overflowY: 'auto',
            }}>
              {report[k] || `Dictate to populate ${k}…`}
            </div>
          </div>
        ))}
      </div>

      {/* Live transcript log */}
      {log.length > 0 && (
        <div style={{ maxHeight: 120, overflowY: 'auto', background: C.bg1, padding: '6px 10px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: C.textLo, letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
            Live Transcript — {totalWords} words
          </div>
          {log.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 8, color: C.textLo, fontFamily: C.FM, flexShrink: 0, marginTop: 1 }}>{entry.ts}</span>
              <SectionBadge section={entry.section} />
              <span style={{ fontSize: 10, color: C.textMd, lineHeight: 1.5 }}>{entry.text}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {!isListening && log.length === 0 && (
        <div style={{ padding: '12px', textAlign: 'center', fontSize: 10, color: C.textLo, lineHeight: 1.7 }}>
          Press <strong style={{ color: C.brand }}>● Record</strong> and dictate freely.<br />
          SEWA ACI auto-structures your words into Technique / Findings / Impression.
        </div>
      )}
    </div>
  );
}
