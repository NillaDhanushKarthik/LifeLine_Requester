import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Share, Animated, Easing, Pressable, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBooking } from '../BookingContext';
import { errMsg } from '../api';
import { API_URL } from '../config';
import { getRoute } from '../directions';
import BookingSheet from '../components/BookingSheet';
import LeafletMap from '../components/LeafletMap';
import { Btn } from '../components/ui';
import { C, shadow } from '../theme';
import { toLL, validPt, TERMINAL, TO_HOSPITAL } from '../util';
import { useAuth } from '../AuthContext';

export default function Home({ navigation }) {
  const { user } = useAuth();
  const { booking, driver, hospital, live, nearbyAmbulances, fetchNearbyAmbulances, reportPrompt, setReportPrompt, reported, online, book, cancel, dismiss } = useBooking();
  const insets = useSafeAreaInsets();
  const map = useRef(null), watch = useRef(null);
  const [me, setMe] = useState(null), [locErr, setLocErr] = useState(null), [busy, setBusy] = useState(false), [route, setRoute] = useState(null);

  // ---- GPS: captured automatically on open, kept fresh ----
  const startGps = useCallback(async () => {
    setLocErr(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return setLocErr('Location permission is needed so we can send an ambulance to you.');
    try { setMe((await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords); }
    catch { return setLocErr('Could not detect your location. Turn on GPS and try again.'); }
    watch.current?.remove();
    watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 15 }, (p) => setMe(p.coords));
  }, []);
  useEffect(() => { startGps(); return () => watch.current?.remove(); }, []);

  // Live nearby ambulances polling (like Rapido / Uber)
  useEffect(() => {
    if (me?.latitude && me?.longitude) {
      fetchNearbyAmbulances(me.latitude, me.longitude);
      const timer = setInterval(() => fetchNearbyAmbulances(me.latitude, me.longitude), 20000);
      return () => clearInterval(timer);
    }
  }, [me?.latitude, me?.longitude, fetchNearbyAmbulances]);

  // "Help the Medical Team" opens automatically once a driver accepts
  useEffect(() => { if (reportPrompt) { setReportPrompt(false); navigation.navigate('Report'); } }, [reportPrompt]);

  // ---- Derived map data ----
  const isSearching = !booking || ['Searching', 'SEARCHING', 'Driver Assigned', 'DRIVER_ASSIGNED'].includes(booking.status);
  const active = booking && !TERMINAL.includes(booking.status);
  const pickup = booking ? toLL(booking.pickup.coordinates) : null;
  const ambPt = !isSearching ? (live?.location?.coordinates || (validPt(driver?.location?.coordinates) ? driver.location.coordinates : null)) : null;
  const amb = toLL(ambPt);
  const toHospital = booking && TO_HOSPITAL.includes(booking.status);
  const hosp = toHospital && hospital?.location ? toLL(hospital.location.coordinates) : null;
  const target = toHospital && hosp ? hosp : pickup;

  // Real road route + traffic ETA (Directions API), refreshed at most every 20s
  const lastRoute = useRef(0);
  useEffect(() => {
    if (!active || isSearching || !amb || !target) { setRoute(null); return; }
    if (Date.now() - lastRoute.current < 20000 && route) return;
    lastRoute.current = Date.now(); let on = true;
    getRoute(amb, target).then((r) => on && setRoute(r));
    return () => { on = false; };
  }, [ambPt?.[0], ambPt?.[1], target?.latitude, target?.longitude, active, isSearching]);

  const etaMin = route?.etaMin ?? live?.etaMinutes ?? null;
  const distKm = route?.distanceKm ?? live?.distanceKm ?? null;

  // Rich data for interactive marker popups (Patient, Ambulance, Hospital)
  const userData = useMemo(() => ({
    name: user?.fullName || 'Patient',
    phone: user?.phone || '',
    address: booking?.pickupLocation?.address || (me ? 'Emergency Pickup Point' : 'Your GPS Location'),
  }), [user?.fullName, user?.phone, booking?.pickupLocation?.address, me]);

  const ambulanceData = useMemo(() => (driver ? {
    name: driver.name || 'Emergency Ambulance',
    vehicleNumber: driver.vehicleNumber || '',
    phone: driver.phone || '',
    ambulanceType: booking?.ambulanceType || 'Basic Life Support',
    eta: etaMin,
    distance: distKm,
  } : null), [driver?.name, driver?.vehicleNumber, driver?.phone, booking?.ambulanceType, etaMin, distKm]);

  const hospitalData = useMemo(() => (hospital ? {
    name: hospital.name || 'Emergency Hospital',
    address: hospital.address || booking?.destination?.address || 'Emergency Care Center',
    eta: etaMin,
    distance: distKm,
  } : null), [hospital?.name, hospital?.address, booking?.destination?.address, etaMin, distKm]);

  // Keep everything in view
  useEffect(() => {
    if (!map.current) return;
    const pts = [active && pickup, !isSearching && amb, !isSearching && target, !active && me && { latitude: me.latitude, longitude: me.longitude }].filter(Boolean);
    if (pts.length > 1) {
      map.current.fitToCoordinates(pts, { edgePadding: { top: 120, right: 50, bottom: 380, left: 50 } });
    } else if (pts.length === 1) {
      map.current.animateToRegion({ latitude: pts[0].latitude, longitude: pts[0].longitude, zoom: 15 });
    }
  }, [!!me, active, isSearching, ambPt?.[0], ambPt?.[1], target?.latitude]);

  // ---- Actions ----
  const onBook = async () => {
    if (!me) return Alert.alert('Waiting for GPS', 'We are still detecting your location.');
    setBusy(true);
    try { await book(me.latitude, me.longitude); } catch (e) { Alert.alert('Could not book', errMsg(e)); }
    setBusy(false);
  };
  const call108 = () => Alert.alert('Call 108?', 'This will dial the national emergency ambulance number.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Call 108', style: 'destructive', onPress: () => Linking.openURL('tel:108') }]);
  const share = () => Share.share({ message: `I requested an ambulance. Track it live: ${API_URL}/api/track/${booking.shareToken}` });
  const doCancel = async () => { try { await cancel(); } catch (e) { Alert.alert('Cannot cancel', errMsg(e)); } };

  // Pulsing BOOK button
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  const ring = { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: C.red,
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LeafletMap
        ref={map}
        userLocation={me}
        pickupLocation={pickup}
        ambulanceLocation={amb}
        hospitalLocation={hosp}
        userData={userData}
        ambulanceData={ambulanceData}
        hospitalData={hospitalData}
        nearbyAmbulances={nearbyAmbulances}
        route={route}
        active={active}
        initialRegion={{ latitude: me?.latitude || 17.385, longitude: me?.longitude || 78.4867, zoom: 14 }}
      />


      {/* top bar */}
      <View style={[s.top, { top: insets.top + 10 }]}>
        <Pressable style={[s.round, shadow]} onPress={() => navigation.navigate('History')}><Ionicons name="time-outline" size={22} color={C.navy} /></Pressable>
        <Pressable style={[s.round, shadow]} onPress={() => navigation.navigate('Profile')}><Ionicons name="person-outline" size={22} color={C.navy} /></Pressable>
      </View>
      {!online && <View style={[s.offline, { top: insets.top + 64 }]}><Text style={{ color: '#fff', fontWeight: '600' }}>Reconnecting…</Text></View>}

      {/* floating emergency call */}
      <Pressable onPress={call108} style={[s.sos, shadow, { top: insets.top + 10 }]}>
        <Ionicons name="call" size={18} color="#fff" /><Text style={s.sosT}>108</Text>
      </Pressable>

      {/* floating re-center to my location button */}
      {me && (
        <Pressable
          style={[s.locateBtn, shadow, { bottom: booking ? 380 : 330 }]}
          onPress={() => map.current?.animateToRegion({ latitude: me.latitude, longitude: me.longitude, zoom: 15 })}
        >
          <Ionicons name="locate" size={22} color={C.blue} />
        </Pressable>
      )}

      {!booking ? (
        <View style={[s.bottom, shadow, { paddingBottom: insets.bottom + 20 }]}>
          {locErr ? (<>
            <Ionicons name="location-outline" size={34} color={C.red} />
            <Text style={s.hint}>{locErr}</Text>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Btn title="Try again" onPress={startGps} style={{ flex: 1, marginRight: 8 }} />
              <Btn title="Settings" variant="ghost" onPress={() => Linking.openSettings()} style={{ flex: 1 }} /></View>
          </>) : (<>
            <Text style={s.h}>Emergency?</Text>
            <Text style={s.hint}>{me ? 'One tap sends the nearest ambulance to your location.' : 'Detecting your GPS location…'}</Text>
            <View style={s.bookWrap}>
              <Animated.View style={ring} />
              <Pressable onPress={onBook} disabled={busy || !me} style={({ pressed }) => [s.book, { opacity: me ? 1 : 0.5, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                {busy ? <ActivityIndicator color="#fff" /> : (<>
                  <Ionicons name="medkit" size={34} color="#fff" /><Text style={s.bookT}>BOOK{'\n'}AMBULANCE</Text></>)}
              </Pressable>
            </View>
          </>)}
        </View>
      ) : (
        <BookingSheet booking={booking} driver={driver} hospital={hospital} etaMin={etaMin} distKm={distKm} reported={reported}
          onCancel={doCancel} onDismiss={dismiss} onReport={() => navigation.navigate('Report')} onShare={share}
          onCall={() => Linking.openURL(`tel:${driver.phone}`)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 16, flexDirection: 'row', zIndex: 10 },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sos: { position: 'absolute', right: 16, height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: C.red, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  sosT: { color: '#fff', fontWeight: '800', fontSize: 17, marginLeft: 6 },
  locateBtn: { position: 'absolute', right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  offline: { position: 'absolute', alignSelf: 'center', backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, zIndex: 10 },

  pin: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, alignItems: 'center', padding: 22 },
  h: { fontSize: 24, fontWeight: '800', color: C.text }, hint: { color: C.mute, textAlign: 'center', marginTop: 6, fontSize: 14, maxWidth: 280 },
  bookWrap: { width: 150, height: 150, marginTop: 24, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  book: { width: 150, height: 150, borderRadius: 75, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#FFD9DA' },
  bookT: { color: '#fff', fontWeight: '900', fontSize: 15, textAlign: 'center', marginTop: 4, letterSpacing: 0.5 },
});
