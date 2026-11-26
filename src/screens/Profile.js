import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn, Field } from '../components/ui';
import api, { errMsg } from '../api'; import { useAuth, unwrapUser } from '../AuthContext'; import { C } from '../theme';

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const currentUser = unwrapUser(user) || user;
  const initialName = currentUser?.fullName || currentUser?.name || '';
  const initialEmail = currentUser?.email || '';
  const phone = currentUser?.phone || '';

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const u = unwrapUser(user) || user;
    if (u) {
      setName(u.fullName || u.name || '');
      setEmail(u.email || '');
    }
  }, [user]);

  const save = async () => {
    setBusy(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.put('/auth/me', { fullName: name, name, email });
      const updated = res.data?.user || res.data?._doc || res.data;
      await updateUser(updated);
      setStatusMsg('Profile updated successfully!');
      if (Platform.OS !== 'web') {
        Alert.alert('Saved', 'Your profile was updated.');
      }
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e) {
      const msg = errMsg(e);
      setErrorMsg(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Could not save', msg);
      }
    }
    setBusy(false);
  };

  const out = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to sign out?')) {
        signOut();
      }
    } else {
      Alert.alert('Sign out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }]);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <View style={s.head}>
        <View style={s.avatar}><Ionicons name="person" size={34} color={C.blue} /></View>
        <Text style={s.name}>{name || initialName || 'Patient'}</Text>
        <Text style={s.phone}>+91 {phone}</Text>
      </View>

      {!!statusMsg && (
        <View style={s.successBox}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" style={{ marginRight: 6 }} />
          <Text style={s.successText}>{statusMsg}</Text>
        </View>
      )}

      {!!errorMsg && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle" size={18} color={C.red} style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{errorMsg}</Text>
        </View>
      )}

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
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 10 },
  phone: { color: C.mute, marginTop: 2, fontSize: 15, fontWeight: '600' },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: { color: '#065F46', fontWeight: '600', fontSize: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: C.red, fontWeight: '600', fontSize: 14 },
});
