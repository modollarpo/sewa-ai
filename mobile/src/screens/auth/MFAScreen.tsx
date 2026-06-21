// SEWA AI — mobile/src/screens/auth/MFAScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function MFAScreen({ route }: any) {
  const { mfaChallenge } = route.params;
  const { verifyMFA, isLoading } = useAuthStore();
  const [digits, setDigits] = useState(['','','','','','']);
  const refs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  const onDigit = (val: string, i: number) => {
    const next = [...digits]; next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) refs[i + 1].current?.focus();
    if (next.every(d => d !== '')) submit(next.join(''));
  };

  const submit = async (code: string) => {
    try { await verifyMFA(mfaChallenge, code); }
    catch (e: any) { Alert.alert('Invalid code', e.message); setDigits(['','','','','','']); refs[0].current?.focus(); }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Two-Factor Authentication</Text>
      <Text style={s.sub}>Enter the 6-digit code from your authenticator app</Text>
      <View style={s.row}>
        {digits.map((d: string, i: number) => (
          <TextInput key={i} ref={refs[i]} style={s.box} value={d} onChangeText={(v: string) => onDigit(v, i)}
            keyboardType="numeric" maxLength={1} textAlign="center" selectTextOnFocus
            placeholderTextColor={T.textLo} />
        ))}
      </View>
      {isLoading && <ActivityIndicator color={T.teal2} style={{ marginTop: 20 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:T.bg0, alignItems:'center', justifyContent:'center', padding:32 },
  title:     { color:T.textHi, fontSize:20, fontWeight:'800', marginBottom:8 },
  sub:       { color:T.textMd, fontSize:13, textAlign:'center', marginBottom:32 },
  row:       { flexDirection:'row', gap:10 },
  box:       { width:48, height:56, backgroundColor:T.bg1, borderRadius:12, borderWidth:1, borderColor:T.border, color:T.textHi, fontSize:24, fontWeight:'800' },
});
