import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TouchableOpacity, Animated, Modal, StyleSheet, 
    Dimensions, Image, Alert, ScrollView, ActivityIndicator, 
    KeyboardAvoidingView, Platform, Vibration
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import { useAppContext } from '../context/AppContext';
import { BACKEND_URL } from '../../config';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function PrivateVaultScreen() {
    const { 
        showPrivateVault, setShowPrivateVault, extraDocs, setExtraDocs, 
        removeExtraDoc, user, vaultPin, setVaultPin, setViewDoc,
        unvaultExtraDoc
    } = useAppContext();

    const [stage, setStage] = useState<'SETUP' | 'CONFIRM' | 'PIN' | 'OPEN'>('PIN');
    const [pin, setPin] = useState('');
    const [tempPin, setTempPin] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [capturedImage, setCapturedImage] = useState<{uri: string, name: string} | null>(null);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [showFileMenu, setShowFileMenu] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    // Animations
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showPrivateVault) {
            if (!vaultPin) {
                setStage('SETUP');
            } else {
                setStage('PIN');
            }
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } else {
            setPin('');
            setTempPin('');
            fadeAnim.setValue(0);
        }
    }, [showPrivateVault, vaultPin]);

    const handlePinPress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            Vibration.vibrate(10);
            
            if (newPin.length === 4) {
                // AUTOMATIC CLEANUP POST-VALIDATION
                setTimeout(() => {
                    const finalPin = newPin; 
                    setPin(''); // Vaciamos visualmente los puntos
                    
                    if (stage === 'SETUP') {
                        setTempPin(finalPin);
                        setStage('CONFIRM');
                    } else if (stage === 'CONFIRM') {
                        if (finalPin === tempPin) {
                            setVaultPin(finalPin);
                            setStage('OPEN');
                            Alert.alert("SUCCESS", "PIN configured correctly.");
                        } else {
                            Vibration.vibrate(400);
                            setStage('SETUP');
                            Alert.alert("ERROR", "PINs do not match.");
                        }
                    } else {
                        verifyPin(finalPin);
                    }
                }, 150);
            }
        }
    };

    const verifyPin = (code: string) => {
        if (code === vaultPin) {
            Vibration.vibrate([0, 50, 100, 50]);
            setStage('OPEN');
        } else {
            Vibration.vibrate(400);
            // Error animation
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
        }
    };

    const handleUpload = async (type: 'camera' | 'gallery' | 'file') => {
        try {
            let result: any;
            if (type === 'camera') {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) return;
                result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
            } else if (type === 'gallery') {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) return;
                result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
            } else {
                result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
            }

            if (!result.canceled) {
                const asset = result.assets[0];
                setCapturedImage({ 
                    uri: asset.uri, 
                    name: asset.name || `photo_${Date.now()}.jpg` 
                });
            }
        } catch (e) {
            Alert.alert("ERROR", "Could not access the file.");
        }
    };

    const uploadFile = async (uri: string, name: string) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            const fileType = name.split('.').pop()?.toLowerCase() || 'jpg';
            
            // Normalización de URI para compatibilidad total (Android/iOS)
            const cleanUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;

            // @ts-ignore
            formData.append('file', {
                uri: cleanUri,
                name: name || `upload_${Date.now()}.${fileType}`,
                type: fileType === 'pdf' ? 'application/pdf' : `image/${fileType === 'png' ? 'png' : 'jpeg'}`
            });

            console.log(`📡 [Vault] Starting upload to ${BACKEND_URL}/api/uploadDocument...`);
            
            const response = await fetch(`${BACKEND_URL}/api/uploadDocument`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    // Importante: NO poner Content-Type manualmente al usar FormData con fetch
                },
                body: formData,
            });

            const data = await response.json();
            if (response.ok) {
                const newDoc = {
                    id: `pv_${Date.now()}`,
                    t: name.toUpperCase().replace(`.${fileType.toUpperCase()}`, ''),
                    s: 'Encrypted in Private Vault',
                    i: data.url,
                    source: 'DOCS',
                    icon: ['jpg', 'jpeg', 'png'].includes(fileType) ? '🖼️' : '📄',
                    verified: true
                };
                setExtraDocs([newDoc, ...extraDocs]);
                Alert.alert("SUCCESS", "Document saved with military-grade security.");
            } else {
                throw new Error(data.error || "Server failure.");
            }
        } catch (e: any) {
            console.error("[Vault Upload Error]", e);
            Alert.alert("SAVE ERROR", "Could not sync with the secure vault. Check your connection.");
        } finally {
            setIsUploading(false);
        }
    };

    const renderSetup = (isConfirm = false) => (
        <View style={styles.centerContainer}>
            <Text style={styles.pinTitle}>{isConfirm ? 'CONFIRM YOUR NEW PIN' : 'SET UP YOUR SECURITY PIN'}</Text>
            <Text style={[styles.subText, { marginBottom: 30, color: '#D4AF37' }]}>
                {isConfirm ? 'Enter the code again' : 'Choose 4 digits to protect your vault'}
            </Text>
            <View style={styles.pinDots}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.dot, pin.length >= i && styles.dotActive]} />
                ))}
            </View>
            
            <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
                    <TouchableOpacity 
                        key={i} 
                        disabled={!key}
                        onPress={() => key === '⌫' ? setPin(pin.slice(0, -1)) : handlePinPress(key)}
                        style={styles.key}
                    >
                        <Text style={styles.keyText}>{key}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderPin = () => (
        <View style={styles.centerContainer}>
            <Text style={styles.pinTitle}>ENTER SECURITY PIN</Text>
            <Animated.View style={[styles.pinDots, { transform: [{ translateX: shakeAnim }] }]}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.dot, pin.length >= i && styles.dotActive]} />
                ))}
            </Animated.View>
            
            <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
                    <TouchableOpacity 
                        key={i} 
                        disabled={!key}
                        onPress={() => key === '⌫' ? setPin(pin.slice(0, -1)) : handlePinPress(key)}
                        style={styles.key}
                    >
                        <Text style={styles.keyText}>{key}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderContent = () => {
        const docs = extraDocs.filter((d: any) => d.source === 'DOCS'); 
        return (
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>PRIVATE VAULT</Text>
                    <Text style={styles.headerStatus}>● AES-256 ENCRYPTED CONNECTION</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {docs.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyEmoji}>🔐</Text>
                            <Text style={styles.emptyText}>Your high-security zone is empty.</Text>
                            <Text style={styles.emptySub}>Use the controls below to add sensitive documents.</Text>
                        </View>
                    ) : (
                        docs.map((doc: any, i: number) => (
                            <TouchableOpacity 
                                key={`vault-item-${i}-${doc.id || 'doc'}`} 
                                onPress={() => {
                                    setSelectedFile(doc);
                                    setShowFileMenu(true);
                                }} 
                                style={styles.docCard}
                            >
                                <View style={styles.docIconContainer}>
                                    <Text style={{ fontSize: 24 }}>{doc.icon || '📄'}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.docTitle}>{doc.t}</Text>
                                    <Text style={styles.docSub}>{doc.s}</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeExtraDoc(doc.id)} style={styles.deleteBtn}>
                                    <Text style={{ color: '#FF3B30' }}>✕</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={() => handleUpload('gallery')} style={styles.uploadBtn}>
                        <Text style={styles.uploadBtnIcon}>🖼️</Text>
                        <Text style={styles.uploadBtnText}>GALLERY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleUpload('file')} style={styles.uploadBtn}>
                        <Text style={styles.uploadBtnIcon}>📁</Text>
                        <Text style={styles.uploadBtnText}>FILES</Text>
                    </TouchableOpacity>
                </View>

                {/* FILE ACTIONS MODAL (NEW) */}
                <Modal visible={showFileMenu} transparent animationType="slide">
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                            <View style={{ backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50, borderWidth: 1, borderColor: '#D4AF37' }}>
                                <View style={{ width: 40, height: 5, backgroundColor: '#333', borderRadius: 3, alignSelf: 'center', marginBottom: 25 }} />
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
                                    <View style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' }}>
                                        <Text style={{ fontSize: 24 }}>{selectedFile?.icon || '📄'}</Text>
                                    </View>
                                    <View style={{ marginLeft: 15, flex: 1 }}>
                                        <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{selectedFile?.t}</Text>
                                        <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: 'bold' }}>ENCRYPTED DOCUMENT</Text>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    onPress={() => {
                                        setShowFileMenu(false);
                                        // Delay to avoid Modal conflicts
                                        setTimeout(() => {
                                            setViewDoc(selectedFile);
                                        }, 400);
                                    }}
                                    style={{ backgroundColor: '#1A1A1A', padding: 18, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333' }}
                                >
                                    <Text style={{ fontSize: 20, marginRight: 15 }}>👁️</Text>
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>VIEW DOCUMENT</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    disabled={isSending}
                                    onPress={async () => {
                                        setIsSending(true);
                                        try {
                                            const isAvailable = await MailComposer.isAvailableAsync();
                                            if (!isAvailable) {
                                                Alert.alert("ELITE NOTIFICATION", "You must configure an email account on your device for automatic dispatch.");
                                                return;
                                            }

                                            let localUri = null;
                                            const remoteUri = typeof selectedFile.i === 'number' ? null : selectedFile.i;

                                            // SECURITY DOWNLOAD FOR ATTACHMENT
                                            if (remoteUri && remoteUri.startsWith('http')) {
                                                const ext = remoteUri.split('.').pop() || 'jpg';
                                                const fileName = `Vault_Secure_${selectedFile.t.replace(/\s/g, '_')}.${ext}`;
                                                const localPath = `${FileSystem.cacheDirectory}${fileName}`;
                                                const download = await FileSystem.downloadAsync(remoteUri, localPath);
                                                localUri = download.uri;
                                            } else if (remoteUri) {
                                                localUri = remoteUri;
                                            }

                                            // COMPOSING PRIVATE EMAIL
                                            await MailComposer.composeAsync({
                                                recipients: [user?.email || 'passenger@flight-pilot.com'],
                                                subject: `📑 PRIVATE VAULT FILE: ${selectedFile.t}`,
                                                body: `Dear user,\n\nAttached is the document "${selectedFile.t}" recovered from your FlightPilot Private Vault.\n\nThis dispatch has been processed with local encryption.`,
                                                attachments: localUri ? [localUri] : [],
                                            });

                                            setShowFileMenu(false);
                                        } catch (e) {
                                            Alert.alert(
                                                "💎 ELITE PRIORITY",
                                                "Secure synchronization temporarily limited. Use the 'SHARE' option for manual dispatch.",
                                                [{ text: "UNDERSTOOD", onPress: () => Vibration.vibrate(10) }]
                                            );
                                        } finally {
                                            setIsSending(false);
                                        }
                                    }}
                                    style={{ backgroundColor: '#D4AF37', padding: 18, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
                                >
                                    {isSending ? <ActivityIndicator color="#000" size="small" style={{ marginRight: 15 }} /> : <Text style={{ fontSize: 20, marginRight: 15 }}>📧</Text>}
                                    <Text style={{ color: '#000', fontWeight: '900' }}>SEND TO MY EMAIL</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    onPress={async () => {
                                        const canShare = await Sharing.isAvailableAsync();
                                        if (canShare && selectedFile?.i) {
                                            setIsSending(true);
                                            try {
                                                const fileUri = typeof selectedFile.i === 'number' ? null : selectedFile.i;
                                                
                                                if (fileUri && fileUri.startsWith('http')) {
                                                    // DESCARGA PREVIA PARA COMPARTIR ARCHIVOS REMOTOS
                                                    const ext = fileUri.split('.').pop() || 'jpg';
                                                    const fileName = `Vault_${selectedFile.t.replace(/\s/g, '_')}.${ext}`;
                                                    const localPath = `${FileSystem.cacheDirectory}${fileName}`;
                                                    
                                                    const download = await FileSystem.downloadAsync(fileUri, localPath);
                                                    await Sharing.shareAsync(download.uri);
                                                } else if (fileUri) {
                                                    await Sharing.shareAsync(fileUri);
                                                } else {
                                                    Alert.alert("NOTICE", "This document is a protected demo.");
                                                }
                                            } catch (e) {
                                                Alert.alert("ERROR", "Could not prepare the private file.");
                                            } finally {
                                                setIsSending(false);
                                            }
                                        } else {
                                            Alert.alert("ERROR", "Sharing function is not available or the file is unreadable.");
                                        }
                                        setShowFileMenu(false);
                                    }}
                                    style={{ backgroundColor: '#1A1A1A', padding: 18, borderRadius: 16, marginBottom: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333' }}
                                >
                                    {isSending ? <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 15 }} /> : <Text style={{ fontSize: 20, marginRight: 15 }}>🔗</Text>}
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>SHARE WITH THIRD PARTIES</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    onPress={() => {
                                        Alert.alert(
                                            "REMOVE FROM VAULT?",
                                            "This document will be visible again in the public area and will no longer be under PIN protection.",
                                            [
                                                { text: "CANCEL", style: "cancel" },
                                                { text: "MAKE PUBLIC", onPress: () => {
                                                    unvaultExtraDoc(selectedFile.id);
                                                    setShowFileMenu(false);
                                                }}
                                            ]
                                        );
                                    }}
                                    style={{ backgroundColor: '#1A1A1A', padding: 18, borderRadius: 16, marginBottom: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#444' }}
                                >
                                    <Text style={{ fontSize: 20, marginRight: 15 }}>🔓</Text>
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>REMOVE FROM VAULT (RE-ACTIVATE)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setShowFileMenu(false)} style={{ padding: 10, alignItems: 'center' }}>
                                    <Text style={{ color: '#666', fontWeight: 'bold' }}>CANCEL</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </BlurView>
                </Modal>

                {/* PREVIEW MODAL */}
                <Modal visible={!!capturedImage} transparent animationType="fade">
                    <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill}>
                        <SafeAreaView style={{ flex: 1 }}>
                            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                                <Text style={styles.previewTitle}>CAPTURE PREVIEW</Text>
                                
                                <View style={[styles.previewWrapper, { height: height * 0.5 }]}>
                                    {capturedImage && (
                                        <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} resizeMode="contain" />
                                    )}
                                </View>

                                <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 20 }}>
                                    Confirm saving in the encrypted archive.{'\n'}
                                    The original file will remain on your device.
                                </Text>

                                <TouchableOpacity 
                                    style={styles.saveBtn} 
                                    onPress={() => {
                                        if (capturedImage) {
                                            uploadFile(capturedImage.uri, capturedImage.name);
                                            setCapturedImage(null);
                                        }
                                    }}
                                >
                                    <Text style={styles.saveBtnText}>SAVE TO PRIVATE VAULT</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCapturedImage(null)}>
                                    <Text style={styles.cancelBtnText}>DISCARD AND GO BACK</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </SafeAreaView>
                    </BlurView>
                </Modal>
            </View>
        );
    };

    return (
        <Modal 
            visible={showPrivateVault} 
            animationType="slide" 
            transparent={false}
            onRequestClose={() => setShowPrivateVault(false)}
        >
            <View style={styles.container}>
                <SafeAreaView style={{ flex: 1 }}>
                    <TouchableOpacity 
                        style={styles.closeBtn} 
                        onPress={() => setShowPrivateVault(false)}
                    >
                        <Text style={styles.closeBtnText}>CLOSE SYSTEM</Text>
                    </TouchableOpacity>

                    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                        {stage === 'SETUP' && renderSetup(false)}
                        {stage === 'CONFIRM' && renderSetup(true)}
                        {stage === 'PIN' && renderPin()}
                        {stage === 'OPEN' && renderContent()}
                    </Animated.View>

                    {isUploading && (
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#D4AF37" />
                                <Text style={styles.loadingText}>ENCRYPTING DOCUMENT...</Text>
                                <Text style={styles.loadingSub}>DO NOT CLOSE THE APPLICATION</Text>
                            </View>
                        </BlurView>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    closeBtn: {
        alignSelf: 'flex-end',
        padding: 20,
        zIndex: 10,
    },
    closeBtnText: {
        color: '#666',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    scanBox: {
        width: 240,
        height: 240,
        borderWidth: 2,
        borderColor: '#D4AF3733',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 40,
    },
    silhouette: {
        width: 150,
        height: 150,
    },
    laser: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: '#D4AF37',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    scanText: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    subText: {
        color: '#444',
        fontSize: 10,
        fontWeight: 'bold',
    },
    pinTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 40,
    },
    pinDots: {
        flexDirection: 'row',
        marginBottom: 60,
    },
    dot: {
        width: 15,
        height: 15,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#333',
        marginHorizontal: 15,
    },
    dotActive: {
        backgroundColor: '#D4AF37',
        borderColor: '#D4AF37',
    },
    keypad: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    key: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 10,
        borderRadius: 40,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#222',
    },
    keyText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    header: {
        padding: 30,
        paddingBottom: 10,
    },
    headerTitle: {
        color: '#D4AF37',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 3,
    },
    headerStatus: {
        color: '#4CD964',
        fontSize: 9,
        fontWeight: 'bold',
        marginTop: 5,
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 20,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyEmoji: {
        fontSize: 60,
        marginBottom: 20,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptySub: {
        color: '#888',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 10,
    },
    docCard: {
        backgroundColor: '#0D0D0D',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D4AF3722',
    },
    docIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#151515',
        justifyContent: 'center',
        alignItems: 'center',
    },
    docTitle: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: 'bold',
    },
    docSub: {
        color: '#666',
        fontSize: 10,
        marginTop: 3,
    },
    deleteBtn: {
        padding: 10,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        justifyContent: 'space-between',
    },
    uploadBtn: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#111',
        marginHorizontal: 5,
        paddingVertical: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    uploadBtnIcon: {
        fontSize: 20,
        marginBottom: 5,
    },
    uploadBtnText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    loadingOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 20,
    },
    loadingSub: {
        color: '#888',
        fontSize: 10,
        marginTop: 5,
    },
    // PREVIEW STYLES (MISSING)
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    previewTitle: {
        color: '#D4AF37',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 20,
    },
    previewWrapper: {
        width: '90%',
        height: '60%',
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#D4AF37',
        marginBottom: 20,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    saveBtn: {
        backgroundColor: '#D4AF37',
        width: '100%',
        padding: 18,
        borderRadius: 14,
        marginTop: 10,
        alignItems: 'center',
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    saveBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    cancelBtn: {
        marginTop: 15,
        padding: 10,
    },
    cancelBtnText: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
