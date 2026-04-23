import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import { useAppContext } from '../context/AppContext';
import { getEU261Amount } from '../utils/flightUtils';

interface VIPAlternativesProps {
    visible: boolean;
    onClose: () => void;
    flightData: any;
    onOpenChat: () => void;
    onGoToClaims: () => void;
    speak?: (text: string) => void;
    setExtraDocs: (fn: any) => void;
    setHasNewDoc: (val: boolean) => void;
    initialDetailView?: string | null;
}

const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function VIPAlternatives({
    visible, onClose, flightData, onOpenChat, onGoToClaims, speak, setExtraDocs, setHasNewDoc, initialDetailView
}: VIPAlternativesProps) {
    const { setChatOrigin, travelProfile } = useAppContext();
    const [detailView, setDetailView] = useState<string | null>(null);

    // Sincronizar el detalle solicitado al abrir
    React.useEffect(() => {
        if (visible && initialDetailView) {
            setDetailView(initialDetailView);
        } else if (!visible) {
            setDetailView(null);
        }
    }, [visible, initialDetailView]);

    const depIata = flightData?.departure?.iata || 'MAD';
    const arrIata = flightData?.arrival?.iata || 'CDG';
    const airline = flightData?.airline || 'Iberia';
    const now = new Date();
    const altDep = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const altArr = new Date(altDep.getTime() + 2.5 * 60 * 60 * 1000);
 
    const delay = flightData?.delayMinutes || flightData?.departure?.delay || 0;
    const isMajorIssue = delay >= 120 || flightData?.status === 'cancelled' || flightData?.status === 'diverted' || flightData?.status === 'RETRASO-400';

    const handleClose = () => {
        setDetailView(null);
        onClose();
    };

    // Base de datos de teléfonos de atención al cliente (España)
    const airlinePhones: Record<string, string> = {
        'iberia': '+34901111500',
        'vueling': '+34931518158',
        'air europa': '+34912010140',
        'ryanair': '+34916978453',
        'easyjet': '+34902599900',
        'wizz air': '+34918755775',
        'lufthansa': '+34900993940',
        'air france': '+34900900370',
        'klm': '+34900100049',
        'british airways': '+34910507585',
        'turkish airlines': '+34917457960',
        'tap air portugal': '+34808205700',
        'brussels airlines': '+34900100140',
    };

    const getAirlinePhone = (airlineName: string): string => {
        if (!airlineName) return '+34901111500';
        const key = airlineName.toLowerCase();
        for (const [name, phone] of Object.entries(airlinePhones)) {
            if (key.includes(name)) return phone;
        }
        return '+34901111500'; // Iberia como fallback
    };

    const airlinePhone = getAirlinePhone(airline);
    const formattedPhone = airlinePhone.replace(/(\+34)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');

    const renderFlightDetail = () => (
        <Modal visible={detailView === 'flight'} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#0A0A0A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#D4AF37', shadowColor: '#D4AF37', shadowOpacity: 0.2, shadowRadius: 30 }}>
                    <View style={{ backgroundColor: '#111', paddingTop: 40, paddingBottom: 25, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 6 }}>📞 REUBICACIÓN INMEDIATA</Text>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>Llama a {airline}</Text>
                        </View>

                        <TouchableOpacity onPress={() => setDetailView(null)} style={{ padding: 10 }}>
                            <Text style={{ color: '#D4AF37', fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={{ maxHeight: 480 }}
                        contentContainerStyle={{ padding: 25, paddingBottom: 50 }}
                        showsVerticalScrollIndicator={true}
                        indicatorStyle="white"
                        persistentScrollbar={true}
                    >

                        <View style={{ backgroundColor: '#0A0A0A', borderRadius: 18, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#333' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>NEXT AVAILABLE FLIGHT</Text>
                                <View style={{ backgroundColor: '#27C93F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                                    <Text style={{ color: '#000', fontSize: 9, fontWeight: 'bold' }}>CONFIRMADO</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900' }}>{depIata}</Text>
                                    <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{fmt(altDep)}</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 15 }}>
                                    <View style={{ height: 1, backgroundColor: '#333', width: '100%', position: 'relative' }}>
                                        <View style={{ position: 'absolute', top: -10, left: '45%' }}>
                                            <Text style={{ fontSize: 16 }}>✈️</Text>
                                        </View>
                                    </View>
                                    <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: 'bold', marginTop: 12 }}>{airline.toUpperCase()} · IB-4022</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900' }}>{arrIata}</Text>
                                    <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{fmt(altArr)}</Text>
                                </View>
                            </View>

                            <Text style={{ color: '#999', fontSize: 12, lineHeight: 18, textAlign: 'center', fontStyle: 'italic' }}>
                                "He reservado una plaza prioritaria para ti. Tienes 15 minutos para confirmar la reubicación antes de que expire el bloqueo VIP."
                            </Text>
                        </View>

                        <View style={{ backgroundColor: '#0A0A0A', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                            {[
                                { label: 'WHAT TO REQUEST', value: `Relocation on next flight to ${arrIata}` },
                                { label: 'TU DERECHO', value: 'EU261 — Reubicación gratuita' },
                                { label: 'TELÉFONO', value: formattedPhone },
                            ].map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: '#1A1A1A' }}>
                                    <Text style={{ color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{item.label}</Text>
                                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', maxWidth: '55%', textAlign: 'right' }}>{item.value}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                const { Linking } = require('react-native');
                                Linking.openURL(`tel:${airlinePhone}`);
                            }}
                            style={{ backgroundColor: '#D4AF37', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>📞 LLAMAR A {airline.toUpperCase()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setDetailView(null);
                                setChatOrigin('vip');
                                handleClose();
                                setTimeout(() => onOpenChat(), 400);
                            }}
                            style={{ backgroundColor: 'rgba(175,82,222,0.15)', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#AF52DE', marginBottom: 20 }}>
                            <Text style={{ color: '#AF52DE', fontWeight: '900', fontSize: 14 }}>💬 OPEN ASSISTANT DURING CALL</Text>
                        </TouchableOpacity>

                        {/* SECCIÓN TREN / TIERRA */}
                        <View style={{ marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1A1A1A' }}>
                            <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 }}>🚢 OTRAS VÍAS DE TRAYECTO</Text>
                            <Text style={{ color: '#666', fontSize: 11, lineHeight: 17, marginBottom: 16 }}>
                                If you prefer to continue your journey by land, your assistant can locate the best combination on High-Speed Train or private Transfer to reach {arrIata}.
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setDetailView(null);
                                    setChatOrigin('vip');
                                    handleClose();
                                    setTimeout(() => onOpenChat(), 400);
                                }}
                                style={{ backgroundColor: '#0A0A0A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}>
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>BUSCAR TREN O TRANSFER VIP →</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    <TouchableOpacity onPress={() => setDetailView(null)} style={{ padding: 18, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#333' }}>
                        <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '900' }}>VOLVER AL PANEL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );



    // ─── CLAIM DRAFT DETAIL ───
    const renderClaimDraft = () => (
        <Modal visible={detailView === 'claim'} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#0A0A0A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#4CD964' }}>
                    <View style={{ backgroundColor: '#111', paddingTop: 40, paddingBottom: 25, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: '#4CD964', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 6 }}>⚖️ INFO RECOPILADA</Text>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>EU261 Claim</Text>
                        </View>
                        <TouchableOpacity onPress={() => setDetailView(null)} style={{ padding: 10 }}>
                            <Text style={{ color: '#4CD964', fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 650 }} contentContainerStyle={{ padding: 25 }}>
                        <View style={{ backgroundColor: '#0A0A0A', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                            {[
                                { label: 'FLIGHT', value: flightData?.flightNumber || flightData?.flight?.iata || '—' },
                                { label: 'AIRLINE', value: airline },
                                { label: 'RUTA', value: `${depIata} → ${arrIata}` },
                                { label: 'DELAY', value: `${flightData?.departure?.delay || 185} min` },
                                { label: 'COMPENSACIÓN', value: getEU261Amount(flightData) },
                                { label: 'ESTADO', value: 'EU261 ELEGIBLE' },
                            ].map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: idx < 5 ? 1 : 0, borderBottomColor: '#1A1A1A' }}>
                                    <Text style={{ color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{item.label}</Text>
                                    <Text style={{ color: idx === 5 ? '#4CD964' : '#FFF', fontSize: 12, fontWeight: '700' }}>{item.value}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={{ backgroundColor: 'rgba(76,217,100,0.06)', padding: 14, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(76,217,100,0.2)', marginBottom: 20 }}>
                            <Text style={{ color: '#4CD964', fontSize: 11, fontWeight: '800', marginBottom: 6 }}>Legal report prepared:</Text>
                            <Text style={{ color: '#999', fontSize: 11, lineHeight: 17 }}>
                                Dear {airline}. Following the incident detected on flight {flightData?.flightNumber || flightData?.flight?.iata || '—'} between {depIata} and {arrIata}, with a verified delay of more than 3 hours, we proceed to formalize the compensation request in accordance with Regulation (EC) 261/2004. As a passenger with the right to assistance, I attach the details collected by FlightPilot for your immediate processing.
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={onGoToClaims}
                            style={{ backgroundColor: '#4CD964', padding: 18, borderRadius: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }}>PROCEDER A LA FIRMA DIGITAL</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <TouchableOpacity onPress={travelProfile === 'standard' ? handleClose : () => setDetailView(null)} style={{ padding: 18, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1A1A1A' }}>
                        <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold' }}>VOLVER</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderSalaVIPDetail = () => (
        <Modal visible={detailView === 'lounge'} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#0A0A0A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#AF52DE' }}>
                    <View style={{ backgroundColor: '#111', paddingTop: 40, paddingBottom: 25, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: '#AF52DE', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 6 }}>🥂 EXCLUSIVO VIP</Text>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>Salas VIP y Confort</Text>
                        </View>
                        <TouchableOpacity onPress={travelProfile === 'standard' ? handleClose : () => setDetailView(null)} style={{ padding: 10 }}>
                            <Text style={{ color: '#AF52DE', fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={{ maxHeight: 580 }}
                        contentContainerStyle={{ padding: 25, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={true}
                        indicatorStyle="white"
                        persistentScrollbar={true}
                    >
                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 14 }}>Espera con la máxima comodidad</Text>
                        <Text style={{ color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
                            As a VIP passenger, you have access to exclusive services while waiting for your next flight. We have located the best options in {depIata}:
                        </Text>

                        {[
                            { icon: '🛋️', title: 'Acceso a Salas VIP', desc: 'Sigue las señales hacia "Sala VIP" en tu terminal. Tienes derecho a solicitar acceso prioritario por incidencia prolongada.' },
                            { icon: '🚿', title: 'Áreas de Descanso', desc: 'Zonas silenciosas con duchas y camas disponibles para esperas superiores a 4 horas.' },
                            { icon: '☕', title: 'Premium Catering', desc: 'Unlimited food and drink included in the member courtesy areas.' },
                        ].map((item, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: '#0A0A0A', padding: 14, borderRadius: 12 }}>
                                <Text style={{ fontSize: 20, marginRight: 12, marginTop: 2 }}>{item.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{item.title}</Text>
                                    <Text style={{ color: '#777', fontSize: 11, marginTop: 3, lineHeight: 16 }}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={() => {
                                setDetailView(null);
                                setChatOrigin('vip');
                                handleClose();
                                setTimeout(() => onOpenChat(), 400);
                            }}
                            style={{ backgroundColor: 'rgba(175,82,222,0.15)', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#AF52DE', marginTop: 10 }}>
                            <Text style={{ color: '#AF52DE', fontWeight: '900', fontSize: 13 }}>📍 REQUEST EXACT LOCATION FROM ASSISTANT</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <TouchableOpacity onPress={() => setDetailView(null)} style={{ padding: 18, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1A1A1A' }}>
                        <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: 'bold' }}>✓ CONFIRMADO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // ─── WAITING COVERAGE DETAIL ───
    const renderPlanB = () => (
        <Modal visible={detailView === 'planB'} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#0A0A0A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#5AC8FA' }}>
                    <View style={{ backgroundColor: '#111', paddingTop: 40, paddingBottom: 25, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 6 }}>🛡️ COBERTURA TOTAL</Text>
                            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>Assistance rights</Text>
                        </View>
                        <TouchableOpacity onPress={travelProfile === 'standard' ? handleClose : () => setDetailView(null)} style={{ padding: 10 }}>
                            <Text style={{ color: '#5AC8FA', fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 580 }} contentContainerStyle={{ padding: 25 }} showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 14 }}>Your rights while waiting</Text>
                        <Text style={{ color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
                            If you prefer to wait for your original flight to operate, your rights are still protected. The airline is obliged to cover the following:
                        </Text>

                        {[
                            { icon: '🍽️', title: 'Food and drink', desc: 'Provided by the airline during the wait.' },
                            { icon: '📱', title: 'Comunicaciones', desc: 'Acceso a llamadas, email o fax (2 usos mínimo).' },
                            { icon: '🏨', title: 'Hotel si es necesario', desc: 'Si la espera requiere pernocta, hotel + traslado incluido.' },
                            { icon: '💶', title: 'Financial compensation', desc: 'Your EU261 claim remains active and independent.' },
                        ].map((item, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: '#0A0A0A', padding: 14, borderRadius: 12 }}>
                                <Text style={{ fontSize: 20, marginRight: 12, marginTop: 2 }}>{item.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{item.title}</Text>
                                    <Text style={{ color: '#777', fontSize: 11, marginTop: 3, lineHeight: 16 }}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={{ backgroundColor: 'rgba(90,200,250,0.06)', padding: 14, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(90,200,250,0.2)', marginBottom: 20 }}>
                            <Text style={{ color: '#999', fontSize: 11, lineHeight: 17 }}>
                                Keep all tickets, invoices and receipts. They are necessary to include them in the claim and maximize your compensation.
                            </Text>
                        </View>

                    </ScrollView>

                    {/* Pista visual de scroll */}
                    <View style={{ alignItems: 'center', paddingVertical: 6, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#1A1A1A' }}>
                        <Text style={{ color: '#5AC8FA', fontSize: 10, fontWeight: '700', letterSpacing: 1, opacity: 0.6 }}>↓ DESLIZA PARA VER MÁS ↓</Text>
                    </View>

                    <TouchableOpacity onPress={travelProfile === 'standard' ? handleClose : () => setDetailView(null)} style={{ padding: 18, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1A1A1A' }}>
                        <Text style={{ color: '#5AC8FA', fontSize: 13, fontWeight: 'bold' }}>✓ CONFIRMADO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // ─── MAIN SCREEN ───
    return (
        <>
            <Modal visible={visible} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#050505' }}>
                    {/* HEADER - Aumentado padding superior para evitar colisión con burbuja de chat */}
                    <View style={{ paddingTop: 85, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.12)' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, marginRight: 15 }}>
                                <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }}>💎 YOUR PERSONAL ASSISTANT</Text>
                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.3 }}>{isMajorIssue ? 'YOUR VIP OPTIONS' : 'YOUR COURTESY PROTOCOL'}</Text>
                                <Text style={{ color: '#777', fontSize: 12, marginTop: 10, lineHeight: 18 }}>
                                    {isMajorIssue 
                                        ? 'Hemos seleccionado lo mejor para tu situación. Elige la opción que más te convenga.' 
                                        : 'This incident is minor. We have activated your privileges so you can wait in total comfort.'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' }}>
                                <Text style={{ color: '#D4AF37', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
                        {travelProfile === 'premium' ? (
                            <>
                                {/* ── OPTION A: PRIORITY FLIGHT ── */}
                                {isMajorIssue && (
                                    <View style={{
                                        backgroundColor: '#0F0F0F', borderRadius: 22, padding: 22, marginBottom: 15,
                                        borderWidth: 1.5, borderColor: '#D4AF37',
                                        shadowColor: '#D4AF37', shadowOpacity: 0.12, shadowRadius: 25, shadowOffset: { width: 0, height: 6 },
                                    }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <View style={{ backgroundColor: 'rgba(212,175,55,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(212,175,55,0.5)' }}>
                                                <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }}>OPCIÓN A · RESCATE INMEDIATO</Text>
                                            </View>
                                            <View style={{ backgroundColor: '#27C93F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                                                <Text style={{ color: '#000', fontSize: 9, fontWeight: 'bold' }}>VIP LOCKED</Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, backgroundColor: '#050505', padding: 15, borderRadius: 12 }}>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>{depIata}</Text>
                                                <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{fmt(altDep)}</Text>
                                            </View>
                                            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 10 }}>
                                                <View style={{ height: 1, backgroundColor: '#333', width: '100%', position: 'relative' }}>
                                                    <View style={{ position: 'absolute', top: -10, left: '42%' }}>
                                                        <Text style={{ fontSize: 14 }}>✈️</Text>
                                                    </View>
                                                </View>
                                                <Text style={{ color: '#D4AF37', fontSize: 8, fontWeight: 'bold', marginTop: 10 }}>{airline.toUpperCase()} · IB-4022</Text>
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>{arrIata}</Text>
                                                <Text style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{fmt(altArr)}</Text>
                                            </View>
                                        </View>

                                        <TouchableOpacity onPress={() => setDetailView('flight')} style={{ backgroundColor: '#D4AF37', padding: 15, borderRadius: 14, alignItems: 'center' }}>
                                            <Text style={{ color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>COMPLETAR RESERVA VIP</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* ── SEPARATOR ── */}
                                <Text style={{ color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 14, marginTop: 6 }}>{isMajorIssue ? 'OTRAS VÍAS DISPONIBLES' : 'SERVICIOS DE CONFORT ACTIVOS'}</Text>

                                {/* ── CARD 2: RECLAMACIÓN PREPARADA ── */}
                                {isMajorIssue && (
                                    <TouchableOpacity
                                        onPress={() => setDetailView('claim')}
                                        activeOpacity={0.7}
                                        style={{ backgroundColor: '#0F0F0F', borderRadius: 18, padding: 20, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#4CD964', borderWidth: 1, borderColor: '#1A1A1A' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(76,217,100,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                                <Text style={{ fontSize: 20 }}>📋</Text>
                                            </View>
                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1 }}>Claim prepared</Text>
                                        </View>
                                        <Text style={{ color: '#888', fontSize: 12, lineHeight: 18, marginBottom: 14, marginLeft: 52 }}>
                                            Tu incidencia ya está resumida para revisión y envío.
                                        </Text>
                                        <View style={{ marginLeft: 52 }}>
                                            <View style={{ backgroundColor: 'rgba(76,217,100,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
                                                <Text style={{ color: '#4CD964', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>VER SIGUIENTES PASOS →</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* ── CARD 3: SALAS VIP Y CONFORT ── */}
                                <TouchableOpacity
                                    onPress={() => setDetailView('lounge')}
                                    activeOpacity={0.7}
                                    style={{ backgroundColor: '#0F0F0F', borderRadius: 18, padding: 20, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#AF52DE', borderWidth: 1, borderColor: '#1A1A1A' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(175,82,222,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <Text style={{ fontSize: 20 }}>🥂</Text>
                                        </View>
                                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1 }}>Salas VIP y Confort</Text>
                                    </View>
                                    <Text style={{ color: '#888', fontSize: 12, lineHeight: 18, marginBottom: 14, marginLeft: 52 }}>
                                        Enjoy the best comfort while waiting for your flight.
                                    </Text>
                                    <View style={{ marginLeft: 52 }}>
                                        <View style={{ backgroundColor: 'rgba(175,82,222,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
                                            <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>LOCALIZAR SALA VIP →</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* ── CARD: RESERVA DE HOTEL DE URGENCIA (BOOKING AFFILIATE) ── */}
                                {isMajorIssue && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            const destStr = flightData?.arrival?.city || flightData?.arrival?.airport || flightData?.arrival?.iata || 'aeropuerto cercano';
                                            const affiliateId = "0000000"; // TODO: Reemplazar con ID de Booking Affiliate real
                                            const { Linking } = require('react-native');
                                            Linking.openURL(`https://www.booking.com/searchresults.es.html?ss=${encodeURIComponent(destStr)}&aid=${affiliateId}`);
                                        }}
                                        activeOpacity={0.7}
                                        style={{ backgroundColor: '#0F0F0F', borderRadius: 18, padding: 20, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#007AFF', borderWidth: 1, borderColor: '#1A1A1A' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,122,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                                <Text style={{ fontSize: 20 }}>🏨</Text>
                                            </View>
                                            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1 }}>Reservar Alojamiento de Urgencia</Text>
                                        </View>
                                        <Text style={{ color: '#888', fontSize: 12, lineHeight: 18, marginBottom: 14, marginLeft: 52 }}>
                                            Airlines take hours to provide accommodation. Book now and use your receipt to demand a refund in your claim.
                                        </Text>
                                        <View style={{ marginLeft: 52 }}>
                                            <View style={{ backgroundColor: 'rgba(0,122,255,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
                                                <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>ABRIR EN BOOKING.COM →</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* ── CARD 4: COBERTURA Y ASISTENCIA ── */}
                                <TouchableOpacity
                                    onPress={() => setDetailView('planB')}
                                    activeOpacity={0.7}
                                    style={{ backgroundColor: '#0F0F0F', borderRadius: 18, padding: 20, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#5AC8FA', borderWidth: 1, borderColor: '#1A1A1A' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(90,200,250,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <Text style={{ fontSize: 20 }}>ℹ️</Text>
                                        </View>
                                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1 }}>Assistance and Coverage</Text>
                                    </View>
                                    <Text style={{ color: '#888', fontSize: 12, lineHeight: 18, marginBottom: 14, marginLeft: 52 }}>
                                        Discover your food and accommodation rights guaranteed by law.
                                    </Text>
                                    <View style={{ marginLeft: 52 }}>
                                        <View style={{ backgroundColor: 'rgba(90,200,250,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
                                            <Text style={{ color: '#5AC8FA', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>VIEW RIGHTS →</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={{ padding: 40, alignItems: 'center', marginTop: 40 }}>
                                <View style={{ padding: 25, borderRadius: 20, backgroundColor: '#0A0A0A', borderStyle: 'dotted', borderWidth: 1, borderColor: '#333' }}>
                                    <Text style={{ color: '#555', textAlign: 'center', fontSize: 13, lineHeight: 22 }}>
                                        This expert assistance channel is managed by Elite human intelligence. Click the X to return to your general panel.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Footer */}
                        <View style={{ marginTop: 20, alignItems: 'center', opacity: 0.5 }}>
                            <Text style={{ color: '#D4AF37', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }}>TRAVEL-PILOT · SERVICIO ÉLITE</Text>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {renderFlightDetail()}
            {renderSalaVIPDetail()}
            {renderClaimDraft()}
            {renderPlanB()}
        </>
    );
}
