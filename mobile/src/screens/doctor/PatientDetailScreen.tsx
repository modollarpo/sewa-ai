// SEWA XAI — mobile/src/screens/doctor/PatientDetailScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#E86060', amber:'#F09A40', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };
const UC: Record<string,string> = { CRITICAL:T.red, URGENT:T.amber, NORMAL:T.teal2 };

export default function PatientDetailScreen({ route }: any) {
  const { patientId } = route.params;
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => (await apiClient.get(`/patients/${patientId}`)).data,
  });

  if (isLoading) return <View style={{ flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={T.teal2} /></View>;
  if (!patient) return <View style={{ flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center' }}><Text style={{ color:T.textMd }}>Patient not found</Text></View>;

  const age = patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : null;

  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ padding:16, paddingBottom:40 }}>
      {/* Patient header */}
      <View style={{ backgroundColor:T.bg1, borderRadius:14, padding:18, marginBottom:14, borderWidth:1, borderColor:T.border, flexDirection:'row', alignItems:'center', gap:14 }}>
        <View style={{ width:56, height:56, borderRadius:28, backgroundColor:'rgba(64,141,123,0.2)', alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color:T.teal2, fontSize:22, fontWeight:'900' }}>{patient.user?.firstName?.[0]}{patient.user?.lastName?.[0]}</Text>
        </View>
        <View>
          <Text style={{ color:T.textHi, fontSize:18, fontWeight:'900' }}>{patient.user?.firstName} {patient.user?.lastName}</Text>
          <Text style={{ color:T.textMd, fontSize:12 }}>MRN: {patient.mrn} · {age ? `${age}y` : ''} {patient.sex}</Text>
          <Text style={{ color:T.textLo, fontSize:11 }}>{patient.user?.email}</Text>
        </View>
      </View>

      {/* Scans */}
      <Text style={{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:10, fontFamily:'Courier' }}>IMAGING HISTORY ({patient.scans?.length||0})</Text>
      {(patient.scans||[]).map((s:any) => {
        const ai = s.aiResult;
        const uc = ai ? UC[ai.urgency] : T.textMd;
        return (
          <View key={s.id} style={{ backgroundColor:T.bg1, borderRadius:12, padding:14, marginBottom:8, borderWidth:1, borderColor: ai?.urgency==='CRITICAL' ? 'rgba(201,68,68,0.3)' : T.border }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ color:T.textMd, fontSize:12, fontWeight:'700' }}>{s.modality} · {s.bodyPart}</Text>
              <Text style={{ color:T.textLo, fontSize:10 }}>{new Date(s.receivedAt).toLocaleDateString()}</Text>
            </View>
            {ai && <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <View style={{ width:5, height:5, borderRadius:3, backgroundColor:uc }} />
              <Text style={{ color:uc, fontSize:11, fontWeight:'600' }}>{ai.primaryFinding}</Text>
              <Text style={{ color:T.textLo, fontSize:10 }}>{(ai.confidence*100).toFixed(0)}%</Text>
            </View>}
            <View style={{ backgroundColor: s.report?.status==='approved' ? 'rgba(64,141,123,0.1)' : T.bg2, borderRadius:6, paddingHorizontal:8, paddingVertical:3, alignSelf:'flex-start', marginTop:6 }}>
              <Text style={{ color: s.report?.status==='approved' ? T.teal2 : T.textLo, fontSize:9, fontWeight:'800' }}>
                {s.report?.status === 'approved' ? '✓ REPORTED' : s.status.toUpperCase()}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
