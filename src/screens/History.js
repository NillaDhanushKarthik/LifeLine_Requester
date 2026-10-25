import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api'; import { C, shadow } from '../theme'; import { fmtDate } from '../util';

const tone = (st) => (st === 'Completed' ? C.ok : st === 'Cancelled' ? C.mute : C.blue);

export default function History() {
  const [items, setItems] = useState(null), [ref, setRef] = useState(false), [err, setErr] = useState(false);
  const load = useCallback(async () => { try { setItems((await api.get('/bookings/mine')).data); setErr(false); } catch { setErr(true); setItems((p) => p || []); } }, []);
  useEffect(() => { load(); }, []);
  return (
    <FlatList style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, flexGrow: 1 }} data={items || []} keyExtractor={(b) => b._id}
      refreshControl={<RefreshControl refreshing={ref} onRefresh={async () => { setRef(true); await load(); setRef(false); }} />}
      ListEmptyComponent={items && <View style={s.empty}><Ionicons name={err ? 'cloud-offline-outline' : 'document-text-outline'} size={44} color={C.mute} />
        <Text style={s.emptyT}>{err ? 'Could not load your history. Pull down to retry.' : 'No ambulance requests yet.'}</Text></View>}
      renderItem={({ item: b }) => (
        <View style={[s.card, shadow]}>
          <View style={[s.icon, { backgroundColor: tone(b.status) + '1A' }]}><Ionicons name="medical" size={20} color={tone(b.status)} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.when}>{fmtDate(b.createdAt)}</Text>
            <Text style={s.who}>{b.driver ? `${b.driver.fullName} · ${b.driver.vehicleNumber}` : 'No ambulance assigned'}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: tone(b.status) + '1A' }]}><Text style={[s.pillT, { color: tone(b.status) }]}>{b.status}</Text></View>
        </View>)} />
  );
}
const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  when: { fontWeight: '700', color: C.text, fontSize: 15 }, who: { color: C.mute, fontSize: 13, marginTop: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }, pillT: { fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 }, emptyT: { color: C.mute, marginTop: 12, textAlign: 'center', maxWidth: 240 },
});
