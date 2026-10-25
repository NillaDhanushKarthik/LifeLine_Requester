import React, { useState } from 'react';
import { Alert } from 'react-native';
import { AuthLayout, Field, Btn } from '../components/ui';
import api, { errMsg } from '../api';

export default function Forgot({ navigation }) {
  const [step, setStep] = useState(1), [phone, setPhone] = useState(''), [code, setCode] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { Alert.alert('Error', errMsg(e)); } setBusy(false); };
  const send = () => run(async () => { await api.post('/auth/forgot-password', { phone: phone.trim() }); setStep(2); });
  const reset = () => run(async () => {
    await api.post('/auth/reset-password', { phone: phone.trim(), code: code.trim().toUpperCase(), password });
    Alert.alert('Password updated', 'Please sign in with your new password.', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
  });
  return (
    <AuthLayout title="Reset password" sub={step === 1 ? 'We will send a reset code to your phone' : 'Enter the code you received and a new password'}>
      <Field label="Phone number" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={step === 1} />
      {step === 2 && (<>
        <Field label="Reset code" icon="key-outline" autoCapitalize="characters" value={code} onChangeText={setCode} />
        <Field label="New password" icon="lock-closed-outline" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" />
      </>)}
      <Btn title={step === 1 ? 'Send code' : 'Update password'} onPress={step === 1 ? send : reset} loading={busy} />
      <Btn title="Back to sign in" variant="ghost" style={{ marginTop: 14 }} onPress={() => navigation.goBack()} />
    </AuthLayout>
  );
}
