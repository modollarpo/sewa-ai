// SEWA XAI — mobile/src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store/authStore';

const T = {
  bg0: '#05100D', bg1: '#091A15', bg2: '#0D201A',
  teal: '#408D7B', teal2: '#52B09A', red: '#C94444',
  textHi: '#D6EDE8', textMd: '#5E9488', textLo: '#2E5048',
  border: '#1A3028',
};

const TENANTS = [
  { slug: 'royal-london',  label: '🇬🇧 Royal London NHS' },
  { slug: 'charite-berlin',label: '🇩🇪 Charité Berlin' },
  { slug: 'luth-lagos',    label: '🇳🇬 LUTH Lagos' },
  { slug: 'apollo-mumbai', label: '🇮🇳 Apollo Mumbai' },
  { slug: 'kenyatta-nh',   label: '🇰🇪 Kenyatta National' },
];

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant]     = useState(TENANTS[0].slug);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return; }
    try {
      const result = await login(email, password, tenant);
      if (result?.mfaRequired) nav.navigate('MFA', { mfaChallenge: result.mfaChallenge });
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    }
  };

  const handleBiometric = async () => {
    const lastEmail = await AsyncStorage.getItem('lastEmail');
    const lastTenant = await AsyncStorage.getItem('lastTenant');
    if (!lastEmail || !lastTenant) { Alert.alert('Setup Required', 'Log in with password first to enable biometrics'); return; }

    const rnBio = new ReactNativeBiometrics();
    const { available } = await rnBio.isSensorAvailable();
    if (!available) { Alert.alert('Not Available', 'Biometric auth not available on this device'); return; }
    const { success } = await rnBio.simplePrompt({ promptMessage: 'Sign in to SEWA XAI' });
    if (success) {
      const savedPass = await AsyncStorage.getItem('bioPass');
      if (savedPass) {
        setEmail(lastEmail); setTenant(lastTenant);
        await login(lastEmail, savedPass, lastTenant);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg0 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.title}>SEWA<Text style={{ color: T.teal2 }}>.AI</Text></Text>
        <Text style={styles.subtitle}>Clinical Intelligence Platform</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {/* Tenant */}
          <Text style={styles.label}>Hospital / Facility</Text>
          <View style={styles.tenantRow}>
            {TENANTS.slice(0, 3).map(t => (
              <TouchableOpacity key={t.slug} onPress={() => setTenant(t.slug)}
                style={[styles.tenantBtn, tenant === t.slug && styles.tenantBtnActive]}>
                <Text style={[styles.tenantText, tenant === t.slug && { color: T.teal2 }]}>{t.label.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            placeholder="doctor@hospital.org" placeholderTextColor={T.textLo}
            autoCapitalize="none" keyboardType="email-address" autoComplete="email"/>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor={T.textLo}
            secureTextEntry autoComplete="password"/>

          {error && <Text style={styles.error}>{error}</Text>}

          {/* Login button */}
          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          {/* Biometric */}
          <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}>
            <Text style={styles.bioBtnText}>🔬 Face ID / Fingerprint</Text>
          </TouchableOpacity>
        </View>

        {/* Compliance badges */}
        <View style={styles.badges}>
          {['GDPR','NHS DSPT'].map(b => (
            <View key={b} style={styles.badge}><Text style={styles.badgeText}>{b}</Text></View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:        { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: T.bg0 },
  logoBox:       { width: 68, height: 68, borderRadius: 18, backgroundColor: T.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText:      { color: '#fff', fontSize: 32, fontWeight: '900' },
  title:         { fontSize: 28, fontWeight: '900', color: T.textHi, letterSpacing: -0.5 },
  subtitle:      { fontSize: 13, color: T.textMd, marginBottom: 32, marginTop: 4 },
  card:          { width: '100%', backgroundColor: T.bg1, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: T.border },
  cardTitle:     { color: T.textHi, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  label:         { color: T.textMd, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input:         { backgroundColor: T.bg2, borderRadius: 10, padding: 13, color: T.textHi, fontSize: 14, borderWidth: 1, borderColor: T.border },
  tenantRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  tenantBtn:     { backgroundColor: T.bg2, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: T.border },
  tenantBtnActive: { borderColor: T.teal, backgroundColor: 'rgba(64,141,123,0.15)' },
  tenantText:    { color: T.textMd, fontSize: 11, fontWeight: '700' },
  error:         { color: T.red, fontSize: 12, marginTop: 8 },
  btn:           { backgroundColor: T.teal, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '800' },
  bioBtn:        { borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: T.border },
  bioBtnText:    { color: T.textMd, fontSize: 13, fontWeight: '600' },
  badges:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 24, justifyContent: 'center' },
  badge:         { backgroundColor: 'rgba(64,141,123,0.1)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(64,141,123,0.3)' },
  badgeText:     { color: T.textLo, fontSize: 9, fontWeight: '700', fontFamily: 'Courier' },
});
