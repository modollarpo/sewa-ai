// SEWA AI — mobile/src/screens/auth/BiometricScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { attemptBiometricAuth } from '../../App';
import { useAuthStore } from '../../store/authStore';

export default function BiometricScreen() {
  const nav = useNavigation<any>();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    attemptBiometricAuth().then(success => {
      if (success) nav.reset({ index:0, routes:[{ name:'Main' }] });
      else nav.navigate('Login');
    }).catch(() => nav.navigate('Login'));
  }, []);

  return (
    <View style={{ flex:1, backgroundColor:'#05100D', alignItems:'center', justifyContent:'center', gap:20 }}>
      <View style={{ width:80, height:80, borderRadius:20, backgroundColor:'rgba(64,141,123,0.2)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#408D7B' }}>
        <Text style={{ fontSize:36 }}>👁</Text>
      </View>
      <Text style={{ color:'#D6EDE8', fontSize:18, fontWeight:'800' }}>SEWA AI</Text>
      <Text style={{ color:'#5E9488', fontSize:13 }}>Authenticating with biometrics...</Text>
      <ActivityIndicator color="#408D7B" />
    </View>
  );
}
