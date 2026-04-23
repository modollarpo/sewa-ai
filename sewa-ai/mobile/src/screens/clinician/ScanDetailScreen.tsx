// SEWA AI — mobile/src/screens/clinician/ScanDetailScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', bg3:'#122820', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', redLt:'#E86060', amber:'#D47820', amberLt:'#F09A40', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };
const URGENCY_COLOR: Record<string,string> = { CRITICAL:T.redLt, URGENT:T.amberLt, NORMAL:T.teal2 };

export default function ScanDetailScreen({ route }: any) {
  const { scanId } = route.params;
  const nav = useNavigation<any>();
  const qc  = useQueryClient();
  const [tab, setTab] = useState<'ai'|'report'|'info'>('ai');

  const { data: scan, isLoading } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => (await apiClient.get(`/scans/${scanId}`)).data,
  });

  const genReport = useMutation({
    mutationFn: () => apiClient.post(`/reports/generate/${scanId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['scan', scanId] }); nav.navigate('ReportEditor', { scanId }); },
    onError: (e: any) => Alert.alert('Error', e.response?.data?.message || 'Could not generate report'),
  });

  if (isLoading) return <View style={s.loading}><ActivityIndicator color={T.teal2} size="large" /></View>;
  if (!scan) return <View style={s.loading}><Text style={{ color:T.textMd }}>Scan not found</Text></View>;

  const ai = scan.aiResult;
  const urgencyColor = ai ? URGENCY_COLOR[ai.urgency] : T.textMd;

  return (
    <View style={s.container}>
      {/* Header strip */}
      <View style={[s.header, ai?.urgency === 'CRITICAL' && s.headerCritical]}>
        <Text style={s.scanId}>{scan.modality} · {scan.bodyPart} · {scan.id.slice(0,12)}</Text>
        {ai && <View style={[s.urgencyBadge, { borderColor: urgencyColor }]}>
          <Text style={[s.urgencyText, { color: urgencyColor }]}>{ai.urgency}</Text>
        </View>}
      </View>

      {/* Patient info bar */}
      <View style={s.patientBar}>
        <Text style={s.patientName}>{scan.patient?.user?.firstName} {scan.patient?.user?.lastName}</Text>
        <Text style={s.priority}>{scan.priority}</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['ai','report','info'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab===t && s.tabActive]}>
            <Text style={[s.tabText, tab===t && s.tabTextActive]}>{t === 'ai' ? 'AI Result' : t === 'report' ? 'Report' : 'Info'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ padding:16, paddingBottom:120 }}>
        {tab === 'ai' && ai && (
          <>
            {/* Primary finding */}
            <View style={s.card}>
              <Text style={s.cardLabel}>PRIMARY FINDING</Text>
              <Text style={[s.finding, { color: urgencyColor }]}>{ai.primaryFinding}</Text>
              {ai.location && <Text style={s.detail}>📍 {ai.location}</Text>}
              {ai.size && <Text style={s.detail}>📐 {ai.size}</Text>}
              {ai.midlineShift && ai.midlineShift !== 'N/A' && <Text style={s.detail}>↔ Midline: {ai.midlineShift}</Text>}
            </View>

            {/* Confidence */}
            <View style={s.card}>
              <Text style={s.cardLabel}>AI CONFIDENCE</Text>
              <View style={s.confRow}>
                <Text style={[s.confNum, { color: urgencyColor }]}>{(ai.confidence*100).toFixed(1)}%</Text>
                <View style={s.confBarBg}>
                  <View style={[s.confBarFill, { width:`${ai.confidence*100}%` as any, backgroundColor: urgencyColor }]} />
                </View>
              </View>
              {ai.uncertaintyScore != null && (
                <Text style={s.detail}>Uncertainty: {(ai.uncertaintyScore*100).toFixed(1)}% · MC Dropout validated</Text>
              )}
              <Text style={[s.metacog, { color: ai.metacognitionPassed ? T.teal2 : T.amber }]}>
                {ai.metacognitionPassed ? '✓ Metacognition: PASSED' : '⚠ Metacognition: Review required'}
              </Text>
            </View>

            {/* SHAP values */}
            {ai.shapValues && ai.shapValues.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardLabel}>KEY FEATURES (SHAP)</Text>
                {(ai.shapValues as any[]).slice(0, 5).map((sv: any, i: number) => (
                  <View key={i} style={s.shapRow}>
                    <Text style={s.shapLabel}>{sv.f || sv.feature}</Text>
                    <View style={s.shapBarBg}>
                      <View style={[s.shapBarFill, { width: `${Math.min(100, (sv.v || sv.value)*100)}%` as any }]} />
                    </View>
                    <Text style={s.shapVal}>{((sv.v || sv.value)*100).toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Grad-CAM heatmap */}
            {ai.gradcamUrl && (
              <View style={s.card}>
                <Text style={s.cardLabel}>GRAD-CAM HEATMAP</Text>
                <Image source={{ uri: ai.gradcamUrl }} style={s.heatmap} resizeMode="contain" />
                <Text style={s.heatmapCaption}>Red = highest AI attention region</Text>
              </View>
            )}
          </>
        )}

        {tab === 'report' && (
          <View style={s.card}>
            {scan.report ? (
              <>
                <Text style={s.cardLabel}>REPORT STATUS: {scan.report.status.toUpperCase()}</Text>
                <Text style={s.reportText}>{scan.report.impression}</Text>
                {scan.report.status !== 'approved' && (
                  <TouchableOpacity style={s.btn} onPress={() => nav.navigate('ReportEditor', { scanId })}>
                    <Text style={s.btnText}>✏️ Edit Report</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={s.cardLabel}>NO REPORT YET</Text>
                <Text style={s.detail}>Generate an AI-assisted report from the scan findings.</Text>
                <TouchableOpacity style={s.btn} onPress={() => genReport.mutate()} disabled={genReport.isPending}>
                  {genReport.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>⚡ Generate VLM Report</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {tab === 'info' && (
          <View style={s.card}>
            <Text style={s.cardLabel}>SCAN INFORMATION</Text>
            {[
              ['Scan ID',    scan.id],
              ['Modality',   scan.modality],
              ['Body Part',  scan.bodyPart],
              ['Priority',   scan.priority],
              ['Status',     scan.status],
              ['Received',   new Date(scan.receivedAt).toLocaleString()],
              ['Study UID',  scan.dicomStudyUid || '—'],
              ['FHIR ID',    scan.fhirImagingStudyId || '—'],
            ].map(([label, val]) => (
              <View key={label} style={s.infoRow}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoVal}>{val}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={s.actionBar}>
        <TouchableOpacity style={s.actionBtn} onPress={() => nav.navigate('Annotation', { scanId })}>
          <Text style={s.actionBtnText}>🖊 Annotate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => nav.navigate('VoiceDictation', { scanId })}>
          <Text style={s.actionBtnText}>🎙 Dictate</Text>
        </TouchableOpacity>
        {!scan.report && ai && (
          <TouchableOpacity style={[s.actionBtn, s.primaryBtn]} onPress={() => genReport.mutate()} disabled={genReport.isPending}>
            <Text style={[s.actionBtnText, { color:'#fff' }]}>⚡ Generate</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex:1, backgroundColor:T.bg0 },
  loading:      { flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center' },
  header:       { backgroundColor:T.bg1, padding:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderBottomWidth:1, borderBottomColor:T.border },
  headerCritical: { backgroundColor:'rgba(201,68,68,0.1)' },
  scanId:       { color:T.textMd, fontSize:12, fontFamily:'Courier', fontWeight:'700' },
  urgencyBadge: { borderWidth:1.5, borderRadius:8, paddingHorizontal:10, paddingVertical:3 },
  urgencyText:  { fontSize:11, fontWeight:'900', letterSpacing:1 },
  patientBar:   { backgroundColor:T.bg2, paddingHorizontal:16, paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  patientName:  { color:T.textHi, fontSize:16, fontWeight:'800' },
  priority:     { color:T.textMd, fontSize:12, fontWeight:'700' },
  tabs:         { flexDirection:'row', backgroundColor:T.bg1, borderBottomWidth:1, borderBottomColor:T.border },
  tab:          { flex:1, paddingVertical:12, alignItems:'center' },
  tabActive:    { borderBottomWidth:2, borderBottomColor:T.teal },
  tabText:      { color:T.textLo, fontSize:12, fontWeight:'700' },
  tabTextActive:{ color:T.teal2 },
  body:         { flex:1 },
  card:         { backgroundColor:T.bg1, borderRadius:14, padding:16, marginBottom:12, borderWidth:1, borderColor:T.border },
  cardLabel:    { color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:10, fontFamily:'Courier' },
  finding:      { fontSize:20, fontWeight:'900', marginBottom:8 },
  detail:       { color:T.textMd, fontSize:12, marginBottom:4 },
  confRow:      { flexDirection:'row', alignItems:'center', gap:12, marginBottom:8 },
  confNum:      { fontSize:24, fontWeight:'900', width:60 },
  confBarBg:    { flex:1, backgroundColor:T.bg2, borderRadius:4, height:8 },
  confBarFill:  { height:'100%', borderRadius:4 },
  metacog:      { fontSize:11, fontWeight:'700', marginTop:6 },
  shapRow:      { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
  shapLabel:    { flex:1, color:T.textMd, fontSize:11 },
  shapBarBg:    { width:80, backgroundColor:T.bg2, borderRadius:3, height:6 },
  shapBarFill:  { height:'100%', borderRadius:3, backgroundColor:T.teal },
  shapVal:      { color:T.textLo, fontSize:10, width:30, textAlign:'right', fontFamily:'Courier' },
  heatmap:      { width:'100%', height:220, borderRadius:8, backgroundColor:T.bg2, marginBottom:6 },
  heatmapCaption: { color:T.textLo, fontSize:10, textAlign:'center' },
  reportText:   { color:T.textMd, fontSize:13, lineHeight:20 },
  btn:          { backgroundColor:T.teal, borderRadius:10, padding:13, alignItems:'center', marginTop:14 },
  btnText:      { color:'#fff', fontWeight:'800', fontSize:14 },
  infoRow:      { flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:T.bg2 },
  infoLabel:    { color:T.textLo, fontSize:12, fontWeight:'600' },
  infoVal:      { color:T.textMd, fontSize:12, fontFamily:'Courier', flex:1, textAlign:'right' },
  actionBar:    { flexDirection:'row', gap:8, padding:12, backgroundColor:T.bg1, borderTopWidth:1, borderTopColor:T.border, paddingBottom:24 },
  actionBtn:    { flex:1, backgroundColor:T.bg2, borderRadius:10, padding:12, alignItems:'center', borderWidth:1, borderColor:T.border },
  primaryBtn:   { backgroundColor:T.teal, borderColor:T.teal },
  actionBtnText:{ color:T.textMd, fontSize:12, fontWeight:'700' },
});
