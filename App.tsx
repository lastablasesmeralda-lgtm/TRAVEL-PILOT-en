import React, { useEffect, useState } from 'react';
import { View, StatusBar, TouchableOpacity, Text, Animated, Alert, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

// Mantener la Splash Screen visible mientras preparamos la app
SplashScreen.preventAutoHideAsync().catch(() => {});

// SILENCIAR TODOS LOS ERRORES DE DESARROLLO (ESTILO PRODUCCIÓN)
// LogBox.ignoreAllLogs(true);
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';

import { AppProvider, useAppContext } from './src/context/AppContext';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalOverlays from './src/GlobalOverlays';
import ChatView from './src/components/ChatView';
import { s } from './src/styles';
import { getEU261Amount } from './src/utils/flightUtils';

function RootComponent() {
  const {
    user, showChat, setShowSOSMenu, setShowChat, sosPulse, compensationEligible, speak, stopSpeak, isSpeaking,
    handleLogout, hasSeenOnboarding, setHasSeenOnboarding, isReplayingTutorial, setIsReplayingTutorial, flightData,
    compBannerDismissed, setCompBannerDismissed, travelProfile, availableVoices, selectedVoice
  } = useAppContext();

  useEffect(() => {
    const prepareApp = async () => {
      // Esperar 4 segundos exactos (incluyendo el tiempo de carga)
      await new Promise(resolve => setTimeout(resolve, 4000));
      await SplashScreen.hideAsync().catch(() => {});
    };
    prepareApp();
  }, []);

  const dynamicAmount = getEU261Amount(flightData);

  // Voz de alertas eliminada de aquí para centralizarla en el flujo de búsqueda de AppContext


  if (!user) return <LoginScreen />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <NavigationContainer theme={DarkTheme}>
        <GlobalOverlays />
        {hasSeenOnboarding === false ? (
          <OnboardingScreen onComplete={() => {
            setHasSeenOnboarding(true);
            if (!isReplayingTutorial) {
              const firstName = (user?.displayName || user?.email || "Viajero").trim().split(/[.\s_-]+/)[0];
              speak(`Hola ${firstName}, es un placer saludarte. Ya estoy conectado para vigilar tus vuelos y proteger tu viaje. Dime si necesitas que revise algo.`);
            }
            setIsReplayingTutorial(false);
          }} />
        ) : (
          <View style={{ flex: 1 }}>
            {showChat ? (
              <ChatView />
            ) : (
              <>
                <AppNavigator />
                {/* ——— PANEL DE MANDO SUPERIOR (FIJO) ——— */}
                <View style={s.topPanel}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#222', flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: travelProfile === 'premium' ? '#D4AF37' : '#4CD964', marginRight: 6 }} />
                        <Text style={{ color: '#B0B0B0', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 }}>
                          {travelProfile === 'premium' ? 'ASISTENTE VIP' : 'MODO ESTÁNDAR'} / ACTIVO
                        </Text>
                      </View>
                  </View>
                </View>

                {/* BOTONES FLOTANTES (AHORA EN POSICIONES FIJAS SUPERIORES) */}
                <View style={s.sosContainer}>
                  <TouchableOpacity style={s.sos} onPress={() => setShowSOSMenu(true)}>
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 10, textAlign: 'center' }} numberOfLines={1}>AYUDA</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.sosChat} onPress={() => setShowChat(true)}>
                  <Text style={{ color: '#AF52DE', fontWeight: 'bold', fontSize: 24 }}>💬</Text>
                </TouchableOpacity>

                {/* BARRA DE COMPENSACIÓN ELEGIBLE (ABSOLUTA SUPERIOR) */}
                {compensationEligible && !compBannerDismissed && (
                  <TouchableOpacity
                    onPress={() => setCompBannerDismissed(true)}
                    activeOpacity={0.9}
                    style={{
                      position: 'absolute',
                      top: 85,
                      left: 15,
                      right: 15,
                      backgroundColor: '#FF9500',
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      zIndex: 200,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 15,
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.1)'
                    }}
                  >
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 0.5, flex: 1 }}>
                      ⚖️ COMPENSACIÓN ELEGIBLE: {getEU261Amount(flightData)} DETECTADOS
                    </Text>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>✕</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppProvider>
        <RootComponent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
