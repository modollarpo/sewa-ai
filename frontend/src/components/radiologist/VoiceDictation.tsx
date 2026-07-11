import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

interface VoiceDictationProps {
  onTranscriptionComplete: (text: string) => void;
  isRecordingMode?: boolean;
}

export function VoiceDictation({ onTranscriptionComplete, isRecordingMode = false }: VoiceDictationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

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
      // Stop all tracks to release microphone
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // In a real implementation, we would send the blob to the backend or use WebSocket.
      // For now, we simulate sending the audio data as a base64 string.
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        const response = await apiClient.post('/ai/ambient-dictation', { audioData: base64Audio });
        
        setTranscription(response.data.transcription);
        onTranscriptionComplete(response.data.transcription);
      };
    } catch (err: any) {
      setError(err.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #1B3028', borderRadius: '8px', background: '#0C1D17', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, color: '#D0ECE6', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          🎙️ Ambient Dictation
        </h3>
        
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
