import React, { useRef, useEffect, useImperativeHandle, forwardRef, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, Dimensions, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAPTILER_KEY } from '../config';
import { LEAFLET_CSS, LEAFLET_JS } from './leafletBundle';

const LeafletMap = forwardRef(function LeafletMap(
  {
    initialRegion = { latitude: 17.385, longitude: 78.4867, zoom: 14 },
    userLocation,
    pickupLocation,
    ambulanceLocation,
    hospitalLocation,
    userData,
    ambulanceData,
    hospitalData,
    nearbyAmbulances,
    route,
    active,
    style,
  },
  ref
) {
  const webViewRef = useRef(null);
  const isReadyRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Keep latest payload handy for when map is ready
  const currentPayload = useMemo(() => ({
    user: userLocation ? {
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      name: userData?.name || 'Patient',
      phone: userData?.phone || '',
      address: userData?.address || 'Current Location',
    } : null,
    pickup: active && pickupLocation ? {
      lat: pickupLocation.latitude,
      lng: pickupLocation.longitude,
      name: userData?.name || 'Patient',
      phone: userData?.phone || '',
      address: userData?.address || pickupLocation?.address || 'Pickup Point',
    } : null,
    ambulance: active && ambulanceLocation ? {
      lat: ambulanceLocation.latitude,
      lng: ambulanceLocation.longitude,
      name: ambulanceData?.name || 'Emergency Ambulance',
      vehicleNumber: ambulanceData?.vehicleNumber || '',
      phone: ambulanceData?.phone || '',
      ambulanceType: ambulanceData?.ambulanceType || 'Basic Life Support',
      eta: ambulanceData?.eta,
      distance: ambulanceData?.distance,
    } : null,
    hospital: active && hospitalLocation ? {
      lat: hospitalLocation.latitude,
      lng: hospitalLocation.longitude,
      name: hospitalData?.name || 'Emergency Hospital',
      address: hospitalData?.address || 'Emergency Trauma Center',
      eta: hospitalData?.eta,
      distance: hospitalData?.distance,
    } : null,
    nearbyAmbulances: nearbyAmbulances || [],
    route: route && route.coords ? route.coords.map((c) => [c.latitude, c.longitude]) : null,
    active: !!active,
  }), [
    userLocation?.latitude,
    userLocation?.longitude,
    userData?.name,
    userData?.phone,
    userData?.address,
    pickupLocation?.latitude,
    pickupLocation?.longitude,
    pickupLocation?.address,
    ambulanceLocation?.latitude,
    ambulanceLocation?.longitude,
    ambulanceData?.name,
    ambulanceData?.vehicleNumber,
    ambulanceData?.phone,
    ambulanceData?.ambulanceType,
    ambulanceData?.eta,
    ambulanceData?.distance,
    hospitalLocation?.latitude,
    hospitalLocation?.longitude,
    hospitalData?.name,
    hospitalData?.address,
    hospitalData?.eta,
    hospitalData?.distance,
    nearbyAmbulances,
    route?.coords?.length,
    active,
  ]);

  const payloadRef = useRef(currentPayload);
  payloadRef.current = currentPayload;

  const sendToMap = useCallback((msgObj) => {
    if (webViewRef.current) {
      try {
        webViewRef.current.postMessage(JSON.stringify(msgObj));
      } catch (e) {}
    }
  }, []);

  // Expose recenter or custom methods to parent via ref
  useImperativeHandle(ref, () => ({
    animateToRegion: ({ latitude, longitude, zoom = 15 }) => {
      sendToMap({
        type: 'PAN_TO',
        payload: { lat: latitude, lng: longitude, zoom },
      });
    },
    fitToCoordinates: (coords, options = {}) => {
      if (coords && coords.length > 0) {
        sendToMap({
          type: 'FIT_BOUNDS',
          payload: { coords, padding: options.edgePadding || { top: 60, bottom: 200, left: 40, right: 40 } },
        });
      }
    },
    invalidateSize: () => {
      sendToMap({ type: 'INVALIDATE_SIZE' });
    },
  }));

  // Sync state to WebView when props update AND map is ready
  useEffect(() => {
    if (isReadyRef.current) {
      sendToMap({
        type: 'UPDATE',
        payload: currentPayload,
      });
    }
  }, [currentPayload, sendToMap]);

  // Handle messages received from WebView
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        isReadyRef.current = true;
        setIsReady(true);
        // Immediately sync current markers
        if (payloadRef.current) {
          sendToMap({
            type: 'UPDATE',
            payload: payloadRef.current,
          });
        }
        if (payloadRef.current?.user) {
          sendToMap({
            type: 'PAN_TO',
            payload: { lat: payloadRef.current.user.lat, lng: payloadRef.current.user.lng, zoom: 15 },
          });
        }
      }
    } catch (err) {}
  }, [sendToMap]);

  // Initial region coordinates captured once to prevent reloading WebView
  const initLat = Number(initialRegion?.latitude) || 17.385;
  const initLng = Number(initialRegion?.longitude) || 78.4867;
  const initZoom = Number(initialRegion?.zoom) || 14;

  // Memoize HTML content permanently so WebView NEVER reloads on state changes
  const htmlContent = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    ${LEAFLET_CSS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #eef2f7;
    }
    #map {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100%;
      background-color: #eef2f7;
    }
    .leaflet-control-attribution { font-size: 10px; background: rgba(255,255,255,0.7) !important; padding: 2px 6px; }

    /* User radar pulse marker */
    .user-marker { width: 32px; height: 32px; position: relative; }
    .user-dot {
      width: 18px; height: 18px;
      background: #1565FF;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(21, 101, 255, 0.5);
      position: absolute;
      top: 7px; left: 7px;
      z-index: 2;
    }
    .user-pulse {
      width: 44px; height: 44px;
      background: rgba(21, 101, 255, 0.25);
      border-radius: 50%;
      position: absolute;
      top: -6px; left: -6px;
      animation: radarPulse 2s ease-out infinite;
      z-index: 1;
    }
    @keyframes radarPulse {
      0% { transform: scale(0.4); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Custom pins */
    .custom-pin {
      width: 44px; height: 44px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .pin-navy { background: #0B2A6F; }
    .pin-red { background: #E5252A; animation: bouncePin 1.6s infinite ease-in-out; }
    .pin-blue { background: #1565FF; }

    @keyframes bouncePin {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    /* Interactive popups */
    .leaflet-popup-content-wrapper {
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 12px 36px rgba(11, 42, 111, 0.22);
      padding: 0;
      overflow: hidden;
    }
    .leaflet-popup-content {
      margin: 0;
      line-height: 1.4;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .leaflet-popup-tip { background: #ffffff; }
    .popup-card {
      padding: 14px 16px;
      min-width: 210px;
      max-width: 270px;
    }
    .popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f0f3f6;
    }
    .popup-badge {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 3px 8px;
      border-radius: 6px;
      display: inline-block;
    }
    .badge-user { background: #eef4ff; color: #1565ff; }
    .badge-amb { background: #feebeb; color: #e5252a; }
    .badge-hosp { background: #e8f8f0; color: #059669; }
    .popup-title {
      font-size: 15px;
      font-weight: 800;
      color: #0b1a3d;
      margin-bottom: 2px;
    }
    .popup-sub {
      font-size: 12.5px;
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .popup-info-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .popup-call-btn {
      display: block;
      margin-top: 10px;
      padding: 8px 12px;
      background: #1565ff;
      color: #ffffff !important;
      text-align: center;
      border-radius: 10px;
      font-weight: 700;
      font-size: 12.5px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(21, 101, 255, 0.3);
    }

    /* Roaming online ambulances (Rapido style) */
    .pin-nearby {
      background: #0B2A6F;
      border: 2.5px solid #ffffff;
      position: relative;
      box-shadow: 0 4px 14px rgba(11, 42, 111, 0.4);
      transition: transform 0.4s ease;
    }
    .online-dot {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      background: #10B981;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    ${LEAFLET_JS}
  </script>

  <script>
    var apiKey = "${MAPTILER_KEY || ''}";
    var initLat = ${initLat};
    var initLng = ${initLng};
    var initZoom = ${initZoom};

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([initLat, initLng], initZoom);

    // Primary: MapTiler Streets v2
    var primaryLayer;
    if (apiKey && apiKey.length > 5) {
      primaryLayer = L.tileLayer('https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=' + apiKey, {
        maxZoom: 19,
        tileSize: 256,
        attribution: '&copy; MapTiler &copy; OSM'
      }).addTo(map);
    } else {
      primaryLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c', 'd'],
        attribution: '&copy; CartoDB &copy; OSM'
      }).addTo(map);
    }

    // Bulletproof Fallbacks: CartoDB Voyager and OpenStreetMap
    var fallbackCarto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '&copy; CartoDB &copy; OSM'
    });
    var fallbackOsm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    });

    primaryLayer.on('tileerror', function() {
      if (!map.hasLayer(fallbackCarto) && !map.hasLayer(fallbackOsm)) {
        fallbackCarto.addTo(map);
      }
    });
    fallbackCarto.on('tileerror', function() {
      if (!map.hasLayer(fallbackOsm)) {
        fallbackOsm.addTo(map);
      }
    });

    // Invalidate map size to force immediate render on Android WebViews
    function fixSize() {
      if (map) map.invalidateSize();
    }
    window.addEventListener('resize', fixSize);
    setTimeout(fixSize, 100);
    setTimeout(fixSize, 400);
    setTimeout(fixSize, 1000);
    setTimeout(fixSize, 2500);

    var userMarker = null;
    var pickupMarker = null;
    var ambulanceMarker = null;
    var hospitalMarker = null;
    var nearbyMarkersMap = new Map();
    var routeLine = null;
    var routeBgLine = null;

    function createUserIcon() {
      return L.divIcon({
        className: '',
        html: '<div class="user-marker"><div class="user-pulse"></div><div class="user-dot"></div></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    }

    function createNearbyAmbulanceIcon() {
      var svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19 8h-2.5V5.5c0-.83-.67-1.5-1.5-1.5H9c-.83 0-1.5.67-1.5 1.5V8H5c-1.1 0-2 .9-2 2v9c0 .55.45 1 1 1h1.18c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2h4.36c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2H20c.55 0 1-.45 1-1v-6.68c0-.68-.28-1.34-.78-1.81L19 8zm-8 4H9v-2h2V8h2v2h2v2h-2v2h-2v-2z"/></svg>';
      return L.divIcon({
        className: '',
        html: '<div class="custom-pin pin-nearby" style="width:38px;height:38px;">' + svg + '<div class="online-dot"></div></div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
    }

    function createPinIcon(type) {
      var bg = 'pin-navy';
      var svg = '';
      if (type === 'pickup') {
        bg = 'pin-navy';
        svg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      } else if (type === 'ambulance') {
        bg = 'pin-red';
        svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M19 8h-2.5V5.5c0-.83-.67-1.5-1.5-1.5H9c-.83 0-1.5.67-1.5 1.5V8H5c-1.1 0-2 .9-2 2v9c0 .55.45 1 1 1h1.18c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2h4.36c.41 1.16 1.52 2 2.82 2s2.41-.84 2.82-2H20c.55 0 1-.45 1-1v-6.68c0-.68-.28-1.34-.78-1.81L19 8zm-8 4H9v-2h2V8h2v2h2v2h-2v2h-2v-2z"/></svg>';
      } else if (type === 'hospital') {
        bg = 'pin-blue';
        svg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>';
      }
      return L.divIcon({
        className: '',
        html: '<div class="custom-pin ' + bg + '">' + svg + '</div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getUserPopupHtml(data, isPickup) {
      var name = (data && data.name) ? data.name : 'Patient';
      var phone = (data && data.phone) ? data.phone : '';
      var address = (data && data.address) ? data.address : (isPickup ? 'Emergency Pickup Point' : 'Your GPS Location');
      var badge = isPickup ? 'Pickup Location' : 'My Location';
      return '<div class="popup-card">' +
        '<div class="popup-header">' +
          '<span class="popup-badge badge-user">👤 ' + badge + '</span>' +
        '</div>' +
        '<div class="popup-title">' + escapeHtml(name) + '</div>' +
        (phone ? '<div class="popup-info-row">📞 ' + escapeHtml(phone) + '</div>' : '') +
        '<div class="popup-info-row">📍 ' + escapeHtml(address) + '</div>' +
      '</div>';
    }

    function getHospitalPopupHtml(data) {
      var name = (data && data.name) ? data.name : 'Emergency Hospital';
      var address = (data && data.address) ? data.address : 'Emergency Medical Center';
      var eta = (data && data.eta != null) ? data.eta : '';
      var dist = (data && data.distance != null) ? (typeof data.distance === 'number' ? data.distance.toFixed(1) : data.distance) : '';
      var stats = (eta || dist) ? (eta ? eta + ' min arrival' : '') + (eta && dist ? ' • ' : '') + (dist ? dist + ' km' : '') : '';
      return '<div class="popup-card">' +
        '<div class="popup-header">' +
          '<span class="popup-badge badge-hosp">🏥 Nearest Hospital</span>' +
        '</div>' +
        '<div class="popup-title">' + escapeHtml(name) + '</div>' +
        '<div class="popup-info-row">📍 ' + escapeHtml(address) + '</div>' +
        (stats ? '<div class="popup-info-row">⏱ ' + escapeHtml(stats) + '</div>' : '') +
      '</div>';
    }

    function getAmbulancePopupHtml(data) {
      var name = (data && data.name) ? data.name : 'Emergency Ambulance';
      var vehicle = (data && data.vehicleNumber) ? data.vehicleNumber : '';
      var phone = (data && data.phone) ? data.phone : '';
      var type = (data && data.ambulanceType) ? data.ambulanceType : 'Life Support';
      var eta = (data && data.eta != null) ? data.eta : '';
      var dist = (data && data.distance != null) ? (typeof data.distance === 'number' ? data.distance.toFixed(1) : data.distance) : '';
      var stats = (eta || dist) ? (eta ? eta + ' min' : '') + (eta && dist ? ' • ' : '') + (dist ? dist + ' km away' : '') : '';
      return '<div class="popup-card">' +
        '<div class="popup-header">' +
          '<span class="popup-badge badge-amb">🚑 Ambulance Driver</span>' +
        '</div>' +
        '<div class="popup-title">' + escapeHtml(name) + '</div>' +
        (vehicle ? '<div class="popup-sub">Vehicle: ' + escapeHtml(vehicle) + ' (' + escapeHtml(type) + ')</div>' : '') +
        (stats ? '<div class="popup-info-row">⏱ ETA: ' + escapeHtml(stats) + '</div>' : '') +
        (phone ? '<a href="tel:' + encodeURIComponent(phone) + '" class="popup-call-btn">📞 Call ' + escapeHtml(phone) + '</a>' : '') +
      '</div>';
    }

    function getNearbyPopupHtml(data) {
      var num = data.ambulanceNumber || data.vehicleNumber || 'Ambulance';
      var type = data.ambulanceType ? data.ambulanceType + ' Life Support' : 'Emergency Ambulance';
      var dist = data.distanceKm != null ? data.distanceKm + ' km away' : 'Available nearby';
      return '<div class="popup-card">' +
        '<div class="popup-header">' +
          '<span class="popup-badge" style="background:#e8f8f0; color:#059669;">🟢 Available & Online</span>' +
        '</div>' +
        '<div class="popup-title">Ambulance ' + escapeHtml(num) + '</div>' +
        '<div class="popup-sub">' + escapeHtml(type) + '</div>' +
        '<div class="popup-info-row">📍 ' + escapeHtml(dist) + '</div>' +
        '<div class="popup-info-row" style="color:#059669; font-weight:700; margin-top:6px;">⚡ Ready to dispatch</div>' +
      '</div>';
    }

    function handleUpdate(p) {
      if (!p) return;
      if (p.user) {
        var userHtml = getUserPopupHtml(p.user, false);
        if (!userMarker) {
          userMarker = L.marker([p.user.lat, p.user.lng], { icon: createUserIcon() }).addTo(map);
          userMarker.bindPopup(userHtml, { closeButton: true, autoPan: true, maxWidth: 280, offset: [0, -10] });
        } else {
          userMarker.setLatLng([p.user.lat, p.user.lng]);
          if (userMarker.getPopup()) userMarker.setPopupContent(userHtml);
        }
      } else if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }

      if (p.pickup) {
        var pickupHtml = getUserPopupHtml(p.pickup, true);
        if (!pickupMarker) {
          pickupMarker = L.marker([p.pickup.lat, p.pickup.lng], { icon: createPinIcon('pickup') }).addTo(map);
          pickupMarker.bindPopup(pickupHtml, { closeButton: true, autoPan: true, maxWidth: 280, offset: [0, -10] });
        } else {
          pickupMarker.setLatLng([p.pickup.lat, p.pickup.lng]);
          if (pickupMarker.getPopup()) pickupMarker.setPopupContent(pickupHtml);
        }
      } else if (pickupMarker) {
        map.removeLayer(pickupMarker);
        pickupMarker = null;
      }

      if (p.ambulance) {
        var ambHtml = getAmbulancePopupHtml(p.ambulance);
        if (!ambulanceMarker) {
          ambulanceMarker = L.marker([p.ambulance.lat, p.ambulance.lng], { icon: createPinIcon('ambulance'), zIndexOffset: 1000 }).addTo(map);
          ambulanceMarker.bindPopup(ambHtml, { closeButton: true, autoPan: true, maxWidth: 280, offset: [0, -10] });
        } else {
          ambulanceMarker.setLatLng([p.ambulance.lat, p.ambulance.lng]);
          if (ambulanceMarker.getPopup()) ambulanceMarker.setPopupContent(ambHtml);
        }
      } else if (ambulanceMarker) {
        map.removeLayer(ambulanceMarker);
        ambulanceMarker = null;
      }

      if (p.hospital) {
        var hospHtml = getHospitalPopupHtml(p.hospital);
        if (!hospitalMarker) {
          hospitalMarker = L.marker([p.hospital.lat, p.hospital.lng], { icon: createPinIcon('hospital') }).addTo(map);
          hospitalMarker.bindPopup(hospHtml, { closeButton: true, autoPan: true, maxWidth: 280, offset: [0, -10] });
        } else {
          hospitalMarker.setLatLng([p.hospital.lat, p.hospital.lng]);
          if (hospitalMarker.getPopup()) hospitalMarker.setPopupContent(hospHtml);
        }
      } else if (hospitalMarker) {
        map.removeLayer(hospitalMarker);
        hospitalMarker = null;
      }

      // Render nearby online roaming ambulances (Rapido / Uber style)
      if (p.nearbyAmbulances && Array.isArray(p.nearbyAmbulances)) {
        var currentIds = new Set();
        p.nearbyAmbulances.forEach(function(amb) {
          if (!amb || amb.latitude == null || amb.longitude == null || (amb.latitude === 0 && amb.longitude === 0)) return;
          // Skip if this ambulance is already the primary assigned ambulance
          if (p.ambulance && (String(p.ambulance.id) === String(amb.id) || String(p.ambulance.vehicleNumber) === String(amb.ambulanceNumber))) return;

          var id = String(amb.id || amb._id || amb.ambulanceNumber);
          currentIds.add(id);

          var popupHtml = getNearbyPopupHtml(amb);
          var m = nearbyMarkersMap.get(id);
          if (!m) {
            m = L.marker([amb.latitude, amb.longitude], { icon: createNearbyAmbulanceIcon(), zIndexOffset: 500 }).addTo(map);
            m.bindPopup(popupHtml, { closeButton: true, autoPan: true, maxWidth: 280, offset: [0, -10] });
            nearbyMarkersMap.set(id, m);
          } else {
            m.setLatLng([amb.latitude, amb.longitude]);
            if (m.getPopup()) m.setPopupContent(popupHtml);
          }
        });

        // Clean up ambulances that went offline
        nearbyMarkersMap.forEach(function(marker, id) {
          if (!currentIds.has(id)) {
            map.removeLayer(marker);
            nearbyMarkersMap.delete(id);
          }
        });
      } else {
        nearbyMarkersMap.forEach(function(marker) { map.removeLayer(marker); });
        nearbyMarkersMap.clear();
      }

      if (p.route && p.route.length > 0) {
        if (!routeBgLine) {
          routeBgLine = L.polyline(p.route, { color: '#0B2A6F', weight: 8, opacity: 0.35 }).addTo(map);
          routeLine = L.polyline(p.route, { color: '#1565FF', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        } else {
          routeBgLine.setLatLngs(p.route);
          routeLine.setLatLngs(p.route);
        }
      } else {
        if (routeBgLine) { map.removeLayer(routeBgLine); routeBgLine = null; }
        if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
      }

      var activePoints = [];
      if (p.pickup) activePoints.push([p.pickup.lat, p.pickup.lng]);
      if (p.ambulance) activePoints.push([p.ambulance.lat, p.ambulance.lng]);
      if (p.hospital) activePoints.push([p.hospital.lat, p.hospital.lng]);
      if (!p.active && p.user) activePoints.push([p.user.lat, p.user.lng]);

      if (activePoints.length > 1) {
        map.fitBounds(L.latLngBounds(activePoints), {
          paddingTopLeft: [40, 100],
          paddingBottomRight: [40, 240],
          maxZoom: 16,
          animate: true
        });
      }
    }

    function onMessage(event) {
      try {
        var msg = event.data;
        if (typeof msg === 'string') {
          msg = JSON.parse(msg);
        }
        if (!msg || !msg.type) return;

        if (msg.type === 'UPDATE') {
          handleUpdate(msg.payload);
        } else if (msg.type === 'PAN_TO') {
          map.setView([msg.payload.lat, msg.payload.lng], msg.payload.zoom || 15, { animate: true });
        } else if (msg.type === 'FIT_BOUNDS') {
          var coords = msg.payload.coords.map(function(c) { return [c.latitude || c.lat, c.longitude || c.lng]; });
          var pad = msg.payload.padding || {};
          map.fitBounds(L.latLngBounds(coords), {
            paddingTopLeft: [pad.left || 30, pad.top || 50],
            paddingBottomRight: [pad.right || 30, pad.bottom || 200],
            animate: true
          });
        } else if (msg.type === 'INVALIDATE_SIZE') {
          fixSize();
        }
      } catch (err) {}
    }

    window.addEventListener('message', onMessage);
    document.addEventListener('message', onMessage);

    // Signal ready to React Native
    setTimeout(function() {
      fixSize();
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }, 50);
  </script>
</body>
</html>`, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'https://api.maptiler.com' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        androidLayerType="hardware"
        androidHardwareAccelerationDisabled={false}
        setSupportMultipleWindows={false}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url && request.url.startsWith('tel:')) {
            Linking.openURL(request.url);
            return false;
          }
          return true;
        }}
        onLoadEnd={() => {
          fixSizeAfterLoad(webViewRef);
        }}
      />
    </View>
  );
});

function fixSizeAfterLoad(ref) {
  if (ref.current) {
    ref.current.postMessage(JSON.stringify({ type: 'INVALIDATE_SIZE' }));
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#eef2f7',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eef2f7',
    opacity: 0.99,
  },
});

export default LeafletMap;
