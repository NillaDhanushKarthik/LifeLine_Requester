import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from './ui';
import { C, shadow } from '../theme';
import { STEPS, STEP_OF, CANCELLABLE, TERMINAL, headline } from '../util';

function Radar() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  const ring = { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: C.red,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] };
  return (<View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={ring} />
    <View style={s.radarDot}><Ionicons name="medkit" size={26} color="#fff" /></View></View>);
}

export default function BookingSheet({ booking, driver, hospital, etaMin, distKm, reported, onCancel, onDismiss, onReport, onShare, onCall }) {
  const st = booking.status, idx = STEP_OF[st] ?? 0, done = TERMINAL.includes(st);
  const isSearching = st === 'Searching' || st === 'SEARCHING' || st === 'Driver Assigned' || st === 'DRIVER_ASSIGNED';
  const isCancelled = st === 'Cancelled' || st === 'CANCELLED';
  const isCompleted = st === 'Completed' || st === 'COMPLETED';
  const confirmCancel = () => Alert.alert('Cancel ambulance?', 'The ambulance will be released for other emergencies.', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel request', style: 'destructive', onPress: onCancel }]);

  return (
    <View style={[s.sheet, shadow]}>
      <View style={s.grab} />
      <View style={s.row}>
        {isSearching ? <Radar /> : (
          <View style={[s.badge, { backgroundColor: isCancelled ? C.mute : isCompleted ? C.ok : C.blue }]}>
            <Ionicons name={isCancelled ? 'close' : isCompleted ? 'checkmark' : 'medical'} size={26} color="#fff" /></View>)}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.title}>{headline(st, hospital)}</Text>
          {isSearching && <Text style={s.sub}>Hold on. We are alerting ambulances near you.</Text>}
          {isCancelled && !!booking.cancelReason && <Text style={s.sub}>{booking.cancelReason}</Text>}
        </View>
      </View>

      {!done && !isSearching && (<>
        <View style={s.steps}>
          {STEPS.map((l, i) => (<View key={l} style={{ flex: 1 }}>
            <View style={[s.bar, i <= idx && { backgroundColor: C.blue }]} />
            <Text style={[s.stepT, i === idx && { color: C.blue, fontWeight: '700' }]}>{l}</Text></View>))}
        </View>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statV}>{etaMin ?? '–'}<Text style={s.unit}> min</Text></Text><Text style={s.statL}>Arrival time</Text></View>
          <View style={s.sep} />
          <View style={s.stat}><Text style={s.statV}>{distKm != null ? distKm.toFixed(1) : '–'}<Text style={s.unit}> km</Text></Text><Text style={s.statL}>Distance</Text></View>
        </View>
      </>)}

      {!isSearching && driver && !done && (
        <View style={s.driver}>
          <View style={s.avatar}><Ionicons name="person" size={22} color={C.blue} /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.dName}>{driver.name}</Text>
            <Text style={s.dSub}>Ambulance {driver.vehicleNumber}</Text></View>
          <Btn title="Call" icon="call" onPress={onCall} style={{ height: 44, borderRadius: 14, paddingHorizontal: 16 }} />
        </View>)}

      {!done && !isSearching && (
        <View style={s.actions}>
          <Btn title={reported ? 'Update details' : 'Help the medical team'} icon="clipboard-outline" variant="ghost" onPress={onReport} style={{ flex: 1, height: 48, marginRight: 8 }} />
          <Btn title="Share" icon="share-social-outline" variant="ghost" onPress={onShare} style={{ height: 48, width: 110 }} />
        </View>)}

      {done ? <Btn title={isCompleted ? 'Done' : 'Close'} onPress={onDismiss} style={{ marginTop: 16 }} />
        : CANCELLABLE.includes(st) && <Btn title="Cancel request" variant="outline" onPress={confirmCancel} style={{ marginTop: 12, height: 48 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 28 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  radarDot: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: C.text }, sub: { color: C.mute, marginTop: 3, fontSize: 13 },
  steps: { flexDirection: 'row', marginTop: 18 }, bar: { height: 5, borderRadius: 3, backgroundColor: C.line, marginRight: 4 },
  stepT: { fontSize: 10.5, color: C.mute, marginTop: 5 },
  stats: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 18, paddingVertical: 14, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center' }, sep: { width: 1, backgroundColor: C.line },
  statV: { fontSize: 26, fontWeight: '800', color: C.navy }, unit: { fontSize: 14, fontWeight: '600', color: C.mute }, statL: { fontSize: 12, color: C.mute, marginTop: 2 },
  driver: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: C.line },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  dName: { fontWeight: '700', fontSize: 16, color: C.text }, dSub: { color: C.mute, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', marginTop: 12 },
});
