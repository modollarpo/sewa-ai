// SEWA XAI — mobile/src/screens/patient/ConsentScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

const CONSENT_ITEMS = [
  { key:'consentAI', label:'AI Analysis', desc:'Allow SEWA XAI to analyse your medical images to detect conditions and generate reports.', required:true },
  { key:'consentResearch', label:'Research Use', desc:'Allow de-identified data to be used for medical AI research to improve diagnostic accuracy.' },
  { key:'consentThirdParty', label:'Third-Party Sharing', desc:'Allow sharing with approved clinical partners for specialist review.' },
  { key:'consentMarketing', label:'Communications', desc:'Receive health tips and platform updates.' },
];

export default function ConsentScreen() {
  const { user } = useAuthStore();
  const [consents, setConsents] = useState<Record<string,boolean>>({ consentAI:true, consentResearch:false, consentThirdParty:false, consentMarketing:false });

  const saveMutation = useMutation({
    mutationFn: () => apiClient.patch(`/patients/${user?.id}/consent`, consents),
    onSuccess: () => Alert.alert('Saved', 'Your consent preferences have been updated.'),
  });

  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ padding:16, paddingTop:60, paddingBottom:40 }}>
      <Text style={{ color:T.textHi, fontSize:20, fontWeight:'900', marginBottom:8 }}>Privacy & Consent</Text>
      <Text style={{ color:T.textMd, fontSize:12, marginBottom:24, lineHeight:18 }}>
        Control how your data is used. Your medical records are encrypted end-to-end and protected under GDPR, HIPAA, and applicable regional data protection laws.
      </Text>

      {CONSENT_ITEMS.map(item => (
        <View key={item.key} style={{ backgroundColor:T.bg1, borderRadius:14, padding:16, marginBottom:10, borderWidth:1, borderColor:T.border, flexDirection:'row', alignItems:'flex-start', gap:14 }}>
          <View style={{ flex:1 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
              <Text style={{ color:T.textHi, fontSize:14, fontWeight:'700' }}>{item.label}</Text>
              {item.required && <View style={{ backgroundColor:'rgba(64,141,123,0.15)', borderRadius:4, paddingHorizontal:6, paddingVertical:2 }}><Text style={{ color:T.teal2, fontSize:9, fontWeight:'800' }}>REQUIRED</Text></View>}
            </View>
            <Text style={{ color:T.textMd, fontSize:12, lineHeight:17 }}>{item.desc}</Text>
          </View>
          <Switch value={consents[item.key]} onValueChange={(v: boolean) => { if (!item.required) setConsents((c: Record<string,boolean>) => ({ ...c, [item.key]: v })); }}
            disabled={item.required} trackColor={{ false:T.bg2, true:T.teal }} thumbColor="#fff" />
        </View>
      ))}

      <View style={{ backgroundColor:T.bg1, borderRadius:12, padding:14, marginBottom:16, borderWidth:1, borderColor:T.border }}>
        <Text style={{ color:T.textLo, fontSize:10, lineHeight:16 }}>
          Under GDPR Article 7, you have the right to withdraw consent at any time. Processing based on consent will stop immediately. Withdraw doesn't affect previous lawful processing.
        </Text>
      </View>

      <TouchableOpacity onPress={() => saveMutation.mutate()} style={{ backgroundColor:T.teal, borderRadius:12, padding:14, alignItems:'center' }}>
        <Text style={{ color:'#fff', fontWeight:'800', fontSize:14 }}>Save Preferences</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
