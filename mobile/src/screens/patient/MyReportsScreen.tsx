// SEWA AI — mobile/src/screens/patient/MyReportsScreen.tsx
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', tealDim:'rgba(64,141,123,0.12)', green:'#3A9E6A', greenBg:'rgba(58,158,106,0.12)', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028', info:'#3B82F6', infoBg:'rgba(59,130,246,0.10)' };
export default function MyReportsScreen() {
  const nav = useNavigation<any>();
  const [filter, setFilter] = useState<'all'|'recent'>('all');
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['patient-reports'],
    queryFn: async () => (await apiClient.get('/patients/me/reports')).data,
    staleTime: 60_000,
  });
  const reports: any[] = data?.reports ?? [];
  const displayed = filter === 'recent'
    ? reports.filter(r => r.signedAt && (Date.now() - new Date(r.signedAt).getTime()) < 30*24*3600*1000)
    : reports;
  const handleShare = async (r: any) => Share.share({ title:'My SEWA AI Report', message:`SEWA AI Report\n${r.scan.modality} ${r.scan.bodyPart}\n\nImpression:\n${r.impression ?? ''}` });
  const renderReport = ({ item: r }: any) => (
    <View style={{ backgroundColor:T.bg1, borderRadius:16, marginBottom:14, borderWidth:1, borderColor:T.border, overflow:'hidden' }}>
      <View style={{ height:3, backgroundColor:T.teal }} />
      <View style={{ padding:16 }}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <Text style={{ fontSize:16, fontWeight:'800', color:T.textHi, flex:1 }}>{r.scan.modality} — {r.scan.bodyPart}</Text>
          <View style={{ backgroundColor:T.greenBg, paddingHorizontal:10, paddingVertical:4, borderRadius:8, borderWidth:1, borderColor:T.green+'50' }}>
            <Text style={{ fontSize:11, fontWeight:'700', color:T.green }}>✓ Signed</Text>
          </View>
        </View>
        <Text style={{ fontSize:12, color:T.textLo, marginBottom:2 }}>Scan: {new Date(r.scan.receivedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</Text>
        {r.signedAt && <Text style={{ fontSize:12, color:T.teal2, marginBottom:8 }}>Signed: {new Date(r.signedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}{r.author ? ` · Dr ${r.author.firstName} ${r.author.lastName}` : ''}</Text>}
        {r.impression && <Text style={{ fontSize:13, color:T.textMd, lineHeight:20, marginBottom:14, backgroundColor:T.bg2, borderRadius:10, padding:12 }} numberOfLines={2}>{r.impression}</Text>}
        <View style={{ flexDirection:'row', gap:10 }}>
          <TouchableOpacity style={{ flex:1, backgroundColor:T.teal, borderRadius:10, paddingVertical:10, alignItems:'center' }} onPress={() => nav.navigate('ReportView', { reportId:r.id })}>
            <Text style={{ color:'#fff', fontSize:13, fontWeight:'700' }}>View full report →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingHorizontal:18, paddingVertical:10, borderRadius:10, borderWidth:1, borderColor:T.border, alignItems:'center', justifyContent:'center' }} onPress={() => handleShare(r)}>
            <Text style={{ color:T.textMd, fontSize:13, fontWeight:'600' }}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      <View style={{ paddingHorizontal:20, paddingTop:56, paddingBottom:16, backgroundColor:T.bg1, borderBottomWidth:1, borderBottomColor:T.border }}>
        <Text style={{ fontSize:22, fontWeight:'900', color:T.textHi }}>My Reports</Text>
        <Text style={{ fontSize:13, color:T.textMd, marginTop:2 }}>{reports.length} signed {reports.length===1?'report':'reports'}</Text>
      </View>
      <View style={{ flexDirection:'row', gap:10, padding:16, backgroundColor:T.bg1, borderBottomWidth:1, borderBottomColor:T.border }}>
        {(['all','recent'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:filter===f?T.teal:T.border, backgroundColor:filter===f?T.tealDim:'transparent' }}>
            <Text style={{ fontSize:13, color:filter===f?T.teal2:T.textMd, fontWeight:'600' }}>{f==='all'?'All reports':'Last 30 days'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator color={T.teal2} size="large" />
          <Text style={{ marginTop:12, fontSize:13, color:T.textMd }}>Loading your reports…</Text>
        </View>
      ) : displayed.length === 0 ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:32 }}>
          <Text style={{ fontSize:40, marginBottom:16 }}>📋</Text>
          <Text style={{ fontSize:16, fontWeight:'800', color:T.textHi, marginBottom:8, textAlign:'center' }}>
            {filter==='recent'?'No recent reports':'No signed reports yet'}
          </Text>
          <Text style={{ fontSize:13, color:T.textMd, textAlign:'center', lineHeight:20 }}>
            {filter==='recent'?'You have no reports signed in the last 30 days.':'Reports appear here once a radiologist has reviewed and signed your scan.'}
          </Text>
        </View>
      ) : (
        <FlatList data={displayed} keyExtractor={r => r.id} renderItem={renderReport}
          contentContainerStyle={{ padding:16, paddingBottom:40 }}
          showsVerticalScrollIndicator={false} onRefresh={refetch} refreshing={isRefetching}
          ListHeaderComponent={
            <View style={{ backgroundColor:T.infoBg, borderWidth:1, borderColor:T.info+'30', borderRadius:12, padding:14, marginBottom:16 }}>
              <Text style={{ fontSize:12, color:T.textMd, lineHeight:18 }}>These are your signed radiology reports. Only you and your care team can see them.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
