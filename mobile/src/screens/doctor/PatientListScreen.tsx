// SEWA AI — mobile/src/screens/doctor/PatientListScreen.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#E86060', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function PatientListScreen() {
  const nav = useNavigation<any>();
  const [search, setSearch] = useState('');
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['patients', search],
    queryFn: async () => (await apiClient.get('/patients', { params: { search: search || undefined, limit:50 } })).data,
  });

  const patients = data?.patients ?? [];
  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      <View style={{ backgroundColor:T.bg1, padding:16, paddingTop:56, borderBottomWidth:1, borderBottomColor:T.border }}>
        <Text style={{ color:T.textHi, fontSize:20, fontWeight:'900', marginBottom:12 }}>Patients</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or MRN..." placeholderTextColor={T.textLo}
          style={{ backgroundColor:T.bg2, borderRadius:10, padding:10, color:T.textHi, fontSize:13, borderWidth:1, borderColor:T.border }} />
      </View>
      <FlatList data={patients} keyExtractor={(i:any) => i.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.teal2} />}
        contentContainerStyle={{ padding:12 }} ItemSeparatorComponent={() => <View style={{ height:8 }} />}
        renderItem={({ item }: any) => {
          const hasCritical = item.scans?.some((s:any) => s.aiResult?.urgency === 'CRITICAL');
          return (
            <TouchableOpacity onPress={() => nav.navigate('PatientDetail', { patientId:item.id })}
              style={{ backgroundColor:T.bg1, borderRadius:12, padding:14, borderWidth:1, borderColor:hasCritical ? 'rgba(201,68,68,0.4)' : T.border, flexDirection:'row', alignItems:'center', gap:12 }}>
              <View style={{ width:44, height:44, borderRadius:22, backgroundColor:'rgba(64,141,123,0.2)', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:T.teal2, fontSize:16, fontWeight:'900' }}>{item.user?.firstName?.[0]}{item.user?.lastName?.[0]}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:T.textHi, fontSize:14, fontWeight:'700' }}>{item.user?.firstName} {item.user?.lastName}</Text>
                <Text style={{ color:T.textMd, fontSize:11 }}>MRN: {item.mrn} · {item.scans?.length||0} scans</Text>
              </View>
              {hasCritical && <View style={{ backgroundColor:'rgba(201,68,68,0.15)', borderRadius:6, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'rgba(201,68,68,0.3)' }}>
                <Text style={{ color:T.red, fontSize:9, fontWeight:'800' }}>CRITICAL</Text>
              </View>}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
