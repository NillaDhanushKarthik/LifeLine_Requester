import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/AuthContext';
import { BookingProvider } from './src/BookingContext';
import Login from './src/screens/Login'; import Register from './src/screens/Register'; import Forgot from './src/screens/Forgot';
import Home from './src/screens/Home'; import Report from './src/screens/Report'; import History from './src/screens/History'; import Profile from './src/screens/Profile';
import { C } from './src/theme';

const Stack = createNativeStackNavigator();
const head = { headerTintColor: C.navy, headerTitleStyle: { fontWeight: '800' }, headerShadowVisible: false };

function Root() {
  const { loading, token } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.blue }}><ActivityIndicator color="#fff" size="large" /></View>;
  return token ? (
    <Stack.Navigator screenOptions={head}>
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="Report" component={Report} options={{ title: 'Help the Medical Team', presentation: 'modal' }} />
      <Stack.Screen name="History" component={History} options={{ title: 'Booking history' }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  ) : (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} /><Stack.Screen name="Register" component={Register} /><Stack.Screen name="Forgot" component={Forgot} />
    </Stack.Navigator>
  );
}
export default function App() {
  return (
    <SafeAreaProvider><AuthProvider><BookingProvider>
      <NavigationContainer><StatusBar style="dark" /><Root /></NavigationContainer>
    </BookingProvider></AuthProvider></SafeAreaProvider>
  );
}
