import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Animated, Image } from 'react-native';
import { s } from '../styles';
import { useAppContext, IS_BETA } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';
import { getEU261Amount } from '../utils/flightUtils';

// Premium rotating phrases for when there is no flight
const IDLE_PHRASES = [
    'All systems operational. Your next trip is under my protection.',
    'Scanning atmospheric conditions and flight connections... All in order.',
    'Monitoring network active. Any incident will be managed instantly.',
    'Real-time surveillance activated. No change will go unnoticed.',
    'Defense protocols loaded. Enter a flight and I\'ll activate full shield.',
    'My radar is clear. Add a flight in RADAR to activate 24h surveillance.',
];

export default function IntelScreen() {
    const navigation = useNavigation<any>();
    const { user, myTrips, saveTrip, removeTrip, myFlights, removeMyFlight, setFlightInput, weather, flightData, clearFlight, simulatePushNotification, tab, selectedVoice, showPlan, travelProfile, hasSeenPlan, selectedRescuePlan, speak, removeActiveSearch, availableVoices, handleLogout, setSavedTime, isSearching } = useAppContext();
    const [newTripTitle, setNewTripTitle] = useState('');
    const [newTripDest, setNewTripDest] = useState('');
    const [newHotelName, setNewHotelName] = useState('');
    const [newHotelPhone, setNewHotelPhone] = useState('');
    const [newFlightNumber, setNewFlightNumber] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTripId, setEditingTripId] = useState<string | null>(null);

    // Animation
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isSearching) {
            Animated.loop(
                Animated.timing(rotateAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            ).start();
        } else {
            rotateAnim.setValue(0);
        }
    }, [isSearching]);


    // Rotating phrase that changes each time the screen is mounted
    const idlePhrase = useMemo(() => IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)], []);

    const handleCreate = () => {
        if (!newTripTitle || !newTripDest) return Alert.alert('Error', 'Please fill in required fields (Title and Destination)');
        if (editingTripId) {
            removeTrip(editingTripId);
        }
        saveTrip(newTripTitle, newTripDest, newHotelName, newHotelPhone, newFlightNumber);
        setNewTripTitle('');
        setNewTripDest('');
        setNewHotelName('');
        setNewHotelPhone('');
        setNewFlightNumber('');
        setEditingTripId(null);
        setShowForm(false);
    };

    const handleEdit = (trip: any) => {
        setNewTripTitle((trip.title || '').includes('|') ? trip.title.split('|')[0].trim() : (trip.title || ''));
        setNewTripDest((trip.title || '').includes('|') ? trip.title.split('|')[1].trim() : (trip.destination || ''));
        setNewFlightNumber(trip.flight_number || '');
        setNewHotelName(trip.hotel_name || '');
        setNewHotelPhone(trip.hotel_phone || '');
        setEditingTripId(trip.id);
        setShowForm(true);
    };
    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0A' }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>


            {/* VIP STATUS CARD (Only if NOT VIP) */}
            {travelProfile !== 'premium' && (
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('VIP')}
                    style={{
                        backgroundColor: '#111',
                        borderRadius: 24,
                        padding: 20,
                        marginBottom: 30,
                        borderWidth: 1,
                        borderColor: '#D4AF37',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        overflow: 'hidden'
                    }}
                >
                    {/* Background glow effect */}
                    <View style={{ position: 'absolute', top: -50, right: -50, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(212, 175, 55, 0.05)' }} />

                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 10, borderWidth: 0.5, borderColor: '#D4AF37' }}>
                                <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: '900' }}>STATUS: STANDARD (LIMITED)</Text>
                            </View>
                        </View>
                        <Text style={{ color: '#E0E0E0', fontSize: 13, lineHeight: 18 }}>Unlock <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>VIP Access</Text> to activate crisis surveillance and legal compensation guarantee on all segments.</Text>
                    </View>

                    <View style={{ backgroundColor: '#D4AF37', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#D4AF37', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 }}>
                        <Text style={{ color: '#000', fontSize: 18, fontWeight: 'bold' }}>›</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* ACTIVE VIP STATUS (Only if ALREADY VIP) */}
            {travelProfile === 'premium' && (
                <View style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.05)',
                    borderRadius: 20,
                    padding: 15,
                    marginBottom: 30,
                    borderWidth: 1,
                    borderColor: 'rgba(212, 175, 55, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center'
                }}>
                    <Text style={{ fontSize: 18, marginRight: 12 }}>🛡️</Text>
                    <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: 'bold' }}>Status: Under VIP Legal Protection</Text>
                </View>
            )}

            {/* GLOBAL BETA BANNER */}
            {IS_BETA && (
                <View style={{ backgroundColor: '#0D0D0D', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#444', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>🛡️ VERIFIED ENVIRONMENT · BETA ACCESS</Text>
                </View>
            )}

            {/* ——— MY TRIPS ——— */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[s.b, { marginBottom: 0 }]}>🌍 HOME</Text>
                <TouchableOpacity
                    onPress={() => {
                        if (showForm) setEditingTripId(null);
                        setShowForm(!showForm);
                    }}
                    style={{ backgroundColor: showForm ? '#333' : '#D4AF37', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                >
                    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>{showForm ? 'CANCEL' : '+ NEW TRIP'}</Text>
                </TouchableOpacity>
            </View>

            {showForm && (
                <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#333' }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>{editingTripId ? 'EDIT TRIP' : 'ADD NEW DESTINATION'}</Text>
                    <TextInput
                        placeholder="Name (e.g., Japan Holidays)"
                        placeholderTextColor="#666"
                        style={{ backgroundColor: '#0A0A0A', color: '#FFF', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#222' }}
                        value={newTripTitle}
                        onChangeText={setNewTripTitle}
                    />
                    <TextInput
                        placeholder="City (e.g., Tokyo, JP)"
                        placeholderTextColor="#666"
                        style={{ backgroundColor: '#0A0A0A', color: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222' }}
                        value={newTripDest}
                        onChangeText={setNewTripDest}
                    />
                    <TextInput
                        placeholder="Flight No. (e.g., IB3110)"
                        placeholderTextColor="#666"
                        style={{ backgroundColor: '#0A0A0A', color: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#222', fontWeight: 'bold' }}
                        value={newFlightNumber}
                        autoCapitalize="characters"
                        onChangeText={setNewFlightNumber}
                    />
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <TextInput
                            placeholder="Hotel"
                            placeholderTextColor="#666"
                            style={{ flex: 1.5, backgroundColor: '#0A0A0A', color: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#222' }}
                            value={newHotelName}
                            onChangeText={setNewHotelName}
                        />
                        <TextInput
                            placeholder="Hotel Phone"
                            placeholderTextColor="#666"
                            style={{ flex: 1, backgroundColor: '#0A0A0A', color: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#222' }}
                            value={newHotelPhone}
                            keyboardType="phone-pad"
                            onChangeText={setNewHotelPhone}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleCreate}
                        style={{ backgroundColor: '#D4AF37', padding: 18, borderRadius: 15, alignItems: 'center' }}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold', letterSpacing: 0.5 }}>SAVE TRIP AND ACTIVATE AI</Text>
                    </TouchableOpacity>
                </View>
            )}

            {myTrips.length === 0 && !showForm ? (
                <View style={{ alignItems: 'center', padding: 40, backgroundColor: '#0D0D0D', borderRadius: 25, borderStyle: 'dashed', borderWidth: 1, borderColor: '#222', marginBottom: 30 }}>
                    <Text style={{ fontSize: 41, marginBottom: 15 }}>🌎</Text>
                    <Text style={{ color: '#B0B0B0', fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>YOU HAVE NO PLANNED TRIPS</Text>
                    <Text style={{ color: '#B0B0B0', fontSize: 13, textAlign: 'center', marginTop: 8 }}>Your assistant has checked your flight details and weather status.

                        Everything seems in order for your trip. If we detect any risk to your connection, we'll notify you instantly.</Text>
                </View>
            ) : (
                myTrips.map((trip: any) => {
                    const [displayTitle, displayDestination] = (trip.title || '').includes('|')
                        ? trip.title.split('|').map((s: string) => s.trim())
                        : [trip.title, trip.destination];

                    const destKey = (displayDestination || '').toLowerCase();
                    const tripWeather = weather[destKey] || { temp: '—', condition: 'Checking...', icon: '🌤️' };

                    return (
                        <View key={trip.id} style={{ backgroundColor: '#111', borderRadius: 24, padding: 20, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#4CD964', borderWidth: 1, borderColor: '#1A1A1A' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4AF37', marginRight: 8 }} />
                                        <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold' }}>ACTIVE TRIP</Text>
                                    </View>
                                    <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold' }}>{displayTitle}</Text>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                                        {displayDestination ? <Text style={{ color: '#CCCCCC', fontSize: 13 }}>📍 {displayDestination}</Text> : null}
                                        {trip.flight_number ? (
                                            <View style={{ backgroundColor: 'rgba(175, 82, 222, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#AF52DE' }}>
                                                <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: 'bold' }}>✈️ {trip.flight_number}</Text>
                                            </View>
                                        ) : null}
                                    </View>

                                    {(trip.hotel_name || trip.hotel_phone) && (
                                        <View style={{ marginTop: 15, padding: 12, backgroundColor: '#1A1A1A', borderRadius: 16, borderLeftWidth: 3, borderLeftColor: '#D4AF37' }}>
                                            <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: '900', marginBottom: 4, letterSpacing: 1 }}>PROTECTED STAY</Text>
                                            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>{trip.hotel_name || 'Confirmed Accommodation'}</Text>
                                            {trip.hotel_phone ? <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }}>📞 {trip.hotel_phone}</Text> : null}
                                        </View>
                                    )}

                                    {/* INDIVIDUAL WEATHER INFO PER CARD */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: '#1A1A1A', padding: 10, borderRadius: 12, alignSelf: 'flex-start' }}>
                                        <Text style={{ fontSize: 20, marginRight: 8 }}>{tripWeather.icon}</Text>
                                        <View>
                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{tripWeather.temp}°C</Text>
                                            <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold' }}>{tripWeather.condition.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <TouchableOpacity onPress={() => handleEdit(trip)} style={{ padding: 5, marginRight: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                                        <Text style={{ color: '#FFF', fontSize: 14 }}>✏️ EDIT</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeTrip(trip.id)} style={{ padding: 5 }}>
                                        <Text style={{ color: '#B0B0B0', fontSize: 20 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}

            {/* ——— SITUATION REPORT & TIMELINE (SECONDARY INFO) ——— */}
            <View style={{ marginTop: 20, marginBottom: 30 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ color: '#B0B0B0', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>🕒 TRIP SUMMARY</Text>
                    </View>
                    {flightData?.flightNumber && (
                        <TouchableOpacity onPress={() => removeActiveSearch(flightData.flightNumber)} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255, 59, 48, 0.2)', borderRadius: 10 }}>
                            <Text style={{ color: '#FF3B30', fontSize: 10, fontWeight: 'bold' }}>✕ DISCARD FLIGHT</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => {
                        let msg = '';
                        if (flightData?.status === 'cancelled') {
                            msg = travelProfile === 'premium'
                                ? `Flight cancelled. Your refund and top-level alternatives are ready. You have everything in your VAULT section.`
                                : `Flight cancelled. Your refund claim is ready in VAULT. Review and sign it to start the process.`;
                        } else if ((flightData?.departure?.delay || 0) >= 180) {
                            const amt = getEU261Amount(flightData).replace('€', ' euros');
                            msg = travelProfile === 'premium'
                                ? `Critical delay detected. I have prepared your legal file to claim ${amt} and analyzed your relocation options. You have everything ready in VAULT.`
                                : travelProfile === 'budget'
                                    ? `Critical delay detected. Your EU261 claim file is ready to sign in your VAULT. One tap and the legal process starts by itself.`
                                    : `Critical delay detected. Your EU261 claim file is ready to sign in VAULT. With the VIP plan you would have additional rescue options.`;
                        } else if ((flightData?.departure?.delay || 0) >= 60) {
                            msg = travelProfile === 'premium'
                                ? `Delay detected. Your flight is under priority surveillance. Any relevant change will reach you instantly.`
                                : `Delay detected. I am monitoring your flight in real time. If the situation changes, you will be the first to know.`;
                        } else if (flightData?.flightNumber) {
                            msg = `Everything under control with your flight ${flightData.flightNumber}. I am monitoring the network for any minor changes.`;
                        } else {
                            msg = idlePhrase;
                        }
                        speak(msg, selectedVoice);
                    }}
                    activeOpacity={0.7}
                    style={{
                        backgroundColor: '#111',
                        borderRadius: 20,
                        padding: 18,
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: travelProfile === 'premium' ? '#D4AF37' : 'rgba(175, 82, 222, 0.4)',
                        flexDirection: 'row',
                        elevation: 5,
                    }}>
                    <View style={{ width: 4, backgroundColor: '#D4AF37', borderRadius: 2, marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                        <View style={{ marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>
                                {travelProfile === 'premium' ? '🛡️ AI REPORT' : 'ASSISTANT REPORT'}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {(flightData?.departure?.delay || 0) >= 60 && (
                                    <View style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 6, borderWidth: 1, borderColor: '#D4AF37' }}>
                                        <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: 'bold' }}>🎧 LISTEN</Text>
                                    </View>
                                )}
                                {flightData?.isSimulation && (
                                    <View style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)' }}>
                                        <Text style={{ color: '#D4AF37', fontSize: 8, fontWeight: 'bold' }}>🛡️ SIM</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View>
                            {!flightData?.flightNumber ? (
                                <View>
                                    <Text style={{ color: '#E0E0E0', fontSize: 13, lineHeight: 20, fontStyle: 'italic', letterSpacing: 0.3 }}>
                                        {idlePhrase}
                                    </Text>
                                </View>
                            ) : (flightData?.departure?.delay || 0) >= 60 ? (
                                <View>
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ color: '#E0E0E0', fontSize: 13, lineHeight: 20, fontStyle: 'italic', letterSpacing: 0.3 }}>
                                            {(flightData?.departure?.delay || 0) >= 180 ? (
                                                <>🚨 <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>CRITICAL ALERT:</Text> Delay over 3h identified for flight <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>{flightData.flightNumber}</Text>. You are entitled to claim <Text style={{ color: '#4CD964', fontWeight: 'bold' }}>{getEU261Amount(flightData)}€</Text> compensation. I have activated your <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>{travelProfile === 'premium' ? 'VIP' : travelProfile === 'budget' ? 'ECONOMY' : 'BALANCED'}</Text> Strategy.</>
                                            ) : (
                                                <>⚠️ <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>INCIDENT DETECTED:</Text> Delay of {(flightData?.departure?.delay || 0)} min for flight <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>{flightData.flightNumber}</Text>. I have organized a personalized <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>{travelProfile === 'premium' ? 'VIP' : travelProfile === 'budget' ? 'ECONOMY' : 'BALANCED'} Strategy</Text>.</>
                                            )}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (selectedRescuePlan) {
                                                const role = availableVoices.find(v => v.identifier === selectedVoice)?.humanName || "Your assistant";
                                                speak(`I am ${role}. I am still working on your plan for ${selectedRescuePlan}. The connection is open and negotiations are advancing.`);
                                            }
                                            if (!hasSeenPlan) setSavedTime((prev: number) => prev + 1.5);
                                            showPlan();
                                        }}
                                        style={{
                                            backgroundColor: selectedRescuePlan ? '#4CD964' : '#D4AF37',
                                            paddingVertical: 12,
                                            paddingHorizontal: 20,
                                            borderRadius: 14,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: selectedRescuePlan ? "#4CD964" : "#D4AF37",
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 5,
                                            elevation: 8,
                                            marginTop: 5
                                        }}
                                    >
                                        <Text style={{ color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>
                                            {selectedRescuePlan
                                                ? `🛰️ ACTIVE PROTOCOL: ${selectedRescuePlan.toUpperCase()}`
                                                : hasSeenPlan
                                                    ? '📂 VIEW AVAILABLE STRATEGIES'
                                                    : '⚡ RESOLVE NOW WITH AI'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={{ color: '#E0E0E0', fontSize: 13, lineHeight: 20, fontStyle: 'italic', letterSpacing: 0.3 }}>Everything under control. I've verified your flight <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>{flightData.flightNumber}</Text> and there are no critical alerts at this time.</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {flightData?.flightNumber ? [
                    { time: 'NOW', event: 'Active monitoring ' + flightData.airline, icon: '✅' },
                    { time: flightData.departure?.estimated ? String(flightData.departure.estimated).substring(11, 16) : 'NEXT', event: `Departure from ${flightData.departure?.iata || 'Origin'}`, icon: '🛫' },
                    { time: flightData.arrival?.estimated ? String(flightData.arrival.estimated).substring(11, 16) : 'LATER', event: `Arrival at ${flightData.arrival?.iata || 'Dest'}`, icon: '🛬' },
                ].map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginBottom: 12 }}>
                        <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: '900', width: 50 }}>{item.time}</Text>
                        <View style={{ width: 1, height: 20, backgroundColor: '#222', marginHorizontal: 15 }} />
                        <Text style={{ fontSize: 14, marginRight: 8 }}>{item.icon}</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 13 }}>{item.event}</Text>
                    </View>
                )) : [
                    { time: 'NOW', event: 'Assistant connected and online', icon: '🟢' },
                    { time: '---', event: 'Waiting for flight assignment', icon: '⏳' },
                ].map((item, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginBottom: 12 }}>
                        <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: '900', width: 50 }}>{item.time}</Text>
                        <View style={{ width: 1, height: 20, backgroundColor: '#222', marginHorizontal: 15 }} />
                        <Text style={{ fontSize: 14, marginRight: 8 }}>{item.icon}</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 13 }}>{item.event}</Text>
                    </View>
                ))}

                {/* PUSH TEST BUTTON (HIDDEN FROM PLAIN SIGHT) */}
                {IS_BETA && (
                    <TouchableOpacity
                        onPress={() => simulatePushNotification()}
                        style={{
                            marginTop: 15, alignSelf: 'flex-start', marginLeft: 10,
                            backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#333'
                        }}
                    >
                        <Text style={{ color: '#888', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>TEST: FORCE PUSH ALERT</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => {
                        Alert.alert("LOG OUT", "Are you sure you want to leave the cockpit?", [
                            { text: "CANCEL", style: 'cancel' },
                            { text: "YES, LOG OUT", style: 'destructive', onPress: () => handleLogout() }
                        ]);
                    }}
                    style={{
                        backgroundColor: 'rgba(255, 59, 48, 0.1)',
                        padding: 20,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#FF3B30',
                        alignItems: 'center',
                        marginTop: 40,
                        marginBottom: 10
                    }}
                >
                    <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>USER LOG OUT</Text>
                </TouchableOpacity>

            </View>

            <View style={{ height: 160 }} />
        </ScrollView>
    );
}
