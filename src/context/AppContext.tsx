import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, Animated, Keyboard, Vibration } from 'react-native';
import * as Speech from 'expo-speech';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { BACKEND_URL } from '../../config';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Audio } from 'expo-av';
import { getEU261Amount } from '../utils/flightUtils';

type AppContextType = any;
export const IS_BETA = true; // Cambiar a true para betas/testing
export const AppContext = createContext<AppContextType>(null);

export const AppProvider = ({ children }) => {
  // AUTH / USUARIO
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  // MAIN APP STATES
  const [tab, setTab] = useState('intel');
  const [ticks, setTicks] = useState(0);
  const [showSOS, setShowSOS] = useState(false);
  const [showSOSMenu, setShowSOSMenu] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<any>(null);

  // NEW STATES ADDED
  const [showChat, setShowChat] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserLogs, setBrowserLogs] = useState<any[]>([]);
  const [legalShieldActive, setLegalShieldActive] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [claims, setClaims] = useState<any[]>([
    {
      id: 'C-VLG8321',
      airline: 'Vueling',
      flight: 'VY8321',
      route: 'BCN > ORY',
      status: 'UNDER LEGAL REVIEW',
      compensation: '250',
    },
    {
      id: 'C-RYR992',
      airline: 'Ryanair',
      flight: 'FR992',
      route: 'MAD > STN',
      status: 'SUBMITTED TO AIRLINE',
      compensation: '400',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([
    { id: '1', text: 'FLIGHT-PILOT CONNECTED. Hello, I am your travel assistant. I am monitoring your flights to protect you. How can I help you?', isUser: false }
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [compensationEligible, setCompensationEligible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiPlan, setApiPlan] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [compBannerDismissed, setCompBannerDismissed] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [prefetchedData, setPrefetchedData] = useState<any>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [flightInput, setFlightInput] = useState('');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasNewDoc, setHasNewDoc] = useState(false);
  const demoItems = [
    {
      id: 'demo-passport-premium',
      t: 'PASSPORT',
      s: 'DOC #ES-992182-B // VERIFIED',
      i: require('../../assets/pasaporte_puro.jpg'),
      source: 'MANUAL',
      icon: '🛂',
      verified: true,
      isDemo: true,
    },
    {
      id: 'demo-boarding-premium',
      t: 'BOARDING PASS',
      s: 'FLIGHT IB3166 // MAD -> CDG',
      i: require('../../assets/tarjeta_embarque_pura.jpg'),
      source: 'GMAIL',
      icon: '🎫',
      verified: true,
      isDemo: true,
    },
    {
      id: 'demo-hotel-premium',
      t: 'HOTEL RESERVATION',
      s: 'CONF: #88291-TX // MADRID',
      i: require('../../assets/reserva_hotel_pura.jpg'),
      source: 'OUTLOOK',
      icon: '🛌',
      verified: true,
      isDemo: true,
    }
  ];

  const [extraDocs, setExtraDocs] = useState<any[]>(demoItems);
  const [flightData, setFlightData] = useState<any>(null);
  const [activeSearches, setActiveSearches] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [myFlights, setMyFlights] = useState<any[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [weatherMap, setWeatherMap] = useState<Record<string, any>>({});
  const [isDictating, setIsDictating] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userIdNumber, setUserIdNumber] = useState('');
  const [hasSeenPlan, setHasSeenPlan] = useState(false);
  const [selectedRescuePlan, setSelectedRescuePlan] = useState<string | null>(null);
  const [lastSearchId, setLastSearchId] = useState<number>(0);
  const [isReplayingTutorial, setIsReplayingTutorial] = useState(false);
  const [travelProfile, setTravelProfile] = useState<'budget' | 'balanced' | 'fast' | 'premium'>('budget');
  const [pendingVIPRedirect, setPendingVIPRedirect] = useState(false);
  const [chatOrigin, setChatOrigin] = useState<'global' | 'vip' | null>(null);
  const [pendingVIPScroll, setPendingVIPScroll] = useState(false);
  const [showVIPAlternatives, setShowVIPAlternatives] = useState(false);
  const [vaultPin, setVaultPin] = useState(''); // Private vault PIN
  const [showSignature, setShowSignature] = useState(false);
  const [currentClaimForSig, setCurrentClaimForSig] = useState<any>(null);

  // Limpieza inicial para Beta (si no hay ahorros guardados, forzar 0)
  const [savedTime, setSavedTime] = useState(0);
  const [recoveredMoney, setRecoveredMoney] = useState(0);
  const [showPrivateVault, setShowPrivateVault] = useState(false);

  // FUNCIÓN PARA MOVER DOCUMENTOS A LA BÓVEDA PRIVADA (ALTERNATIVA 3)
  const moveExtraDocToVault = (id: string) => {
    setExtraDocs((prev: any[]) => prev.map(doc => 
      doc.id === id ? { ...doc, source: 'DOCS' } : doc
    ));
    Vibration.vibrate(10);
    console.log(`🔒 [AppContext] Document ${id} moved to Private Vault.`);
  };

  const unvaultExtraDoc = (id: string) => {
    setExtraDocs((prev: any[]) => prev.map(doc => 
      doc.id === id ? { ...doc, source: undefined } : doc
    ));
    Vibration.vibrate(10);
    console.log(`🔓 [AppContext] Document ${id} returned to public area.`);
  };

  // EFECTOS INICIALES / WAKE UP BACKEND
  useEffect(() => {
    wakeUpBackend();
    // Retry every 5 minutes while the app is open to prevent Render from sleeping
    const interval = setInterval(wakeUpBackend, 300000);
    return () => clearInterval(interval);
  }, []);

  const wakeUpBackend = async () => {
    try {
      console.log('📡 [AppContext] Waking up cloud server...');
      // Ensure audio has permissions to sound even in silent mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      // Light pings to different endpoints to ensure instance wakes up
      fetch(`${BACKEND_URL}/api/logs`, { headers: { 'ngrok-skip-browser-warning': 'true' } }).catch(() => { });

      // Pre-Warm TTS (Text-to-Speech) engine to avoid 2s delay on first crisis
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Speech.speak(' ', { volume: 0, rate: 2.0 });
      }
      fetch(`${BACKEND_URL}/api/weather?location=Madrid`, { headers: { 'ngrok-skip-browser-warning': 'true' } }).catch(() => { });
    } catch (e) { }
  };

  const masterReset = async () => {
    try {
      // 1. Limpiar Estados de React
      setMyFlights([]);
      setMyTrips([]);
      setClaims([
        { id: 'C-VLG8321', airline: 'Vueling', flight: 'VY8321', route: 'BCN > ORY', status: 'UNDER LEGAL REVIEW', compensation: '250' },
        { id: 'C-RYR992', airline: 'Ryanair', flight: 'FR992', route: 'MAD > STN', status: 'SUBMITTED TO AIRLINE', compensation: '400' }
      ]);
      setExtraDocs(demoItems);
      setSavedTime(0);
      setRecoveredMoney(0);
      setFlightData(null);
      setFlightInput('');
      setMessages([{ id: '1', text: 'FLIGHT-PILOT RESET. Beta Mode activated. How can I help you?', isUser: false }]);
      setTravelProfile('budget');
      setUserPhone('');
      setUserFullName('');
      setUserIdNumber('');
      setDismissedClaims([]);
      setHasSeenPlan(false);
      setSelectedRescuePlan(null);

      // 2. Clear AsyncStorage (Nuclear)
      const keys = [
        'lastFlightData', 'lastFlightInput', 'activeSearches',
        'offline_claims', 'offline_extraDocs', 'savedTime',
        'recoveredMoney', 'travelProfile', 'userPhone', 'userFullName', 'userIdNumber',
        'offline_dismissedClaims', 'hasSeenOnboarding', 'hasSeenPlan',
        'disclaimerOnboardingAccepted', 'vaultPin', 'selectedVoice'
      ];
      await AsyncStorage.multiRemove(keys);
      setVaultPin('');
      setSelectedVoice(null);

      Alert.alert("🔄 MASTER RESET", "Nuclear cleanup completed. The system is 100% pure for the next Beta test.");
    } catch (e) {
      console.error("Error en Master Reset:", e);
    }
  };

  // ✅ UNIFIED LOADING (AsyncStorage) — Solution to data loss (Flight/Vault)
  useEffect(() => {
    const loadAppState = async () => {
      try {
        const keys = [
          'lastFlightData', 'offline_extraDocs', 'savedTime',
          'recoveredMoney', 'travelProfile', 'vaultPin', 'userPhone', 'userFullName', 'userIdNumber',
          'activeSearches', 'offline_claims', 'offline_dismissedClaims',
          'chatOrigin', 'hasSeenOnboarding', 'selectedVoice'
        ];
        const results = await AsyncStorage.multiGet(keys);
        const stores = Object.fromEntries(results);

        if (stores.lastFlightData) {
          const cachedData = JSON.parse(stores.lastFlightData);
          setFlightData({ ...cachedData, isFromCache: true }); // Mark as cache
        }

        let finalDocs = [...demoItems];
        if (stores.offline_extraDocs) {
          try {
            const saved = JSON.parse(stores.offline_extraDocs);
            if (Array.isArray(saved) && saved.length > 0) {
              const savedIds = saved.map((d: any) => d.id);
              const uniqueDemos = demoItems.filter(d => !savedIds.includes(d.id));
              finalDocs = [...uniqueDemos, ...saved];
            }
          } catch (e) { }
        }
        setExtraDocs(finalDocs);

        if (stores.travelProfile) setTravelProfile(stores.travelProfile as any);
        if (stores.savedTime) setSavedTime(parseFloat(stores.savedTime));
        if (stores.recoveredMoney) setRecoveredMoney(parseFloat(stores.recoveredMoney));
        if (stores.vaultPin) setVaultPin(stores.vaultPin);
        if (stores.userPhone) setUserPhone(stores.userPhone);
        if (stores.userFullName) setUserFullName(stores.userFullName);
        if (stores.userIdNumber) setUserIdNumber(stores.userIdNumber);
        if (stores.activeSearches) setActiveSearches(JSON.parse(stores.activeSearches));
        if (stores.offline_claims) {
          const sc = JSON.parse(stores.offline_claims);
          if (Array.isArray(sc)) setClaims(sc);
        }
        if (stores.offline_dismissedClaims) setDismissedClaims(JSON.parse(stores.offline_dismissedClaims));
        if (stores.chatOrigin) setChatOrigin(stores.chatOrigin as any);
        if (stores.selectedVoice) setSelectedVoice(stores.selectedVoice);

        if (stores.hasSeenOnboarding === 'true') {
          setHasSeenOnboarding(true);
        } else {
          setHasSeenOnboarding(false);
        }

      } catch (err) {
        console.error("Error carga:", err);
      } finally {
        setIsStorageReady(true);
      }
    };
    loadAppState();
  }, []);


  // Save savings when they change
  useEffect(() => {
    AsyncStorage.setItem('savedTime', savedTime.toString());
    AsyncStorage.setItem('recoveredMoney', recoveredMoney.toString());
  }, [savedTime, recoveredMoney]);

  // STATE OF PLANS AND RECOVERED CRISIS
  const [planes, setPlanes] = useState<any[]>([
    { id: '1', destination: 'PARIS', status: 'OK', hour: 0, img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500', co: '48.85 N, 2.35 E' },
    { id: '2', destination: 'TOKYO', status: 'OK', hour: 8, img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500', co: '35.67 N, 139.65 E' }
  ]);

  const [dismissedClaims, setDismissedClaims] = useState<string[]>([]);

  // ✅ FLIGHT PERSISTENCE IN ASYNCSTORAGE
  const [isStorageReady, setIsStorageReady] = useState(false);

  // La carga ahora se realiza de forma unificada arriba para evitar colisiones.


  // Save flight code when it changes (only if loaded)
  useEffect(() => {
    if (isStorageReady) {
      if (flightInput !== '') {
        AsyncStorage.setItem('lastFlightInput', flightInput);
      } else {
        AsyncStorage.removeItem('lastFlightInput');
      }
    }
  }, [flightInput, isStorageReady]);

  // Save flight data when they change (only if already loaded)
  useEffect(() => {
    if (isStorageReady) {
      if (flightData) {
        AsyncStorage.setItem('lastFlightData', JSON.stringify(flightData));
      } else {
        AsyncStorage.removeItem('lastFlightData');
      }
    }
  }, [flightData, isStorageReady]);

  // Save active searches
  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('activeSearches', JSON.stringify(activeSearches));
    }
  }, [activeSearches, isStorageReady]);

  // Save rest of data on change
  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('offline_claims', JSON.stringify(claims));
    }
  }, [claims, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('savedTime', savedTime.toString());
    }
  }, [savedTime, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('recoveredMoney', recoveredMoney.toString());
    }
  }, [recoveredMoney, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('offline_dismissedClaims', JSON.stringify(dismissedClaims));
    }
  }, [dismissedClaims, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('offline_extraDocs', JSON.stringify(extraDocs));
    }
  }, [extraDocs, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('userPhone', userPhone);
    }
  }, [userPhone, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      AsyncStorage.setItem('travelProfile', travelProfile);
    }
  }, [travelProfile, isStorageReady]);

  useEffect(() => {
    if (isStorageReady) {
      if (chatOrigin) {
        AsyncStorage.setItem('chatOrigin', chatOrigin);
      } else {
        AsyncStorage.removeItem('chatOrigin');
      }
    }
  }, [chatOrigin, isStorageReady]);

  // VAULT PIN PERSISTENCE
  useEffect(() => {
    if (isStorageReady && vaultPin !== '') {
      AsyncStorage.setItem('vaultPin', vaultPin);
    }
  }, [vaultPin, isStorageReady]);

  // PERSISTENCIA DE LA VOZ SELECCIONADA
  useEffect(() => {
    if (isStorageReady) {
      if (selectedVoice) {
        AsyncStorage.setItem('selectedVoice', selectedVoice);
      } else {
        AsyncStorage.removeItem('selectedVoice');
      }
    }
  }, [selectedVoice, isStorageReady]);

  // ============================================================
  // PROACTIVE MONITORING (POSTPONED TO PRODUCTION)
  // ============================================================
  // NOTE: Polling every 5 min quickly consumes 100 calls/month from AviationStack.
  // Currently disabled at user request.
  // For the final version (Android/iOS), AeroDataBox Push Webhooks will be used.
  const lastKnownDelay = useRef<number>(0);

  useEffect(() => {
    if (!flightData?.flightNumber) {
      lastKnownDelay.current = 0;
      return;
    }

    lastKnownDelay.current = flightData.departure?.delay || 0;

    // Polling interval was here. Removed to avoid quota consumption.

  }, [flightData?.flightNumber, flightData?.departure?.delay]);

  // EFECTOS INICIALES
  useEffect(() => {
    // Inicializar Audio globalmente para saltarse el modo silencioso de iOS
    try {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn("Error config audio global", e);
    }

    const timer = setInterval(() => setTicks(t => t + 1), 100);
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    const initVoices = async () => {
      let voices: any[] = [];
      try {
        voices = await Speech.getAvailableVoicesAsync();
      } catch (e) {
        console.warn('Error fetching native voices', e);
      }

      // Look for English voices (including US, GB, AU variants, etc.)
      let enVoices = voices.filter(v => v.language && v.language.startsWith('en'));

      const internalFallback = [
        { identifier: 'en-us-x-sfg-network', name: 'en-us-x-sfg-network', language: 'en-US', quality: 'Enhanced' },
        { identifier: 'en-gb-x-fis-network', name: 'en-gb-x-fis-network', language: 'en-GB', quality: 'Enhanced' },
        { identifier: 'en-us-x-iol-network', name: 'en-us-x-iol-network', language: 'en-US', quality: 'Enhanced' },
        { identifier: 'en-au-x-aub-network', name: 'en-au-x-aub-network', language: 'en-AU', quality: 'Enhanced' }
      ];

      if (!enVoices || enVoices.length === 0) {
        console.log("No native english voices found, using internal emergency pool...");
        enVoices = internalFallback;
      }

      // Ordenar para priorizar voces de Alta Definición (Evitar el efecto "Radio de la IA")
      enVoices.sort((a, b) => {
        const idA = (a.identifier || '').toLowerCase();
        const idB = (b.identifier || '').toLowerCase();
        let scoreA = 0; let scoreB = 0;

        // Premiar voces HD/Network
        if (idA.includes('network') || a.quality === 'Enhanced') scoreA += 10;
        if (idB.includes('network') || b.quality === 'Enhanced') scoreB += 10;

        // Penalize robotic/highly compressed local voices
        if (idA.includes('local') || idA.includes('compact')) scoreA -= 5;
        if (idB.includes('local') || idB.includes('compact')) scoreB -= 5;

        return scoreB - scoreA;
      });

      // Dynamic mapping and translation of native identifiers (iOS/Android)
      const categorizedVoices = enVoices.map(v => {
        let gender = 'unknown';
        const id = ((v.identifier || '') + ' ' + (v.name || '')).toLowerCase();

        // Absolute classification based on hardware and user feedback
        // Female: a, c, e / Male: b, d, f (Common pattern in Android/Google)
        if (id.includes('monica') || id.includes('clara') || id.includes('paulina') || id.includes('luciana') || id.includes('helena') ||
          id.includes('-esa') || id.includes('-esc') || id.includes('-ese') || id.includes('female') || id.includes('mujer') ||
          id.includes('-eea') || id.includes('-eec') || id.includes('-eee')) {
          gender = 'female';
        } else if (id.includes('juan') || id.includes('carlos') || id.includes('jorge') || id.includes('diego') ||
          id.includes('manuel') || id.includes('pablo') || id.includes('-esd') || id.includes('-esf') || id.includes('male') || id.includes('hombre') ||
          id.includes('-eeb') || id.includes('-eed') || id.includes('-eef')) {
          gender = 'male';
        }
        return { ...v, gender };
      });

      const males = categorizedVoices.filter(v => v.gender === 'male');
      const females = categorizedVoices.filter(v => v.gender === 'female');
      const unknowns = categorizedVoices.filter(v => v.gender === 'unknown');

      // If OS doesn't have enough of one gender, borrow from the other
      const fPool = females.length > 0 ? females : (males.length > 0 ? males : unknowns);
      const mPool = males.length > 0 ? males : (females.length > 0 ? females : unknowns);

      // Separate by accent for Premium assignment (US English: en-US)
      const enUsFemales = fPool.filter((v: any) => v.language === 'en-US' || (v.identifier || '').toLowerCase().includes('en-us'));
      const otherFemales = fPool.filter((v: any) => v.language !== 'en-US' && !(v.identifier || '').toLowerCase().includes('en-us'));

      const enUsMales = mPool.filter((v: any) => v.language === 'en-US' || (v.identifier || '').toLowerCase().includes('en-us'));
      const otherMales = mPool.filter((v: any) => v.language !== 'en-US' && !(v.identifier || '').toLowerCase().includes('en-us'));

      // Premium usa inglés americano prioritariamente
      const premiumFemalePool = enUsFemales.length > 0 ? enUsFemales : fPool;
      const premiumMalePool = enUsMales.length > 0 ? enUsMales : mPool;

      // Gratuitos usan variantes de otras regiones (Latam, etc.) para aportar variedad, o repiten si no hay
      const freeFemalePool = otherFemales.length > 0 ? otherFemales : fPool;
      const freeMalePool = otherMales.length > 0 ? otherMales : mPool;

      // Forced and shielded instantiation of the 4 roles (New names)
      const lucyV = { ...(freeFemalePool[0] || fPool[0] || enVoices[0]), humanName: 'Lucy', isPremium: false };
      const jamesV = { ...(freeMalePool[0] || mPool[0] || enVoices[0]), humanName: 'James', isPremium: false };

      // Premium (Acento en-US garantizado si existe en el OS)
      // If the free voice took the same one (e.g. only 1 female voice), we force index 1 of fPool if it exists
      const fPremVoice = premiumFemalePool[0]?.identifier === lucyV.identifier && premiumFemalePool.length > 1 ? premiumFemalePool[1] : (premiumFemalePool[0] || fPool[0]);
      const claireV = { ...(fPremVoice || enVoices[0]), humanName: 'Claire', isPremium: true };

      const mPremVoice = premiumMalePool[0]?.identifier === jamesV.identifier && premiumMalePool.length > 1 ? premiumMalePool[1] : (premiumMalePool[0] || mPool[0]);
      const markV = { ...(mPremVoice || enVoices[0]), humanName: 'Mark', isPremium: true };

      const roles = [lucyV, jamesV, claireV, markV];

      // Insertamos uniqueId para evitar quejas de React si usamos la misma voz 2 veces
      const visibleRoles = roles.map((r, i) => ({ ...r, uniqueId: (r.identifier || 'v') + '_' + i }));

      setAvailableVoices(visibleRoles);

      if (visibleRoles.length > 0 && !selectedVoice) {
        // James por defecto si existe, si no, Lucy
        const defaultVoiceId = jamesV.identifier || visibleRoles[0].identifier;
        setSelectedVoice(defaultVoiceId);
      }
    };

    initVoices();
    const retry = setTimeout(initVoices, 3500);

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('tactical', {
        name: 'Tactical Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 1000], // Tactical pattern: double fast + one long
        lightColor: '#FF3B30',
      });
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    return () => {
      clearInterval(timer);
      clearTimeout(retry);
    };
  }, []);

  // REAL-TIME ASSISTANT BROWSER LOGS SIMULATION (SSE ENGINE)
  useEffect(() => {
    let xhr: XMLHttpRequest | null = null;

    if (showBrowser && selectedPlan) {
      setBrowserLogs([]);

      const destCity = flightData?.arrival?.airport || "tu destino";
      const pType = selectedPlan?.type || "General";

      const hotelMatch = selectedPlan?.title?.match(/en\s([A-Za-z\s]+)/i);
      const hName = hotelMatch ? hotelMatch[1] : "Alojamiento Óptimo";

      const fId = flightData?.flightNumber || "";
      const depCity = flightData?.departure?.iata || flightData?.departure?.airport || "";
      const arrCity = flightData?.arrival?.iata || flightData?.arrival?.airport || "";
      const url = `${BACKEND_URL}/api/executePlan?flightId=${encodeURIComponent(fId)}&planType=${encodeURIComponent(pType)}&destination=${encodeURIComponent(destCity)}&hotelName=${encodeURIComponent(hName)}&depCity=${encodeURIComponent(depCity)}&arrCity=${encodeURIComponent(arrCity)}`;

      xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.timeout = 25000; // Aumentado a 25s para dar tiempo a Render a arrancar
      xhr.setRequestHeader('Accept', 'text/event-stream');
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');

      // Logs iniciales de sistema para dar feedback inmediato
      setBrowserLogs([
        '🚀 [System] Initializing Cloud Execution Engine...',
        '🔒 Establishing AES-256 security tunnel...',
        '📡 Contacting FlightPilot global network...'
      ]);

      const demoTimer = setTimeout(() => {
        if (browserLogs.length <= 3) {
          setBrowserLogs(prev => [
            ...prev,
            '⏳ Server is waking up (this may take a few seconds)...',
            '🤖 Preparing real-time search agents...',
          ]);
        }
      }, 5000);

      let seenBytes = 0;
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          clearTimeout(demoTimer);

          if (!xhr) return;
          const newData = xhr.responseText.substring(seenBytes);
          seenBytes = xhr.responseText.length;

          if (newData.trim().length > 0) {
            const lines = newData.split('\n');
            for (let line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const payload = line.substring(6).trim();
                  if (payload.startsWith('{')) {
                    const parsed = JSON.parse(payload);
                    if (parsed.log) {
                      setBrowserLogs(prev => [...prev, parsed.log]);
                    }
                    if (parsed.done && xhr) {
                      xhr.abort();
                    }
                  }
                } catch (e) {
                  // Ignorar errores de parseo parcial de chunks
                }
              }
            }
          }
        }
      };

      xhr.ontimeout = () => {
        setBrowserLogs(prev => [...prev, '⚠️ [Timeout] Server is taking too long to respond. Use "Share" for immediate manual management if you are in a hurry.']);
      };

      xhr.onerror = () => {
        setBrowserLogs(prev => [...prev, '❌ [Error] Service temporarily unavailable. Elite Protocol suggested: Use the SHARE option.']);
      };

      xhr.send();

    } else if (!showBrowser && !isExtracting) {
      setBrowserLogs([]);
    }

    return () => {
      if (xhr) {
        xhr.abort();
        xhr = null;
      }
    };
  }, [showBrowser, selectedPlan, flightData]);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (firebaseUser) => {
      // If user changes or logs out, ATOMIC AND DISK CLEANUP
      if (!firebaseUser || (user && firebaseUser.uid !== user.uid)) {
        setMyFlights([]);
        setClaims([
          {
            id: 'C-VLG8321',
            airline: 'Vueling',
            flight: 'VY8321',
            route: 'BCN > ORY',
            status: 'UNDER LEGAL REVIEW',
            compensation: '250',
          },
          {
            id: 'C-RYR992',
            airline: 'Ryanair',
            flight: 'FR992',
            route: 'MAD > STN',
            status: 'SUBMITTED TO AIRLINE',
            compensation: '400',
          }
        ]);
        setExtraDocs(demoItems);
        setAgentLogs([]);
        const firstName = (user?.displayName || user?.email || 'Traveler').trim().split(/[.\s_-]+/)[0];
        setMessages([{ id: '1', text: `PROTOCOLS ACTIVATED. Hello ${firstName}, I am your FlightPilot assistant. My radar is active to protect your journey. Do you need anything?`, isUser: false }]);
        setApiPlan(null);
        setFlightData(null);
        setFlightInput('');
        setMyTrips([]);
        setUserPhone('');
        setHasSeenOnboarding(false); // Reset so next user sees Onboarding
        setTravelProfile('budget');
        setSavedTime(0);
        setRecoveredMoney(0);
        setSelectedRescuePlan(null);

        // Format phone memory for this device
        await AsyncStorage.multiRemove([
          'lastFlightData', 'lastFlightInput', 'activeSearches',
          'offline_claims', 'offline_myFlights', 'offline_myTrips',
          'offline_extraDocs', 'userPhone', 'hasSeenOnboarding',
          'travelProfile', 'savedTime', 'recoveredMoney', 'hasSeenPlan',
          'disclaimerOnboardingAccepted'
        ]);
        console.log("🛡️ [Privacidad] Memoria local formateada al 100% para nueva cuenta.");
      }

      if (firebaseUser?.email) {
        loadMyFlights(firebaseUser.email);
        loadMyTrips(firebaseUser.email);
        registerForPushNotificationsAsync(firebaseUser.email);

      }
      setUser(firebaseUser);
    });

    return () => {
      sub();
    };
  }, []);

  const recordingRef = useRef<Audio.Recording | null>(null);

  const startDictation = async () => {
    try {
      console.log("[Audio] Iniciando flujo de grabación...");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('PERMISSION NOTICE', 'To speak with the voice assistant, FlightPilot needs permission to access your microphone. Please accept it in the settings if the menu does not appear.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Limpiar grabación anterior si existe
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) { }
        recordingRef.current = null;
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsDictating(true);
      Vibration.vibrate(50);
      console.log("[Audio] Grabación en curso...");
    } catch (e: any) {
      console.error('[Voice Start Error]:', e);
      setIsDictating(false);
      Alert.alert('HARDWARE ERROR', 'Microphone could not be activated.');
    }
  };

  const stopDictation = async () => {
    try {
      if (!recordingRef.current) {
        setIsDictating(false);
        return;
      }

      console.log("[Audio] Deteniendo grabación...");
      setIsDictating(false);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        setIsTyping(true);
        console.log("[Audio] Analizando voz...");
        const formData = new FormData();
        // @ts-ignore
        formData.append('audio', {
          uri,
          name: 'audio.m4a',
          type: 'audio/mp4'
        });

        try {
          const res = await fetch(`${BACKEND_URL}/api/transcribe`, {
            method: 'POST',
            body: formData,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'multipart/form-data',
            },
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          if (data.text && data.text.trim().length > 0) {
            setInputText(data.text);
            Vibration.vibrate(50);
          } else {
            console.warn("[Audio] Respuesta vacía del servidor.");
            Alert.alert('ASSISTANT', "I couldn't understand your words. Can you repeat it a bit clearer?");
          }
        } catch (e: any) {
          console.error("[Audio] Error en transcripción:", e);
          Alert.alert('CONEXIÓN', 'No he podido procesar el audio. Revisa tu conexión a internet.');
        }
      }
    } catch (e: any) {
      console.error('[Voice Stop Error]:', e);
    } finally {
      setIsTyping(false);
      setIsDictating(false);
    }
  };

  const registerForPushNotificationsAsync = async (email: string) => {
    if (!Device.isDevice) return;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Constants.appOwnership === 'expo') {
      console.log("Expo Go detectado: Saltando token remoto (Las notificaciones locales seguirán funcionando)");
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || '71acd23d-946c-4b17-8637-2e7eae12016f';
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })).data;
      setExpoPushToken(token);

      await fetch(`${BACKEND_URL}/api/registerPushToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          deviceName: `${Device.brand} ${Device.modelName}`
        })
      }).catch(e => console.log('Silencioso: error red token push'));
    } catch (e) {
      // SILENCIADO INTENCIONALMENTE: En Expo Go o sin configuración EAS, esto suele fallar y asusta al usuario.
      console.log("Silencioso: No se pudo obtener el token push remoto, pero las locales funcionarán.");
    }
  };

  const simulatePushNotification = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'You must allow notifications to test this function.');
        return;
      }
    } catch (e) {
      console.log('Error requesting fast permissions', e);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: (flightData?.departure?.delay || 0) >= 180 ? "🚨 CRISIS: Critical Delay" : "⚠️ NOTICE: Flight Incident",
        body: (flightData?.departure?.delay || 0) >= 180
          ? `Your flight has a +3h delay. I have prepared your rescue. Tap to solve it.`
          : `Delay of ${(flightData?.departure?.delay || 0)} min detected. I have prepared your assistance plan. Tap to view it.`,
        sound: true,
        vibrate: [0, 500, 200, 500],
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: 'tactical'
      },
    });

    // Force vibration at hardware level (In case OS blocks notification vibration)
    setTimeout(() => {
      Vibration.vibrate([0, 500, 200, 500]);
    }, 5000);

    Alert.alert(
      "Simulation Started",
      "1. Close this window.\n2. Immediately go to your phone's home menu (without closing the app entirely).\n3. Wait 5 seconds."
    );
    console.log("[Push] Local notification scheduled in 5 seconds");
  };

  useEffect(() => {
    if (!user) return;
    if (planes.some((p: any) => p.status === 'CRITICAL')) setCompensationEligible(true);
    if (tab === 'radar') {
      prefetchPlan();
    }
  }, [user, planes, tab]);

  // LOCAL NETWORK AND AUTH FUNCTIONS
  const handleRegister = async () => {
    if (!authEmail) return Alert.alert('Registration', 'Please enter your email.');
    if (!authPassword) return Alert.alert('Registration', 'Please create a password.');
    if (authPassword.length < 6) return Alert.alert('Security', 'Password must be at least 6 characters.');
    if (!authName) return Alert.alert('Registration', 'Please enter your full name.');
    if (authMode === 'register' && !userPhone) return Alert.alert('Registration', 'SOS phone is mandatory to notify you of critical delays.');

    try {
      setAuthLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      await updateProfile(cred.user, { displayName: authName });

      // FORCE ONBOARDING FOR NEW USER
      await AsyncStorage.removeItem('hasSeenOnboarding');
      setHasSeenOnboarding(false);

      // VERIFICATION SEND (Security)
      await sendEmailVerification(cred.user);

      // BACKEND PERSISTENCE (Supabase)
      await fetch(`${BACKEND_URL}/api/registerUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail,
          name: authName,
          phone: userPhone
        })
      });

      Alert.alert('Registration', 'Welcome! We have sent a confirmation link to your email. Please verify it to activate your Legal Shield.');
    }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setAuthLoading(false); }
  };

  const handleLogin = async () => {
    if (!authEmail || !authPassword) return Alert.alert('Login', 'Enter email and password.');
    try {
      setAuthLoading(true);
      await signInWithEmailAndPassword(auth, authEmail, authPassword);

      // IF LOGGED IN, ONBOARDING NO LONGER NEEDED (Ensure persistence)
      setHasSeenOnboarding(true);
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    try {
      // Clean local persistent cache
      const keys = ['lastFlightData', 'lastFlightInput', 'activeSearches'];
      await AsyncStorage.multiRemove(keys);

      // Clean app memory
      setFlightData(null);
      setActiveSearches([]);

      await signOut(auth);
    } catch (e) {
      console.error("Error logging out:", e);
    }
  };

  const playVipAudio = async (voiceName: string) => {
    try {
      let soundAsset = null;
      if (voiceName === 'Clara') soundAsset = require('../../assets/audio/clara_intro.mp3');
      if (voiceName === 'Marco') soundAsset = require('../../assets/audio/marco_intro.mp3');

      if (soundAsset) {
        const { sound } = await Audio.Sound.createAsync(soundAsset);
        await sound.playAsync();
        // Auto cleanup after playing
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) sound.unloadAsync();
        });
        return true;
      }
    } catch (e) {
      console.warn("[VIP-AUDIO] Error reproduciendo audio real:", e);
    }
    return false;
  };

  const speak = async (text: string, overrideVoiceId?: string) => {
    try {
      const isSpeakingNow = await Speech.isSpeakingAsync();
      if (isSpeakingNow) {
        await Speech.stop();
        // Increase to 300ms to ensure Android clears the buffer
        if (Platform.OS === 'android') await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) { }

    setIsSpeaking(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    const voiceId = overrideVoiceId || selectedVoice;
    const voiceObj = availableVoices.find(v => v.identifier === voiceId);
    const isVoiceAvailable = !!voiceObj;

    // VIP LOGIC: If we are saying the intro phrase and it's a VIP voice
    if (text.includes("I am Clara") || text.includes("I am your assistant") || text.includes("Marco here")) {
      if (voiceObj?.humanName === 'Clara' || voiceObj?.humanName === 'Marco') {
        const success = await playVipAudio(voiceObj.humanName);
        if (success) {
          // If real audio worked, we don't need the bot to speak
          setTimeout(() => {
            setIsSpeaking(false);
            waveAnim.stopAnimation();
          }, 4000); // Estimated duration of short phrase
          return;
        }
      }
    }

    Speech.speak(text, {
      language: 'es-ES',
      voice: isVoiceAvailable ? voiceId! : undefined,
      pitch: 1.0,
      rate: 0.95, // Slightly slower for better understanding in noisy environments
      volume: 1.0,
      onDone: () => onSpeechDone(),
      onError: (e) => {
        console.warn("[Speech] Error detected, retrying with native voice...", e);
        onSpeechDone();
      }
    });
  };

  const onSpeechDone = () => {
    setIsSpeaking(false);
    waveAnim.stopAnimation();
  };

  const stopSpeak = () => { Speech.stop(); onSpeechDone(); };

  const clearMessages = () => {
    setMessages([{ id: '1', text: "Hello, I am listening. How can I help you?", isUser: false }]);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '--:--';
    try { const d = new Date(iso); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); } catch { return '--:--'; }
  };

  const getStatusColor = (status: string) => {
    if (status === 'active' || status === 'scheduled') return '#4CD964';
    if (status === 'landed') return '#4CD964';
    if (status === 'cancelled') return '#FF3B30';
    return '#FF9500';
  };

  const getStatusLabel = (status: string, delay: number) => {
    if (delay > 0) return `DELAYED +${delay} MIN`;
    if (status === 'active') return 'IN FLIGHT';
    if (status === 'scheduled') return 'SCHEDULED';
    return status?.toUpperCase() || 'UNKNOWN';
  };

  const prefetchPlan = async () => {
    if (prefetchedData || isPrefetching) return;
    setIsPrefetching(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/monitorFlight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ flightId: flightInput.trim() || 'TP404' })
      });
      const data = await response.json();
      if (data.contingencyPlan) {
        // DYNAMIC CLEANUP + FORCED EXECUTIVE FILTER
        const cleanOptions = (data.contingencyPlan.options || []).map((o: any) => {
          let title = (o.title || '').replace(/\+\d+€/g, '').replace(/\d+€/g, '').replace(/€/g, '').trim();
          let desc = (o.description || '').replace(/\d+€/g, '').replace(/€/g, '').trim();

          if (travelProfile === 'premium') {
            if (o.type === 'FAST') { title = 'JET PROTOCOL / MAXIMUM PRIORITY'; desc = 'Immediate relocation on preferred fleets to meet your schedule.'; }
            if (o.type === 'ECONOMIC') { title = 'ELITE CLAIM (ZERO MANAGEMENT)'; desc = 'Recovery of your legal funds managed by our legal department.'; }
            if (o.type === 'CONFORT') { title = 'GUARANTEED LUXURY STAY'; desc = 'Access to the best hotels in the area and private transfer shuttles.'; }
          }

          return { ...o, title, description: desc, estimatedCost: 0 };
        });
        setPrefetchedData({ ...data.contingencyPlan, options: cleanOptions });
      }
    } catch (e) { } finally { setIsPrefetching(false); }
  };

  const searchFlight = async (manualCode?: string | any) => {
    // Si manualCode es un evento (de un onPress), lo ignoramos y usamos flightInput
    const code = (typeof manualCode === 'string') ? manualCode.trim() : flightInput.trim();
    if (!code) return;

    // FREE LIMIT: Only 1 simultaneous flight for non-VIP users
    const isNewFlight = !activeSearches.find(f => f.flightNumber === code.toUpperCase());
    if (travelProfile !== 'premium' && activeSearches.length >= 1 && isNewFlight) {
      Alert.alert(
        'LIMIT REACHED',
        'With the free plan you can only monitor 1 flight at a time. Upgrade to VIP to monitor unlimited flights simultaneously.',
        [
          { text: 'CANCEL', style: 'cancel' },
          { text: 'VIEW VIP', onPress: () => setPendingVIPRedirect(true) }
        ]
      );
      return;
    }

    // 1) CLEAR EVERYTHING from previous circuit to avoid conflicts
    stopSpeak();
    setShowSOS(false);
    setSearchError(null);
    setIsSearching(true);
    wakeUpBackend(); // Proactive ping to wake up the cloud
    try {

      setTimeout(() => setBrowserLogs(prev => [...prev, `🔍 Scanning databases for '${code.toUpperCase()}'...`]), 2200);
      setTimeout(() => setBrowserLogs(prev => [...prev, '📡 Establishing link with Inmarsat satellites...']), 3200);
      setTimeout(() => setBrowserLogs(prev => [...prev, '⏳ AI Specialist analyzing arrival vectors...']), 4500);

      const response = await fetch(`${BACKEND_URL}/api/flightInfo?flight=${code}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        const err = await response.json();
        setBrowserLogs(prev => [...prev, `❌ CRITICAL ERROR: Flight ${code.toUpperCase()} has not been located in the network.`]);
        setSearchError(err.error || 'Flight not found');
        return;
      }

      const data = await response.json();
      setBrowserLogs(prev => {
        const baseLogs = [
          ...prev,
          `✅ LINK ESTABLISHED. Data received from the fleet of ${data.airline || 'the operator'}.`,
          `📊 CURRENT STATUS: ${data.status === 'cancelled' ? '🚨 CANCELLED' : '⚠️ DELAYED'}.`,
          `🧠 RESCUE MODE: Starting calculation of VIP alternatives for the leg ${data.departure?.iata} > ${data.arrival?.iata}...`
        ];

        const effectiveDelay = data.departure?.delay || data.delayMinutes || 0;
        if (effectiveDelay >= 180 || data.status === 'cancelled') {
          baseLogs.push(`📑 Generating legal file for EU261 claim of up to ${getEU261Amount(data)}€...`);
        } else {
          baseLogs.push(`👨‍⚖️ Current delay less than 3 hours. Monitoring basic assistance rights (food/drink)...`);
        }

        return baseLogs;
      });

      setFlightData(data);

      // SAVINGS INCREMENT: Searching a flight saves at least 15 mins (0.25h) of bureaucracy
      setSavedTime(prev => prev + 0.25);

      // 3) AÑADIR A BÚSQUEDAS ACTIVAS
      setActiveSearches(prev => {
        const exists = prev.find(f => f.flightNumber === data.flightNumber);
        if (exists) return [data, ...prev.filter(f => f.flightNumber !== data.flightNumber)];
        return [data, ...prev];
      });

      // 4) GENERATE LEGAL FILE (silent, no voice here)
      const effectiveDelay = data.departure?.delay || data.delayMinutes || 0;
      if (effectiveDelay >= 180 || data.status === 'cancelled') {
        setCompensationEligible(true);
        setClaims(prevBase => {
          const prev = prevBase.filter(c => c.flight !== data.flightNumber);
          const newClaim = {
            id: `C-${data.flightNumber}-${Date.now()}`,
            airline: data.airline || 'Airline',
            flight: data.flightNumber,
            route: `${data.departure?.iata} > ${data.arrival?.iata}`,
            status: 'LEGAL FILE PREPARED',
            delayActual: effectiveDelay,
            compensation: getEU261Amount(data) === 'US_DOMESTIC' ? 'US DOT RIGHTS' : 
                         getEU261Amount(data) === 'LATAM_DOMESTIC' ? 'LATAM / MONTREAL RIGHTS' : 
                         `${getEU261Amount(data)}€`,
            isDynamic: true,
            // Passenger data extracted from API and profile
            passengerName: user?.displayName || null,
            passengerDNI: null, // Filled manually if user provides it
            dateTime: data.departure?.scheduledTime
              ? new Date(data.departure.scheduledTime).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : (data.departure?.scheduled || null),
            pnr: data.bookingRef || data.pnr || null,
            airlineAddress: `${data.airline || 'Airline'} · Passenger Service Dept.`,
          };
          // SAVINGS INCREMENT: Generating a claim recovers real money
          const amount = getEU261Amount(data);
          if (amount !== 'US_DOMESTIC' && amount !== 'LATAM_DOMESTIC') {
            setRecoveredMoney(prev => prev + parseFloat(amount.replace('€', '')));
          }
          setSavedTime(prev => prev + 1); // Generating the claim saves 1h of paperwork
          return [newClaim, ...prev];
        });
      }

      // 5) UNA SOLA VOZ — el resumen completo de la situación adaptado al perfil
      const delay = data.departure?.delay || data.delayMinutes || 0;
      let finalSpeech = ''

      // ══════════════════════════════════════════════════════════════
      // WINDOW 1: DETECTION — Dialogues for the 9 demo scenarios
      // VIP = proactive ("I have prepared..."), Standard = informative ("You have the right to...")
      // ══════════════════════════════════════════════════════════════
      if (data.flightNumber === 'FLIGHT-OK') {
        finalSpeech = travelProfile === 'premium'
          ? 'Your flight is on time. Everything under control, I continue monitoring the network in real time in case of any changes.'
          : 'Your flight is on time. No incidents detected.';
      } else if (data.flightNumber === 'PRIVATE-JET') {
        finalSpeech = travelProfile === 'premium'
          ? 'Long duration delay detected. I have prepared your 600 euro legal claim and analyzed the best alternative routes. You have your file ready in your documents section.'
          : 'Extreme delay detected. You have the right to maximum compensation of 600 euros. Check the options on screen.';
      } else if (data.flightNumber === 'DIVERSION-VLC') {
        finalSpeech = travelProfile === 'premium'
          ? 'Flight diverted to Valencia. You are entitled to alternative transport. I am analyzing the best options to reach your destination.'
          : 'Flight diverted to Valencia. You are entitled to alternative transport to your final destination. Check the information on screen.';
      } else if (data.flightNumber === 'FLIGHT-HISTORY') {
        finalSpeech = travelProfile === 'premium'
          ? 'I have analyzed your past flight. You are entitled to compensation for the delay suffered. I have generated the legal file in your Vault.'
          : 'Past flight with incident detected. According to EU261 law, you can still claim if it was within the last 3 years. More info on screen.';
      } else if (data.flightNumber === 'DELAY-VIP') {
        finalSpeech = travelProfile === 'premium'
          ? 'Critical incident in your flight. I have prepared your VIP Lounge access and the 400 euro claim form. Everything managed in your documents section.'
          : 'Severe delay detected. You are entitled to 400 euros compensation and maintenance. Check details on screen.';
      } else if (data.flightNumber === 'DELAY-60') {
        finalSpeech = travelProfile === 'premium'
          ? 'Delay detected. I have prepared your VIP pass and maintenance in case the wait gets longer. I will notify you if the situation changes.'
          : 'Delay detected. If it exceeds 2 hours, request your food vouchers. I continue monitoring your flight.';
      } else if (data.status === 'cancelled') {
        // CANCELLED + any other real cancelled flight
        finalSpeech = travelProfile === 'premium'
          ? 'Flight cancelled. Don\'t worry, I have already blocked an alternative route and secured your refund. Check your VIP options.'
          : 'Flight cancelled. I have prepared your legal claim and refund. You have the details on screen.';
      } else if (delay > 180) {
        // DELAY-180, DELAY-400 + any real flight with severe delay
        finalSpeech = travelProfile === 'premium'
          ? 'Critical delay detected in your flight. I have activated your assistance and I am preparing your compensation file. Relax.'
          : 'Significant delay detected. You are entitled to compensation according to EU261 regulations. Check the options on screen.';
      } else if (delay > 60) {
        finalSpeech = travelProfile === 'premium'
          ? 'Delay detected. I have prepared your VIP pass and maintenance in case the wait gets longer. I will notify you.'
          : 'Delay detected. If it exceeds 2 hours, request your food vouchers. I continue monitoring your flight.';
      }

      if (data.status === 'active' && delay < 60) {
        finalSpeech = travelProfile === 'premium'
          ? `Your flight ${data.flightNumber} is currently in the air. Everything is progressing as planned and I continue monitoring your arrival at ${data.arrival?.iata || 'destination'}.`
          : `Flight ${data.flightNumber} is in progress and on time. Have a nice trip.`;
      } else if (data.status === 'scheduled' && delay < 60) {
        finalSpeech = travelProfile === 'premium'
          ? `I have verified your flight ${data.flightNumber}. It is scheduled and on time. My radar will remain active until you land.`
          : `Your flight is scheduled correctly and no delays detected.`;
      }

      if (!finalSpeech) {
        finalSpeech = 'I have detected a special situation in your flight. Open the chat with your assistant to analyze the details for you.'
      }
      if (finalSpeech) speak(finalSpeech, selectedVoice)

      // 6) LA VENTANA DE CRISIS LA ABRE GlobalOverlays automáticamente
      //    (already has the auto-trigger that resets with each new flight)

      setTimeout(() => {
        setBrowserLogs(prev => [...prev, `✅ Protocol finished. Contingency plan deployed.`]);
      }, 3000);

      setLastSearchId(prev => prev + 1);
    } catch (e) {
      setBrowserLogs(prev => [...prev, `❌ Critical failure in execution engine: Connection error.`]);
      setSearchError('Connection error with the server. Check the ngrok tunnel.');
      console.error(e);
    } finally { setIsSearching(false); }
  };

  const clearFlight = () => {
    setFlightInput('');
    setFlightData(null);
    setSearchError(null);
    setActiveSearches([]); // Opcionalmente podemos dejar que esto solo borre el input
    AsyncStorage.removeItem('lastFlightInput');
    AsyncStorage.removeItem('lastFlightData');
    AsyncStorage.removeItem('activeSearches');
  };

  const removeActiveSearch = (flightNumber: string) => {
    setActiveSearches(prev => {
      const updated = prev.filter(f => f.flightNumber !== flightNumber);
      // Si borramos el que está en flightData, actualizamos flightData al siguiente o null
      if (flightData?.flightNumber === flightNumber) {
        setFlightData(updated.length > 0 ? updated[0] : null);
      }
      return updated;
    });
  };

  const showPlan = () => {
    Vibration.vibrate(50);
    setHasSeenPlan(true);
    if (prefetchedData) { setApiPlan(prefetchedData); setShowSOS(true); }
    else { fetchContingencyPlan(); }
  };

  const fetchContingencyPlan = async () => {
    // Instant local plan: shown NOW, without waiting for the AI
    const allOptions: any[] = [
      { type: 'FAST', title: 'Urgent Alternative Route', description: 'Priority substitution direct flight managed to avoid waiting.' },
      { type: 'ECONOMIC', title: 'Smart Refund Management', description: 'Active EU261 legal procedure combined with the best available low-cost connection.' },
      { type: 'CONFORT', title: 'Stay and Rest Plan', description: 'Night in selected hotel and scheduled departure for tomorrow with total comfort.' }
    ];

    let finalOptions = allOptions;

    const instantPlan = {
      options: allOptions,
      impact: { hotelAlert: "I have secured your accommodation booking. No risk of cancellation." }
    };

    if (travelProfile !== 'premium') {
      const econOption = instantPlan.options.find(
        (o: any) => o.type === 'ECONOMIC'
      );
      const lockedCard = {
        type: 'VIP_LOCKED',
        title: '2 more options available in VIP',
        description: 'Unlock FAST and CONFORT options with personalized plans and priority management.',
        actionType: 'locked'
      };
      setApiPlan({ ...instantPlan, options: [econOption, lockedCard] });
    } else {
      // VIP MODE: Unique master resolution card (OPTION 3 selected by user)
      const masterVIPOption = {
        type: 'FAST',
        title: 'PREMIUM RESCUE PROTOCOL',
        description: 'Direct access to your personalized alternatives panel. Flights, VIP lounges and legal files ready for immediate execution.',
        aiReasoning: 'Comprehensive Protocol Activated: I have unified all solution routes in your personal command panel.',
        voiceScriptFinal: 'Rescue strategy generated. I have analyzed all alternatives and prepared your claim file. Everything is ready in your documents section.'
      };
      setApiPlan({ ...instantPlan, options: [masterVIPOption] });
    }
    setShowSOS(true); setHasSeenPlan(true); setIsGenerating(false);
    setSavedTime(prev => prev + 0.5); // Generar un plan ahorra 30 mins

    // En segundo plano: si la IA responde con algo mejor, se actualiza en silencio
    try {
      const response = await fetch(`${BACKEND_URL}/api/monitorFlight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          flightId: flightInput.trim() || 'TP404',
          travelProfile: travelProfile
        })
      });
      const data = await response.json();
      if (data.contingencyPlan) {
        // LIMPIEZA DINÁMICA + FILTRO EJECUTIVO FORZOSO
        const cleanOptions = (data.contingencyPlan.options || []).map((o: any) => {
          let title = (o.title || '').replace(/\+\d+€/g, '').replace(/\d+€/g, '').replace(/€/g, '').trim();
          let desc = (o.description || '').replace(/\d+€/g, '').replace(/€/g, '').trim();

          if (travelProfile === 'premium') {
            // We reduce to master card if VIP
            return {
              ...o,
              type: 'FAST',
              title: 'PREMIUM RESCUE PROTOCOL',
              description: 'Direct access to your personalized alternatives panel. Flights, VIP lounges and legal files ready for immediate execution.',
              estimatedCost: 0
            };
          }

          if (!(o.type?.includes('ECONÓMIC') || o.type?.includes('BARAT'))) {
            return {
              ...o,
              title: `🔒 ${title}`,
              description: desc,
              actionType: 'locked',
              estimatedCost: 0
            };
          }

          return { ...o, title, description: desc, estimatedCost: 0 };
        });

        // Aseguramos que solo haya una opción si es VIP
        const finalOptions = travelProfile === 'premium' ? [cleanOptions[0]] : cleanOptions;

        setApiPlan({ ...data.contingencyPlan, options: finalOptions });
      }
    } catch (e) {
      console.error("Error IA (plan local ya visible):", e);
    }
  };

  const fetchAgentLogs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/logs`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      if (Array.isArray(data)) setAgentLogs(data);
    } catch (e) {
      console.error('[Frontend] Error fetching logs:', e);
    }
  };

  const clearAgentLogs = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/logs`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      setAgentLogs([]);
      setApiPlan(null);
      setHasSeenPlan(false);
      setPrefetchedData(null);
      setIsGenerating(false);
      setFlightData(null); // Total reset of flight data
      setFlightInput('');  // Limpieza del campo de búsqueda
      setMyFlights([]);   // Clean saved local flights
      setSearchError(null);
      setSavedTime(0); // Reset savedTime on clearing logs
      setRecoveredMoney(0); // Reset recoveredMoney on clearing logs

      // Limpieza atómica de AsyncStorage
      await AsyncStorage.multiRemove([
        'lastFlightData',
        'lastFlightInput',
        'offline_agentLogs',
        'offline_myFlights'
      ]);

      Alert.alert('✅ COMPLETED', 'History, demos and AI plans cleared successfully.');
    } catch (e) {
      console.error('[Frontend] Error clearing logs:', e);
    }
  };

  const handleSendMessage = (directText?: string | any) => {
    const text = (typeof directText === 'string' ? directText : inputText).trim(); if (!text) return;
    const newMessage = { id: Date.now().toString(), text, isUser: true };
    const history = [...messages, newMessage];
    setMessages(history);
    setInputText(''); Keyboard.dismiss();

    (async () => {
      setIsTyping(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s for Gemini

      // Saneamiento estructural
      let safeHistory = history.slice(-10);
      while (safeHistory.length > 0 && !safeHistory[0].isUser) {
        safeHistory.shift();
      }

      try {
        const activeFlight = flightData?.flightNumber || flightInput.trim() || undefined;
        console.log(`[Chat] Sending to backend: ${text} | Flight: ${activeFlight}`);

        const response = await fetch(`${BACKEND_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            text,
            history: safeHistory,
            flightId: activeFlight,
            travelProfile: travelProfile,
            flightContext: flightData ? {
              flightNumber: flightData.flightNumber,
              airline: flightData.airline,
              status: flightData.status,
              departureAirport: flightData.departure?.airport,
              arrivalAirport: flightData.arrival?.airport,
              delayMinutes: flightData.departure?.delay || 0,
            } : undefined,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.text) {
          setMessages(prev => [...prev, { id: Date.now().toString(), text: data.text, isUser: false }]);
          speak(data.text);

          // DYNAMIC ACTION: If the AI says it has created a document, we really create it in the Vault
          const responseLower = data.text.toLowerCase();
          if (responseLower.includes('i have generated') || responseLower.includes('i have created') || responseLower.includes('i have prepared') || responseLower.includes('claim')) {
            const flightNum = flightData?.flightNumber || 'TP404';
            const airport = flightData?.arrival?.airport || 'Destination';
            const isClaim = responseLower.includes('claim') || responseLower.includes('defense');

            const amount = getEU261Amount(flightData);
            const chatDoc = {
              id: `chat_doc_${Date.now()}`,
              t: isClaim ? `Claim ${flightNum}_${amount}€` : responseLower.includes('plan') ? `ALTERNATIVE FLIGHTS PLAN ${flightNum}` : 'AI ASSISTANCE DOCUMENT',
              s: `Generated by AI on ${new Date().toLocaleDateString()} // Ref: ${flightNum}-${airport}`,
              i: isClaim ? 'demo-boarding-premium' : 'demo-boarding-premium', // Cambiado a boarding para evitar la imagen del hotel
              source: 'AI ASSISTANT',
              icon: isClaim ? '⚖️' : '📄',
              verified: true,
            };

            setTimeout(() => {
              setExtraDocs((prev: any) => [chatDoc, ...prev]);
              if (isClaim) {
                const newClaim = {
                  id: `CHAT-CLAIM-${Date.now()}`,
                  airline: flightData?.airline || 'Iberia',
                  flight: flightNum,
                  route: flightData ? `${flightData.departure?.iata} > ${flightData.arrival?.iata}` : airport,
                  status: 'AI DRAFT GENERATED',
                  compensation: '250', // Default as per screenshot
                };
                setClaims((prev: any) => [newClaim, ...prev]);
              }
              setHasNewDoc(true);
              console.log("📄 [AI Action] Document and Claim injected from Chat.");
            }, 1000);
          }
        } else {
          throw new Error("Respuesta vacía del servidor.");
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("[Frontend] Chat Error:", error);
        let errorMsg = "Can you repeat that? I have a temporary connection problem.";
        if (error.name === 'AbortError') errorMsg = "I am still thinking about your answer, but my connection took too long. Try again.";
        setMessages(prev => [...prev, { id: Date.now().toString(), text: errorMsg, isUser: false }]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  const saveMyFlight = async (flightNumber: string, alias?: string) => {
    if (!user?.email) return Alert.alert('Error', 'Please login first');
    try {
      const response = await fetch(`${BACKEND_URL}/api/myFlights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ userEmail: user.email, flightNumber, alias })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('✅ Flight saved', `${flightNumber} added to your flights`);
        loadMyFlights(user.email);
      }
    } catch (e) {
      console.error('[Frontend] Error saving flight:', e);
    }
  };

  const loadMyFlights = async (email: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/myFlights?email=${email}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!response.ok) throw new Error("Network response not ok");
      const data = await response.json();
      if (Array.isArray(data)) {
        setMyFlights(data);
        AsyncStorage.setItem('offline_myFlights', JSON.stringify(data));
      }
    } catch (e) {
      console.log('📡 [OFFLINE MODE] Loading flights from local cache...');
      const cached = await AsyncStorage.getItem('offline_myFlights');
      if (cached) setMyFlights(JSON.parse(cached));
    }
  };

  const removeMyFlight = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/myFlights?id=${id}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      if (data.success && user?.email) loadMyFlights(user.email);
    } catch (e) {
      console.error('[Frontend] Error removing flight:', e);
    }
  };

  const loadMyTrips = async (email: string) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/trips?email=${email}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!resp.ok) throw new Error("Network response not ok");
      const data = await resp.json();
      if (Array.isArray(data)) {
        setMyTrips(data);
        AsyncStorage.setItem('offline_myTrips', JSON.stringify(data));
      }
    } catch (e) {
      console.log('📡 [OFFLINE MODE] Loading trips from local cache...');
      const cached = await AsyncStorage.getItem('offline_myTrips');
      if (cached) setMyTrips(JSON.parse(cached));
    }
  };

  const saveTrip = async (title: string, destination: string, hotelName?: string, hotelPhone?: string, flightNumber?: string, startDate?: string, endDate?: string) => {
    if (!user?.email) return Alert.alert('Error', 'Please login first');
    try {
      const resp = await fetch(`${BACKEND_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          userEmail: user.email,
          title,
          destination,
          hotelName,
          hotelPhone,
          flightNumber,
          startDate,
          endDate
        })
      });
      const data = await resp.json();
      if (data.id) {
        Alert.alert('Success', 'Trip created successfully');
        loadMyTrips(user.email);
      }
    } catch (e: any) {
      console.error("Error saving trip:", e);
      Alert.alert('Connection error', `Could not create trip: ${e.message}. Verify that the backend is running.`);
    }
  };

  const updateTrip = async (tripId: string, hotelName?: string, hotelPhone?: string, flightNumber?: string) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/trips/${tripId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ hotelName, hotelPhone, flightNumber })
      });
      const data = await resp.json();
      if (data.id && user?.email) {
        Alert.alert('Success', 'Trip updated successfully');
        loadMyTrips(user.email);
      }
    } catch (e: any) {
      console.error("Error updating trip:", e);
      Alert.alert('Connection error', `Could not update trip: ${e.message}. Verify that the backend is running.`);
    }
  };

  // ✅ GENERACIÓN AUTOMÁTICA DE RECLAMACIONES DINÁMICAS (Importado de utils)

  // La generación ahora es impulsada directamente desde searchFlight para evitar problemas de async/useEffect

  const confirmFlightRescue = async (rescueData: any) => {
    if (!rescueData) return;

    setIsScanning(true);
    speak("Relocation management started. I am connecting with booking services to secure your seat.");

    // Simular latencia de red/agente
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Update Global Flight Data (Congruence)
    const newFlight = {
      ...flightData,
      flightNumber: rescueData.flightNumber || 'IB3167',
      airline: rescueData.airline || 'Iberia',
      status: 'scheduled',
      departure: {
        ...flightData?.departure,
        iata: flightData?.departure?.iata || 'MAD',
        delay: 0,
        estimated: new Date(Date.now() + 3600000).toISOString(), // 1h desde ahora
      },
      arrival: {
        ...flightData?.arrival,
        iata: flightData?.arrival?.iata || 'CDG',
        estimated: new Date(Date.now() + 10800000).toISOString(), // 3h desde ahora
      },
      isRescued: true
    };

    setFlightData(newFlight);
    AsyncStorage.setItem('lastFlightData', JSON.stringify(newFlight));

    // 2. Actualizar el documento en la Bóveda (De Propuesta a Confirmado)
    setExtraDocs((prev: any[]) => prev.map(doc => {
      if (doc.t?.includes('PROPUESTA RESCATE')) {
        return {
          ...doc,
          t: `CONFIRMED TICKET: ${newFlight.flightNumber}`,
          s: `Successful Relocation · Gate ${Math.floor(Math.random() * 20) + 1}A`,
          icon: '✅',
          verified: true,
          isActionable: false, // Ya no se puede volver a ejecutar
          isConfirmed: true
        };
      }
      return doc;
    }));

    setIsScanning(false);
    speak(`Reservation completed successfully. I have relocated you to flight ${newFlight.flightNumber}. You have your new boarding pass in the Documents section.`);

    // 3. Local success notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "✅ RELOCATION COMPLETED",
        body: `AI Agent has confirmed your seat on flight ${newFlight.flightNumber}. Have a nice trip!`,
        sound: true,
      },
      trigger: null,
    });
  };

  const removeTrip = async (id: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/trips?id=${id}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (user?.email) loadMyTrips(user.email);
    } catch (e) {
      console.error("Error eliminando viaje:", e);
    }
  };

  const fetchWeather = async (location: string) => {
    try {
      const sanitized = location.toLowerCase().includes('bora bora') ? 'Bora Bora, French Polynesia' : location;
      const resp = await fetch(`${BACKEND_URL}/api/weather?location=${encodeURIComponent(sanitized)}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!resp.ok) throw new Error("Backend weather failed");
      const data = await resp.json();
      if (data.temp) {
        setWeatherMap(prev => ({ ...prev, [location.toLowerCase()]: data }));
      }
    } catch (e) {
      console.error(`Error loading weather for ${location}:`, e);
      // Instant local fallback if backend fails
      const fallbacks: any = {
        'madrid': { temp: '18', condition: 'Clear', icon: '☀️' },
        'barcelona': { temp: '19', condition: 'Sunny', icon: '☀️' },
        'london': { temp: '12', condition: 'Rain', icon: '🌧️' },
        'paris': { temp: '14', condition: 'Cloudy', icon: '☁️' },
        'tokyo': { temp: '16', condition: 'Partially Cloudy', icon: '⛅' },
        'bora bora': { temp: '28', condition: 'Tropical storm', icon: '⛈️' }
      };
      const query = location.toLowerCase();
      if (fallbacks[query]) {
        setWeatherMap(prev => ({ ...prev, [query]: fallbacks[query] }));
      }
    }
  };

  useEffect(() => {
    if (myTrips.length > 0) {
      myTrips.forEach((trip: any) => {
        const dest = trip.destination || (trip.title || '').split('|')[1]?.trim() || trip.title;
        if (dest && !weatherMap[dest.toLowerCase()]) {
          fetchWeather(dest);
        }
      });
    }
  }, [myTrips]);

  const removeExtraDoc = (id: string) => {
    console.log(`📡 [AppContext] Attempting to delete document ID: ${id}`);
    setExtraDocs(prev => {
      let filtered = prev.filter((d: any) => d.id !== id);
      // If nothing was deleted by ID, try by title as backup
      if (filtered.length === prev.length) {
        const idx = prev.findIndex((d: any) => d.t === id || d.id === id);
        if (idx >= 0) filtered = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      }
      console.log(`📡 [AppContext] ${filtered.length} left in the Vault.`);
      return filtered;
    });
  };

  const removeClaim = (id: string) => {
    const claim = claims.find(c => c.id === id);
    if (claim && claim.flight) {
      setDismissedClaims(prev => [...prev.filter(v => v !== claim.flight), claim.flight]);
    }
    setClaims(prev => prev.filter(c => c.id !== id));
  };

  const simulateGmailSync = () => {
    // 1. Mandatory initial states
    setIsExtracting(true);
    setBrowserLogs(['[System] Starting secure synchronization with Google Mail...']);
    setShowBrowser(true);

    const dest = flightData?.arrival?.iata || flightData?.arrival?.airport || "GBL";
    const destName = (flightData?.arrival?.airport || "your destination").toUpperCase();

    let docTitle = 'PARKING RECEIPT';
    let docSub = `Parking P1 · Airport // Ticket ID: #G-9921`;
    let docIcon = '🅿️';
    let docImg = 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400';

    if (destName.includes('MADRID') || dest === 'MAD') {
      docTitle = 'PARKING T4 BARAJAS';
      docSub = 'Spot 422 - Floor 2 // Madrid Barajas';
    } else if (destName.includes('LONDRES') || destName.includes('LONDON') || ['LHR', 'LGW', 'STN'].includes(dest)) {
      docTitle = 'HEATHROW EXPRESS';
      docSub = 'Round trip ticket · Confirmation: #HE-882';
      docIcon = '🚆';
      docImg = 'https://images.unsplash.com/photo-1544006659-f0b21f04cb1d?w=400';
    } else if (destName.includes('PARIS') || destName.includes('PARÍS') || ['CDG', 'ORY'].includes(dest)) {
      docTitle = 'TICKET RER B / DISNEY';
      docSub = 'Airport-Center Transfer // Ref: #PAR-002';
      docIcon = '🚇';
      docImg = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400';
    }

    // 2. Secuencia de logs con tiempos ajustados para visibilidad fluida
    const fId = flightData?.flightNumber || 'VUELO';
    const pType = apiPlan || 'standard';
    const isMajor = (flightData?.delayMinutes || flightData?.departure?.delay || 0) >= 120 || flightData?.status?.includes('cancel');
    const isVip = travelProfile === 'premium';

    const fallbackLogs = (isVip && !isMajor) ? [
      `[Assistant] Starting COURTESY PROTOCOL for your VIP plan`,
      `🌍 [Intelligence] Verifying real leg for flight ${fId}...`,
      `✨ [Assistant] Processing priority access to VIP Lounge...`,
      `🔍 [Intelligence] Monitoring layover times and next connections...`,
      `💎 [Personal] Activating concierge services and active surveillance...`,
      `✅ [Completed] Courtesy Protocol for ${fId} finished.`
    ] : [
      `[Assistant] Starting solution search for your plan: ${isVip ? 'JET PROTOCOL / VIP' : pType.toUpperCase()}`,
      `🌍 [Intelligence] Verifying real leg for flight ${fId}...`,
      `🔍 [Assistant] Locating free seats in alternative flights of ${fId}...`,
      `✈️ [Intelligence] Analyzing connection times and layovers for ${fId}...`,
      `👤 [Personal] Requesting priority access and blocking your new seat...`,
      `✅ [Completed] Relocation plan for ${fId} finished.`
    ];

    const logs = [
      { t: 600, m: `🔐 Establishing secure tunnel with Google gateway...` },
      { t: 1500, m: `🔍 Scanning emails related to ${destName}...` },
      { t: 2600, m: '📄 Filtering attachments and confirmation metadata...' },
      { t: 3700, m: '🛡️ Verifying authenticity and digital signatures...' },
      { t: 4800, m: `🧠 AI detected critical relevance: '${docTitle}'.` },
      { t: 5900, m: '⚙️ Encrypting local copy in AES-256 Vault...' },
      { t: 6900, m: '✅ Elite extraction finished. Records synchronized.' }
    ];

    logs.forEach(log => {
      setTimeout(() => {
        setBrowserLogs(prev => {
          // Evitamos duplicados si el Vigilante ya puso el suyo
          if (prev.includes(log.m)) return prev;
          return [...prev, log.m];
        });
      }, log.t);
    });
    // 3. Finalización y creación del documento
    setTimeout(() => {
      const newDoc = {
        id: `gmail_${Date.now()}`,
        t: docTitle,
        s: docSub,
        i: docImg,
        source: 'GMAIL',
        icon: docIcon,
        verified: true,
      };

      setExtraDocs((prev: any) => [newDoc, ...prev]);
      setHasNewDoc(true);

      speak(`Excellent news. I have synchronized your email and located a relevant document for your trip to ${destName}. I have saved your ${docTitle.toLowerCase()} in the Vault.`);

      // We don't close the browser here, let the user see the ✅ and press Back
      Alert.alert('✅ EXTRACTION COMPLETED', `Your email has been synchronized. I have detected 1 new document: ${docTitle}.`);
      setIsExtracting(false);
    }, 7500);
  };

  const value = {
    user, authEmail, setAuthEmail, authName, setAuthName, authPassword, setAuthPassword, authMode, setAuthMode, authLoading,
    handleLogin, handleRegister, handleLogout,
    tab, setTab, showSOS, setShowSOS, showSOSMenu, setShowSOSMenu,
    selectedPlan, setSelectedPlan, viewDoc, setViewDoc, isScanning, setIsScanning, scanAnim, sosPulse,
    showChat, setShowChat, showBrowser, setShowBrowser, browserLogs, setBrowserLogs, legalShieldActive, setLegalShieldActive,
    claims, setClaims, removeClaim, clearAgentLogs, inputText, setInputText, messages, setMessages, isSpeaking, waveAnim, compensationEligible, setCompensationEligible,
    isGenerating, apiPlan, setApiPlan, isTyping, availableVoices, selectedVoice, setSelectedVoice, loadingStep, flightInput, setFlightInput,
    flightData, setFlightData, isSearching, searchError, planes, setPlanes, searchFlight, clearFlight, showPlan, fetchContingencyPlan, handleSendMessage,
    agentLogs, fetchAgentLogs,
    myFlights, saveMyFlight, loadMyFlights, removeMyFlight, simulatePushNotification,
    myTrips, saveTrip, loadMyTrips, removeTrip, updateTrip,
    weather: weatherMap,
    fetchWeather,
    hasSeenOnboarding, setHasSeenOnboarding,
    confirmFlightRescue,
    removeExtraDoc,
    hasNewDoc, setHasNewDoc,
    speak, stopSpeak, formatTime, getStatusColor, getStatusLabel, scrollViewRef,
    clearMessages, isDictating, startDictation, stopDictation,
    userPhone, setUserPhone, userFullName, setUserFullName, userIdNumber, setUserIdNumber,
    isReplayingTutorial, setIsReplayingTutorial,
    savedTime, setSavedTime,
    recoveredMoney, setRecoveredMoney,
    selectedRescuePlan, setSelectedRescuePlan,
    hasSeenPlan, setHasSeenPlan,
    activeSearches, removeActiveSearch,
    travelProfile, setTravelProfile,
    masterReset,
    pendingVIPRedirect, setPendingVIPRedirect,
    compBannerDismissed, setCompBannerDismissed,
    chatOrigin, setChatOrigin,
    showVIPAlternatives, setShowVIPAlternatives,
    pendingVIPScroll, setPendingVIPScroll,
    showCancellation, setShowCancellation,
    showPrivateVault, setShowPrivateVault,
    vaultPin, setVaultPin,
    extraDocs, setExtraDocs,
    moveExtraDocToVault,
    unvaultExtraDoc,
    isExtracting, simulateGmailSync,
    lastSearchId,
    showSignature, setShowSignature,
    currentClaimForSig, setCurrentClaimForSig
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
