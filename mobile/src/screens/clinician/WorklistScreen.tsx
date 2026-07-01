// SEWA XAI — mobile/src/screens/clinician/WorklistScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

const T = {
  bg0:'#05100D', bg1:'#091A15', bg2:'#0D201A', bg3:'#122820',
  teal:'#408D7B', teal2:'#52B09A',
  red:'#C94444', redLt:'#E86060',
  amber:'#D47820', amberLt:'#F09A40',
  gold:'#D4952A',
  textHi:'#D6EDE8', textMd:'#5E9488', textLo:'#2E5048',
  border:'#1A3028',
};

const URGENCY_COLOR: Record<string, string> = {
  CRITICAL: T.redLt, URGENT: T.amberLt, NORMAL: T.teal2,
};
const PRIORITY_BG: Record<string, string> = {
  STAT: 'rgba(201,68,68,0.18)', URGENT: 'rgba(212,120,32,0.18)', ROUTINE: 'rgba(64,141,123,0.12)',
};

interface Scan {
  id: string; modality: string; bodyPart: string; priority: string; status: string;
  receivedAt: string; patient: { user: { firstName: string; lastName: string } };
  aiResult?: { primaryFinding: string; urgency: string; confidence: number; };
}

export default function WorklistScreen() {
  const nav = useNavigation<any>();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'all'|'STAT'|'URGENT'|'ROUTINE'>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['worklist', filter],
    queryFn: async () => {
      const r = await apiClient.get('/scans', { params: { priority: filter !== 'all' ? filter : undefined, limit: 50 } });
      return r.data;
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const scans: Scan[] = data?.scans ?? [];
  const filtered = search
    ? scans.filter(s =>
        `${s.patient?.user?.firstName} ${s.patient?.user?.lastName} ${s.id} ${s.aiResult?.primaryFinding}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : scans;

  const statCount    = scans.filter(s => s.priority === 'STAT').length;
  const urgentCount  = scans.filter(s => s.priority === 'URGENT').length;

  const renderItem = useCallback(({ item }: { item: Scan }) => (
    <TouchableOpacity style={[styles.card, item.priority === 'STAT' && styles.cardStat]}
      onPress={() => nav.navigate('ScanDetail', { scanId: item.id })} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_BG[item.priority] || PRIORITY_BG.ROUTINE }]}>
          <Text style={[styles.priorityText, { color: URGENCY_COLOR[item.aiResult?.urgency || 'NORMAL'] }]}>
            {item.priority}
          </Text>
        </View>
        <Text style={styles.time}>{new Date(item.receivedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</Text>
      </View>

      <Text style={styles.patientName}>
        {item.patient?.user?.firstName} {item.patient?.user?.lastName}
      </Text>

      <View style={styles.row}>
        <View style={styles.modalityTag}>
          <Text style={styles.modalityText}>{item.modality} · {item.bodyPart}</Text>
        </View>
        <Text style={styles.scanId}>{item.id.slice(0, 12)}</Text>
      </View>

      {item.aiResult && (
        <View style={styles.aiRow}>
          <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLOR[item.aiResult.urgency] }]} />
          <Text style={[styles.aiFinding, { color: URGENCY_COLOR[item.aiResult.urgency] }]}>
            {item.aiResult.primaryFinding}
          </Text>
          <Text style={styles.confidence}>{(item.aiResult.confidence * 100).toFixed(0)}%</Text>
        </View>
      )}

      {/* Confidence bar */}
      {item.aiResult && (
        <View style={styles.confBar}>
          <View style={[styles.confFill, {
            width: `${item.aiResult.confidence * 100}%` as any,
            backgroundColor: item.aiResult.urgency === 'CRITICAL' ? T.red : item.aiResult.urgency === 'URGENT' ? T.amber : T.teal,
          }]} />
        </View>
      )}
    </TouchableOpacity>
  ), [nav]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Worklist</Text>
        <View style={styles.headerCounts}>
          {statCount > 0 && <View style={styles.countBadge}><Text style={[styles.countText, { color: T.redLt }]}>{statCount} STAT</Text></View>}
          {urgentCount > 0 && <View style={styles.countBadge}><Text style={[styles.countText, { color: T.amberLt }]}>{urgentCount} URGENT</Text></View>}
        </View>
      </View>

      {/* Search */}
      <TextInput style={styles.search} value={search} onChangeText={setSearch}
        placeholder="Search patient, ID, finding..." placeholderTextColor={T.textLo}/>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all','STAT','URGENT','ROUTINE'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
            <Text style={[styles.filterText, filter === f && { color: T.teal2 }]}>{f === 'all' ? `All (${scans.length})` : f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={T.teal2} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.teal2} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<Text style={styles.empty}>No scans found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: T.bg0 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, backgroundColor: T.bg1, borderBottomWidth: 1, borderBottomColor: T.border },
  headerTitle:   { color: T.textHi, fontSize: 20, fontWeight: '900' },
  headerCounts:  { flexDirection: 'row', gap: 6 },
  countBadge:    { backgroundColor: T.bg2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: T.border },
  countText:     { fontSize: 11, fontWeight: '800' },
  search:        { backgroundColor: T.bg1, margin: 12, borderRadius: 10, padding: 11, color: T.textHi, fontSize: 13, borderWidth: 1, borderColor: T.border },
  filters:       { flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 8 },
  filterBtn:     { backgroundColor: T.bg2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
  filterBtnActive: { borderColor: T.teal },
  filterText:    { color: T.textLo, fontSize: 11, fontWeight: '700' },
  list:          { padding: 12, paddingTop: 4 },
  card:          { backgroundColor: T.bg1, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.border },
  cardStat:      { borderColor: 'rgba(201,68,68,0.5)', backgroundColor: 'rgba(201,68,68,0.04)' },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  time:          { color: T.textLo, fontSize: 11 },
  patientName:   { color: T.textHi, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalityTag:   { backgroundColor: T.bg3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: T.border },
  modalityText:  { color: T.textMd, fontSize: 11, fontWeight: '600' },
  scanId:        { color: T.textLo, fontSize: 10, fontFamily: 'Courier' },
  aiRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  urgencyDot:    { width: 7, height: 7, borderRadius: 4 },
  aiFinding:     { flex: 1, fontSize: 12, fontWeight: '600' },
  confidence:    { color: T.textLo, fontSize: 11, fontFamily: 'Courier' },
  confBar:       { backgroundColor: T.bg3, borderRadius: 3, height: 4 },
  confFill:      { height: '100%', borderRadius: 3 },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:         { color: T.textLo, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
