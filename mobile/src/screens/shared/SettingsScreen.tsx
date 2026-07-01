// SEWA XAI — mobile/src/screens/shared/SettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [pushEnabled,    setPush]    = useState(true);
  const [criticalSound,  setCritical]= useState(true);
  const [biometricOn,    setBio]     = useState(false);
  const [offlineSync,    setOffline] = useState(true);

  const handleLogout = () => Alert.alert('Sign Out', 'Are you sure?', [
    { text:'Cancel', style:'cancel' },
    { text:'Sign Out', style:'destructive', onPress: logout },
  ]);

  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ padding:16, paddingTop:60 }}>
      <Text style={{ color:T.textHi, fontSize:22, fontWeight:'900', marginBottom:20 }}>Settings</Text>

      {/* Profile */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>PROFILE</Text>
        <View style={s.row}><Text style={s.rowLabel}>Name</Text><Text style={s.rowVal}>{user?.firstName} {user?.lastName}</Text></View>
        <View style={s.row}><Text style={s.rowLabel}>Role</Text><Text style={s.rowVal}>{user?.role}</Text></View>
        <View style={s.row}><Text style={s.rowLabel}>Hospital</Text><Text style={s.rowVal}>{user?.tenantName}</Text></View>
        <View style={s.row}><Text style={s.rowLabel}>Region</Text><Text style={s.rowVal}>{user?.region?.toUpperCase()}</Text></View>
      </View>

      {/* Notifications */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
        {([
          ['Push Notifications', pushEnabled, setPush],
          ['Critical Alert Sound', criticalSound, setCritical],
        ] as const).map(([label, val, setter]: any) => (
          <View key={label} style={[s.row, { justifyContent:'space-between' }]}>
            <Text style={s.rowLabel}>{label}</Text>
            <Switch value={val} onValueChange={setter} trackColor={{ false:T.bg2, true:T.teal }} thumbColor="#fff" />
          </View>
        ))}
      </View>

      {/* Security */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>SECURITY</Text>
        {([
          ['Biometric Login', biometricOn, setBio],
          ['Offline Sync', offlineSync, setOffline],
        ] as const).map(([label, val, setter]: any) => (
          <View key={label} style={[s.row, { justifyContent:'space-between' }]}>
            <Text style={s.rowLabel}>{label}</Text>
            <Switch value={val} onValueChange={setter} trackColor={{ false:T.bg2, true:T.teal }} thumbColor="#fff" />
          </View>
        ))}
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>ABOUT</Text>
        {[['App Version','2.4.1'],['AI Engine','EfficientNet-B4 v2.4.1'],['Compliance','HIPAA · GDPR · NHS DSPT · ISO 13485'],['Build','production']].map(([label, val]) => (
          <View key={label} style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowVal}>{val}</Text></View>
        ))}
      </View>

      <TouchableOpacity onPress={handleLogout} style={{ backgroundColor:'rgba(201,68,68,0.1)', borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:'rgba(201,68,68,0.3)', marginTop:8, marginBottom:32 }}>
        <Text style={{ color:T.red, fontWeight:'800', fontSize:14 }}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  section:      { backgroundColor:T.bg1, borderRadius:14, padding:4, marginBottom:14, borderWidth:1, borderColor:T.border },
  sectionLabel: { color:T.textLo, fontSize:9, fontWeight:'800', letterSpacing:1.5, padding:'10px 14px', paddingHorizontal:14, paddingVertical:10, fontFamily:'Courier' } as any,
  row:          { flexDirection:'row', paddingHorizontal:14, paddingVertical:12, borderTopWidth:1, borderTopColor:T.bg2 },
  rowLabel:     { flex:1, color:T.textMd, fontSize:13 },
  rowVal:       { color:T.textLo, fontSize:12, fontFamily:'Courier' },
});
