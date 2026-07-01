// SEWA XAI — mobile/src/screens/clinician/ReportEditorScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028', amber:'#D47820' };

export default function ReportEditorScreen({ route, navigation }: any) {
  const { scanId } = route.params;
  const qc = useQueryClient();

  const { data: scan, isLoading } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => (await apiClient.get(`/scans/${scanId}`)).data,
  });

  const report = scan?.report;
  const [technique,   setTechnique]   = useState(report?.technique   ?? '');
  const [findings,    setFindings]    = useState(report?.findings    ?? '');
  const [impression,  setImpression]  = useState(report?.impression  ?? '');
  const [recommendation, setRec]     = useState(report?.recommendation ?? '');
  const [edited, setEdited] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => apiClient.patch(`/reports/${report?.id}`, { technique, findings, impression, recommendation }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['scan', scanId] }); setEdited(false); Alert.alert('Saved'); },
  });

  const signMutation = useMutation({
    mutationFn: () => apiClient.post(`/reports/${report?.id}/sign`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:['scan', scanId] });
      Alert.alert('Report Signed', 'FHIR DiagnosticReport created. HL7 ORU dispatched.', [{ text:'Done', onPress:()=>navigation.goBack() }]);
    },
  });

  if (isLoading) return <View style={s.loading}><ActivityIndicator color={T.teal2} /></View>;
  const isSigned = report?.status === 'approved';

  return (
    <View style={s.container}>
      {isSigned && <View style={s.signedBanner}><Text style={s.signedText}>✓ SIGNED — {new Date(report.signedAt).toLocaleString()}</Text></View>}
      <ScrollView style={s.scroll} contentContainerStyle={{ padding:16, paddingBottom:120 }}>
        {[
          ['TECHNIQUE', technique, setTechnique],
          ['FINDINGS', findings, setFindings],
          ['IMPRESSION', impression, setImpression],
          ['RECOMMENDATION', recommendation, setRec],
        ].map(([label, val, setter]: any) => (
          <View key={label} style={s.section}>
            <Text style={s.sectionLabel}>{label}</Text>
            <TextInput
              style={[s.input, isSigned && s.inputDisabled]}
              value={val} onChangeText={(t) => { setter(t); setEdited(true); }}
              multiline editable={!isSigned}
              placeholderTextColor={T.textLo}
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          </View>
        ))}

        {/* AI assist note */}
        {report?.vlmGenerated && !edited && (
          <View style={s.aiNote}>
            <Text style={s.aiNoteText}>⚡ AI-generated draft · VLM v1.8.0 · Review before signing</Text>
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      {!isSigned && (
        <View style={s.bar}>
          <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={!edited || saveMutation.isPending}>
            {saveMutation.isPending ? <ActivityIndicator color={T.textHi} /> : <Text style={s.saveBtnText}>Save Draft</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.signBtn} onPress={() => Alert.alert('Sign Report?', 'This will dispatch FHIR + HL7 messages and lock the report.', [
            { text:'Cancel', style:'cancel' },
            { text:'Sign & Approve', style:'default', onPress: () => signMutation.mutate() },
          ])} disabled={signMutation.isPending}>
            {signMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.signBtnText}>✍ Sign & Approve</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:T.bg0 },
  loading:     { flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center' },
  signedBanner:{ backgroundColor:'rgba(64,141,123,0.15)', padding:10, borderBottomWidth:1, borderBottomColor:T.teal },
  signedText:  { color:T.teal2, fontSize:12, fontWeight:'800', textAlign:'center' },
  scroll:      { flex:1 },
  section:     { marginBottom:16 },
  sectionLabel:{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:6, fontFamily:'Courier' },
  input:       { backgroundColor:T.bg1, borderRadius:10, padding:12, color:T.textHi, fontSize:13, lineHeight:20, borderWidth:1, borderColor:T.border, minHeight:80, textAlignVertical:'top' },
  inputDisabled: { opacity:0.6 },
  aiNote:      { backgroundColor:'rgba(64,141,123,0.08)', borderRadius:8, padding:10, borderWidth:1, borderColor:'rgba(64,141,123,0.2)', marginBottom:16 },
  aiNoteText:  { color:T.textMd, fontSize:11 },
  bar:         { flexDirection:'row', gap:10, padding:12, backgroundColor:T.bg1, borderTopWidth:1, borderTopColor:T.border, paddingBottom:24 },
  saveBtn:     { flex:1, backgroundColor:T.bg2, borderRadius:10, padding:14, alignItems:'center', borderWidth:1, borderColor:T.border },
  saveBtnText: { color:T.textHi, fontWeight:'700', fontSize:13 },
  signBtn:     { flex:1, backgroundColor:T.teal, borderRadius:10, padding:14, alignItems:'center' },
  signBtnText: { color:'#fff', fontWeight:'800', fontSize:13 },
});
