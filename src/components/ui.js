import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const V = { primary: { bg: C.blue, fg: '#fff' }, danger: { bg: C.red, fg: '#fff' }, ghost: { bg: C.soft, fg: C.blue }, outline: { bg: '#fff', fg: C.red, bd: C.red } };
export function Btn({ title, onPress, variant = 'primary', loading, icon, style, disabled }) {
  const v = V[variant];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: v.bg, borderColor: v.bd || v.bg, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (<>
        {icon && <Ionicons name={icon} size={20} color={v.fg} style={{ marginRight: 8 }} />}
        <Text style={[s.bt, { color: v.fg }]}>{title}</Text></>)}
    </Pressable>
  );
}

export function Field({ label, icon, ...p }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        {icon && <Ionicons name={icon} size={18} color={C.mute} style={{ marginRight: 10 }} />}
        <TextInput placeholderTextColor="#9AA6C0" style={s.input} autoCapitalize="none" {...p} />
      </View>
    </View>
  );
}

/** Auth screens shell: blue masthead + white sheet */
export function AuthLayout({ title, sub, children }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.blue }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={s.mast}>
          <View style={s.logo}><Ionicons name="pulse" size={30} color={C.red} /></View>
          <Text style={s.brand}>LifeLine</Text>
          <Text style={s.tag}>Help is one tap away</Text>
        </View>
        <View style={s.sheet}>
          <Text style={s.h1}>{title}</Text>
          {!!sub && <Text style={s.sub}>{sub}</Text>}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const Chip = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.blue, borderColor: C.blue }]}>
    <Text style={[s.chipT, active && { color: '#fff' }]}>{label}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  btn: { height: 56, borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  bt: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '600', color: C.mute, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 54 },
  input: { flex: 1, fontSize: 16, color: C.text },
  mast: { alignItems: 'center', paddingTop: 70, paddingBottom: 34 },
  logo: { width: 64, height: 64, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 12 },
  tag: { color: '#CFE0FF', fontSize: 14, marginTop: 2 },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 28, minHeight: 440 },
  h1: { fontSize: 24, fontWeight: '800', color: C.text }, sub: { color: C.mute, marginTop: 4, marginBottom: 18, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', marginRight: 8, marginBottom: 8 },
  chipT: { color: C.text, fontWeight: '600', fontSize: 14 },
});
