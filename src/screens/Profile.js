import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Field } from '../components/ui';
import api, { errMsg } from '../api'; import { useAuth } from '../AuthContext'; import { C } from '../theme';

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const displayName = user?.fullName || user?.name || '';
  const [name, setName] = useState(displayName), [email, setEmail] = useState(user?.email || ''), [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const res = await api.put('/auth/me', { fullName: name, name, email });
      updateUser(res.data);
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e) {
      Alert.alert('Could not save', errMsg(e));
    }
    setBusy(false);
  };
  const out = () => Alert.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }]);
  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <View style={s.head}><View style={s.avatar}><Ionicons name="person" size={34} color={C.blue} /></View>
        <Text style={s.name}>{displayName || 'Patient'}</Text><Text style={s.phone}>+91 {user?.phone}</Text></View>
      <Field label="Full name" icon="person-outline" autoCapitalize="words" value={name} onChangeText={setName} />
      <Field label="Email" icon="mail-outline" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Btn title="Save changes" onPress={save} loading={busy} />
      <Btn title="Sign out" variant="outline" onPress={out} style={{ marginTop: 14 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  head: { alignItems: 'center', marginVertical: 18 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 10 }, phone: { color: C.mute, marginTop: 2 },
});
