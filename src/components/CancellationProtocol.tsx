import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, SafeAreaView, Platform } from 'react-native';
import { useAppContext } from '../context/AppContext';

interface CancellationProtocolProps {
    visible: boolean;
    onClose: () => void;
    flightData: any;
    onOpenChat: () => void;
    onGoToClaims: () => void;
    onOpenVIP: (detail?: string) => void;
    onGoToSubscription: () => void;
}

export default function CancellationProtocol({
    visible, onClose, flightData, onOpenChat, onGoToClaims, onOpenVIP, onGoToSubscription
}: CancellationProtocolProps) {
    const { travelProfile, speak } = useAppContext();

    if (!flightData) return null;

    const flightNum = flightData.flightNumber || 'your flight';
    const airline = flightData.airline || 'tu aerolínea';
    const route = `${flightData.departure?.iata} → ${flightData.arrival?.iata}`;

    const renderAction = (icon: string, title: string, sub: string, onPress: () => void, isPrimary = false) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                backgroundColor: isPrimary ? 'rgba(255, 59, 48, 0.15)' : '#0F0F0F',
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isPrimary ? '#FF3B30' : '#222',
                flexDirection: 'row',
                alignItems: 'center'
            }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isPrimary ? '#FF3B30' : '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                <Text style={{ fontSize: 24 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ color: isPrimary ? '#FF3B30' : '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>{title.toUpperCase()}</Text>
                <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>{sub}</Text>
            </View>
            <Text style={{ color: isPrimary ? '#FF3B30' : '#444', fontSize: 20 }}>›</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                {/* HEADER DE EMERGENCIA */}
                <View style={{ padding: 25, borderBottomWidth: 1, borderBottomColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.05)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', marginRight: 8 }} />
                                <Text style={{ color: '#FF3B30', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>ALERTA DE CANCELACIÓN</Text>
                            </View>
                            <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '900' }}>Protocolo de Rescate</Text>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '300', marginTop: 4 }}>{flightNum} | {route}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ padding: 10, backgroundColor: '#1A1A1A', borderRadius: 20 }}>
                            <Text style={{ color: '#FFF', fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={{ backgroundColor: '#0A0A0A', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#333' }}>
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 10 }}>Situación Verificada</Text>
                        <Text style={{ color: '#999', fontSize: 13, lineHeight: 20 }}>
                            Your flight with {airline} has been formally cancelled. FlightPilot has activated the legal and logistical safeguards to protect your trip.
                        </Text>
                    </View>

                    {travelProfile === 'premium' ? (
                        <>
                            {/* SECCIÓN VIP */}
                            <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textAlign: 'center' }}>★ SERVICIOS DE PRIORIDAD ELITE ★</Text>
                            
                            {renderAction('✈️', 'Reubicación de Rescate', 'Accede a las rutas alternativas ya bloqueadas', () => {
                                onOpenVIP('flight');
                            }, true)}

                            {renderAction('🥂', 'Salas VIP y Confort', 'Acceso a Salas VIP y servicios de estancia Premium', () => {
                                onOpenVIP('lounge');
                            })}

                            {renderAction('⚖️', 'Priority Claim', 'Immediate processing of refund and compensation', () => {
                                onGoToClaims();
                            })}

                        </>
                    ) : (
                        <>
                            {/* SECCIÓN ESTÁNDAR */}
                            <Text style={{ color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textAlign: 'center' }}>PASOS DE REEMBOLSO DISPONIBLES</Text>

                            {renderAction('💰', 'Recuperar mi dinero', 'Solicitar reembolso íntegro y compensación', () => {
                                onGoToClaims();
                            }, true)}

                            {renderAction('🍔', 'Food and Accommodation', 'Consult your legal assistance rights (EU261)', () => {
                                onOpenVIP('planB');
                            })}

                            {/* UPSELL */}
                            <TouchableOpacity 
                                onPress={() => {
                                    speak('In the Premium plan, I personally search and pre-book your new flight so you can reach your destination today. Would you like to upgrade?');
                                    onGoToSubscription();
                                }}
                                style={{ marginTop: 20, padding: 20, backgroundColor: 'rgba(212, 175, 55, 0.08)', borderRadius: 22, borderStyle: 'dotted', borderWidth: 1, borderColor: '#D4AF37', alignItems: 'center' }}>
                                <Text style={{ color: '#D4AF37', fontSize: 12, fontWeight: '900', marginBottom: 6 }}>DESBLOQUEAR PROTOCOLO VIP →</Text>
                                <Text style={{ color: '#888', fontSize: 11, textAlign: 'center' }}>Reubicación inteligente y gestión directa por concierge para llegar a tu destino lo antes posible.</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <View style={{ marginTop: 30, padding: 20, borderTopWidth: 1, borderTopColor: '#1A1A1A', alignItems: 'center' }}>
                        <Text style={{ color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>IDENTIFICADOR: {flightData.id || 'TP-RESCUE-001'}</Text>
                        <Text style={{ color: '#222', fontSize: 9, marginTop: 5 }}>TRAVEL-PILOT PROTOCOL REV 4.2</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
