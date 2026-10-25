# LifeLine – Requester App (Expo / React Native)

## Run
```
cp .env.example .env        # set EXPO_PUBLIC_API_URL (real phone: your computer's LAN IP) and the Google Maps key
npm install && npx expo install --fix
npx expo run:android        # or run:ios  (a dev build is needed for Google Maps on iOS; Android also works in Expo Go)
```
Backend: `cd ../backend && npm run dev`. Enable *Maps SDK for Android/iOS* and *Directions API* on your Google key.

## Screens
Login · Register · Forgot password (code + reset) · Home (map, BOOK, live tracking, call 108) · Help the Medical Team ·
Booking history · Profile.

## How it connects
- Auth: `/api/auth/{register,login,forgot-password,reset-password,me}`; JWT kept in SecureStore, auto sign-out on 401.
- Book: `POST /api/bookings {lat,lng}` straight from GPS, no form.
- Socket (JWT handshake): `booking:update`, `ambulance:location`, `report:prompt`. State is re-synced from `GET /api/bookings/active` on app start and on every reconnect.
- Optional medical info: `POST /api/bookings/:id/report` (opens automatically after a driver accepts).
- Share tracking: public page `GET /api/track/:token` (status, vehicle, ETA only).
