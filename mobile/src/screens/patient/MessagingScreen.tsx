// SEWA AI — mobile/src/screens/patient/MessagingScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

interface Msg { id:string; from:'patient'|'doctor'|'system'; text:string; ts:string; }

export default function MessagingScreen() {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    { id:'1', from:'system', text:'Secure encrypted messaging with your care team. Messages are end-to-end encrypted.', ts: new Date().toISOString() },
    { id:'2', from:'doctor', text:'Hello! I\'ve reviewed your CT Head scan. The AI found no acute findings. Please follow up if you experience any symptoms.', ts: new Date().toISOString() },
  ]);
  const listRef = useRef<FlatList>(null);

  const send = () => {
    if (!input.trim()) return;
    const newMsg: Msg = { id: Date.now().toString(), from:'patient', text:input.trim(), ts:new Date().toISOString() };
    setMsgs((m: any) => [...m, newMsg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated:true }), 100);
    setTimeout(() => {
      setMsgs((m: any) => [...m, { id:(Date.now()+1).toString(), from:'doctor', text:'Thank you for your message. A clinician will respond within 24 hours.', ts:new Date().toISOString() }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated:true }), 100);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor:T.bg0 }} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={90}>
      <View style={{ backgroundColor:T.bg1, padding:16, paddingTop:56, borderBottomWidth:1, borderBottomColor:T.border }}>
        <Text style={{ color:T.textHi, fontSize:18, fontWeight:'900' }}>Secure Messages</Text>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:4 }}>
          <View style={{ width:6, height:6, borderRadius:3, backgroundColor:T.teal2 }} />
          <Text style={{ color:T.teal2, fontSize:11, fontWeight:'700' }}>End-to-end encrypted</Text>
        </View>
      </View>

      <FlatList ref={listRef} data={msgs} keyExtractor={i=>i.id} contentContainerStyle={{ padding:16, gap:10 }}
        renderItem={({ item }) => {
          const isMe = item.from === 'patient';
          const isSystem = item.from === 'system';
          if (isSystem) return (
            <View style={{ backgroundColor:'rgba(64,141,123,0.1)', borderRadius:8, padding:10, borderWidth:1, borderColor:'rgba(64,141,123,0.2)' }}>
              <Text style={{ color:T.textMd, fontSize:11, textAlign:'center' }}>{item.text}</Text>
            </View>
          );
          return (
            <View style={{ alignSelf: isMe?'flex-end':'flex-start', maxWidth:'80%' }}>
              {!isMe && <Text style={{ color:T.textLo, fontSize:10, marginBottom:3 }}>Dr. Care Team</Text>}
              <View style={{ backgroundColor:isMe?T.teal:T.bg1, borderRadius:14, borderBottomRightRadius:isMe?4:14, borderBottomLeftRadius:isMe?14:4, padding:12, borderWidth:isMe?0:1, borderColor:T.border }}>
                <Text style={{ color:isMe?'#fff':T.textHi, fontSize:13, lineHeight:19 }}>{item.text}</Text>
              </View>
              <Text style={{ color:T.textLo, fontSize:9, marginTop:3, alignSelf:isMe?'flex-end':'flex-start' }}>{new Date(item.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</Text>
            </View>
          );
        }}
      />

      <View style={{ flexDirection:'row', gap:10, padding:12, paddingBottom:24, backgroundColor:T.bg1, borderTopWidth:1, borderTopColor:T.border }}>
        <TextInput value={input} onChangeText={setInput} placeholder="Type a message..." placeholderTextColor={T.textLo}
          style={{ flex:1, backgroundColor:T.bg2, borderRadius:20, paddingHorizontal:14, paddingVertical:10, color:T.textHi, fontSize:13, borderWidth:1, borderColor:T.border }}
          multiline maxLength={500} />
        <TouchableOpacity onPress={send} style={{ width:44, height:44, borderRadius:22, backgroundColor:T.teal, alignItems:'center', justifyContent:'center', alignSelf:'flex-end' }}>
          <Text style={{ color:'#fff', fontSize:18 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
