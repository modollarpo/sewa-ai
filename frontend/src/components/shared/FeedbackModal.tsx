import React, { useState } from 'react';
import { createFeedback } from '../../services/apiClient';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const C = {
  bg0:'#050F0C', bg1:'#08160F', bg2:'#0C1D17', bg3:'#111F1A',
  brand:'#408D7B', brandLt:'#52B09A',
  textHi:'#D0ECE6', textMd:'#6FA898', textLo:'#3A6055',
  border:'#1B3028',
  F:"'IBM Plex Sans',system-ui,sans-serif",
  FM:"'IBM Plex Mono',monospace",
};

const FEEDBACK_TYPES = ['feature_request', 'bug_report', 'satisfaction', 'usability', 'general'];
const CATEGORIES = ['radiologist_ui', 'ai_accuracy', 'mobile_app', 'billing', 'integration', 'other'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function FeedbackModal({ isOpen, onClose, onSubmitted }: Props) {
  const [type, setType] = useState('general');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await createFeedback({
        feedbackType: type,
        subject: subject.trim() || undefined,
        description: description.trim(),
        category: category || undefined,
        score: score || undefined,
      });
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        setSubmitted(false);
        setType('general');
        setSubject('');
        setDescription('');
        setCategory('');
        setScore(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,0.7)', zIndex: 2000,
      padding:'16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:C.bg2, border:`1px solid ${C.border}`, borderRadius:'16px',
        width:'100%', maxWidth:'500px',
        padding:'28px',
      }}>
        {submitted ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ width:'64px', height:'64px', borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              background:`${C.brand}20`, border:`1px solid ${C.brand}50`,
              margin:'0 auto 16px', fontSize:'32px'}}>✅</div>
            <h3 style={{ fontSize:'20px', fontWeight:900, color:C.textHi, margin:0, fontFamily:C.F }}>
              Thank you for your feedback!
            </h3>
            <p style={{ fontSize:'13px', color:C.textMd, lineHeight:1.7, margin:'12px 0 0', fontFamily:C.F }}>
              We appreciate you letting us know how we can improve SEWA XAI.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:900, color:C.textHi, margin:0, fontFamily:C.F }}>
                Feedback
              </h2>
              <button onClick={onClose} style={{ background:'none', border:'none', color:C.textLo, fontSize:'20px', cursor:'pointer', padding:0 }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.textLo, letterSpacing:'0.06em', display:'block', marginBottom:'6px', fontFamily:C.F }}>
                  FEEDBACK TYPE
                </label>
                <select value={type} onChange={e => setType(e.target.value)} style={{
                  width:'100%', padding:'10px 12px', background:C.bg3,
                  border:`1px solid ${C.border}`, borderRadius:'10px',
                  color:C.textHi, fontSize:'13px',
                }}>
                  {FEEDBACK_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {type === 'satisfaction' && (
                <div>
                  <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                    {[1,2,3,4,5].map(num => (
                      <button type="button" key={num} onClick={() => setScore(num)} style={{
                        width:'40px', height:'40px', borderRadius:'10px',
                        border: `1px solid ${score === num ? C.brand : C.border}`,
                        background: score === num ? C.brand : C.bg3,
                        color: score === num ? 'white' : C.textMd,
                        cursor:'pointer', fontWeight:700,
                        fontSize: '16px',
                      }}>{num}</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.textLo, letterSpacing:'0.06em', display:'block', marginBottom:'6px', fontFamily:C.F }}>
                  SUBJECT (OPTIONAL)
                </label>
                <input value={subject} onChange={e => setSubject(e.target.value)} style={{
                  width:'100%', padding:'10px 12px', background:C.bg3,
                  border:`1px solid ${C.border}`, borderRadius:'10px',
                  color:C.textHi, fontSize:'13px',
                }} placeholder="Brief summary" />
              </div>

              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.textLo, letterSpacing:'0.06em', display:'block', marginBottom:'6px', fontFamily:C.F }}>
                  CATEGORY (OPTIONAL)
                </label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{
                  width:'100%', padding:'10px 12px', background:C.bg3,
                  border:`1px solid ${C.border}`, borderRadius:'10px',
                  color:C.textHi, fontSize:'13px',
                }}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize:'11px', fontWeight:700, color:C.textLo, letterSpacing:'0.06em', display:'block', marginBottom:'6px', fontFamily:C.F }}>
                  DESCRIPTION
                </label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)}
                style={{
                  width:'100%', minHeight:'120px',
                  padding:'10px 12px', background:C.bg3,
                  border:`1px solid ${C.border}`, borderRadius:'10px',
                  color:C.textHi, fontSize:'13px',
                  resize:'vertical'
                }}
                placeholder="Tell us what you think..." />
              </div>

              <button type="submit" disabled={submitting || !description.trim()}
                style={{
                  width:'100%',
                  padding:'12px',
                  marginTop:'8px',
                  border:'none',
                  borderRadius:'12px',
                  background:`linear-gradient(135deg, ${C.brand}, ${C.brandLt})`,
                  color:'white',
                  fontSize:'13px',
                  fontWeight:800,
                  cursor: 'pointer',
                  opacity: (!description.trim() || submitting) ? 0.5 : 1,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:'8px',
                }}
              >
                {submitting ? <LoadingSpinner size="small" /> : 'Submit Feedback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
