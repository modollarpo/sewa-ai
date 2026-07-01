// SEWA XAI — mobile/src/screens/patient/HomeScreen.tsx
// Patient home dashboard: scan stats, quick actions, recent scans
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', tealDim:'rgba(64,141,123,0.15)', red:'#C94444', redBg:'rgba(201,68,68,0.12)', amber:'#D47820', amberBg:'rgba(212,120,32,0.12)', green:'#3A9E6A', greenBg:'rgba(58,158,106,0.12)', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028', white:'#FFFFFF' };
export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuthStore();
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['patient-home'],
    queryFn: async () => {
      const [sc, nt] = await Promise.all([apiClient.get('/scans?limit=5'), apiClient.get('/notifications?limit=3&read=false')]);
      return { scans: sc.data, notifications: nt.data };
    }, staleTime: 30_000,
  });
  const scans = data?.scans?.scans ?? [];
  const totalScans = data?.scans?.total ?? 0;
  const reportsReady = scans.filter((s: any) => s.report?.status === 'approved' || s.report?.status === 'signed').length;
  const urgentCount = scans.filter((s: any) => s.aiResult?.urgency === 'CRITICAL' || s.aiResult?.urgency === 'URGENT').length;
  const unread = data?.notifications?.notifications?.length ?? 0;
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ paddingBottom:40 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.teal2} />} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:60, paddingBottom:20, backgroundColor:T.bg1, borderBottomWidth:1, borderBottomColor:T.border }}>
        <View>
          <Text style={{ fontSize:13, color:T.textMd, fontWeight:'500' }}>{greeting}</Text>
          <Text style={{ fontSize:22, fontWeight:'900', color:T.textHi, marginTop:2 }}>{user?.firstName ?? 'Patient'}</Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('Profile')} style={{ width:42, height:42, borderRadius:21, backgroundColor:T.teal, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color:T.white, fontSize:18, fontWeight:'800' }}>{(user?.firstName?.[0] ?? 'P').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
      {/* Urgent banner */}
      {urgentCount > 0 && (
        <TouchableOpacity onPress={() => nav.navigate('MyScans')} style={{ flexDirection:'row', alignItems:'center', margin:16, padding:14, backgroundColor:T.redBg, borderRadius:14, borderWidth:1, borderColor:T.red+'40', gap:12 }}>
          <Text style={{ fontSize:20 }}>🔴</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:'#E86060', fontSize:14, fontWeight:'800' }}>{urgentCount} result{urgentCount>1?'s':''} need attention</Text>
            <Text style={{ color:T.textMd, fontSize:12, marginTop:2 }}>Tap to review your scan results</Text>
          </View>
          <Text style={{ color:'#E86060', fontSize:18, fontWeight:'700' }}>→</Text>
        </TouchableOpacity>
      )}
      {/* Stats */}
      {isLoading ? <ActivityIndicator color={T.teal2} style={{ marginVertical:24 }} /> : (
        <View style={{ flexDirection:'row', gap:10, paddingHorizontal:16, marginTop:20 }}>
          {[{ v:totalScans, l:'Total Scans', c:T.teal2, bg:T.tealDim, p:'MyScans' },
            { v:reportsReady, l:'Reports Ready', c:T.green, bg:T.greenBg, p:'MyReports' },
            { v:unread, l:'Unread Alerts', c:urgentCount>0?T.red:T.teal2, bg:urgentCount>0?T.redBg:T.tealDim, p:'MyScans' }]
            .map(({ v, l, c, bg, p }) => (
            <TouchableOpacity key={l} onPress={() => nav.navigate(p)} activeOpacity={0.7} style={{ flex:1, borderRadius:14, borderWidth:1, borderColor:c+'40', backgroundColor:bg, padding:14, alignItems:'center' }}>
              <Text style={{ fontSize:26, fontWeight:'900', color:c, marginBottom:4 }}>{v}</Text>
              <Text style={{ fontSize:11, color:T.textMd, fontWeight:'600', textAlign:'center' }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* Quick actions */}
      <Text style={{ fontSize:16, fontWeight:'800', color:T.textHi, paddingHorizontal:16, marginTop:24, marginBottom:12 }}>Quick Actions</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, gap:10 }}>
        {[{ icon:'🩻', label:'My Scans', color:T.teal2, page:'MyScans' },
          { icon:'📋', label:'My Reports', color:T.green, page:'MyReports' },
          { icon:'💬', label:'Messages', color:T.teal2, page:'Messages' },
          { icon:'📅', label:'Appointments', color:T.amber, page:'Appointments' }]
          .map(({ icon, label, color, page }) => (
          <TouchableOpacity key={label} onPress={() => nav.navigate(page)} activeOpacity={0.7} style={{ width:'46%', backgroundColor:T.bg2, borderRadius:14, borderWidth:1, borderColor:color+'30', padding:16, alignItems:'center', marginHorizontal:'2%' }}>
            <Text style={{ fontSize:22, marginBottom:6 }}>{icon}</Text>
            <Text style={{ fontSize:12, fontWeight:'700', color, textAlign:'center' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Recent scans */}
      {scans.length > 0 && <>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingRight:16 }}>
          <Text style={{ fontSize:16, fontWeight:'800', color:T.textHi, paddingHorizontal:16, marginTop:24, marginBottom:12 }}>Recent Scans</Text>
          <TouchableOpacity onPress={() => nav.navigate('MyScans')}><Text style={{ fontSize:13, color:T.teal2, fontWeight:'600' }}>See all →</Text></TouchableOpacity>
        </View>
        {scans.slice(0,3).map((scan: any) => {
          const ready = scan.report?.status === 'approved' || scan.report?.status === 'signed';
          const urgent = scan.aiResult?.urgency === 'CRITICAL' || scan.aiResult?.urgency === 'URGENT';
          return (
            <TouchableOpacity key={scan.id} onPress={() => ready ? nav.navigate('ReportView', { reportId:scan.report.id }) : nav.navigate('ScanDetail', { scanId:scan.id })}
              style={{ backgroundColor:T.bg1, borderRadius:14, padding:14, marginHorizontal:16, marginBottom:10, borderWidth:1, borderColor:urgent?T.red+'50':T.border }} activeOpacity={0.8}>
              <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <View>
                  <Text style={{ fontSize:14, fontWeight:'700', color:T.textHi }}>{scan.modality} · {scan.bodyPart}</Text>
                  <Text style={{ fontSize:11, color:T.textLo, marginTop:2 }}>{new Date(scan.receivedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</Text>
                </View>
                <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:8, borderWidth:1, backgroundColor:ready?T.greenBg:T.tealDim, borderColor:ready?T.green+'60':T.teal+'40' }}>
                  <Text style={{ fontSize:11, fontWeight:'700', color:ready?T.green:T.teal2 }}>{ready?'✓ Ready':scan.status}</Text>
                </View>
              </View>
              {scan.aiResult?.primaryFinding && <Text style={{ fontSize:12, color:urgent?'#E86060':T.textMd, marginTop:4 }}>{scan.aiResult.primaryFinding}</Text>}
            </TouchableOpacity>
          );
        })}
      </>}
      {/* Footer */}
      <View style={{ marginTop:32, paddingHorizontal:16, alignItems:'center' }}>
        <Text style={{ fontSize:11, color:T.textLo, textAlign:'center', marginBottom:8 }}>🔒 Your data is encrypted and protected under GDPR</Text>
        <Text style={{ fontSize:10, color:T.textLo+'80', textAlign:'center', lineHeight:15 }}>© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}
