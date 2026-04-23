// SEWA AI — mobile/src/screens/patient/ReportViewScreen.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function ReportViewScreen({ route }: any) {
  const { reportId } = route.params;
  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => (await apiClient.get(`/reports/${reportId}`)).data,
  });

  const handleShare = () => Share.share({ message: `SEWA AI Report\n\n${report?.fullText || ''}`, title:'My Medical Report' });

  if (isLoading) return <View style={{ flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={T.teal2} /></View>;

  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ padding:16, paddingBottom:40 }}>
      <View style={{ backgroundColor:T.bg1, borderRadius:14, padding:18, marginBottom:14, borderWidth:1, borderColor:T.teal }}>
        <Text style={{ color:T.teal2, fontSize:12, fontWeight:'800', marginBottom:6 }}>✓ SIGNED REPORT</Text>
        <Text style={{ color:T.textHi, fontSize:16, fontWeight:'800', marginBottom:4 }}>{report?.scan?.modality} {report?.scan?.bodyPart}</Text>
        <Text style={{ color:T.textMd, fontSize:11 }}>Signed by Dr {report?.author?.firstName} {report?.author?.lastName} · {report?.signedAt ? new Date(report.signedAt).toLocaleDateString() : ''}</Text>
      </View>

      {[['TECHNIQUE', report?.technique], ['FINDINGS', report?.findings], ['IMPRESSION', report?.impression], ['RECOMMENDATION', report?.recommendation]].map(([label, val]) => val && (
        <View key={label as string} style={{ backgroundColor:T.bg1, borderRadius:12, padding:16, marginBottom:10, borderWidth:1, borderColor:T.border }}>
          <Text style={{ color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, marginBottom:8, fontFamily:'Courier' }}>{label}</Text>
          <Text style={{ color:T.textMd, fontSize:13, lineHeight:20 }}>{val}</Text>
        </View>
      ))}

      <TouchableOpacity onPress={handleShare} style={{ backgroundColor:T.teal, borderRadius:12, padding:14, alignItems:'center', marginTop:8 }}>
        <Text style={{ color:'#fff', fontWeight:'800' }}>Share Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
