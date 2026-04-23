import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { s } from '../styles';
import { useAppContext } from '../context/AppContext';
import { BACKEND_URL } from '../../config';
import VIPModalScreen from './VIPModalScreen';

export default function BioScreen() {
    const {
        availableVoices, selectedVoice, setSelectedVoice, user,
        setHasSeenOnboarding, userPhone, setUserPhone, setIsReplayingTutorial,
        travelProfile, setTravelProfile, speak, simulatePushNotification, handleLogout,
        savedTime, recoveredMoney, masterReset,
        userFullName, setUserFullName, userIdNumber, setUserIdNumber
    } = useAppContext();
    const [showGuide, setShowGuide] = React.useState(false);
    const [showVip, setShowVip] = React.useState(false);

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0A' }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 100, paddingBottom: 120 }}>
            <View style={{ padding: 20 }}>
                {/* ——— STATUS HEADER ——— */}
                <View style={{
                    backgroundColor: '#111',
                    borderRadius: 24,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: travelProfile === 'premium' ? '#D4AF37' : '#333',
                    borderLeftWidth: 6,
                    borderLeftColor: travelProfile === 'premium' ? '#D4AF37' : '#555'
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={{ color: travelProfile === 'premium' ? '#D4AF37' : '#B0B0B0', fontWeight: '900', fontSize: 17 }}>
                            STATUS: {travelProfile === 'premium' ? 'ELITE ACTIVATED' : 'EXPLORER'}
                        </Text>
                        <View style={{ backgroundColor: travelProfile === 'premium' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                            <Text style={{ color: travelProfile === 'premium' ? '#D4AF37' : '#777', fontWeight: 'bold', fontSize: 11 }}>
                                {travelProfile === 'premium' ? 'VIP TRAVELER' : 'BASIC MODE'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#222', borderRadius: 3, marginBottom: 10 }}>
                        <View style={{ width: travelProfile === 'premium' ? '100%' : '30%', height: '100%', backgroundColor: travelProfile === 'premium' ? '#D4AF37' : '#555', borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: '#888', fontSize: 12 }}>
                        {travelProfile === 'premium' ? 'Your FlightPilot protection is active and monitoring.' : 'Standard protection enabled. Upgrade to VIP for full coverage.'}
                    </Text>
                </View>

                {/* ——— CONNECTION STATUS ——— */}
                <View style={{
                    flexDirection: 'row',
                    marginTop: 20,
                    backgroundColor: '#0D0D0D',
                    borderRadius: 16,
                    padding: 15,
                    borderWidth: 1,
                    borderColor: '#222',
                    alignItems: 'center'
                }}>
                    <View style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: '#4CD964', marginRight: 12,
                        shadowColor: '#4CD964', shadowOpacity: 0.5, shadowRadius: 5
                    }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>ASSISTANCE CONNECTED</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 11 }}>Synced with FlightPilot Global</Text>
                    </View>
                    <Text style={{ color: '#444', fontSize: 11 }}>Ping: 42ms</Text>
                </View>

                <Text style={[s.b, { marginTop: 30, marginBottom: 15 }]}>YOUR SAVINGS</Text>
                <View style={s.statsCard}>
                    <View style={s.statBox}>
                        <Text style={{ color: '#AF52DE', fontSize: 25, fontWeight: '900' }}>{savedTime} H</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold' }}>TIME SAVED</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={{ color: '#4CD964', fontSize: 25, fontWeight: '900' }}>€{recoveredMoney}</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold' }}>MONEY RECOVERED</Text>
                    </View>
                </View>

                {/* ——— SECURITY INFORMATION ——— */}
                <Text style={[s.b, { marginTop: 10, marginBottom: 15 }]}>SECURITY INFORMATION</Text>
                <View style={[s.statsCard, { flexDirection: 'column' }]}>
                    <View style={{ width: '100%', marginBottom: 15 }}>
                        <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>NAME</Text>
                        <TextInput
                            value={userFullName}
                            onChangeText={setUserFullName}
                            placeholder="Your full name"
                            placeholderTextColor="#444"
                            style={{ backgroundColor: '#1A1A1A', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}
                        />
                    </View>

                    <View style={{ width: '100%', marginBottom: 15 }}>
                        <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>ID / PASSPORT</Text>
                        <TextInput
                            value={userIdNumber}
                            onChangeText={setUserIdNumber}
                            placeholder="Your ID or passport number"
                            placeholderTextColor="#444"
                            style={{ backgroundColor: '#1A1A1A', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}
                        />
                    </View>

                    <View style={{ width: '100%', marginBottom: 15 }}>
                        <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: 'bold', marginBottom: 5 }}>PHONE</Text>
                        <TextInput
                            value={userPhone}
                            onChangeText={setUserPhone}
                            placeholder="Your phone (e.g., +1 555...)"
                            placeholderTextColor="#444"
                            keyboardType="phone-pad"
                            style={{ backgroundColor: '#1A1A1A', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}
                        />
                    </View>

                    <TouchableOpacity
                         onPress={async () => {
                             await AsyncStorage.setItem('userFullName', userFullName);
                             await AsyncStorage.setItem('userIdNumber', userIdNumber);
                             await AsyncStorage.setItem('userPhone', userPhone);
                             Alert.alert('✅ Success', 'Information updated and encrypted.');
                         }}
                         style={{ backgroundColor: '#4CD964', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                    >
                         <Text style={{ color: '#000', fontWeight: 'bold' }}>SAVE CHANGES</Text>
                    </TouchableOpacity>
                </View>

                {/* ——— TRAVEL PROFILE (AI) ——— */}
                <Text style={[s.b, { marginTop: 30, marginBottom: 15 }]}>TRAVELER PROFILE (AI)</Text>
                <View style={[s.statsCard, { flexDirection: 'column' }]}>
                    <Text style={{ color: '#B0B0B0', fontSize: 11, marginBottom: 15, lineHeight: 16 }}>
                        The AI will use this profile to make automatic decisions in case of serious incidents.
                    </Text>

                    <View style={{ gap: 10 }}>

                        <TouchableOpacity
                            onPress={() => setTravelProfile('budget')}
                            style={{
                                backgroundColor: travelProfile === 'budget' ? 'rgba(52, 199, 89, 0.1)' : '#1A1A1A',
                                borderWidth: 1,
                                borderColor: travelProfile === 'budget' ? '#34C759' : '#333',
                                borderRadius: 12,
                                padding: 15
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={{ fontSize: 18, marginRight: 8 }}>🎒</Text>
                                <Text style={{ color: travelProfile === 'budget' ? '#34C759' : '#FFF', fontSize: 14, fontWeight: 'bold' }}>STANDARD MODE</Text>
                            </View>
                            <Text style={{ color: '#B0B0B0', fontSize: 11 }}>Standard flight monitoring. Advanced AI resolution protocols are reserved for VIP users.</Text>
                        </TouchableOpacity>
                    </View>

                    {/* SPECIAL SECTION: VIP LEGAL SHIELD (Premium Service) */}
                    <View style={{ marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#222' }}>
                        <TouchableOpacity
                            onPress={() => setShowVip(true)}
                            style={{
                                backgroundColor: travelProfile === 'premium' ? 'rgba(212, 175, 55, 0.1)' : '#1A1A1A',
                                borderWidth: travelProfile === 'premium' ? 2 : 1,
                                borderColor: travelProfile === 'premium' ? '#D4AF37' : '#333',
                                borderRadius: 16,
                                padding: 20,
                                shadowColor: travelProfile === 'premium' ? '#D4AF37' : 'transparent',
                                shadowOpacity: travelProfile === 'premium' ? 0.3 : 0,
                                shadowRadius: travelProfile === 'premium' ? 10 : 0
                            }}
                        >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 24, marginRight: 10 }}>💎</Text>
                                    <Text style={{ color: '#D4AF37', fontSize: 16, fontWeight: '900' }}>VIP LEGAL SHIELD</Text>
                                </View>
                                {travelProfile === 'premium' && (
                                    <View style={{ backgroundColor: '#D4AF37', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                        <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>ACTIVE</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                                {travelProfile === 'premium' ? 'Full Protection Activated' : 'Unlock Elite Assistance'}
                            </Text>
                            <Text style={{ color: '#B0B0B0', fontSize: 11, lineHeight: 16 }}>
                                {travelProfile === 'premium'
                                    ? 'You are covered against delays, cancellations and lost baggage with absolute priority.'
                                    : 'Access the automatic claims system, VIP lounges and 24/7 human assistance.'}
                            </Text>
                            <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: 'bold', marginTop: 12 }}>
                                {travelProfile === 'premium' ? 'MANAGE MY SUBSCRIPTION →' : 'LEARN MORE & ACTIVATE →'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ——— VOICE ——— */}
                <Text style={[s.b, { marginTop: 30, marginBottom: 15 }]}>ASSISTANT VOICE</Text>
                <View style={s.statsCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: 'bold', marginBottom: 5 }}>SELECTED VOICE:</Text>
                        <Text style={{ color: '#FFF', fontSize: 11 }}>{availableVoices.find((v: any) => v.identifier === selectedVoice)?.humanName?.toUpperCase() || 'Native Voice'}</Text>

                        <Text style={{ color: '#B0B0B0', fontSize: 10, marginTop: 12, marginBottom: 10 }}>QUICK SELECT</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {availableVoices.slice(0, 5).map((v: any, i: number) => {
                                const isLocked = v.isPremium && travelProfile !== 'premium';
                                return (
                                    <TouchableOpacity
                                        key={v.identifier || i}
                                        style={[
                                            s.voiceBtn,
                                            selectedVoice === v.identifier && s.voiceBtnSelected,
                                            isLocked && { opacity: 0.6, borderColor: '#555' }
                                        ]}
                                        onPress={() => {
                                            if (isLocked) {
                                                Alert.alert('Premium Access', 'Mark and Claire voices are exclusive to VIP users. Upgrade your plan to unlock them.');
                                                return;
                                            }
                                            setSelectedVoice(v.identifier);
                                            // speak('Hello, I am your intelligent travel assistant.', v.identifier);
                                        }}
                                    >
                                        <Text style={{ color: selectedVoice === v.identifier ? '#000' : '#AF52DE', fontSize: 10, fontWeight: 'bold' }}>
                                            {isLocked ? `🔒 ${v.humanName?.toUpperCase()}` : v.humanName?.toUpperCase() || `VOICE ${i + 1}`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>

                {/* ——— HELP & TUTORIAL ——— */}
                <Text style={[s.b, { marginTop: 30, marginBottom: 15 }]}>📖 HELP CENTER</Text>
                <TouchableOpacity
                    onPress={async () => {
                        await AsyncStorage.removeItem('hasSeenOnboarding');
                        setIsReplayingTutorial(true);
                        setHasSeenOnboarding(false);
                    }}
                    style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 15 }}>🎬</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>WATCH WELCOME TUTORIAL</Text>
                    </View>
                    <Text style={{ color: '#007AFF', fontSize: 18 }}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowGuide(true)}
                    style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#AF52DE', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 15 }}>📖</Text>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>TRAVELER'S GUIDE</Text>
                    </View>
                    <Text style={{ color: '#AF52DE', fontSize: 18 }}>→</Text>
                </TouchableOpacity>

                {/* ——— MASTER RESET (FOR BETA) ——— */}
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert(
                            "🔄 MASTER RESET (BETA MODE)",
                            "This will delete all your savings, flights and documents to start fresh.\n\nAre you sure?",
                            [
                                { text: "CANCEL", style: 'cancel' },
                                { text: "YES, RESET ALL", style: 'destructive', onPress: () => masterReset() }
                            ]
                        );
                    }}
                    style={{
                        backgroundColor: 'rgba(255, 149, 0, 0.1)',
                        padding: 20,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#FF9500',
                        alignItems: 'center',
                        marginBottom: 15
                    }}
                >
                    <Text style={{ color: '#FF9500', fontWeight: 'bold', fontSize: 15 }}>MASTER RESET (BETA 0.0)</Text>
                </TouchableOpacity>

                {/* ——— LOG OUT ——— */}
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert("LOG OUT", "Are you sure you want to log out?", [
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
                        marginBottom: 100
                    }}
                >
                    <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 15 }}>LOG OUT</Text>
                </TouchableOpacity>
            </View>

            {/* TRAVELER'S GUIDE MODAL */}
            <Modal visible={showGuide} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.98)', paddingTop: 60 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20 }}>
                        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>HOW WE PROTECT YOU</Text>
                        <TouchableOpacity onPress={() => setShowGuide(false)} style={{ backgroundColor: '#222', padding: 8, borderRadius: 15, width: 40, alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }}>
                        <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10 }}>YOUR PREMIUM EXPERIENCE ✨</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 14, lineHeight: 20, marginBottom: 30 }}>
                            Welcome to <Text style={{ color: '#FFF', fontWeight: 'bold' }}>FlightPilot</Text>. These are the 9 key features designed to keep your trips peaceful and under control.
                        </Text>

                        {[
                            { id: '1', t: 'Trip Organizer', d: 'Register your trip in the HOME tab to activate your protection shield. By doing so, you link your flight with your accommodation and allow our AI to cross-manage weather, schedules and your hotel security in real time.', icon: '🗺️' },
                            { id: '2', t: 'Flight Tracker', d: 'Enter your code in the RADAR tab. We activate 24/7 satellite surveillance via AI that will notify you of any alteration or last-minute change instantly.', icon: '🛰️' },
                            { id: '3', t: 'Smart Alerts', d: 'Zero SPAM. Our algorithm only generates critical notifications when it detects a real risk to your itinerary, allowing you to enjoy your trip without noise but with total safety.', icon: '🔔' },
                            { id: '4', t: 'Refund Management', d: 'We automatically detect delays of 3h+ and cancellations to generate your legal claim of up to €600. You can review, digitally sign your claim and export it as PDF in seconds from the App.', icon: '🛡️' },
                            { id: '5', t: 'Emergency Help', d: 'During a serious crisis, your assistant activates an intelligent voice call to notify your hotel directly of your delay. We protect your accommodation without you having to make any international calls.', icon: '🆘' },
                            { id: '6', t: 'Route Solutions', d: 'Don\'t waste time deciding. Our AI instantly calculates 3 personalized rescue protocols: the Fastest (Flight), the most Economical (Claim) or maximum Comfort (Hotel). You choose with a single tap.', icon: '⚡' },
                            { id: '7', t: 'Copilot 24/7', d: 'Your assistant never sleeps. While you rest or travel, our AI works in the background tracking free seats and transport alternatives to stay ahead of any problem.', icon: '🤖' },
                            { id: '8', t: 'Conversational Agent', d: 'Communicate with your intelligent assistant via voice or text. Our AI knows every detail of your trip and is ready to solve complex queries, translate emergency phrases or coordinate transport in any city.', icon: '🎤' },
                            { id: '9', t: 'Total Privacy', d: 'Your data is sacred. Passports, tickets and claims are stored under maximum encryption in your own Armored Vault, ensuring your personal information is never shared without your explicit permission.', icon: '🔐' },
                        ].map((p, i) => (
                            <View key={i} style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <Text style={{ color: '#444', fontSize: 10, fontWeight: '900' }}>FEATURE {p.id}</Text>
                                    <Text style={{ fontSize: 18 }}>{p.icon}</Text>
                                </View>
                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 6 }}>{p.t.toUpperCase()}</Text>
                                <Text style={{ color: '#888', fontSize: 13, lineHeight: 18 }}>{p.d}</Text>
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={() => setShowGuide(false)}
                            style={{ backgroundColor: '#AF52DE', padding: 18, borderRadius: 15, marginTop: 20, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#FFF', fontWeight: 'bold', letterSpacing: 1 }}>UNDERSTOOD</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={showVip} animationType="slide" transparent>
                <VIPModalScreen
                    onClose={() => setShowVip(false)}
                    onActivate={() => {
                        setTravelProfile('premium');
                        setShowVip(false);
                        Alert.alert('💎 STATUS ACTIVATED', 'Welcome to the VIP Universe.');
                    }}
                />
            </Modal>
        </ScrollView>
    );
}
