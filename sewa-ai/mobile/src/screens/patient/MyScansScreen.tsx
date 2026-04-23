// SEWA AI — mobile/src/screens/patient/MyScansScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', redLt:'#E86060', amber:'#D47820', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function MyScansScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['my-scans'],
    queryFn: async () => (await apiClient.get('/scans')).data,
  });

  const scans = data?.scans ?? [];

  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      <View style={{ backgroundColor:T.bg1, padding:16, paddingTop:56, borderBottomWidth:1, borderBottomColor:T.border }}>
        <Text style={{ color:T.textHi, fontSize:20, fontWeight:'900' }}>My Scans</Text>
        <Text style={{ color:T.textMd, fontSize:13, marginTop:2 }}>Welcome, {user?.firstName}</Text>
      </View>
      <FlatList
        data={scans}
        keyExtractor={(i:any) => i.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.teal2} />}
        contentContainerStyle={{ padding:16 }}
        ItemSeparatorComponent={() => <View style={{ height:10 }} />}
        renderItem={({ item }: any) => {
          const isReported = item.report?.status === 'approved';
          const isUrgent   = item.aiResult?.urgency === 'CRITICAL' || item.aiResult?.urgency === 'URGENT';
          return (
            <TouchableOpacity onPress={() => isReported && nav.navigate('ReportView', { reportId: item.report?.id })}
              style={{ backgroundColor:T.bg1, borderRadius:14, padding:14, borderWidth:1, borderColor: isUrgent ? 'rgba(201,68,68,0.4)' : T.border }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <Text style={{ color:T.textMd, fontSize:12, fontWeight:'700' }}>{item.modality} · {item.bodyPart}</Text>
                <View style={{ backgroundColor: isReported ? 'rgba(64,141,123,0.15)' : T.bg2, borderRadius:6, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor: isReported ? T.teal : T.border }}>
                  <Text style={{ color: isReported ? T.teal2 : T.textLo, fontSize:10, fontWeight:'800' }}>
                    {isReported ? 'REPORT READY' : item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={{ color:T.textLo, fontSize:11, marginBottom:4 }}>{new Date(item.receivedAt).toLocaleDateString()}</Text>
              {item.aiResult && (
                <Text style={{ color: isUrgent ? T.redLt : T.textMd, fontSize:12 }}>
                  {item.aiResult.primaryFinding} · {(item.aiResult.confidence*100).toFixed(0)}% AI confidence
                </Text>
              )}
              {isReported && (
                <Text style={{ color:T.teal2, fontSize:12, fontWeight:'700', marginTop:8 }}>Tap to view report →</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
