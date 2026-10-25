// Route service: Google Directions API or free OSRM road routing fallback
import { GOOGLE_KEY } from './config';

const decode = (t) => {
  let i = 0, la = 0, ln = 0; const out = [];
  while (i < t.length) {
    let b, s = 0, r = 0;
    do { b = t.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32);
    la += r & 1 ? ~(r >> 1) : r >> 1;
    s = 0; r = 0;
    do { b = t.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32);
    ln += r & 1 ? ~(r >> 1) : r >> 1;
    out.push({ latitude: la / 1e5, longitude: ln / 1e5 });
  }
  return out;
};

export async function getRoute(o, d) {
  if (!o || !d) return null;

  // Try Google Directions if key is provided
  if (GOOGLE_KEY) {
    try {
      const u = `https://maps.googleapis.com/maps/api/directions/json?origin=${o.latitude},${o.longitude}&destination=${d.latitude},${d.longitude}&mode=driving&departure_time=now&key=${GOOGLE_KEY}`;
      const j = await (await fetch(u)).json();
      const leg = j.routes?.[0]?.legs?.[0];
      if (leg) {
        return {
          coords: decode(j.routes[0].overview_polyline.points),
          distanceKm: leg.distance.value / 1000,
          etaMin: Math.max(1, Math.round((leg.duration_in_traffic || leg.duration).value / 60))
        };
      }
    } catch {}
  }

  // Free OSRM road routing fallback
  try {
    const u = `https://router.project-osrm.org/route/v1/driving/${o.longitude},${o.latitude};${d.longitude},${d.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(u);
    const j = await res.json();
    if (j.code === 'Ok' && j.routes?.[0]) {
      const route = j.routes[0];
      const coords = route.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
      const distanceKm = +(route.distance / 1000).toFixed(1);
      const etaMin = Math.max(1, Math.round(route.duration / 60));
      return { coords, distanceKm, etaMin };
    }
  } catch {}

  // Fallback: direct line
  return {
    coords: [o, d],
    distanceKm: 0,
    etaMin: 5
  };
}

