import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, Platform, Keyboard, StyleSheet, Modal } from 'react-native';
import { s } from '../styles';
import { useAppContext } from '../context/AppContext';

export default function LoginScreen() {
    const {
        user, authEmail, setAuthEmail, authName, setAuthName, authPassword, setAuthPassword,
        authMode, setAuthMode, authLoading, handleLogin, handleRegister, handleLogout,
        userPhone, setUserPhone
    } = useAppContext();

    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [showTOS, setShowTOS] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // Listen to real keyboard events from the OS
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                // Scroll to bottom after a short delay for layout adjustment
                setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
            }
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const handleFocus = (field: string) => {
        setFocusedField(field);
        // Double scroll: immediate + after keyboard appearance
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 400);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
            <ScrollView 
                ref={scrollRef}
                contentContainerStyle={{ 
                    flexGrow: 1, 
                    padding: 12, 
                    paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 150 
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
            {!user ? (
                <View style={{ padding: 16, backgroundColor: '#111', borderRadius: 16, marginBottom: 12, marginTop: 40, borderWidth: 1, borderColor: '#222' }}>
                    <View style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#333' }}>
                        <Image
                            source={require('../../assets/onboarding2.jpg')}
                            style={{ width: '100%', height: 200 }}
                            resizeMode="cover"
                        />
                    </View>

                    <Text style={{ color: '#F2F2F2', fontSize: 26, fontWeight: '900', marginBottom: 8, letterSpacing: 3, textShadowColor: 'rgba(255, 255, 255, 0.1)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }}>
                        FLIGHT‑PILOT
                    </Text>
                    <Text style={{ color: '#B0B0B0', fontSize: 13, marginBottom: 24, lineHeight: 20, fontWeight: '500' }}>
                        Intelligent assistant for safe travels, managing delays, connections and claims for you.
                    </Text>

                    <View style={{ marginBottom: 30, paddingHorizontal: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ width: 8, height: 2, backgroundColor: '#27C93F', marginRight: 12, borderRadius: 1 }} />
                            <Text style={{ color: '#E0E0E0', fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, flex: 1 }}>
                                <Text style={{ color: '#27C93F' }}>Predictive Monitoring</Text> of all your flights in real-time, watching every change 24/7.
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ width: 8, height: 2, backgroundColor: '#D4AF37', marginRight: 12, borderRadius: 1 }} />
                            <Text style={{ color: '#E0E0E0', fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, flex: 1 }}>
                                <Text style={{ color: '#D4AF37' }}>Compensation Management</Text> legal compensation of up to €600 via EU261 regulation automatically.
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 8, height: 2, backgroundColor: '#00DEFF', marginRight: 12, borderRadius: 1 }} />
                            <Text style={{ color: '#E0E0E0', fontSize: 12.5, fontWeight: '600', letterSpacing: 0.3, flex: 1 }}>
                                <Text style={{ color: '#00DEFF' }}>Immediate Assistance</Text> with alternative plans for hotels and transport in case of any eventuality.
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: '#222', marginBottom: 24 }} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#AF52DE', marginRight: 8, shadowColor: '#AF52DE', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }} />
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>
                            {authMode === 'login' ? 'Your journey starts here' : 'Join FlightPilot'}
                        </Text>
                    </View>
                    <Text style={{ color: '#888', fontSize: 12, marginBottom: 16, marginLeft: 16 }}>
                        {authMode === 'login' ? 'Log in so our AI can look after your journey for you.' : 'Create your profile to start traveling with peace of mind.'}
                    </Text>

                    <TextInput
                        placeholder="Email"
                        placeholderTextColor="#444"
                        value={authEmail}
                        onChangeText={setAuthEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onFocus={() => handleFocus('email')}
                        onBlur={() => setFocusedField(null)}
                        style={{ backgroundColor: '#000', color: 'white', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: focusedField === 'email' ? '#AF52DE' : '#222', fontSize: 14 }}
                    />

                    {authMode === 'register' && (
                        <>
                            <TextInput
                                placeholder="Full name"
                                placeholderTextColor="#444"
                                value={authName}
                                onChangeText={setAuthName}
                                onFocus={() => handleFocus('name')}
                                onBlur={() => setFocusedField(null)}
                                style={{ backgroundColor: '#000', color: 'white', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: focusedField === 'name' ? '#AF52DE' : '#222', fontSize: 14 }}
                            />
                            <TextInput
                                placeholder="Contact phone (e.g., +1...)"
                                placeholderTextColor="#444"
                                value={userPhone}
                                onChangeText={setUserPhone}
                                keyboardType="phone-pad"
                                onFocus={() => handleFocus('phone')}
                                onBlur={() => setFocusedField(null)}
                                style={{ backgroundColor: '#000', color: 'white', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: focusedField === 'phone' ? '#AF52DE' : '#222', fontSize: 14 }}
                            />
                        </>
                    )}

                    <View style={{ position: 'relative', marginTop: 12 }}>
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#444"
                            value={authPassword}
                            onChangeText={setAuthPassword}
                            secureTextEntry={!showPassword}
                            onFocus={() => handleFocus('password')}
                            onBlur={() => setFocusedField(null)}
                            style={{ backgroundColor: '#000', color: 'white', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: focusedField === 'password' ? '#AF52DE' : '#222', fontSize: 14 }}
                        />
                        <TouchableOpacity 
                            onPress={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, justifyContent: 'center', alignItems: 'center' }}
                            activeOpacity={0.6}
                        >
                            <Text style={{ fontSize: 20, color: '#666' }}>{showPassword ? '👁️' : '👁️‍G'}</Text>
                        </TouchableOpacity>
                    </View>

                    {authMode === 'register' && (
                        <View style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#888', fontSize: 11, textAlign: 'center' }}>
                                By clicking "CONFIRM REGISTRATION" you declare to have read and accepted our{' '}
                                <Text 
                                    onPress={() => setShowTOS(true)} 
                                    style={{ color: '#AF52DE', fontWeight: 'bold', textDecorationLine: 'underline' }}
                                >
                                    Legal Shield and Terms of Service
                                </Text>.
                            </Text>
                        </View>
                    )}

                    {/* TERMS OF SERVICE MODAL (LEGAL SHIELD) */}
                    <Modal visible={showTOS} transparent animationType="slide">
                        <View style={{ flex: 1, backgroundColor: '#000', padding: 25, paddingTop: 60 }}>
                            <Text style={{ color: '#AF52DE', fontSize: 24, fontWeight: '900', marginBottom: 10 }}>LEGAL SHIELD</Text>
                            <Text style={{ color: '#888', fontSize: 13, marginBottom: 25, letterSpacing: 1 }}>TERMS OF SERVICE AND USE</Text>
                            
                            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginBottom: 30 }}>
                                <Text style={{ color: '#E0E0E0', fontSize: 15, lineHeight: 24, marginBottom: 20 }}>
                                    1. <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>Nature of the Service:</Text> FlightPilot is an informative monitoring artificial intelligence tool. We are not an airline or a direct legal management service.{"\n\n"}
                                    2. <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>Limitation of Liability:</Text> AI assistant responses are for guidance. Traveler's operational decisions must always be cross-checked with official airport or airline staff.{"\n\n"}
                                    3. <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>Flight Data:</Text> Although we monitor global networks, the official flight status is the one communicated by airport screens. FlightPilot is not responsible for delays in updating external data.{"\n\n"}
                                    4. <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>User Representation Management:</Text> The system does not automatically perform financial transactions, bookings or final cancellations without direct human intervention according to the subscribed Plan.{"\n\n"}
                                    5. <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>Document Protection:</Text> The DOCS Shield provides high-security encrypted storage. The user guarantees they own the legal rights to any document uploaded to the platform.{"\n\n"}
                                    6. <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>EU261 Indemnity:</Text> Compensation calculation is a technical estimate based on European regulations. It does not guarantee final payment, which depends on legal deadlines and airline acceptance.
                                </Text>
                            </ScrollView>

                            <TouchableOpacity 
                                onPress={() => setShowTOS(false)}
                                style={{ backgroundColor: '#AF52DE', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#AF52DE', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>I UNDERSTAND AND ACCEPT</Text>
                            </TouchableOpacity>
                        </View>
                    </Modal>

                    <View style={{ marginTop: 28 }}>
                        <TouchableOpacity
                            onPress={authMode === 'login' ? handleLogin : handleRegister}
                            style={{ 
                                backgroundColor: authMode === 'login' ? '#007AFF' : '#AF52DE', 
                                paddingVertical: 16, 
                                borderRadius: 12, 
                                alignItems: 'center',
                                opacity: authLoading ? 0.6 : 1, 
                                shadowColor: authMode === 'login' ? '#007AFF' : '#AF52DE', 
                                shadowOffset: { width: 0, height: 4 }, 
                                shadowOpacity: 0.4, 
                                shadowRadius: 8, 
                                elevation: 5 
                            }}
                            disabled={authLoading}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>
                                {authMode === 'login' ? 'LOG IN' : 'CONFIRM REGISTRATION'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setAuthMode((prev: string) => (prev === 'login' ? 'register' : 'login'))}
                            style={{ backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginTop: 12, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 12 }}>
                                {authMode === 'login' ? 'CREATE A NEW ACCOUNT' : '← BACK TO LOG IN'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            ) : (
                <View style={{ padding: 40, alignItems: 'center', marginTop: 100, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#222' }}>
                    <Text style={{ color: '#E0E0E0', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>ACTIVE ASSISTANCE</Text>
                    <Text style={{ color: '#888', marginBottom: 30 }}>User: {user?.email}</Text>
                    <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 }}>
                        <Text style={{ color: '#E0E0E0', fontWeight: 'bold' }}>LOG OUT</Text>
                    </TouchableOpacity>
                </View>
            )}
            </ScrollView>
        </View>
    );
}
