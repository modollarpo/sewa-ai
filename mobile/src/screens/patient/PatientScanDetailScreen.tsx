// SEWA XAI — mobile/src/screens/patient/PatientScanDetailScreen.tsx
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', tealDim:'rgba(64,141,123,0.12)', red:'#C94444', amber:'#D47820', green:'#3A9E6A', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };
const URGENCY_COLOR: Record<string,string> = { CRITICAL:T.red, URGENT:T.amber, NORMAL:T.green, ROUTINE:T.teal2 };
export default function PatientScanDetailScreen({ route }: any) {
  const nav = useNavigation<any>();
  const { scanId } = route.params;
  const { data: scan, isLoading } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => (await apiClient.get(`/scans/${scanId}`)).data,
  });
  if (isLoading) return <View style={{ flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={T.teal2} size="large" /></View>;
  const ai = scan?.aiResult;
  const urg = ai?.urgency ?? 'ROUTINE';
  const urgColor = URGENCY_COLOR[urg] ?? T.teal2;
  const hasReport = scan?.report?.status === 'approved' || scan?.report?.status === 'signed';
  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ paddingBottom:40 }}>
      {/* Header */}
      <View style={{ backgroundColor:T.bg1, paddingHorizontal:20, paddingTop:56, paddingBottom:20, borderBottomWidth:1, borderBottomColor:T.border }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginBottom:12 }}>
          <Text style={{ color:T.teal2, fontSize:14, fontWeight:'600' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize:20, fontWeight:'900', color:T.textHi }}>{scan?.modality} — {scan?.bodyPart}</Text>
        <Text style={{ fontSize:12, color:T.textLo, marginTop:4 }}>{scan?.receivedAt ? new Date(scan.receivedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}) : ''}</Text>
      </View>
      <View style={{ padding:16 }}>
        {/* Status */}
        <View style={{ backgroundColor:T.bg1, borderRadius:14, padding:16, marginBottom:14, borderWidth:1, borderColor:T.border }}>
          <Text style={{ fontSize:12, color:T.textLo, fontWeight:'700', letterSpacing:1, marginBottom:10, textTransform:'uppercase' }}>Scan Status</Text>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:14, color:T.textMd }}>Status</Text>
            <Text style={{ fontSize:14, fontWeight:'700', color:T.teal2, textTransform:'uppercase' }}>{scan?.status?.replace('_',' ')}</Text>
          </View>
          {scan?.priority && <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:8 }}>
            <Text style={{ fontSize:14, color:T.textMd }}>Priority</Text>
            <Text style={{ fontSize:14, fontWeight:'700', color:T.textHi }}>{scan.priority}</Text>
          </View>}
        </View>
        {/* AI Result */}
        {ai && (
          <View style={{ backgroundColor:T.bg1, borderRadius:14, padding:16, marginBottom:14, borderWidth:1, borderColor:urgColor+'40' }}>
            <Text style={{ fontSize:12, color:T.textLo, fontWeight:'700', letterSpacing:1, marginBottom:10, textTransform:'uppercase' }}>AI Analysis</Text>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
              <Text style={{ fontSize:14, color:T.textMd }}>Finding</Text>
              <Text style={{ fontSize:14, fontWeight:'700', color:T.textHi }}>{ai.primaryFinding}</Text>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
              <Text style={{ fontSize:14, color:T.textMd }}>Urgency</Text>
              <Text style={{ fontSize:14, fontWeight:'800', color:urgColor }}>{urg}</Text>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontSize:14, color:T.textMd }}>AI Confidence</Text>
              <Text style={{ fontSize:14, fontWeight:'700', color:T.textHi }}>{ai.confidence ? (ai.confidence*100).toFixed(0)+'%' : '—'}</Text>
            </View>
            <View style={{ backgroundColor:T.bg2, borderRadius:8, padding:10, marginTop:12 }}>
              <Text style={{ fontSize:11, color:T.textLo, lineHeight:16 }}>AI analysis is always reviewed and confirmed by a qualified radiologist before any clinical action.</Text>
            </View>
          </View>
        )}
        {/* Report CTA */}
        {hasReport ? (
          <TouchableOpacity style={{ backgroundColor:T.teal, borderRadius:14, padding:16, alignItems:'center' }} onPress={() => nav.navigate('ReportView', { reportId:scan.report.id })}>
            <Text style={{ color:'#fff', fontSize:15, fontWeight:'800' }}>📋  View Signed Report →</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ backgroundColor:T.tealDim, borderRadius:14, padding:16, alignItems:'center', borderWidth:1, borderColor:T.teal+'30' }}>
            <Text style={{ color:T.teal2, fontSize:14, fontWeight:'700', marginBottom:4 }}>Report not yet available</Text>
            <Text style={{ color:T.textMd, fontSize:12, textAlign:'center', lineHeight:18 }}>A radiologist is reviewing your scan. You will be notified when the report is ready.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
