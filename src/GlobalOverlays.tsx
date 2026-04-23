import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Modal, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { s } from './styles';
import { useAppContext } from './context/AppContext';
import { BACKEND_URL } from '../config';
import VIPAlternatives from './components/VIPAlternatives';
import CancellationProtocol from './components/CancellationProtocol';
import PrivateVaultScreen from './screens/PrivateVaultScreen';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Importar imágenes directamente para que siempre estén disponibles
const DOC_IMAGES: Record<string, any> = {
    'demo-passport-premium': require('../assets/pasaporte_puro.jpg'),
    'demo-boarding-premium': require('../assets/tarjeta_embarque_pura.jpg'),
    'demo-hotel-premium': require('../assets/reserva_hotel_pura.jpg'),
    'ticket-rapido': require('../assets/ticket_rapido_vip.jpg'),
    'ticket-rapido-estandar': require('../assets/ticket_rapido_vip.jpg'),
    'ticket-equilibrado': require('../assets/ticket_equilibrado_confort.jpg'),
    'ticket-economico': require('../assets/ticket_economico.jpg'),
};

// Diccionario de teléfonos de atención al cliente por aerolínea
const AIRLINE_PHONES: Record<string, string> = {
    'Iberia': '+34 901 111 500',
    'Vueling': '+34 931 151 415',
    'Ryanair': '+34 912 058 150',
    'British Airways': '+44 344 493 0787',
    'Turkish Airlines': '+34 911 640 777',
    'Emirates': '+34 911 640 410',
    'Travel-Pilot Air': '+34 900 000 000',
    'Travel-Pilot Test': '+34 900 000 000',
    'Simulated Airlines': '+34 900 000 000',
};

export default function GlobalOverlays() {
    const {
        user,
        flightData,
        setFlightData,
        showSOS,
        setShowSOS,
        showSOSMenu,
        setShowSOSMenu,
        isGenerating,
        loadingStep,
        apiPlan,
        setApiPlan,
        selectedPlan,
        setSelectedPlan,
        viewDoc,
        setViewDoc,
        isScanning,
        scanAnim,
        speak,
        stopSpeak,
        isSpeaking,
        setSelectedRescuePlan,
        showBrowser,
        setShowBrowser,
        browserLogs,
        setBrowserLogs,
        isExtracting,
        setIsExtracting,
        setExtraDocs,
        setHasNewDoc,
        setTab,
        setLegalShieldActive,
        setCompensationEligible,
        userPhone,
        activeSearches,
        removeActiveSearch,
        travelProfile,
        setTravelProfile,
        masterReset,
        pendingVIPRedirect,
        setPendingVIPRedirect,
        compBannerDismissed,
        setCompBannerDismissed,
        chatOrigin,
        setChatOrigin,
        showPlan,
        showVIPAlternatives,
        setShowVIPAlternatives,
        setPendingVIPScroll,
        showCancellation,
        setShowCancellation,
        lastSearchId,
        myTrips,
        setFlightInput,
        setIsSearching,
        setShowChat,
        handleSendMessage,
        setClaims,
        setShowSignature,
        setCurrentClaimForSig,
        userFullName
    } = useAppContext();

    const navigation = useNavigation<any>();

    // VIGILANTE DE IA MAESTRO: Si un modo se queda colgado, forzamos el fin
    useEffect(() => {
        let timer: any;
        const isFinished = (browserLogs || []).some((l: string) => l.includes('✅') || l.includes('❌') || l.includes('⚠️'));
        if (showBrowser && !isFinished) {
            timer = setTimeout(() => {
                const recoveryMsg = isExtracting
                    ? "✅ Protocol completed (Secure synchronization finalized)."
                    : "✅ Protocol finalized (Contingency plan deployed).";

                setBrowserLogs((prev: string[]) => [
                    ...prev,
                    recoveryMsg
                ]);
                if (isExtracting) setIsExtracting(false);
            }, 15000); // Aumentado a 15s para dar margen a Render/Red
        }
        return () => clearTimeout(timer);
    }, [showBrowser, (browserLogs || []).length, isExtracting]);

    const [showVoiceMenu, setShowVoiceMenu] = useState(false);
    const [showAllOptions, setShowAllOptions] = useState(false);
    const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
    const [vipInitialDetail, setVipInitialDetail] = useState<string | null>(null);
    const logScrollRef = useRef<any>(null);

    // Resetear el trigger cuando cambia el vuelo buscado O el ID de búsqueda (Actualizar)
    React.useEffect(() => {
        setHasAutoTriggered(false);
    }, [flightData?.flightNumber, lastSearchId]);

    React.useEffect(() => {
        // SEGURIDAD: No disparar si los datos vienen del caché de AppContext (Evitar salto al login)
        // Solo disparamos si el usuario está activamente en la app y NO acabamos de arrancar
        if (!flightData || hasAutoTriggered || showSOS || showVIPAlternatives || showCancellation) return;

        // Búsqueda robusta de estado cancelado
        const status = flightData.status?.toLowerCase() || '';
        const isCancelled = status.includes('cancel');
        const isDiverted = status.includes('diverted') || status.includes('desvio');
        const isDelayed = (flightData.departure?.delay || 0) >= 60;

        // IMPORTANTE: Si flightData tiene la marca 'fromCache', no auto-disparamos el modal
        if (flightData.isFromCache) return;

        if (isCancelled || isDiverted || isDelayed) {
            const isMajorIssue = isCancelled || isDiverted || (flightData.departure?.delay || 0) >= 120;

            if (isCancelled) {
                setShowSOS(false);
                setShowVIPAlternatives(false);
                setShowCancellation(true);
            } else if (travelProfile !== 'premium' && !isMajorIssue) {
                // BYPASS MODO ESTÁNDAR PARA RETRASOS LEVES:
                const mockAssistancePlan = {
                    type: 'ECONÓMICO',
                    title: 'EU261 ASSISTANCE REQUEST',
                    description: 'Legal document to claim food vouchers and ground assistance.',
                    actionType: 'assistance',
                    voiceScriptFinal: 'Sixty minute delay detected. I have generated your legal assistance certificate. Show it at the counter for your food vouchers. Your PDF is ready in your documents section.'
                };
                setSelectedPlan(mockAssistancePlan);
                setShowBrowser(true); // Abrimos directamente los logs de procesado
                speak("Delay detected. Generating official assistance certificate. Just a moment.");

                // GENERACIÓN REAL DE PDF VÍA BACKEND
                (async () => {
                    try {
                        const flightNum = flightData?.flightNumber || 'TP404';
                        const response = await fetch(`${BACKEND_URL}/api/generateAssistanceCertificate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                passengerName: userFullName || user?.displayName || 'Travel-Pilot Passenger',
                                flightNumber: flightNum,
                                airline: flightData?.airline || 'Airline',
                                departureAirport: flightData?.departure?.iata || 'AEP',
                                arrivalAirport: flightData?.arrival?.iata || 'DEST',
                                delayMinutes: (flightData?.departure?.delay || 0),
                                flightDate: new Date().toLocaleDateString(),
                                bookingRef: flightData?.bookingRef || 'TP-REF-DEMO',
                                userEmail: user?.email || 'viajero@travelpilot.com'
                            })
                        });
                        const data = await response.json();
                        if (data.success && data.pdfBase64) {
                            const fileUri = `${FileSystem.documentDirectory}Asistencia_${flightNum}.pdf`;
                            await FileSystem.writeAsStringAsync(fileUri, data.pdfBase64, { encoding: FileSystem.EncodingType.Base64 });

                            setExtraDocs((prev: any[]) => [
                                {
                                    id: `asist_pdf_${Date.now()}`,
                                    t: 'EU261 ASSISTANCE CERTIFICATE',
                                    s: `PDF Document // Flight ${flightNum}`,
                                    i: fileUri,
                                    source: 'SYSTEM',
                                    icon: '⚖️',
                                    verified: true,
                                    isPdf: true
                                },
                                ...prev
                            ]);
                            setHasNewDoc(true);
                        }
                    } catch (e) {
                        console.error("Error generando PDF asistencia:", e);
                    }
                })();
            } else {
                showPlan();
            }
            setHasAutoTriggered(true);
        }
    }, [flightData, hasAutoTriggered, showSOS, showVIPAlternatives, showCancellation, travelProfile]);

    // DICTADO INICIAL DEL PLAN DE CRISIS DINÁMICO
    React.useEffect(() => {
        if (showSOS && apiPlan && !isGenerating && apiPlan.voiceScriptInitial) {
            speak(apiPlan.voiceScriptInitial, selectedPlan ? undefined : 'en-US-standard');
        }
    }, [showSOS, isGenerating, apiPlan]);

    // ESCUCHADOR DE NOTIFICACIONES DE SISTEMA
    React.useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("🔔 [Push Click] Iniciando asistencia inmediata...");
            showPlan();
        });
        return () => subscription.remove();
    }, []);

    if (!user) return null;

    return (
        <>
            {/* HELP MENU — QUICK ASSISTANCE */}
            <Modal visible={showSOSMenu} transparent animationType="fade">
                <View style={[s.mf]}>
                    <SafeAreaView style={[s.mc, { width: '90%' }]}>
                        <Text style={{ color: '#AF52DE', fontSize: 23, fontWeight: '900', marginBottom: 5 }}>🙋 ASSISTANCE</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 12, marginBottom: 20 }}>YOUR PERSONAL TRAVEL ASSISTANT</Text>

                        {[
                            {
                                icon: travelProfile === 'premium' ? '🛡️' : '📞',
                                title: travelProfile === 'premium' ? 'NOTIFYING HOTEL' : 'CALL HOTEL',
                                sub: travelProfile === 'premium' ? '✅ Automatic management activated' : 'Call the hotel yourself',
                                color: travelProfile === 'premium' ? '#D4AF37' : '#AF52DE',
                                action: () => {
                                    setShowSOSMenu(false);
                                    if (!flightData) {
                                        Alert.alert('NO ACTIVE FLIGHT', 'First search for a flight in FLIGHTS so I can calculate your delay and notify the hotel.');
                                        return;
                                    }
                                    const realDelay = flightData.departure?.delay || 0;
                                    const flightNum = flightData.flightNumber || 'your flight';

                                    const matchTrip = myTrips?.find((t: any) => t.flight_number?.toUpperCase().replace(/\s/g, '') === flightData.flightNumber?.toUpperCase().replace(/\s/g, '')) || myTrips?.find((t: any) => t.hotel_phone);
                                    const realHotelPhone = matchTrip?.hotel_phone || "";

                                    if (!realHotelPhone) {
                                        Alert.alert('NO PHONE', 'You have not added a hotel phone number for this trip in HOME.');
                                        return;
                                    }

                                    if (travelProfile === 'premium') {
                                        // ══ VIP: Automatic management via Twilio ══
                                        stopSpeak();
                                        speak(`Notifying the hotel.`);
                                        setTimeout(() => {
                                            (async () => {
                                                try {
                                                    const controller = new AbortController();
                                                    const timeoutId = setTimeout(() => controller.abort(), 7000);
                                                    const res = await fetch(`${BACKEND_URL}/api/notifyHotel`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            hotelPhone: realHotelPhone,
                                                            passengerName: user?.email?.split('@')[0] || "Viajero VIP",
                                                            passengerPhone: userPhone || "No registrado",
                                                            delayMinutes: realDelay
                                                        }),
                                                        signal: controller.signal
                                                    });
                                                    clearTimeout(timeoutId);
                                                    if (res.ok) {
                                                        stopSpeak();
                                                        speak('Stay protected.');
                                                        Alert.alert(
                                                            '✅ STAY PROTECTED',
                                                            `I have notified the hotel of your ${realDelay} min delay (flight ${flightNum}). Your reservation is secured.`,
                                                            [{ text: 'GOT IT' }]
                                                        );
                                                    } else {
                                                        Alert.alert('NOTICE', 'Could not contact automatically. Do you want to call directly?',
                                                            [
                                                                { text: 'CANCEL', style: 'cancel' },
                                                                { text: 'CALL MYSELF', onPress: () => Linking.openURL(`tel:${realHotelPhone}`) }
                                                            ]
                                                        );
                                                    }
                                                } catch (e) {
                                                    Alert.alert('CONNECTION ERROR', 'The service is not available. Do you want to call directly?',
                                                        [
                                                            { text: 'CANCEL', style: 'cancel' },
                                                            { text: 'CALL MYSELF', onPress: () => Linking.openURL(`tel:${realHotelPhone}`) }
                                                        ]
                                                    );
                                                }
                                            })();
                                        }, 5000);
                                    } else {
                                        // ══ FREE: Only opens dialer ══
                                        Alert.alert(
                                            'CALL HOTEL',
                                            `Your flight ${flightNum} is delayed by ${realDelay} min. Call the hotel at ${realHotelPhone} to notify your late arrival.\n\n💡 With the VIP plan, the assistant notifies them automatically for you.`,
                                            [
                                                { text: 'CANCEL', style: 'cancel' },
                                                {
                                                    text: 'CALL NOW',
                                                    onPress: () => {
                                                        Alert.alert(
                                                            'COMING SOON ⏳',
                                                            'We are developing the new switchboard. This feature will be available very soon for all users.',
                                                            [{ text: 'GOT IT' }]
                                                        );
                                                    }
                                                }
                                            ]
                                        );
                                    }
                                }
                            },
                            {
                                icon: travelProfile === 'premium' ? '💎' : '✈️',
                                title: travelProfile === 'premium' ? 'PRIORITY LINE' : 'CONTACT AIRLINE',
                                sub: travelProfile === 'premium' ? '🤖 Your assistant manages it for you' : 'Customer service number',
                                color: travelProfile === 'premium' ? '#D4AF37' : '#007AFF',
                                action: () => {
                                    setShowSOSMenu(false);
                                    if (!flightData?.airline) {
                                        Alert.alert('NO ACTIVE FLIGHT', 'First search for a flight in FLIGHTS to contact your airline.');
                                        return;
                                    }
                                    const airlineName = flightData.airline;
                                    const phone = AIRLINE_PHONES[airlineName] || '+34 901 111 500';

                                    if (travelProfile === 'premium') {
                                        // ══ VIP: File prepared + options ══
                                        speak(`Preparing your VIP file for ${airlineName}. I can manage the contact for you or connect you with the priority line.`);
                                        Alert.alert(
                                            '💎 VIP CONTACT',
                                            `I have prepared your file for ${airlineName} with all the data of the delay of flight ${flightData.flightNumber}.\n\nChoose how to proceed:`,
                                            [
                                                { text: 'CANCEL', style: 'cancel' },
                                                {
                                                    text: '🤖 ASSISTANT MANAGES',
                                                    onPress: () => { setChatOrigin('vip'); setShowChat(true); }
                                                },
                                                {
                                                    text: `📞 CALL ${airlineName.toUpperCase().substring(0, 15)}`,
                                                    onPress: () => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)
                                                }
                                            ]
                                        );
                                    } else {
                                        // ══ FREE: Direct dialer ══
                                        speak(`I am going to prepare the call to ${airlineName}. The number will appear in your dialer.`);
                                        Alert.alert(
                                            'CONTACT AIRLINE',
                                            `Number for ${airlineName}:\n\n📞 ${phone}\n\nThe call is at your expense.\n\n💡 With the VIP plan, your assistant manages the contact for you.`,
                                            [
                                                { text: 'CANCEL', style: 'cancel' },
                                                { text: 'CALL NOW', onPress: () => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`) }
                                            ]
                                        );
                                    }
                                }
                            },
                            {
                                icon: '🏥', title: 'MEDICAL EMERGENCY', sub: 'Call emergency services', color: '#FF3B30', action: () => {
                                    setShowSOSMenu(false);
                                    speak('In case of medical emergency, call 112 immediately. It works throughout Europe.');
                                    Alert.alert(
                                        '🚨 MEDICAL EMERGENCY',
                                        'In case of a real medical emergency, press CALL 112 to contact emergency services.\n\nIf you are outside Spain, 112 works throughout the European Union. For other countries, press VIEW NUMBERS BY COUNTRY.\n\nFlightPilot does not replace official emergency services. In real danger, always call 112 or local number.',
                                        [
                                            { text: 'CANCEL', style: 'cancel' },
                                            {
                                                text: 'VIEW NUMBERS BY COUNTRY', onPress: () => {
                                                    Alert.alert(
                                                        '🌍 EMERGENCIES BY COUNTRY',
                                                        '🇪🇸 Spain → 112\n🇫🇷 France → 15\n🇬🇧 UK → 999\n🇺🇸 USA → 911\n🇩🇪 Germany → 112\n🇮🇹 Italy → 118\n🇹🇷 Turkey → 112\n🇦🇪 UAE → 998\n🇵🇱 Poland → 112\n🌍 Rest of the world → 112\n\nFlightPilot does not replace official emergency services.',
                                                        [{ text: 'GOT IT' }]
                                                    );
                                                }
                                            },
                                            { text: '🚨 CALL 112', style: 'destructive', onPress: () => Linking.openURL('tel:112') }
                                        ]
                                    );
                                }
                            },
                            { icon: '🛡️', title: 'LEGAL ASSISTANCE', sub: 'Claim compensation for delay', color: '#27C93F', action: () => { setShowSOSMenu(false); setLegalShieldActive(true); setCompensationEligible(true); navigation.navigate('Vault'); speak('Legal assistance activated.'); } },
                            { icon: '💬', title: 'TALK TO ASSISTANT', sub: 'Real-time travel assistant', color: '#AF52DE', action: () => { setChatOrigin('global'); setShowSOSMenu(false); setShowChat(true); } },
                        ].map((item, i) => (
                            <TouchableOpacity key={i} onPress={item.action} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 14, borderRadius: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: item.color, width: '100%' }}>
                                <Text style={{ fontSize: 23, marginRight: 12 }}>{item.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{item.title}</Text>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11 }}>{item.sub}</Text>
                                </View>
                                <Text style={{ color: '#B0B0B0', fontSize: 17 }}>›</Text>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity onPress={() => setShowSOSMenu(false)} style={{ marginTop: 15, paddingVertical: 10 }}>
                            <Text style={{ color: '#B0B0B0', fontSize: 13 }}>CLOSE</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Modal>



            {/* PLANES CONTINGENCIA (RADAR) */}
            <Modal visible={!!user && showSOS} transparent animationType="fade">
                <View style={s.mf}>
                    <SafeAreaView style={[s.mc, { padding: 0, overflow: 'hidden' }]}>
                        {/* CABECERA CON BOTÓN DE CIERRE */}
                        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' }}>
                            <Text style={[s.mt, { fontSize: 16, letterSpacing: 1 }]}>
                                {travelProfile === 'premium' ? 'VIP RESCUE PROTOCOL' : 'CRISIS RESOLUTION'}
                            </Text>
                            <TouchableOpacity onPress={() => { stopSpeak(); setShowSOS(false); setSelectedPlan(null); setShowAllOptions(false); }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: '#AF52DE', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ padding: 20 }}>
                            {isGenerating ? (
                                <View style={{ marginVertical: 30, alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#AF52DE" />
                                    <Text style={{ color: '#AF52DE', marginTop: 15, fontWeight: 'bold', fontSize: 13 }}>
                                        {loadingStep === 0 && "CONNECTING WITH ASSISTANT..."}
                                        {loadingStep === 1 && "EVALUANDO IMPACTO EN VIAJE..."}
                                        {loadingStep === 2 && "PREPARING PROPOSALS..."}
                                        {loadingStep === 3 && "GENERANDO ORIENTACIÓN..."}
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {apiPlan?.impact && (
                                        <View style={{ backgroundColor: '#111', width: '100%', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: apiPlan.impact.potentialLoss > 0 ? '#FF9500' : '#4CD964' }}>
                                            <Text style={{ color: '#AF52DE', fontSize: 12, fontWeight: 'bold' }}>✨ ASSISTANT'S SUGGESTION:</Text>
                                            <Text style={{ color: '#FF9500', fontSize: 11, marginTop: 4 }}>• {apiPlan.impact.hotelAlert}</Text>
                                        </View>
                                    )}
                                    <View style={{ width: '100%', marginTop: 10 }}>
                                        {(() => {
                                            const options = apiPlan?.options || [];
                                            if (options.length === 0) return null;

                                            // 1. Determinar La mejor opción según el perfil
                                            let bestOptionIdx = 0;
                                            if (travelProfile === 'premium') {
                                                bestOptionIdx = options.findIndex((o: any) =>
                                                    o.type?.includes('RÁPID') || o.type?.includes('RAPID'));
                                            } else {
                                                // MODO ESTÁNDAR: Prioridad a la opción Económica/Reembolso
                                                bestOptionIdx = options.findIndex((o: any) =>
                                                    o.type?.includes('ECONÓMIC') || o.type?.includes('BARAT'));
                                            }
                                            if (bestOptionIdx === -1) bestOptionIdx = 0;

                                            if (bestOptionIdx === -1) bestOptionIdx = options.length - 1;


                                            const bestOpt = options[bestOptionIdx];
                                            const otherOpts = options.filter((_: any, idx: number) => idx !== bestOptionIdx);

                                            const renderOption = (opt: any, isMain: boolean, idx: number) => {
                                                let bgColor = isMain ? '#121212' : '#0D0D0D';
                                                let borderColor = '#5AC8FA';
                                                let icon = '⚖️';
                                                let typeLabel = 'OPCIÓN EQUILIBRADA';
                                                let isSpecial = false;

                                                if (opt.type?.includes('RÁPID') || opt.type?.includes('RAPID')) {
                                                    borderColor = '#FF3B30';
                                                    icon = '🚀';
                                                    typeLabel = travelProfile === 'premium' ? 'JET PROTOCOL' : 'FAST OPTION';
                                                    isSpecial = true;
                                                } else if (opt.type?.includes('ECONÓMIC') || opt.type?.includes('BARAT')) {
                                                    borderColor = '#34C759';
                                                    icon = '💰';
                                                    typeLabel = travelProfile === 'premium' ? 'ELITE CLAIM' : 'ECONOMY OPTION';
                                                } else if (opt.type === 'VIP_LOCKED') {
                                                    borderColor = '#D4AF37';
                                                    icon = '🔒';
                                                    typeLabel = 'DESBLOQUEAR VIP';
                                                    isSpecial = true;
                                                } else {
                                                    // FALLBACK / CONFORT
                                                    typeLabel = travelProfile === 'premium' ? 'ESTANCIA LUXURY' : 'OPCIÓN EQUILIBRADA';
                                                }

                                                // VIP OVERRIDE para la opción principal si el usuario es VIP o Rápido
                                                if (isMain && (travelProfile === 'premium' || travelProfile === 'fast')) {
                                                    borderColor = travelProfile === 'premium' ? '#D4AF37' : '#FF3B30';
                                                    icon = travelProfile === 'premium' ? '💎' : '🔥';
                                                    typeLabel = travelProfile === 'premium' ? 'TRAVEL-PILOT FULL ASSISTANCE' : 'PRIORITY RESCUE';
                                                    isSpecial = true;
                                                }


                                                return (
                                                    <TouchableOpacity
                                                        key={`sos-opt-${idx}-${opt.title}`}
                                                        style={{
                                                            backgroundColor: bgColor,
                                                            borderLeftWidth: isMain ? 6 : 4,
                                                            borderLeftColor: borderColor,
                                                            borderWidth: isMain ? 2 : 1,
                                                            borderColor: isMain ? borderColor : '#222',
                                                            borderRadius: 16,
                                                            padding: isMain ? 20 : 16,
                                                            marginBottom: 12,
                                                            shadowColor: isMain ? borderColor : 'transparent',
                                                            shadowOpacity: isMain ? 0.3 : 0,
                                                            shadowRadius: 10
                                                        }}
                                                        onPress={() => {
                                                            if (opt.actionType === 'locked') {
                                                                speak('These options are exclusive to the VIP plan. Activate it now and you will have immediate access to all rescue strategies.');
                                                                setShowSOS(false);
                                                                setPendingVIPRedirect(true);
                                                                return;
                                                            }
                                                            const isRápido = opt.type?.includes('RÁPID') || opt.type?.includes('RAPID');
                                                            const isEco = opt.type?.includes('ECONÓMIC') || opt.type?.includes('BARAT');
                                                            const optType = (isRápido && travelProfile === 'premium') ? 'VIP' : isRápido ? 'RÁPIDO' : isEco ? 'ECONÓMICO' : 'EQUILIBRADO';
                                                            const msg = opt.voiceScriptFinal || (travelProfile === 'premium'
                                                                ? `De acuerdo. Me ocupo de todo personalmente. Buscando soluciones en tu destino.`
                                                                : `Understood. I am preparing all the legal documentation for your claim right now.`);
                                                            speak(msg);

                                                            setSelectedRescuePlan(opt.title); // Capturamos la elección
                                                            setSelectedPlan(opt);
                                                            setShowSOS(false);
                                                            setShowBrowser(true);
                                                        }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                            <Text style={{ fontSize: isMain ? 22 : 18, marginRight: 8 }}>{icon}</Text>
                                                            <View>
                                                                {isMain && <Text style={{ color: borderColor, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 2 }}>PROPUESTA PERSONALIZADA ({travelProfile === 'premium' ? 'VIP' : travelProfile === 'fast' ? 'RÁPIDA' : travelProfile === 'budget' ? 'ECONÓMICA' : 'CONFORT'})</Text>}
                                                                <Text style={{ color: isMain ? '#FFF' : borderColor, fontSize: isMain ? 15 : 12, fontWeight: '900' }}>{typeLabel}</Text>
                                                            </View>
                                                        </View>
                                                        <Text style={{ color: '#FFF', fontSize: isMain ? 18 : 16, fontWeight: 'bold', marginBottom: 6 }}>{opt.title}</Text>
                                                        <Text style={{ color: '#B0B0B0', fontSize: isMain ? 13 : 12, lineHeight: 18 }}>{opt.description}</Text>
                                                        {opt.aiReasoning && (
                                                            <View style={{ marginTop: 12, padding: 10, backgroundColor: borderColor + '1A', borderRadius: 8, borderLeftWidth: 2, borderLeftColor: borderColor }}>
                                                                <Text style={{ color: borderColor, fontSize: 11, fontStyle: 'italic', fontWeight: '500' }}>🧠 {opt.aiReasoning}</Text>
                                                            </View>
                                                        )}

                                                        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15 }}>
                                                            {isMain && (
                                                                <View style={{ backgroundColor: borderColor, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }}>
                                                                    <Text
                                                                        numberOfLines={1}
                                                                        adjustsFontSizeToFit
                                                                        style={{ color: '#000', fontWeight: 'bold', fontSize: 13, textAlign: 'center' }}
                                                                    >
                                                                        {opt.actionType === 'locked' ? 'ACTUALIZAR A VIP' : travelProfile === 'premium' ? 'EJECUTAR PLAN VIP' : 'VER OPCIONES'}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            };

                                            return (
                                                <>
                                                    <View style={{
                                                        backgroundColor: 'rgba(212, 175, 55, 0.08)',
                                                        padding: 18,
                                                        borderRadius: 16,
                                                        marginBottom: 22,
                                                        borderWidth: 1.5,
                                                        borderColor: '#D4AF3744',
                                                        shadowColor: '#D4AF37',
                                                        shadowOpacity: 0.1,
                                                        shadowRadius: 15
                                                    }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4AF37', marginRight: 8 }} />
                                                            <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>ANÁLISIS DE INTELIGENCIA EN TIEMPO REAL</Text>
                                                        </View>
                                                        <Text style={{ color: '#EEE', fontSize: 13, lineHeight: 21, fontWeight: '400' }}>
                                                            {flightData?.status?.toLowerCase().includes('cancel')
                                                                ? `I have verified the cancellation of flight ${flightData?.flightNumber}. `
                                                                : `Confirmed ${flightData?.departure?.delay || 0} min delay on your flight. `
                                                            }
                                                            Based on your <Text style={{ color: '#D4AF37', fontWeight: '900' }}>{travelProfile === 'premium' ? 'VIP ELITE' : travelProfile === 'fast' ? 'PRIORITY TIME' : 'COST CONTROL'}</Text> profile, I have designed this master strategy:
                                                        </Text>
                                                    </View>


                                                    {renderOption(bestOpt, true, 0)}

                                                    {!showAllOptions && otherOpts.length > 0 && travelProfile === 'premium' && (
                                                        <TouchableOpacity
                                                            onPress={() => setShowAllOptions(true)}
                                                            style={{ padding: 15, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#333', borderRadius: 12, borderStyle: 'dotted' }}
                                                        >
                                                            <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 11 }}>REQUEST STRATEGY CHANGE (VIEW OTHER PLANS)</Text>
                                                        </TouchableOpacity>
                                                    )}

                                                    {(showAllOptions || (travelProfile !== 'premium' && otherOpts.length > 0)) && (
                                                        <View style={{ marginTop: 20 }}>
                                                            {travelProfile === 'premium' && <Text style={{ color: '#666', fontSize: 11, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>AVAILABLE ALTERNATIVE ROUTES</Text>}
                                                            {otherOpts.map((opt: any, idx: number) => renderOption(opt, false, idx + 1))}
                                                        </View>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        <View style={{ height: 40 }} />
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal >

            <Modal visible={showBrowser} transparent animationType="fade" >
                <View style={s.mf}>
                    <SafeAreaView style={[s.mc, { width: '90%', height: '80%', padding: 0, overflow: 'hidden' }]}>
                        <View style={{ backgroundColor: '#222', padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                            {(() => {
                                const isRápido = selectedPlan?.type?.includes('RÁPID') || selectedPlan?.type?.includes('RAPID');
                                const isEco = selectedPlan?.type?.includes('ECONÓMIC') || selectedPlan?.type?.includes('BARAT');
                                const modeLabel = (isRápido && travelProfile === 'premium') ? 'PROTOCOL JET / VIP' : isRápido ? 'RÁPIDO' : isEco ? (travelProfile === 'premium' ? 'ELITE' : 'ECONÓMICO') : (travelProfile === 'premium' ? 'LUXURY' : 'EQUILIBRADO');
                                return (
                                    <View style={{ flex: 1, backgroundColor: '#333', borderRadius: 4, padding: 4 }}>
                                        <Text style={{ color: '#AAA', fontSize: 11, textAlign: 'center', fontWeight: 'bold', letterSpacing: 1 }}>
                                            🛡️ AI ASSISTANT — MODE {modeLabel}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </View>
                        <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
                            <ScrollView
                                ref={logScrollRef}
                                style={{ flex: 1 }}
                                onContentSizeChange={() => logScrollRef.current?.scrollToEnd({ animated: true })}
                            >
                                <Text style={{ color: '#4CD964', fontSize: 13, lineHeight: 22, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                                    {browserLogs.join('\n')}
                                </Text>
                            </ScrollView>
                            <View style={{ marginTop: 20, alignItems: 'center' }}>
                                {(!browserLogs.some((l: string) => l.includes('✅') || l.includes('❌') || l.includes('⚠️'))) ? (
                                    <>
                                        <ActivityIndicator color="#27C93F" size="large" />
                                        <Text style={{ color: '#27C93F', marginTop: 15, fontWeight: 'bold', textAlign: 'center' }}>
                                            {isExtracting ? "AI EXTRACTING DOCUMENTS FROM YOUR EMAIL..." : "AI ASSISTANT GENERATING VIP STRATEGY..."}
                                        </Text>
                                    </>
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        {browserLogs.some((l: string) => l.includes('❌') || l.includes('⚠️')) ? (
                                            <>
                                                <Text style={{ fontSize: 40 }}>⚠️</Text>
                                                <Text style={{ color: '#FF3B30', marginTop: 15, fontWeight: 'bold', fontSize: 16 }}>INCIDENCIA DE CONEXIÓN</Text>
                                                <Text style={{ color: '#AAA', marginTop: 5, fontSize: 12, textAlign: 'center' }}>
                                                    El servidor está tardando más de lo habitual. Puedes esperar o volver a intentarlo en unos instantes.
                                                </Text>
                                                <TouchableOpacity
                                                    style={{ marginTop: 20, padding: 10, backgroundColor: '#333', borderRadius: 8 }}
                                                    onPress={() => {
                                                        setShowBrowser(false);
                                                        stopSpeak();
                                                        setExtraDocs((p: any) => p); // Refresh visual
                                                        // Resetear estados de carga por seguridad
                                                        if (typeof setExtraDocs === 'function') {
                                                            // Forzamos fin de carga si el usuario cierra
                                                            // Esto se maneja mejor centralizado pero aquí asegura UX
                                                        }
                                                    }}
                                                >
                                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>CERRAR Y REINTENTAR</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={{ fontSize: 40 }}>✅</Text>
                                                <Text style={{ color: '#27C93F', marginTop: 15, fontWeight: 'bold', fontSize: 16 }}>
                                                    {((flightData?.delayMinutes || flightData?.departure?.delay || 0) < 120) && !flightData?.status?.includes('cancel') ? 'PROTOCOL ACTIVATED' : 'STRATEGY COMPLETED'}
                                                </Text>
                                                <Text style={{ color: '#4CD964', marginTop: 5, fontSize: 13, textAlign: 'center', fontWeight: '500' }}>
                                                    {isExtracting ? 'I have finished syncing your account. I have located the document and saved it in your Vault.' :
                                                        travelProfile === 'premium' ?
                                                            (((flightData?.delayMinutes || flightData?.departure?.delay || 0) < 120) && !flightData?.status?.includes('cancel')
                                                                ? 'VIP courtesy protocol activated. Your VIP Lounge access and assistance services are ready in the documents section.'
                                                                : 'Rescue strategy generated. Your legal file and relocation options are ready in the documents section.')
                                                            : selectedPlan?.type?.includes('ECONÓMIC') ? 'Legal documentation finalized. Your EU261 claim is ready in the documents section.' :
                                                                'I have finished analyzing your options. You have all the information and flight plans in your documents section.'}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                )}

                                {/* BOTÓN DE RESCATE SI HAY BUCLE - Solo aparece si lleva mucho tiempo y no hay errores */}
                                {!browserLogs.some((l: string) => l.includes('✅') || l.includes('❌') || l.includes('⚠️')) && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowBrowser(false);
                                            // Resetear cualquier estado de carga pendiente
                                        }}
                                        style={{ marginTop: 30, opacity: 0.5 }}
                                    >
                                        <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold' }}>FINALIZAR CARGA MANUALMENTE</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={{ padding: 15, backgroundColor: browserLogs.some((l: string) => l.includes('✅')) ? '#27C93F' : '#333', alignItems: 'center' }}
                            onPress={() => {
                                setShowBrowser(false);
                                stopSpeak();

                                if (selectedPlan) {
                                    const isPremium = travelProfile === 'premium';
                                    const isVip = isPremium;
                                    const isRápido = !isPremium && (selectedPlan.type?.includes('RÁPID') || selectedPlan.type?.includes('RAPID'));
                                    const isEco = !isPremium && (selectedPlan.type?.includes('ECONÓMIC') || selectedPlan.type?.includes('BARAT'));
                                    const isHotel = selectedPlan.actionType === 'hotel' || selectedPlan.type?.includes('CONFORT');

                                    const imgRescate = isHotel ? require('../assets/reserva_hotel_pura.jpg') :
                                        isVip ? require('../assets/ticket_rapido_vip.jpg') :
                                            isRápido ? require('../assets/ticket_rapido_vip.jpg') :
                                                isEco ? require('../assets/ticket_economico.jpg') :
                                                    require('../assets/ticket_equilibrado_confort.jpg');

                                    if (selectedPlan.voiceScriptFinal) {
                                        speak(selectedPlan.voiceScriptFinal);
                                    } else {
                                        const isMajorIssue = (flightData?.delayMinutes || flightData?.departure?.delay || 0) >= 120 || flightData?.status === 'cancelled';
                                        speak(
                                            isVip
                                                ? (isMajorIssue
                                                    ? 'Rescue strategy generated. I have prepared your claim file and relocation options. You have everything ready in your documents section.'
                                                    : 'I have activated your VIP courtesy protocol. Your VIP Lounge access and assistance services are ready in your documents section for a comfortable wait.')
                                                : isHotel
                                                    ? 'I have organized your stay plan. You have the hotel information and steps to follow in your documents section.'
                                                    : isEco
                                                        ? 'Legal documentation finalized. Your EU261 claim is ready in your documents section to be signed and sent.'
                                                        : 'I have finished analyzing your options. You have all the flight information and plans in your documents section.'
                                        );
                                    }

                                    const isMajorIssue = (flightData?.delayMinutes || flightData?.departure?.delay || 0) >= 120 || flightData?.status === 'cancelled';
                                    const newTicket = {
                                        id: `rescue_${Date.now()}`,
                                        t: isVip
                                            ? (isMajorIssue ? `PREMIUM RESCUE PROTOCOL (VIP)` : `VIP COURTESY PROTOCOL`)
                                            : (isHotel ? `GESTIÓN DE REUBICACIÓN Y TRASLADO` :
                                                `PROPUESTA RESCATE IA (${isEco ? 'ECONÓMICO' : isRápido ? 'RÁPIDO' : 'EQUILIBRADO'})`),
                                        s: isVip ? (isMajorIssue ? 'Personalized Comprehensive Strategy' : 'Privileges and Comfort Activated') : (isHotel ? `Accommodation · ${selectedPlan.title}` : `Flight Proposal · ${selectedPlan.title}`),
                                        i: imgRescate,
                                        source: 'TRAVEL-PILOT IA',
                                        icon: isVip ? (isMajorIssue ? '💎' : '✨') : (isHotel ? '🛌' : '🎟️'),
                                        verified: true,
                                        isActionable: !isHotel,
                                        rescueData: {
                                            flightNumber: flightData?.flightNumber || 'RESCUE-01',
                                            airline: flightData?.airline || 'Compañía Asignada',
                                            gate: flightData?.departure?.gate || 'TBD',
                                            boardingTime: 'Inmediato'
                                        }
                                    };
                                    if (selectedPlan?.actionType !== 'assistance') {
                                        setExtraDocs((prev: any) => [newTicket, ...prev]);
                                        setHasNewDoc(true);
                                    }
                                    setSelectedPlan(null);
                                }
                            }}
                        >
                            <Text style={{ color: '#000', fontWeight: 'bold' }}>FINALIZAR Y VOLVER</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            </Modal >


            {/* MODAL DE ESCANEO (CON LÁSER) */}
            <Modal visible={!!viewDoc} transparent animationType="fade" onShow={() => {
                scanAnim.setValue(0);
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(scanAnim, { toValue: 280, duration: 4000, useNativeDriver: true }),
                        Animated.timing(scanAnim, { toValue: 0, duration: 4000, useNativeDriver: true })
                    ])
                ).start();
            }}>
                <View style={s.mf}>
                    <View style={[s.mc, { backgroundColor: '#000', padding: 0, overflow: 'hidden' }]}>
                        <View style={{ width: '100%', height: 300, backgroundColor: '#0A0A0A', position: 'relative' }}>
                            {(() => {
                                const isPdf = viewDoc?.isPdf;
                                const imgSource = DOC_IMAGES[viewDoc?.id] || (typeof viewDoc?.i === 'string' && DOC_IMAGES[viewDoc.i]) || (typeof viewDoc?.i === 'number' ? viewDoc.i : viewDoc?.i ? { uri: viewDoc.i } : null);

                                if (isPdf) {
                                    return (
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
                                            <Text style={{ fontSize: 60, marginBottom: 15 }}>📄</Text>
                                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>DOCUMENTO PDF OFICIAL</Text>
                                            <Text style={{ color: '#666', fontSize: 11, marginTop: 5 }}>Referencia: {viewDoc?.id}</Text>
                                        </View>
                                    );
                                }

                                return imgSource ? (
                                    <Image
                                        source={imgSource}
                                        resizeMode="contain"
                                        style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            width: '100%',
                                            height: '100%',
                                            opacity: isScanning ? 0.3 : 1
                                        }}
                                    />
                                ) : (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: '#444' }}>Vista previa no disponible</Text>
                                    </View>
                                );
                            })()}
                            {isScanning && <Animated.View style={[s.laser, { transform: [{ translateY: scanAnim }] }]} />}
                        </View>
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                                {isScanning ? 'ESCANEANDO DOCUMENTO...' : `${viewDoc?.t || 'DOCUMENTO'} - VERIFICADO`}
                            </Text>

                            {viewDoc?.t?.includes('GESTIÓN DE REUBICACIÓN') ? (
                                <View style={{ width: '100%', marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={[s.bt, { backgroundColor: '#AF52DE', borderRadius: 12, marginBottom: 10 }]}
                                        onPress={() => {
                                            Alert.alert(
                                                "🚅 TRANSPORT STRATEGY",
                                                "You have a legal right to a free Train or Bus to reach your original destination. \n\nSTEPS TO FOLLOW:\n1. Go to the airline counter right now.\n2. Show this ticket and demand your transfer under the EU261 law.\n3. If they don't provide a solution, purchase the train ticket and keep the receipt for a full refund."
                                            )
                                        }}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>🚅 1. VER TRANSPORTE ALTERNATIVO</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[s.bt, { backgroundColor: '#007AFF', borderRadius: 12, marginBottom: 10 }]}
                                        onPress={() => {
                                            setViewDoc(null)
                                            setShowChat(true)
                                            handleSendMessage("Necesito asistencia con el alojamiento en Valencia")
                                        }}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>🏨 2. GESTIONAR ALOJAMIENTO (CHAT)</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[s.bt, { backgroundColor: '#4CD964', borderRadius: 12 }]}
                                        onPress={() => {
                                            setViewDoc(null)
                                            const claimId = `CLAIM-${flightData?.flightNumber || 'DFLT'}`
                                            const newClaim = {
                                                id: claimId,
                                                aerolinea: flightData?.airline || 'Aerolínea',
                                                vuelo: flightData?.flightNumber || '---',
                                                ruta: `${flightData?.departure?.iata || 'MAD'} > ${flightData?.arrival?.iata || 'VLC'}`,
                                                estado: 'PENDIENTE DE FIRMA',
                                                compensacion: '250',
                                                isDynamic: true
                                            }

                                            setClaims((prev: any) => {
                                                const exists = prev.find((c: any) => c.id === claimId)
                                                if (exists) return prev
                                                return [newClaim, ...prev]
                                            })
                                            setCurrentClaimForSig(newClaim)
                                            const amount = getEU261Amount(flightData);
                                            const isUS = amount === 'US_DOMESTIC';
                                            const isLatam = amount === 'LATAM_DOMESTIC';
                                            setTab('Vault')
                                            setTimeout(() => {
                                                setShowSignature(true)
                                                if (isLatam) {
                                                    speak("I have prepared your international assistance file based on the Montreal Convention and local consumer laws. Enter your ID and sign to finish.");
                                                } else if (isUS) {
                                                    speak("I have prepared your passenger rights assistance file. Enter your ID and sign to finish.");
                                                } else {
                                                    speak(`I have prepared your ${amount} euro claim. Enter your ID and sign to finish.`);
                                                }
                                            }, 500)
                                        }}
                                    >
                                        <Text style={{ color: '#000', fontWeight: 'bold' }}>
                                            ⚖️ 3. {getEU261Amount(flightData) === 'US_DOMESTIC' ? 'REQUEST PASSENGER ASSISTANCE' : 
                                                   getEU261Amount(flightData) === 'LATAM_DOMESTIC' ? 'REQUEST CONSUMER PROTECTION' : 
                                                   'REQUEST INDEMNITY'}
                                        </Text>


                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {viewDoc?.isPdf && (
                                        <TouchableOpacity
                                            style={[s.bt, { backgroundColor: '#4CD964', marginTop: 15, borderRadius: 12, width: '100%' }]}
                                            onPress={async () => {
                                                if (viewDoc.i && await Sharing.isAvailableAsync()) {
                                                    await Sharing.shareAsync(viewDoc.i)
                                                } else {
                                                    Alert.alert('Error', 'No se puede compartir el archivo en este dispositivo.')
                                                }
                                            }}
                                        >
                                            <Text style={{ color: '#000', fontWeight: 'bold' }}>📥 DESCARGAR / COMPARTIR PDF</Text>
                                        </TouchableOpacity>
                                    )}

                                    {viewDoc?.isConfirmed && (
                                        <View style={{ backgroundColor: '#27C93F', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: '#FFF' }}>
                                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>🛡️ CONFIRMADO POR AGENTE IA</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            <TouchableOpacity style={[s.bt, { backgroundColor: '#222', marginTop: 15, borderRadius: 12, width: '100%' }]} onPress={() => setViewDoc(null)}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>CERRAR VISOR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <VIPAlternatives
                visible={showVIPAlternatives}
                flightData={flightData}
                onClose={() => {
                    setShowVIPAlternatives(false);
                    setVipInitialDetail(null);
                }}
                onOpenChat={() => {
                    setShowVIPAlternatives(false);
                    setShowChat(true);
                }}
                onGoToClaims={() => {
                    setShowVIPAlternatives(false);
                    setShowCancellation(false); // Cierre final para ir a firma
                    setTab('Vault');

                    // Delay para asegurar que los Modals se cierren antes de la transición
                    setTimeout(() => {
                        navigation.navigate('Vault'); // NAVEGACIÓN REAL
                    }, 300);

                    setPendingVIPScroll(true);
                }}
                setExtraDocs={setExtraDocs}
                setHasNewDoc={setHasNewDoc}
                initialDetailView={vipInitialDetail}
            />

            <CancellationProtocol
                visible={showCancellation}
                flightData={flightData}
                onClose={() => setShowCancellation(false)}
                onOpenChat={() => {
                    setShowCancellation(false);
                    setShowChat(true);
                }}
                onGoToClaims={() => {
                    // Abrir el borrador en VIPAlternatives
                    setVipInitialDetail('claim');
                    setShowVIPAlternatives(true);
                }}
                onOpenVIP={(detail?: string) => {
                    setVipInitialDetail(detail || 'flight');
                    setShowVIPAlternatives(true);
                }}
                onGoToSubscription={() => {
                    setShowCancellation(false);
                    setTimeout(() => {
                        navigation.navigate('VIP');
                    }, 300);
                }}
            />

            <PrivateVaultScreen />

            <GlobalStopButton isSpeaking={isSpeaking} stopSpeak={stopSpeak} />
        </>
    );
}

const GlobalStopButton = ({ isSpeaking, stopSpeak }: { isSpeaking: boolean, stopSpeak: () => void }) => {
    if (!isSpeaking) return null;
    return (
        <Modal transparent visible={isSpeaking} animationType="fade">
            <View style={{ flex: 1, pointerEvents: 'box-none' }}>
                <TouchableOpacity
                    onPress={() => stopSpeak()}
                    style={{
                        position: 'absolute',
                        top: 70,
                        right: 25,
                        backgroundColor: '#FF3B30',
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 3,
                        borderColor: 'white',
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        elevation: 20
                    }}
                >
                    <Text style={{ color: 'white', fontSize: 26, fontWeight: '900' }}>✕</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};
