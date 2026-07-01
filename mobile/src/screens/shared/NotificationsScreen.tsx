// SEWA XAI — mobile/src/screens/shared/NotificationsScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNotificationStore } from '../../store/notificationStore';

const T = { bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', teal:'#408D7B', teal2:'#52B09A', red:'#E86060', amber:'#F09A40', textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048', border:'#1A3028' };

export default function NotificationsScreen() {
  const { notifications, markRead, clearAll } = useNotificationStore();

  return (
    <View style={{ flex:1, backgroundColor:T.bg0 }}>
      <View style={{ backgroundColor:T.bg1, padding:16, paddingTop:56, borderBottomWidth:1, borderBottomColor:T.border, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
        <Text style={{ color:T.textHi, fontSize:20, fontWeight:'900' }}>Notifications</Text>
        {notifications.length > 0 && <TouchableOpacity onPress={clearAll}><Text style={{ color:T.textLo, fontSize:12 }}>Clear all</Text></TouchableOpacity>}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding:12 }}
        ItemSeparatorComponent={() => <View style={{ height:8 }} />}
        ListEmptyComponent={<Text style={{ color:T.textLo, textAlign:'center', marginTop:40 }}>No notifications</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => markRead(item.id)}
            style={{ backgroundColor: item.read ? T.bg1 : 'rgba(64,141,123,0.08)', borderRadius:12, padding:14, borderWidth:1, borderColor: item.type==='CRITICAL_ALERT' ? 'rgba(201,68,68,0.3)' : T.border }}>
            <Text style={{ color: item.type==='CRITICAL_ALERT' ? T.red : T.teal2, fontSize:12, fontWeight:'800', marginBottom:4 }}>{item.title}</Text>
            <Text style={{ color:T.textMd, fontSize:12, marginBottom:4 }}>{item.body}</Text>
            <Text style={{ color:T.textLo, fontSize:10 }}>{new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ── SettingsScreen ─────────────────────────────────────────────
// mobile/src/screens/shared/SettingsScreen.tsx
export function SettingsScreenComponent() { return null; } // re-exported below
