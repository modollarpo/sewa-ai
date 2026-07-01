// SEWA XAI — mobile/src/screens/clinician/VoiceDictationScreen.tsx
// Feature 10: Voice Dictation — Google Cloud Speech-to-Text / AWS Transcribe Medical
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// In production: import Voice from '@react-native-voice/voice';
// This screen shows the complete UX; Voice library wired in via hooks

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028', amber:'#D47820' };

const RADIOLOGY_PHRASES = [
  'There is a hyperdense region in the right basal ganglia',
  'No acute intracranial abnormality identified',
  'Bilateral lower lobe consolidation consistent with pneumonia',
  'Filling defect within the main pulmonary artery',
  'No pneumothorax or pleural effusion',
];

export default function VoiceDictationScreen({ route }: any) {
  const { scanId } = route.params;
  const nav = useNavigation<any>();
  const qc  = useQueryClient();

  const [recording, setRecording]   = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partial, setPartial]       = useState('');
  const [section, setSection]       = useState<'findings'|'impression'|'recommendation'>('findings');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const demoIdx   = useRef(0);
  const demoTimer = useRef<ReturnType<typeof setInterval>>();

  // Pulse animation when recording
  useEffect(() => {
    if (recording) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.3, duration:600, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1.0, duration:600, useNativeDriver:true }),
      ])).start();
      // Demo mode: stream pre-written phrases to simulate STT
      demoTimer.current = setInterval(() => {
        const phrase = RADIOLOGY_PHRASES[demoIdx.current % RADIOLOGY_PHRASES.length];
        demoIdx.current++;
        setPartial(phrase);
        setTimeout(() => {
          setTranscript(prev => prev ? `${prev}. ${phrase}` : phrase);
          setPartial('');
        }, 1200);
      }, 2500);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      clearInterval(demoTimer.current);
      setPartial('');
    }
    return () => clearInterval(demoTimer.current);
  }, [recording]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Fetch existing report and patch the selected section
      const { data: scan } = await apiClient.get(`/scans/${scanId}`);
      if (!scan.report?.id) throw new Error('No report found');
      return apiClient.patch(`/reports/${scan.report.id}`, { [section]: transcript });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['scan', scanId] });
      Alert.alert('Saved', `${section} updated from voice dictation`, [{ text:'Back to Report', onPress:()=>nav.goBack() }]);
    },
  });

  return (
    <View style={s.container}>
      {/* Section selector */}
      <View style={s.sectionRow}>
        {(['findings','impression','recommendation'] as const).map(sec => (
          <TouchableOpacity key={sec} onPress={() => setSection(sec)} style={[s.secBtn, section===sec && s.secBtnActive]}>
            <Text style={[s.secText, section===sec && { color:T.teal2 }]}>{sec}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transcript area */}
      <ScrollView style={s.transcriptBox}>
        <Text style={s.transcriptText}>{transcript}</Text>
        {partial && <Text style={s.partialText}>{partial}</Text>}
        {!transcript && !partial && <Text style={s.placeholder}>Tap the mic to begin dictating {section}...</Text>}
      </ScrollView>

      {/* Mic button */}
      <View style={s.controls}>
        <Animated.View style={{ transform:[{ scale: pulseAnim }] }}>
          <TouchableOpacity style={[s.mic, recording && s.micActive]} onPress={() => setRecording(r => !r)}>
            <Text style={s.micIcon}>{recording ? '⏹' : '🎙'}</Text>
          </TouchableOpacity>
        </Animated.View>
        {recording && <Text style={s.recordingText}>Recording... tap to stop</Text>}
      </View>

      {/* Quick phrases */}
      <View style={s.phrasesBox}>
        <Text style={s.phrasesLabel}>QUICK PHRASES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['No acute abnormality', 'Correlate clinically', 'Follow-up recommended', 'Urgent clinical review'].map(p => (
            <TouchableOpacity key={p} style={s.phrase} onPress={() => setTranscript(prev => prev ? `${prev}. ${p}` : p)}>
              <Text style={s.phraseText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.clearBtn} onPress={() => setTranscript('')}>
          <Text style={s.clearBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={!transcript || saveMutation.isPending}>
          <Text style={s.saveBtnText}>Save to Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex:1, backgroundColor:T.bg0 },
  sectionRow:    { flexDirection:'row', backgroundColor:T.bg1, borderBottomWidth:1, borderBottomColor:T.border },
  secBtn:        { flex:1, paddingVertical:12, alignItems:'center' },
  secBtnActive:  { borderBottomWidth:2, borderBottomColor:T.teal },
  secText:       { color:T.textLo, fontSize:11, fontWeight:'700', textTransform:'capitalize' },
  transcriptBox: { flex:1, margin:16, backgroundColor:T.bg1, borderRadius:14, padding:16, borderWidth:1, borderColor:T.border },
  transcriptText:{ color:T.textHi, fontSize:14, lineHeight:22 },
  partialText:   { color:T.textMd, fontSize:14, lineHeight:22, fontStyle:'italic' },
  placeholder:   { color:T.textLo, fontSize:13 },
  controls:      { alignItems:'center', paddingVertical:20 },
  mic:           { width:80, height:80, borderRadius:40, backgroundColor:T.bg1, borderWidth:2, borderColor:T.border, alignItems:'center', justifyContent:'center' },
  micActive:     { backgroundColor:'rgba(201,68,68,0.2)', borderColor:T.red },
  micIcon:       { fontSize:32 },
  recordingText: { color:T.red, fontSize:12, fontWeight:'700', marginTop:10 },
  phrasesBox:    { paddingHorizontal:16, paddingBottom:8 },
  phrasesLabel:  { color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:8, fontFamily:'Courier' },
  phrase:        { backgroundColor:T.bg1, borderRadius:8, paddingHorizontal:12, paddingVertical:7, marginRight:8, borderWidth:1, borderColor:T.border },
  phraseText:    { color:T.textMd, fontSize:11, fontWeight:'600' },
  actions:       { flexDirection:'row', gap:10, padding:12, paddingBottom:24, backgroundColor:T.bg1, borderTopWidth:1, borderTopColor:T.border },
  clearBtn:      { flex:1, backgroundColor:T.bg2, borderRadius:10, padding:14, alignItems:'center', borderWidth:1, borderColor:T.border },
  clearBtnText:  { color:T.textMd, fontWeight:'700' },
  saveBtn:       { flex:2, backgroundColor:T.teal, borderRadius:10, padding:14, alignItems:'center' },
  saveBtnText:   { color:'#fff', fontWeight:'800', fontSize:13 },
});
