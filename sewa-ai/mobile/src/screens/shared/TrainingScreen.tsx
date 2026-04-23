// SEWA AI Mobile — TrainingScreen
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { C, FS, FW, SP } from '../../design/tokens';

export default function TrainingScreen() {
  return (
    <ScrollView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Training</Text>
      </View>
      <View style={s.body}>
        <Text style={s.text}>Content available after connecting to SEWA AI backend.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg0 },
  header: { padding: SP[4], backgroundColor: C.bg1, borderBottomWidth: 1, borderBottomColor: C.border },
  title:  { fontSize: FS.xl, fontWeight: FW.black, color: C.textHigh },
  body:   { padding: SP[4] },
  text:   { fontSize: FS.sm, color: C.textMed, lineHeight: 20 },
});
