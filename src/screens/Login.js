import React, { useState, useEffect, useRef } from 'react';
import { Alert, Text, View, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout, Field, Btn } from '../components/ui';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { C } from '../theme';

export default function Login() {
  const { signIn } = useAuth();
  const [step, setStep] = useState(1); // 1 = Phone number, 2 = Enter OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timer]);

  // Clean 10-digit number
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  const requestOtp = async () => {
    if (cleanPhone.length !== 10) {
      return Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone: cleanPhone });
      setIsNewUser(!data.isExistingUser);
      if (data.name) setFullName(data.name);
      setStep(2);
      setTimer(30);
      setOtp('');
    } catch (e) {
      Alert.alert('Could not send OTP', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (codeOverride) => {
    const cleanCode = (codeOverride !== undefined ? codeOverride : otp).trim();
    if (!cleanCode || cleanCode.length < 4) {
      return Alert.alert('Enter OTP', 'Please enter the OTP sent to your phone.');
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        phone: cleanPhone,
        otp: cleanCode,
        fullName: fullName.trim() || undefined,
      });
      await signIn(data.token, data.user);
    } catch (e) {
      Alert.alert('Verification Failed', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleOtpChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    // When OTP arrives via SMS autofill or is entered (6 digits), auto-verify immediately
    if (digits.length === 6) {
      verifyOtp(digits);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? 'Mobile Login' : 'Verify OTP'}
      sub={
        step === 1
          ? 'Enter your phone number to receive a one-time password'
          : `We sent a verification code to +91 ${cleanPhone}`
      }
    >
      {step === 1 ? (
        <>
          <View style={s.inputContainer}>
            <Text style={s.label}>Mobile Number</Text>
            <View style={s.phoneRow}>
              <View style={s.countryCode}>
                <Ionicons name="call-outline" size={18} color={C.blue} style={{ marginRight: 6 }} />
                <Text style={s.countryCodeText}>+91</Text>
              </View>
              <View style={s.phoneInputWrap}>
                <Field
                  label=""
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                  style={s.fieldInput}
                />
              </View>
            </View>
          </View>

          <Btn
            title="Send OTP"
            icon="arrow-forward-outline"
            onPress={requestOtp}
            loading={busy}
            disabled={cleanPhone.length !== 10}
            style={{ marginTop: 8 }}
          />

          <View style={s.emergencyCard}>
            <View style={s.emergencyIconWrap}>
              <Ionicons name="alert-circle" size={24} color={C.red} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.emergencyTitle}>Critical Emergency?</Text>
              <Text style={s.emergencySub}>For immediate ambulance dispatch, call 108</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL('tel:108')}
              style={s.emergencyBtn}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={s.emergencyBtnText}>108</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={s.numberRow}>
            <View style={s.verifiedPhoneBadge}>
              <Ionicons name="phone-portrait-outline" size={16} color={C.blue} />
              <Text style={s.verifiedPhoneText}>+91 {cleanPhone}</Text>
            </View>
            <Pressable
              onPress={() => {
                setStep(1);
                setOtp('');
              }}
              style={s.changeBtn}
            >
              <Text style={s.changeText}>Change</Text>
            </Pressable>
          </View>

          {isNewUser && (
            <Field
              label="Your Full Name"
              icon="person-outline"
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. John Doe"
            />
          )}

          <Field
            label="6-Digit OTP"
            icon="key-outline"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={handleOtpChange}
            placeholder="Enter 6-digit OTP"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            importantForAutofill="yes"
            autoFocus={true}
          />

          <Btn
            title="Verify & Sign In"
            icon="checkmark-circle-outline"
            onPress={() => verifyOtp()}
            loading={busy}
            disabled={otp.trim().length < 4}
            style={{ marginTop: 12 }}
          />

          <View style={s.resendRow}>
            {timer > 0 ? (
              <Text style={s.timerText}>
                Resend code in <Text style={{ fontWeight: '700', color: C.blue }}>{timer}s</Text>
              </Text>
            ) : (
              <Pressable onPress={requestOtp} disabled={busy}>
                <Text style={s.resendText}>Didn't receive code? Resend OTP</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: C.mute, marginBottom: 6 },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  countryCode: {
    height: 54,
    paddingHorizontal: 12,
    backgroundColor: C.soft,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: C.line,
  },
  countryCodeText: { fontSize: 16, fontWeight: '700', color: C.navy },
  phoneInputWrap: { flex: 1 },
  fieldInput: { fontSize: 17, letterSpacing: 1 },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderRadius: 18,
    padding: 14,
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  emergencyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: { fontSize: 14, fontWeight: '700', color: C.red },
  emergencySub: { fontSize: 12, color: '#883333', marginTop: 2 },
  emergencyBtn: {
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  emergencyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  verifiedPhoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedPhoneText: { fontSize: 15, fontWeight: '700', color: C.text },
  changeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  changeText: { fontSize: 13, fontWeight: '700', color: C.blue },
  resendRow: { alignItems: 'center', marginTop: 20 },
  timerText: { fontSize: 14, color: C.mute },
  resendText: { fontSize: 14, fontWeight: '700', color: C.blue },
});

