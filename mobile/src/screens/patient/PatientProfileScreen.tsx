// SEWA XAI — mobile/src/screens/patient/PatientProfileScreen.tsx
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#C94444', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028', white:'#FFFFFF' };
export default function PatientProfileScreen() {
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '');
  const [phone,     setPhone]     = useState(user?.phone     ?? '');
  const saveMutation = useMutation({
    mutationFn: () => apiClient.patch('/users/me', { firstName, lastName, phone }),
    onSuccess: () => { Alert.alert('Saved', 'Profile updated.'); setEditing(false); },
    onError: () => Alert.alert('Error', 'Could not save profile.'),
  });
  const handleSignOut = () => Alert.alert('Sign out', 'Are you sure?', [
    { text:'Cancel', style:'cancel' },
    { text:'Sign out', style:'destructive', onPress: logout },
  ]);
  const Field = ({ label, value, onChangeText, editable }: any) => (
    <View style={{ marginBottom:14 }}>
      <Text style={{ fontSize:11, color:T.textLo, fontWeight:'700', letterSpacing:1, marginBottom:6, textTransform:'uppercase' }}>{label}</Text>
      {editable ? (
        <TextInput value={value} onChangeText={onChangeText} style={{ backgroundColor:T.bg2, borderRadius:10, borderWidth:1, borderColor:T.teal, padding:12, color:T.textHi, fontSize:14 }} placeholderTextColor={T.textLo} />
      ) : (
        <Text style={{ fontSize:14, color:T.textMd, padding:12, backgroundColor:T.bg2, borderRadius:10, borderWidth:1, borderColor:T.border }}>{value || '—'}</Text>
      )}
    </View>
  );
  return (
    <ScrollView style={{ flex:1, backgroundColor:T.bg0 }} contentContainerStyle={{ paddingBottom:40 }}>
      {/* Header */}
      <View style={{ backgroundColor:T.bg1, paddingHorizontal:20, paddingTop:56, paddingBottom:20, borderBottomWidth:1, borderBottomColor:T.border, alignItems:'center' }}>
        <View style={{ width:72, height:72, borderRadius:36, backgroundColor:T.teal, alignItems:'center', justifyContent:'center', marginBottom:12 }}>
          <Text style={{ color:T.white, fontSize:28, fontWeight:'900' }}>{(user?.firstName?.[0]??'P').toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize:20, fontWeight:'900', color:T.textHi }}>{user?.firstName} {user?.lastName}</Text>
        <Text style={{ fontSize:13, color:T.textMd, marginTop:4 }}>{user?.email}</Text>
      </View>
      <View style={{ padding:20 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <Text style={{ fontSize:16, fontWeight:'800', color:T.textHi }}>Personal Details</Text>
          <TouchableOpacity onPress={() => editing ? saveMutation.mutate() : setEditing(true)} style={{ backgroundColor:editing?T.teal:T.bg2, paddingHorizontal:14, paddingVertical:8, borderRadius:10, borderWidth:1, borderColor:editing?T.teal:T.border }}>
            <Text style={{ color:editing?T.white:T.teal2, fontSize:13, fontWeight:'700' }}>{editing?'Save':'Edit'}</Text>
          </TouchableOpacity>
        </View>
        <Field label="First Name" value={firstName} onChangeText={setFirstName} editable={editing} />
        <Field label="Last Name"  value={lastName}  onChangeText={setLastName}  editable={editing} />
        <Field label="Email"      value={user?.email ?? ''} editable={false} />
        <Field label="Phone"      value={phone}      onChangeText={setPhone}     editable={editing} />
        <Field label="NHS Number" value={user?.nhsNumber ?? 'Not on record'} editable={false} />
        {/* Sign out */}
        <TouchableOpacity onPress={handleSignOut} style={{ marginTop:32, backgroundColor:'rgba(201,68,68,0.10)', borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:T.red+'40' }}>
          <Text style={{ color:T.red, fontSize:14, fontWeight:'700' }}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={{ fontSize:10, color:T.textLo+'80', textAlign:'center', marginTop:20, lineHeight:15 }}>© 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073). All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}
