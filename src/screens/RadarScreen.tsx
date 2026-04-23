import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native';
import { s } from '../styles';
import { useAppContext, IS_BETA } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';

export default function RadarScreen() {
    const navigation = useNavigation<any>();
    const {
        flightInput, setFlightInput, searchFlight, clearFlight, isSearching, searchError,
        flightData, formatTime, getStatusColor, getStatusLabel,
        myFlights, saveMyFlight, removeMyFlight, activeSearches, removeActiveSearch,
        pendingVIPRedirect, setPendingVIPRedirect,
        showCancellation, setShowCancellation, travelProfile
    } = useAppContext();

    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [showDemoMenu, setShowDemoMenu] = useState(false);

    const demoOptions = [
        { code: 'DELAY-60',     name: '⏱️ Minor Delay — 60 min',       desc: 'VIP Courtesy Protocol' },
        { code: 'DELAY-180',    name: '🔴 Major Delay — 3h',           desc: 'EU261 Compensation activated' },
        { code: 'DELAY-400',    name: '🌍 Long Haul Delay',            desc: 'Long Distance Flight' },
        { code: 'DELAY-VIP',    name: '💎 Delay with Lounge Access',   desc: 'Compensation + VIP Lounge Access' },
        { code: 'CANCELLED',    name: '❌ Total Cancellation',         desc: 'Urgent refund and relocation' },
        { code: 'DIVERSION-VLC', name: '🔄 Route Diversion',            desc: 'Alternative ground transport' }
    ];

    const launchDemo = (code: string) => {
        setFlightInput(code);
        setShowDemoMenu(false);
        searchFlight(code);
    };

    // Update timestamp when flight data is retrieved
    useEffect(() => {
        if (flightData?.flightNumber) {
            setLastUpdate(new Date());
        }
    }, [flightData?.flightNumber]);

    // Redirect to VIP tab when user taps "VIEW VIP" in the limit alert
    useEffect(() => {
        if (pendingVIPRedirect) {
            setPendingVIPRedirect(false);
            navigation.navigate('VIP');
        }
    }, [pendingVIPRedirect]);

    return (
        <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 100 }}>
                {/* ——— DEMO MENU BUTTON (REPLACES STATIC BANNER) ——— */}
                {IS_BETA && (
                    <TouchableOpacity
                        onPress={() => setShowDemoMenu(true)}
                        activeOpacity={0.8}
                        style={{
                            backgroundColor: 'rgba(255, 149, 0, 0.1)',
                            borderRadius: 16,
                            padding: 15,
                            marginBottom: 20,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 149, 0, 0.5)',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 149, 0, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                                <Text style={{ fontSize: 20 }}>🧪</Text>
                            </View>
                            <View>
                                <Text style={{ color: '#FF9500', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>FLIGHT SIMULATION</Text>
                                <Text style={{ color: '#B0B0B0', fontSize: 11, marginTop: 2 }}>Test 6 crisis scenarios with AI</Text>
                            </View>
                        </View>
                        <Text style={{ color: '#FF9500', fontSize: 20 }}>▼</Text>
                    </TouchableOpacity>
                )}

                {/* ——— SEARCH BAR ——— */}
                <View style={{ backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', marginBottom: 8 }}>🔍 SEARCH FLIGHT</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <View style={{ flex: 1, position: 'relative', marginRight: 10 }}>
                            <TextInput
                                placeholder="e.g., IB3166, BA0117..."
                                placeholderTextColor="#B0B0B0"
                                value={flightInput}
                                onChangeText={setFlightInput}
                                autoCapitalize="characters"
                                style={{
                                    backgroundColor: '#1F2937', color: 'white', paddingHorizontal: 12, paddingVertical: 10, paddingRight: 40, borderRadius: 10, fontSize: 15, width: '100%'
                                }}
                            />
                            {(flightData || searchError || flightInput.length > 0) && (
                                <TouchableOpacity
                                    onPress={clearFlight}
                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#666', fontSize: 22, fontWeight: 'bold' }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={searchFlight}
                            disabled={isSearching || !flightInput.trim()}
                            style={{ backgroundColor: isSearching ? '#666' : '#AF52DE', paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', opacity: !flightInput.trim() ? 0.5 : 1 }}
                        >
                            {isSearching ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold' }}>SEARCH</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ——— SOS RESCUE BANNER (STICKY ALERT) ——— */}
                {flightData?.status?.includes('cancel') && !showCancellation && (
                    <TouchableOpacity
                        onPress={() => setShowCancellation(true)}
                        activeOpacity={0.9}
                        style={{
                            backgroundColor: '#FF3B30',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#FF3B30',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 6
                        }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                            <Text style={{ fontSize: 22 }}>🚨</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>ACTIVE RESCUE PROTOCOL</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Tap to manage your cancelled flight</Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>OPEN</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* ——— SEARCH ERROR ——— */}
                {searchError && (
                    <View style={{ backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FF9500', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FF9500', fontWeight: 'bold', fontSize: 14 }}>⚠️ SHIELD ERROR / FLIGHT NOT DETECTED</Text>
                            <Text style={{ color: '#B0B0B0', fontSize: 12, marginTop: 4 }}>Our radar cannot locate the specified flight. Check the code to activate surveillance.</Text>
                        </View>
                        <TouchableOpacity onPress={() => clearFlight()} style={{ padding: 5 }}>
                            <Text style={{ color: '#666', fontSize: 20 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ——— FLIGHT CARD LIST ——— */}
                {activeSearches.length > 0 ? (
                    activeSearches.map((data) => (
                        <View key={data.flightNumber} style={{ backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: getStatusColor(data.status) }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold' }}>✈️ {data.airline?.toUpperCase()}</Text>
                                <Text style={{ color: '#B0B0B0', fontSize: 11, marginRight: 35 }}>LIVE TRACKING</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    {(data.departure?.delay || 0) >= 120 && (
                                        <View style={{ backgroundColor: 'rgba(175, 82, 222, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4, borderWidth: 1, borderColor: '#AF52DE' }}>
                                            <Text style={{ color: '#AF52DE', fontSize: 9, fontWeight: '900' }}>✨ SOLUTION AVAILABLE</Text>
                                        </View>
                                    )}
                                    <Text style={{ color: '#FFF', fontSize: 23, fontWeight: '900' }}>{data.flightNumber}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => saveMyFlight(data.flightNumber)}
                                        style={{ backgroundColor: '#AF52DE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                                    >
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>SAVE</Text>
                                    </TouchableOpacity>
                                    <View style={{ backgroundColor: getStatusColor(data.status), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>{getStatusLabel(data.status, data.departure.delay)}</Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={{ color: '#B0B0B0', fontSize: 14, marginTop: 8 }}>{data.departure.airport} ({data.departure.iata}) → {data.arrival.airport} ({data.arrival.iata})</Text>
                            <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11 }}>DEPARTURE</Text>
                                    <Text style={{ color: '#FFF', fontSize: 17, fontWeight: 'bold' }}>{formatTime(data.departure.scheduled)}</Text>
                                </View>
                                {data.departure.delay > 0 && (
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#B0B0B0', fontSize: 11 }}>NEW DEPARTURE</Text>
                                        <Text style={{ color: '#FF9500', fontSize: 17, fontWeight: 'bold' }}>{formatTime(data.departure.estimated)}</Text>
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11 }}>ARRIVAL</Text>
                                    <Text style={{ color: '#FFF', fontSize: 17, fontWeight: 'bold' }}>{formatTime(data.arrival.scheduled)}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11 }}>TERMINAL</Text>
                                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold' }}>{data.departure.terminal || '—'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11 }}>GATE</Text>
                                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold' }}>{data.departure.gate || '—'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11 }}>STATUS</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: getStatusColor(data.status), fontSize: 13, fontWeight: 'bold' }}>{data.status?.toUpperCase()}</Text>
                                        {data.isSimulation && (
                                            <View style={{ backgroundColor: 'rgba(76, 217, 100, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6, borderWidth: 1, borderColor: '#4CD964' }}>
                                                <Text style={{ color: '#4CD964', fontSize: 8, fontWeight: 'bold' }}>🧪 TEST</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => removeActiveSearch(data.flightNumber)}
                                style={{ position: 'absolute', top: 5, right: 5, width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                ) : !searchError && !isSearching && (
                    /* ——— C) PREMIUM "EMPTY RADAR" CARD ——— */
                    <View style={{
                        backgroundColor: '#111',
                        borderRadius: 20,
                        padding: 30,
                        marginBottom: 16,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(175, 82, 222, 0.2)',
                    }}>
                        {/* Visual Radar Effect */}
                        <View style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(175, 82, 222, 0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, borderColor: 'rgba(175, 82, 222, 0.2)', justifyContent: 'center', alignItems: 'center' }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(175, 82, 222, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 20 }}>📡</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>SURVEILLANCE RADAR</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                            Your radar is empty. Enter a flight code to activate real-time AI surveillance.
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(76, 217, 100, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CD964', marginRight: 8 }} />
                            <Text style={{ color: '#4CD964', fontSize: 11, fontWeight: 'bold' }}>OPERATING SYSTEM · STANDBY</Text>
                        </View>
                    </View>
                )}

                {/* ——— MY SAVED FLIGHTS ——— */}
                {myFlights.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>MY FLIGHTS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {myFlights.map((f: any) => (
                                <View key={f.id} style={{ backgroundColor: '#111', padding: 16, borderRadius: 16, marginRight: 10, width: 140, borderWidth: 1, borderColor: '#222' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{f.flight_number}</Text>
                                        <TouchableOpacity onPress={() => removeMyFlight(f.id)}>
                                            <Text style={{ color: '#FF3B30', fontSize: 17 }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={{ color: '#4CD964', fontSize: 10, fontWeight: 'bold', marginTop: 8 }}>FOLLOWING</Text>
                                    <Text style={{ color: '#B0B0B0', fontSize: 9, marginTop: 2 }}>In real time</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ——— A) REAL-TIME STATUS PANEL ——— */}
                <View style={{
                    backgroundColor: '#111',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: '#1A1A1A',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: flightData ? '#4CD964' : '#666', marginRight: 10 }} />
                        <View>
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                                {flightData
                                    ? (flightData.departure?.delay || 0) >= 60
                                        ? '⚠️ 1 flight with incident'
                                        : '✅ No incidents'
                                    : '— No active flights'}
                            </Text>
                            <Text style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                                Last check: {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => { if (flightData?.flightNumber) { searchFlight(flightData.flightNumber); setLastUpdate(new Date()); } }}
                        style={{
                            backgroundColor: flightData ? 'rgba(175, 82, 222, 0.2)' : 'rgba(255,255,255,0.05)',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: flightData ? 'rgba(175, 82, 222, 0.4)' : '#222',
                        }}
                    >
                        <Text style={{ color: flightData ? '#AF52DE' : '#666', fontSize: 10, fontWeight: 'bold' }}>UPDATE</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 120 }} />

            </ScrollView>

            {/* ——— DEMO SELECTOR MODAL ——— */}
            <Modal
                visible={showDemoMenu}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDemoMenu(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowDemoMenu(false)}
                >
                    <View style={{ backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                        <View style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>Select a Scenario</Text>
                        <Text style={{ color: '#8E8E93', fontSize: 13, marginBottom: 20 }}>Test the power of AI in extreme situations.</Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {demoOptions.map((opt, i) => {
                                const isLocked = opt.code.includes('VIP') && travelProfile !== 'premium';
                                return (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => {
                                        if (isLocked) {
                                            Alert.alert("🔒 RESTRICTED ACCESS", "This simulation is exclusive to the Premium profile. Go to 'VIP' or 'Profile' to change your traveler profile and unlock this scenario.");
                                            return;
                                        }
                                        launchDemo(opt.code);
                                    }}
                                    activeOpacity={isLocked ? 1 : 0.7}
                                    style={{
                                        backgroundColor: '#2C2C2E',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 10,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        opacity: isLocked ? 0.5 : 1
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                                            {opt.name}
                                        </Text>
                                        <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: '600' }}>
                                            {opt.desc}
                                        </Text>
                                    </View>
                                    <View style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)', marginLeft: 10 }}>
                                        <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: 'bold' }}>{isLocked ? '🔒 VIP' : opt.code}</Text>
                                    </View>
                                </TouchableOpacity>
                                );
                            })}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
