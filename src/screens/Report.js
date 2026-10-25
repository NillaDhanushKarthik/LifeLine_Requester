import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Chip, Field } from '../components/ui';
import api, { errMsg } from '../api'; import { useBooking } from '../BookingContext'; import { C } from '../theme';

const TYPES = ['Road Accident', 'Heart Attack', 'Stroke', 'Fire Injury', 'Pregnant Woman', 'Other'];
const YND = ['Yes', 'No', "Don't Know"];

function Seg({ label, value, onChange }) {
  return (<View style={{ marginBottom: 18 }}>
    <Text style={s.q}>{label}</Text>
    <View style={{ flexDirection: 'row' }}>{YND.map((o) => <Chip key={o} label={o} active={value === o} onPress={() => onChange(o)} />)}</View></View>);
}

/** "Help the Medical Team" – entirely optional; sent to the hospital as operational info only */
export default function Report({ navigation }) {
  const { booking, setReported } = useBooking();
  const [f, setF] = useState({ emergencyType: 'Other', approximateAge: '', numberOfInjured: 1, conscious: "Don't Know", heavyBleeding: "Don't Know", notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      const body = { ...f, approximateAge: f.approximateAge ? parseInt(f.approximateAge, 10) : undefined };
      await api.post(`/bookings/${booking._id}/report`, body);
      setReported(true); navigation.goBack();
    } catch (e) { Alert.alert('Could not send', errMsg(e)); setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={s.banner}><Ionicons name="shield-checkmark" size={22} color={C.blue} />
          <Text style={s.bannerT}>Fill in only what you know. The hospital never receives patient names, phone numbers or medical history.</Text></View>

        <Text style={s.q}>What happened?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>{TYPES.map((t) => <Chip key={t} label={t} active={f.emergencyType === t} onPress={() => set('emergencyType')(t)} />)}</View>

        <Field label="Approximate age" icon="hourglass-outline" keyboardType="number-pad" maxLength={3} value={f.approximateAge} onChangeText={set('approximateAge')} placeholder="e.g. 45" />

        <Text style={s.q}>Number of injured</Text>
        <View style={s.stepper}>
          <Pressable style={s.stepBtn} onPress={() => set('numberOfInjured')(Math.max(1, f.numberOfInjured - 1))}><Ionicons name="remove" size={22} color={C.blue} /></Pressable>
          <Text style={s.stepV}>{f.numberOfInjured}</Text>
          <Pressable style={s.stepBtn} onPress={() => set('numberOfInjured')(Math.min(50, f.numberOfInjured + 1))}><Ionicons name="add" size={22} color={C.blue} /></Pressable>
        </View>

        <Seg label="Is the patient conscious?" value={f.conscious} onChange={set('conscious')} />
        <Seg label="Heavy bleeding?" value={f.heavyBleeding} onChange={set('heavyBleeding')} />

        <Text style={s.q}>Additional notes</Text>
        <TextInput style={s.notes} multiline maxLength={500} value={f.notes} onChangeText={set('notes')} placeholder="Anything the medical team should know" placeholderTextColor="#9AA6C0" />

        <Btn title="Send to medical team" icon="send" onPress={submit} loading={busy} style={{ marginTop: 20 }} />
        <Btn title="Skip for now" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 12 }} />
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  banner: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 18, padding: 14, marginBottom: 22, alignItems: 'center' },
  bannerT: { flex: 1, marginLeft: 10, color: C.navy, fontSize: 13, lineHeight: 18 },
  q: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stepBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  stepV: { width: 64, textAlign: 'center', fontSize: 24, fontWeight: '800', color: C.navy },
  notes: { minHeight: 96, backgroundColor: C.bg, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, fontSize: 16, color: C.text, textAlignVertical: 'top' },
});
