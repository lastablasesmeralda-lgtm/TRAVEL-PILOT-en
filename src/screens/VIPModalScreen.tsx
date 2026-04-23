import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { s } from '../styles';

const { width } = Dimensions.get('window');

interface VIPModalScreenProps {
    onClose?: () => void;
    onActivate?: () => void;
}

export default function VIPModalScreen({ onClose, onActivate }: VIPModalScreenProps) {
    const { travelProfile, setTravelProfile } = useAppContext();
    const navigation = useNavigation<any>();

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigation.navigate('Intel');
        }
    };

    const benefits = [
        {
            icon: '⚖️',
            title: 'Claims Assistance',
            desc: 'Automatic management of your EU261 compensation of up to €600. No forms or red tape. We fight, you get paid.',
        },
        {
            icon: '⚡',
            title: 'Instant Reaction AI Agent',
            desc: 'Your personal assistant locates exclusive alternative routes and high-end hotels before you even leave the departure lounge.',
        },
        {
            icon: '🎩',
            title: 'Executive Crisis Resolution',
            desc: 'Priority alternative flight, courtesy hotel or full refund. Three master options. You decide with one tap.',
        },
        {
            icon: '⚖️',
            title: '24/7 Predictive Surveillance',
            desc: 'Receive critical alerts before anyone else. Total and proactive control of every second of your journey with direct reports.',
        },
        {
            icon: '🛡️',
            title: 'Secure File Vault',
            desc: 'Military-grade encrypted documentation. Passports and tickets accessible without Wi-Fi from anywhere in the world.',
        },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 150 }}>
            {/* Header with Image */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/onboarding4.jpg')}
                    style={styles.headerImage}
                    resizeMode="cover"
                />
                <View style={styles.overlay}>
                    <TouchableOpacity onPress={handleClose} style={{ position: 'absolute', top: 85, right: 25, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>EXCLUSIVE ACCESS</Text>
                    </View>
                    <Text style={styles.title}>VIP UNIVERSE</Text>
                    <Text style={styles.subtitle}>The ultimate experience for the invincible traveler</Text>
                </View>
            </View>

            {/* Benefits List */}
            <View style={styles.content}>
                {benefits.map((b, i) => (
                    <View key={i} style={styles.benefitCard}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>{b.icon}</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.benefitTitle}>{b.title}</Text>
                            <Text style={styles.benefitDesc}>{b.desc}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Subscription */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.subscribeButton, travelProfile === 'premium' && { backgroundColor: '#222', borderColor: '#D4AF37', borderWidth: 1 }]}
                    onPress={() => {
                        if (travelProfile === 'premium') {
                            if (onClose) onClose();
                        } else {
                            setTravelProfile('premium');
                            if (onActivate) onActivate();
                        }
                    }}
                >
                    <Text style={[styles.subscribeText, travelProfile === 'premium' && { color: '#D4AF37' }]}>
                        {travelProfile === 'premium' ? 'I AM PROTECTED (GO BACK)' : 'ACTIVATE VIP STATUS'}
                    </Text>
                </TouchableOpacity>

                {travelProfile !== 'premium' && (
                    <Text style={[styles.legalText, { marginTop: 15, fontSize: 11, lineHeight: 16, color: '#FFFFFF' }]}>
                        Subscription for <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>€7.99 / month</Text> or <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>€59.99 / year</Text>.{"\n"}
                        Cancel anytime.
                    </Text>
                )}
                
                <Text style={[styles.legalText, travelProfile === 'premium' ? { marginTop: 15 } : { marginTop: 6, opacity: 0.5 }]}>
                    Subject to terms and conditions.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    header: {
        height: 350,
        width: '100%',
    },
    headerImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        padding: 30,
        paddingBottom: 40,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D4AF37',
        marginBottom: 15,
    },
    badgeText: {
        color: '#D4AF37',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    title: {
        color: '#FFF',
        fontSize: 38,
        fontWeight: '900',
        letterSpacing: -1,
    },
    subtitle: {
        color: '#B0B0B0',
        fontSize: 16,
        marginTop: 8,
        lineHeight: 22,
    },
    content: {
        padding: 20,
        marginTop: 10,
    },
    benefitCard: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        alignItems: 'center'
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.1)'
    },
    icon: {
        fontSize: 24,
    },
    textContainer: {
        flex: 1,
    },
    benefitTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    benefitDesc: {
        color: '#888',
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    subscribeButton: {
        backgroundColor: '#D4AF37',
        width: '100%',
        paddingVertical: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    },
    subscribeText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    legalText: {
        color: '#888',
        fontSize: 10,
        marginTop: 15,
        textAlign: 'center'
    }
});
