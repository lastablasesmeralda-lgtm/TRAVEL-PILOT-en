import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Dimensions, FlatList, Animated, Easing, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        image: require('../../assets/onboarding1.jpg'), // Intel/Inicio
        title: 'THIS IS NOT A TRAVEL APP',
        subtitle: 'Regular apps inform you of a problem. FlightPilot gives you the tools to solve it in seconds.\n\nIt is the first app in the world that detects and manages what goes wrong on your trip.',
        accent: '#9333EA', // Púrpura (Intel)
    },
    {
        id: '2',
        image: require('../../assets/onboarding2.jpg'), // Radar/Vuelos
        title: 'YOU ONLY NEED YOUR FLIGHT',
        subtitle: 'Enter your flight number (e.g., BA2490).\n\nFrom that moment on, my AI will be monitoring 24/7 every detail. You forget about everything.',
        accent: '#3B82F6', // Azul (Radar)
    },
    {
        id: '3',
        image: require('../../assets/onboarding3.jpg'), // Vault/Docs
        title: 'DELAY? WE TAKE ACTION',
        subtitle: 'If your flight is delayed, the AI:\n• Coordinates with your hotel to protect your reservation.\n• Finds your best alternatives.\n• Prepares your claim for up to €600.\nAll ready. You decide in seconds.',
        accent: '#EF4444', // Rojo (Vault)
    },
    {
        id: '4',
        image: require('../../assets/onboarding4.jpg'), // Bio/Perfil
        title: 'THE RESCUE PROTOCOL',
        subtitle: 'My AI will detect any incident and act based on your predefined priority:\n\n💎 COMFORT PRIORITY — Elite relocation and VIP lounge access.\n💰 REFUND PRIORITY — Maximum legal financial compensation.\n\nAll managed. You just decide.',
        accent: '#D4AF37', // Dorado de status
    },
    {
        id: '5',
        image: require('../../assets/onboarding5.jpg'), // VIP
        title: 'VIP UNIVERSE EXCLUSIVE',
        subtitle: 'When your flight fails, the AI acts for you.\n\n• Automatic EU261 claims up to €600.\n• Contingency plans personalized to your profile.\n• Proactive AI assistant: we notify you before the airline knows.\n• Premium voice and early access to new features.\n\nAll managed. You just decide.',
        accent: '#D4AF37', // Dorado (VIP)
    },
    {
        id: '6',
        image: require('../../assets/onboarding5.jpg'), // Placeholder
        title: 'QUICK START GUIDE',
        subtitle: '1️⃣ PROFILE 👤\nChoose your Level. (Standard: Travel guide and basic assistance tools. VIP: The AI automatically notifies the hotel, drafts claims and assists your relocations).\n\n2️⃣ DOCS 🔐\nTap "UPDATE FROM MY EMAILS" to import reservations and tickets.\n\n3️⃣ FLIGHT SIMULATION 🚀\nWant to see the full potential? In the RADAR tab, tap the orange button and choose one of the 6 crisis scenarios to see the AI in action.',
        accent: '#10B981', // Verde Esmeralda
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState<boolean | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const checkDisclaimer = async () => {
            try {
                const accepted = await AsyncStorage.getItem('disclaimerOnboardingAccepted');
                setIsDisclaimerAccepted(accepted === 'true');
            } catch (e) {
                setIsDisclaimerAccepted(false);
            }
        };
        checkDisclaimer();
    }, []);

    const handleAcceptDisclaimer = async () => {
        try {
            await AsyncStorage.setItem('disclaimerOnboardingAccepted', 'true');
            setIsDisclaimerAccepted(true);
        } catch (e) {
            setIsDisclaimerAccepted(true); // Smooth fallback
        }
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
                flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
                setCurrentIndex(currentIndex + 1);
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            });
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        onComplete();
    };

    const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
        <View style={{
            width,
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 25,
        }}>
            {/* 3D Card Icon */}
            <View style={{
                height: item.id === '6' ? '18%' : '42%',
                width: '100%',
                borderRadius: 40,
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: item.id === '6' ? 15 : 30,
                overflow: 'hidden'
            }}>
                {item.id === '6' ? (
                    <Text style={{ fontSize: 75 }}>🚀</Text>
                ) : (
                    <Image
                        source={item.image}
                        style={{ width: '85%', height: '85%' }}
                        resizeMode="contain"
                    />
                )}
            </View>

            {/* Dynamic Premium Text */}
            <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 10 }}>
                <Text style={{
                    color: '#FFF',
                    fontSize: 28,
                    fontWeight: '900',
                    textAlign: 'center',
                    marginBottom: 15,
                    letterSpacing: -0.5
                }}>
                    {item.title}
                </Text>

                <Text style={{
                    color: '#B0B0B0',
                    fontSize: item.id === '6' ? 14 : 16,
                    textAlign: 'left',
                    lineHeight: item.id === '6' ? 22 : 24,
                    fontWeight: '400',
                    paddingHorizontal: item.id === '6' ? 5 : 10
                }}>
                    {item.subtitle}
                </Text>
            </View>
        </View>
    );

    if (isDisclaimerAccepted === null) return null;

    if (!isDisclaimerAccepted) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', paddingHorizontal: 25, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: '100%', alignItems: 'center' }}>
                    {/* Disclaimer Icon */}
                    <View style={{
                        height: 200,
                        width: '100%',
                        borderRadius: 40,
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 30,
                    }}>
                        <Text style={{ fontSize: 80 }}>🛡️</Text>
                    </View>

                    <Text style={{
                        color: '#FFF',
                        fontSize: 32,
                        fontWeight: '900',
                        textAlign: 'center',
                        marginBottom: 15,
                        letterSpacing: -1
                    }}>
                        Before we begin
                    </Text>

                    <Text style={{
                        color: '#B0B0B0',
                        fontSize: 16,
                        textAlign: 'center',
                        lineHeight: 24,
                        marginBottom: 40,
                        paddingHorizontal: 15
                    }}>
                        FlightPilot uses artificial intelligence to inform and guide you in real time.{"\n\n"}
                        Automatic actions like notifying your hotel or preparing claims always require your final confirmation.{"\n\n"}
                        We never act without your knowledge. You are always in control.
                    </Text>

                    <TouchableOpacity
                        onPress={handleAcceptDisclaimer}
                        style={{
                            backgroundColor: '#9333EA',
                            width: '100%',
                            paddingVertical: 20,
                            borderRadius: 16,
                            alignItems: 'center',
                            shadowColor: '#9333EA',
                            shadowOpacity: 0.4,
                            shadowRadius: 15,
                            elevation: 10
                        }}
                    >
                        <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 1 }}>UNDERSTOOD</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const isLastSlide = currentIndex === SLIDES.length - 1;

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Top Badge */}
            <View style={{ position: 'absolute', top: 60, width: '100%', alignItems: 'center', zIndex: 10 }}>
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#444' }}>
                    <Text style={{ color: '#AAA', fontSize: 11, fontWeight: '900', letterSpacing: 3 }}>FLIGHTPILOT AI</Text>
                </View>
            </View>

            {/* Skip button */}
            <TouchableOpacity
                onPress={handleFinish}
                style={{
                    position: 'absolute', top: 55, right: 10, zIndex: 20,
                    paddingHorizontal: 16, paddingVertical: 8,
                }}
            >
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 'bold' }}>SKIP</Text>
            </TouchableOpacity>

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(idx);
                }}
            />

            {/* Bottom section */}
            <View style={{
                paddingHorizontal: 40,
                paddingBottom: 60,
                alignItems: 'center',
            }}>
                {/* Animated Dots */}
                <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: currentIndex === i ? 28 : 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: currentIndex === i ? SLIDES[currentIndex].accent : '#222',
                                marginHorizontal: 4,
                                // Shadow glow for active dot
                                ...(currentIndex === i ? {
                                    shadowColor: SLIDES[currentIndex].accent,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.6,
                                    shadowRadius: 8,
                                    elevation: 8,
                                } : {}),
                            }}
                        />
                    ))}
                </View>

                {/* Beta Badge */}
                {isLastSlide && (
                    <Text style={{
                        color: '#888',
                        fontSize: 11,
                        marginBottom: 15,
                        textAlign: 'center',
                        fontWeight: '500',
                        letterSpacing: 0.5
                    }}>
                        Free beta phase. No credit card required.
                    </Text>
                )}

                {/* Button */}
                <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.8}
                    style={{
                        backgroundColor: SLIDES[currentIndex].accent,
                        width: '100%',
                        paddingVertical: 18,
                        borderRadius: 16,
                        alignItems: 'center',
                        // Button glow
                        shadowColor: SLIDES[currentIndex].accent,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    <Text style={{
                        color: '#FFF',
                        fontSize: 17,
                        fontWeight: '900',
                        letterSpacing: 0.5,
                    }}>
                        {isLastSlide ? 'GET STARTED' : 'NEXT'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
