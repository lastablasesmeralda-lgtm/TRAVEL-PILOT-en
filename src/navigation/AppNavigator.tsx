import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Text } from 'react-native';
import { useAppContext } from '../context/AppContext';

import IntelScreen from '../screens/IntelScreen';
import VuelosScreen from '../screens/RadarScreen';
import VIPModalScreen from '../screens/VIPModalScreen';
import DocsScreen from '../screens/VaultScreen';
import BioScreen from '../screens/BioScreen';
import { s } from '../styles';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
    const { hasNewDoc } = useAppContext();
    return (
        <Tab.Navigator
            id="AppTabs"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 40, // Bajada para acercar a los botones del sistema
                    left: 15,
                    right: 15,
                    height: 90, // Un poco más alta
                    backgroundColor: 'rgba(2, 6, 17, 1)', // Opaco total para máximo contraste
                    borderRadius: 45,
                    borderTopWidth: 0,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 215, 0, 0.9)',
                    paddingBottom: 5,
                    paddingHorizontal: 15,
                    elevation: 35, // Sombra máxima en Android
                    shadowColor: '#FFD700',
                    shadowOffset: { width: 0, height: 15 },
                    shadowOpacity: 1, // Full Glow
                    shadowRadius: 25
                },
                tabBarButton: (props) => {
                    let icon = '';
                    if (route.name === 'Intel') icon = '💠';
                    else if (route.name === 'Radar') icon = '✈️';
                    else if (route.name === 'VIP') icon = '💎';
                    else if (route.name === 'Vault') icon = '💼';
                    else if (route.name === 'Bio') icon = '👥';

                    const isFocused = props.accessibilityState?.selected;

                    return (
                        <TouchableOpacity
                            {...(props as any)}
                            style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                            activeOpacity={0.7}
                        >
                            <View style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: isFocused ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255,255,255,0.03)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: isFocused ? 2.5 : 0.5,
                                borderColor: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.1)'
                            }}>
                                <Text style={{
                                    fontSize: isFocused ? 33 : 24, 
                                    opacity: isFocused ? 1 : 0.65, // Mucho más visible aun inactivo
                                    transform: [{ scale: isFocused ? 1.3 : 1 }],
                                    textShadowColor: isFocused ? '#FFFFFF' : 'transparent',
                                    textShadowRadius: isFocused ? 25 : 0,
                                    textShadowOffset: { width: 0, height: 0 },
                                }}>
                                    {icon}
                                </Text>
                                {route.name === 'Vault' && hasNewDoc && (
                                    <View style={{
                                        position: 'absolute',
                                        right: -2,
                                        top: -2,
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: '#FF3B30',
                                        borderWidth: 2,
                                        borderColor: '#0C0F14'
                                    }} />
                                )}
                            </View>
                            <Text style={{
                                color: isFocused ? '#FFFFFF' : '#FFD700', // Dorado puro inactivo, Blanco puro activo
                                fontSize: 11,
                                fontWeight: '900',
                                opacity: isFocused ? 1 : 0.6, // Inactivo mucho más brillante
                                marginTop: 4,
                                textTransform: 'uppercase',
                                letterSpacing: isFocused ? 3 : 1.5,
                                textShadowColor: isFocused ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 215, 0, 0.3)',
                                textShadowRadius: isFocused ? 15 : 5
                            }}>
                                {route.name === 'Intel' ? 'HOME' :
                                    route.name === 'Radar' ? 'RADAR' :
                                        route.name === 'VIP' ? 'VIP' :
                                            route.name === 'Vault' ? 'VAULT' : 'PROFILE'}
                            </Text>
                        </TouchableOpacity>
                    );
                }
            })}
        >
            <Tab.Screen name="Intel" component={IntelScreen} />
            <Tab.Screen name="Radar" component={VuelosScreen} />
            <Tab.Screen name="VIP" component={VIPModalScreen} />
            <Tab.Screen name="Vault" component={DocsScreen} />
            <Tab.Screen name="Bio" component={BioScreen} />
        </Tab.Navigator>
    );
}
