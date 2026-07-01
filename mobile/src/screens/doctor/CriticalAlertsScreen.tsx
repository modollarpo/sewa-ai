// SEWA XAI — mobile/src/screens/doctor/CriticalAlertsScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', redLt:'#E86060', amber:'#D47820', amberLt:'#F09A40', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function CriticalAlertsScreen() {
  const nav = useNavigation<any>();
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['critical-scans'],
    queryFn: async () => (await apiClient.get('/scans', { params: { status: 'ai_complete', limit: 100 } })).data,
    refetchInterval: 15_000,
  });

  const critical = (data?.scans ?? []).filter((s: any) => s.aiResult?.urgency === 'CRITICAL' || s.aiResult?.urgency === 'URGENT');

  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      <View style={{ backgroundColor:T.bg1, padding:16, paddingTop:56, borderBottomWidth:1, borderBottomColor:T.border }}>
        <Text style={{ color:T.textHi, fontSize:20, fontWeight:'900' }}>Critical Alerts</Text>
        <Text style={{ color:T.red, fontSize:12, marginTop:2 }}>{critical.length} active alerts requiring review</Text>
      </View>
      <FlatList
        data={critical}
        keyExtractor={(i:any) => i.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.teal2} />}
        contentContainerStyle={{ padding:12 }}
        ItemSeparatorComponent={() => <View style={{ height:10 }} />}
        renderItem={({ item }: any) => {
          const isCritical = item.aiResult?.urgency === 'CRITICAL';
          return (
            <TouchableOpacity onPress={() => nav.navigate('ScanDetail', { scanId: item.id })}
              style={{ backgroundColor: isCritical ? 'rgba(201,68,68,0.08)' : 'rgba(212,120,32,0.08)', borderRadius:14, padding:16, borderWidth:1.5, borderColor: isCritical ? 'rgba(201,68,68,0.4)' : 'rgba(212,120,32,0.4)' }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <Text style={{ color: isCritical ? T.redLt : T.amberLt, fontSize:11, fontWeight:'900', letterSpacing:1 }}>{item.aiResult?.urgency}</Text>
                <Text style={{ color:T.textLo, fontSize:10 }}>{new Date(item.receivedAt).toLocaleString()}</Text>
              </View>
              <Text style={{ color:T.textHi, fontSize:16, fontWeight:'800', marginBottom:4 }}>
                {item.patient?.user?.firstName} {item.patient?.user?.lastName}
              </Text>
              <Text style={{ color: isCritical ? T.redLt : T.amberLt, fontSize:13, fontWeight:'600', marginBottom:4 }}>
                {item.aiResult?.primaryFinding}
              </Text>
              <Text style={{ color:T.textMd, fontSize:12 }}>
                {item.modality} · {item.bodyPart} · {(item.aiResult?.confidence*100).toFixed(0)}% confidence
              </Text>
              <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
                <TouchableOpacity style={{ flex:1, backgroundColor:T.bg2, borderRadius:8, padding:10, alignItems:'center', borderWidth:1, borderColor:T.border }}>
                  <Text style={{ color:T.textMd, fontSize:12, fontWeight:'700' }}>View Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex:1, backgroundColor: isCritical ? T.red : T.amber, borderRadius:8, padding:10, alignItems:'center' }}>
                  <Text style={{ color:'#fff', fontSize:12, fontWeight:'800' }}>Review Now →</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
