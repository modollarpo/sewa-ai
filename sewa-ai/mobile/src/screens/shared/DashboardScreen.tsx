// SEWA AI — mobile/src/screens/shared/DashboardScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', redLt:'#E86060', amber:'#D47820', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await apiClient.get('/analytics')).data,
    refetchInterval: 60_000,
  });

  const kpis = [
    { label: 'Total Scans',       value: analytics?.totalScans     ?? '—', color: T.teal2 },
    { label: 'Critical Findings', value: analytics?.criticalScans  ?? '—', color: T.redLt },
    { label: 'Reports Approved',  value: analytics?.approvedReports ?? '—', color: T.teal2 },
    { label: 'AI Confidence',     value: analytics?.avgAIConfidence ? `${(analytics.avgAIConfidence*100).toFixed(1)}%` : '—', color: T.teal2 },
    { label: 'Avg Inference',     value: analytics?.avgInferenceMs  ? `${analytics.avgInferenceMs}ms` : '—', color: T.textMd },
    { label: 'Total Patients',    value: analytics?.totalPatients   ?? '—', color: T.textMd },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding:16, paddingTop:60 }}>
      <Text style={s.title}>Dashboard</Text>
      <Text style={s.sub}>Welcome, {user?.firstName} · {user?.tenantName}</Text>
      <View style={s.grid}>
        {kpis.map(k => (
          <View key={k.label} style={s.card}>
            <Text style={s.cardLabel}>{k.label.toUpperCase()}</Text>
            <Text style={[s.cardValue, { color: k.color }]}>{k.value}</Text>
          </View>
        ))}
      </View>
      <View style={s.infoCard}>
        <Text style={s.cardLabel}>SYSTEM STATUS</Text>
        {[['AI Triage Engine','Online','#52B09A'],['VLM Report Generator','Online','#52B09A'],['Metacognition Engine','Online','#52B09A'],['FHIR R4 Integration','Online','#52B09A'],['HL7v2 MLLP Server','Online','#52B09A']].map(([svc,status,col]) => (
          <View key={svc as string} style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: col as string }]} />
            <Text style={s.statusLabel}>{svc}</Text>
            <Text style={[s.statusVal, { color: col as string }]}>{status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:T.bg0 },
  title:      { color:T.textHi, fontSize:22, fontWeight:'900', marginBottom:4 },
  sub:        { color:T.textMd, fontSize:12, marginBottom:20 },
  grid:       { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 },
  card:       { width:'47%', backgroundColor:T.bg1, borderRadius:12, padding:14, borderWidth:1, borderColor:T.border },
  cardLabel:  { color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:6, fontFamily:'Courier' },
  cardValue:  { fontSize:24, fontWeight:'900' },
  infoCard:   { backgroundColor:T.bg1, borderRadius:14, padding:16, borderWidth:1, borderColor:T.border },
  statusRow:  { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:7, borderBottomWidth:1, borderBottomColor:T.bg2 },
  dot:        { width:6, height:6, borderRadius:3 },
  statusLabel:{ flex:1, color:T.textMd, fontSize:12 },
  statusVal:  { fontSize:11, fontWeight:'700' },
});
