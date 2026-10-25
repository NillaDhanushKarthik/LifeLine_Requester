import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Vibration } from 'react-native';
import api from './api';
import { useAuth } from './AuthContext';
import { connectSocket } from './socket';
import { TERMINAL } from './util';
const Ctx = createContext(null);
export const useBooking = () => useContext(Ctx);

const driverOf = (d) => d && { name: d.name || d.fullName, phone: d.phone, vehicleNumber: d.vehicleNumber, photo: d.photo || d.profilePhoto, location: d.location };

export function BookingProvider({ children }) {
  const { token } = useAuth();
  const [booking, setBooking] = useState(null), [driver, setDriver] = useState(null), [hospital, setHospital] = useState(null);
  const [live, setLive] = useState(null), [reportPrompt, setReportPrompt] = useState(false), [reported, setReported] = useState(false), [online, setOnline] = useState(true);
  const [nearbyAmbulances, setNearbyAmbulances] = useState([]);
  const ref = useRef(null); ref.current = booking;

  const reset = useCallback(() => { setBooking(null); setDriver(null); setHospital(null); setLive(null); setReportPrompt(false); setReported(false); }, []);

  // Fetch all online nearby ambulances (like Rapido / Uber)
  const fetchNearbyAmbulances = useCallback(async (lat, lng) => {
    try {
      const params = (lat != null && lng != null) ? { lat, lng } : {};
      const { data } = await api.get('/ambulances/nearby', { params });
      if (data?.ambulances) {
        setNearbyAmbulances(data.ambulances);
      }
    } catch (err) {}
  }, []);

  // Pull server truth (app reopen, socket reconnect)
  const restore = useCallback(async () => {
    try {
      const { data } = await api.get('/bookings/active');
      if (data) { setBooking(data); setDriver(driverOf(data.driver)); setHospital(data.hospital ? { name: data.hospital.name, location: data.hospital.location } : null); }
      else if (ref.current && !TERMINAL.includes(ref.current.status)) {      // ended while we were offline
        const r = await api.get(`/bookings/${ref.current._id}`); setBooking(r.data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!token) { reset(); setNearbyAmbulances([]); return; }
    restore();
    fetchNearbyAmbulances();
    const s = connectSocket(token);
    s.on('connect', () => { setOnline(true); restore(); fetchNearbyAmbulances(); });
    s.on('disconnect', () => setOnline(false));
    s.on('booking:update', ({ booking: b, driver: d, hospital: h }) => {
      if (b) {
        const wasSearching = !ref.current || ['Searching', 'SEARCHING', 'Driver Assigned', 'DRIVER_ASSIGNED'].includes(ref.current.status);
        const nowAccepted = ['Accepted', 'ACCEPTED', 'Driver Arriving', 'DRIVER_ARRIVING'].includes(b.status);
        if (wasSearching && nowAccepted) {
          Vibration.vibrate([0, 300, 150, 300]);
          setReportPrompt(true);
        }
        setBooking(b);
      }
      if (d) setDriver(driverOf(d));
      if (h) setHospital(h);
    });
    s.on('booking:status', (payload) => {
      const b = payload?.booking || payload;
      if (b) {
        const wasSearching = !ref.current || ['Searching', 'SEARCHING', 'Driver Assigned', 'DRIVER_ASSIGNED'].includes(ref.current.status);
        const nowAccepted = ['Accepted', 'ACCEPTED', 'Driver Arriving', 'DRIVER_ARRIVING'].includes(b.status);
        if (wasSearching && nowAccepted) {
          Vibration.vibrate([0, 300, 150, 300]);
          setReportPrompt(true);
        }
        setBooking(b);
        if (b.driver) setDriver(driverOf(b.driver));
        if (b.hospital) setHospital(b.hospital);
      }
    });
    s.on('ambulance:location', (p) => setLive(p));
    s.on('driver:location', (d) => {
      if (d?.latitude && d?.longitude) {
        setLive({ location: { type: 'Point', coordinates: [d.longitude, d.latitude] }, heading: d.heading });
      }
    });
    // Live Rapido-style roaming ambulances update
    s.on('nearby:ambulance:update', (amb) => {
      if (!amb?.id || amb.latitude == null || amb.longitude == null) return;
      setNearbyAmbulances((prev) => {
        const idx = prev.findIndex((x) => x.id === amb.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...amb };
          return updated;
        }
        return [...prev, amb];
      });
    });
    s.on('nearby:ambulance:status', (amb) => {
      if (!amb?.id) return;
      setNearbyAmbulances((prev) => {
        if (!amb.isAvailable) {
          return prev.filter((x) => x.id !== amb.id);
        }
        const idx = prev.findIndex((x) => x.id === amb.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...amb };
          return updated;
        }
        return [...prev, amb];
      });
    });

    s.on('report:prompt', () => setReportPrompt(true));   // driver accepted → "Help the Medical Team"
    return () => s.disconnect();
  }, [token]);

  const book = async (lat, lng) => {
    const { data } = await api.post('/bookings', { lat, lng });
    const b = data?.booking || data;
    reset();
    setBooking(b);
    if (b?.driver && !['Searching', 'SEARCHING', 'Driver Assigned', 'DRIVER_ASSIGNED'].includes(b.status)) {
      setDriver(driverOf(b.driver));
    }
    if (b?.hospital) setHospital(b.hospital);
  };
  const cancel = async () => {
    const id = booking?._id || booking?.id;
    const { data } = await api.post(`/bookings/${id}/cancel`);
    const b = data?.booking || data;
    setBooking(b);
  };

  return (
    <Ctx.Provider value={{ booking, driver, hospital, live, nearbyAmbulances, fetchNearbyAmbulances, reportPrompt, setReportPrompt, reported, setReported, online, book, cancel, dismiss: reset }}>
      {children}
    </Ctx.Provider>
  );
}
