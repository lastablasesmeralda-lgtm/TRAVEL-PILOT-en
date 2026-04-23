import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Platform, ActivityIndicator, TextInput, Keyboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { s } from '../styles';

export default function ChatView() {
    const {
        showChat, setShowChat, isSpeaking, waveAnim, messages, isTyping, inputText, setInputText,
        handleSendMessage, scrollViewRef, clearMessages, stopSpeak, availableVoices,
        selectedVoice, setSelectedVoice, speak, chatOrigin, setChatOrigin, setTab,
        setShowVIPAlternatives, flightData, compensationEligible, travelProfile
    } = useAppContext();

    const [showVoiceMenu, setShowVoiceMenu] = React.useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        return () => {
            setChatOrigin('global');
        };
    }, []);

    // Escuchar eventos reales del teclado
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Quick Action: escribe y envía automáticamente
    const sendQuickAction = (text: string) => {
        setInputText(text);
        setTimeout(() => {
            handleSendMessage(text);
        }, 100);
    };

    if (!showChat) return null;

    return (
        <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                <View style={s.chatHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 19 }}>🧠 ASISTENTE IA</Text>
                        {isSpeaking && (
                            <Animated.View style={{ flexDirection: 'row', marginLeft: 15, opacity: waveAnim }}>
                                <View style={{ width: 3, height: 15, backgroundColor: '#AF52DE', borderRadius: 2, marginRight: 3 }} />
                                <View style={{ width: 3, height: 25, backgroundColor: '#AF52DE', borderRadius: 2, marginRight: 3 }} />
                                <View style={{ width: 3, height: 15, backgroundColor: '#AF52DE', borderRadius: 2 }} />
                            </Animated.View>
                        )}
                        <TouchableOpacity onPress={() => setShowVoiceMenu(!showVoiceMenu)} style={{ marginLeft: 10 }}>
                            <Text style={{ fontSize: 18 }}>🎙️</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={() => { clearMessages(); stopSpeak(); }} 
                            style={{ marginRight: 20, backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                        >
                            <Text style={{ color: '#999', fontWeight: 'bold', fontSize: 10 }}>BORRAR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowChat(false); setChatOrigin('global'); }}>
                            <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>CERRAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {chatOrigin === 'vip' && (
                    <TouchableOpacity 
                        onPress={() => {
                            setShowChat(false);
                            setTab('Vault');
                            setTimeout(() => setShowVIPAlternatives(true), 400);
                        }}
                        style={{ 
                            backgroundColor: '#AF52DE20', 
                            padding: 12, 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            borderBottomWidth: 1,
                            borderColor: '#AF52DE40'
                        }}
                    >
                        <Text style={{ color: '#AF52DE', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }}>✨ VER OTRAS ALTERNATIVAS VIP</Text>
                        <Text style={{ color: '#AF52DE', marginLeft: 8, fontSize: 14 }}>→</Text>
                    </TouchableOpacity>
                )}

                {showVoiceMenu && (
                    <View style={{ backgroundColor: '#111', padding: 10, borderBottomWidth: 1, borderColor: '#222' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ color: '#E0E0E0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>SELECCIONAR VOZ DEL ASISTENTE</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {availableVoices
                                .slice(0, 4)
                                .map((v: any, index: number) => {
                                    const label = v.humanName || `Asistente ${index + 1}`;
                                    const isVoicePremium = v.isPremium || false;
                                    const isLocked = isVoicePremium && travelProfile !== 'premium';

                                    return (
                                        <TouchableOpacity 
                                            key={v.uniqueId || v.identifier}
                                            onPress={() => { 
                                                if (isLocked) {
                                                    Alert.alert('Acceso Premium', 'Las voces de Marco y Clara son exclusivas para usuarios VIP. Mejora tu plan para desbloquearlas.');
                                                    return;
                                                }
                                                setSelectedVoice(v.identifier); 
                                                speak('He cambiado mi configuración de voz.', v.identifier); 
                                            }} 
                                            style={{ 
                                                backgroundColor: selectedVoice === v.identifier ? '#AF52DE' : '#1A1A1A', 
                                                paddingHorizontal: 16, 
                                                paddingVertical: 10, 
                                                borderRadius: 12, 
                                                marginRight: 12,
                                                borderWidth: 2,
                                                borderColor: selectedVoice === v.identifier ? '#FFF' : (isVoicePremium ? '#D4AF3744' : '#333'),
                                                opacity: isLocked ? 0.7 : 1
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#E0E0E0', fontSize: 13, fontWeight: isVoicePremium ? 'bold' : '500' }}>
                                                    {isLocked ? `🔒 ${label.toUpperCase()}` : label.toUpperCase()}
                                                </Text>
                                            </View>
                                            {isVoicePremium && (
                                                <Text style={{ color: isLocked ? '#666' : '#D4AF37', fontSize: 8, marginTop: 2, fontWeight: 'bold' }}>
                                                    {isLocked ? 'CERRADO (SOLO VIP)' : 'VERSIÓN PREMIUM'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                        </ScrollView>
                    </View>
                )}

                <ScrollView 
                    ref={scrollViewRef} 
                    style={{ flex: 1, padding: 15 }} 
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
                    keyboardShouldPersistTaps="handled"
                >
                    {messages.map((m: any) => (
                        <View key={m.id} style={{ alignSelf: m.isUser ? 'flex-end' : 'flex-start', backgroundColor: m.isUser ? '#AF52DE' : '#111', padding: 15, borderRadius: 15, marginBottom: 10, maxWidth: '80%', borderWidth: m.isUser ? 0 : 1, borderColor: '#222' }}>
                            <Text style={{ color: '#FFF', fontSize: 15 }}>{m.text}</Text>
                        </View>
                    ))}
                    {isTyping && (
                        <View style={{ alignSelf: 'flex-start', backgroundColor: '#111', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#222', flexDirection: 'row' }}>
                            <ActivityIndicator size="small" color="#AF52DE" />
                            <Text style={{ color: '#B0B0B0', fontSize: 13, marginLeft: 10, fontStyle: 'italic' }}>Analizando...</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Quick Action Chips - only when active flight exists */}
                {flightData && !isTyping && messages.length < 4 && (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={{ paddingHorizontal: 15, paddingVertical: 8, maxHeight: 50 }}
                        contentContainerStyle={{ alignItems: 'center', gap: 8 }}
                    >
                        <TouchableOpacity 
                            onPress={() => sendQuickAction('What is the current status of my flight?')}
                            style={{ backgroundColor: '#1A1A2E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#AF52DE40', flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: '600' }}>✈️ My Flight Status</Text>
                        </TouchableOpacity>

                        {compensationEligible && (
                            <TouchableOpacity 
                                onPress={() => sendQuickAction('Am I entitled to compensation for my flight delay? How much according to EU261?')}
                                style={{ backgroundColor: '#1A2E1A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#34C75940', flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Text style={{ color: '#34C759', fontSize: 13, fontWeight: '600' }}>💰 How much am I owed?</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            onPress={() => sendQuickAction('My flight has problems. What should I do right now? Give me concrete steps.')}
                            style={{ backgroundColor: '#2E1A1A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FF453A40', flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#FF6B6B', fontSize: 13, fontWeight: '600' }}>🚨 What do I do now?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => sendQuickAction('Are there alternative flights available from my airport to my destination today?')}
                            style={{ backgroundColor: '#1A1A2E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#5E5CE640', flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Text style={{ color: '#5E5CE6', fontSize: 13, fontWeight: '600' }}>🔄 Alternatives</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}

                <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 10, color: '#888', textAlign: 'center', fontWeight: '500' }}>
                         ⓘ El asistente puede cometer errores.{"\n"}Verifica siempre las decisiones importantes.
                    </Text>
                </View>

                <View style={[s.chatInputWrap, { marginBottom: keyboardHeight > 0 ? keyboardHeight - (Platform.OS === 'ios' ? 34 : 0) : 20 }]}>
                    <TextInput 
                        style={s.chatInput} 
                        placeholder={"Escribe tu mensaje..."} 
                        placeholderTextColor="#666" 
                        value={inputText} 
                        onChangeText={setInputText}
                        keyboardAppearance="dark"
                        keyboardType="default"
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        autoComplete="off"
                        spellCheck={false}
                        textContentType="none"
                        disableFullscreenUI={true}
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                            console.log(`[Chat] Sending message with flight context: ${flightData?.flightNumber || 'None'}`);
                            handleSendMessage();
                        }}
                        onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 350)}
                    />
                    <TouchableOpacity style={s.chatBtn} onPress={() => {
                        console.log(`[Chat] Sending message with flight context: ${flightData?.flightNumber || 'None'}`);
                        handleSendMessage();
                    }}>
                        <Text style={{ color: '#FFF' }}>➤</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}
