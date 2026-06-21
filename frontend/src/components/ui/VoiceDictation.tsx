import React, { useState, useEffect } from 'react';

const C = {
  brand: '#408D7B', critical: '#E03535', textMd: '#6FA898', textHi: '#D0ECE6', bg3: '#111F1A', border: '#1B3028'
};

interface VoiceDictationProps {
  onTranscript: (text: string) => void;
  lang?: string;
}

export function VoiceDictation({ onTranscript, lang = 'en-US' }: VoiceDictationProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true; // Use continuous for real-time STT
      rec.interimResults = true;
      rec.lang = lang === 'sw' ? 'sw-KE' : 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
        }
      };

      rec.onerror = (err: any) => {
        console.error('[Azure Medical Speech Error]:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [lang, onTranscript]);

  const toggleScribe = () => {
    if (!recognition) {
      setErrorMsg('Azure Speech not supported in this browser.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start Azure AI Speech:", err);
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {errorMsg && <div style={{ position:'absolute', bottom:'100%', left:0, background:C.critical, color:'white', padding:'4px 8px', borderRadius:6, fontSize:10, whiteSpace:'nowrap', marginBottom:8, zIndex:10 }}>{errorMsg}</div>}
      <button 
        onClick={toggleScribe}
      style={{ 
        padding:'4px 10px', 
        background: isListening ? `${C.critical}14` : `${C.brand}14`, 
        border:`1px solid ${isListening ? C.critical : C.brand}30`, 
        borderRadius:20, fontSize:10, fontWeight:700, 
        color: isListening ? C.critical : C.brand, 
        cursor: 'pointer', 
        display:'flex', alignItems:'center', gap:4,
        transition: 'all 0.2s ease'
      }}
      title="Azure AI Ambient Clinical Intelligence"
    >
      {isListening ? (
        <>
          <span style={{ width:6, height:6, borderRadius:'50%', background:C.critical, animation:'pulse 1s infinite' }} />
          Listening (Azure ACI)...
        </>
      ) : '🎙 Ambient Scribe'}
      <style>{`@keyframes pulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.5}100%{transform:scale(1);opacity:1}}`}</style>
      </button>
    </div>
  );
}
