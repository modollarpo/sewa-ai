import React, { useState, useRef, useEffect } from 'react';
import { apiClient, enterpriseTranscribe, translateText as apiTranslateText, listLanguages } from '../../services/apiClient';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'sw', name: 'Swahili' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
];

interface VoiceDictationProps {
  onTranscriptionComplete: (text: string) => void;
  isRecordingMode?: boolean;
  scanId?: string;
}

export function VoiceDictation({ onTranscriptionComplete, scanId }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEnterprise, setUseEnterprise] = useState(true);
  const [targetLang, setTargetLang] = useState('fr');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [availableLangs, setAvailableLangs] = useState(SUPPORTED_LANGUAGES);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    listLanguages().then((langs: Array<{ code: string; name: string }>) => {
      if (langs?.length) setAvailableLangs(langs);
    }).catch(() => {});
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranslatedText('');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (useEnterprise && scanId) {
          const result = await enterpriseTranscribe(base64Audio!, scanId);
          setTranscription(result.transcription);
          onTranscriptionComplete(result.transcription);
        } else {
          const response = await apiClient.post('/ai/ambient-dictation', { audioData: base64Audio });
          setTranscription(response.data.transcription);
          onTranscriptionComplete(response.data.transcription);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async () => {
    if (!transcription) return;
    setIsTranslating(true);
    try {
      const result = await apiTranslateText(transcription, targetLang);
      setTranslatedText(result.translatedText);
    } catch (err: any) {
      setError(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #1B3028', borderRadius: '8px', background: '#0C1D17', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, color: '#D0ECE6', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Ambient Dictation
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ color: '#6FA898', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={useEnterprise}
              onChange={(e) => setUseEnterprise(e.target.checked)}
            />
            Enterprise
          </label>
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              background: isRecording ? '#E03535' : '#408D7B',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
          >
            {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Dictation'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#FF8080', fontSize: '12px' }}>{error}</div>}

      {isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E03535', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: '#E03535', fontSize: '12px' }}>Recording in progress...</span>
        </div>
      )}

      {transcription && (
        <div style={{ marginTop: '8px', padding: '12px', background: '#08160F', borderRadius: '6px', fontSize: '13px', color: '#6FA898', fontStyle: 'italic' }}>
          "{transcription}"
          
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{
                padding: '6px 8px',
                background: '#0C1D17',
                color: '#D0ECE6',
                border: '1px solid #408D7B',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {availableLangs.filter(l => l.code !== 'en').map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              style={{
                padding: '6px 12px',
                background: '#408D7B',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isTranslating ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {isTranslating ? 'Translating...' : 'Translate'}
            </button>
          </div>

          {translatedText && (
            <div style={{ marginTop: '8px', padding: '8px', background: '#0C1D17', borderRadius: '4px', fontSize: '13px', color: '#D0ECE6' }}>
              {translatedText}
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
