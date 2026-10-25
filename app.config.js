const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const why = 'LifeLine uses your location to send the nearest ambulance to you.';

module.exports = {
  expo: {
    name: 'LifeLine',
    slug: 'lifeline-requester',
    version: '1.0.0',
    sdkVersion: '58.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',

    ios: {
      bundleIdentifier: 'com.lifeline.requester',
      config: {
        googleMapsApiKey: key
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: why
      }
    },

    android: {
      package: 'com.lifeline.requester',
      config: {
        googleMaps: {
          apiKey: key
        }
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION'
      ]
    },

    plugins: [
  'expo-asset',
  'expo-font',
  'expo-status-bar',
  'expo-secure-store',
  ['expo-location', { locationWhenInUsePermission: why }]
]
  }
};
