import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, Modal, Platform, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { useAppContext, IS_BETA } from '../context/AppContext';
import { getEU261Amount } from '../utils/flightUtils';
import { BACKEND_URL } from '../../config';

export default function VaultScreen() {
    const {
        legalShieldActive, setViewDoc, setIsScanning, claims, setClaims, removeClaim, flightData, setFlightData,
        compensationEligible, extraDocs, setExtraDocs, isExtracting, simulateGmailSync, user,
        removeExtraDoc, setHasNewDoc, setRecoveredMoney, setShowChat,
        showVIPAlternatives, setShowVIPAlternatives, pendingVIPScroll, setPendingVIPScroll,
        setShowPrivateVault, setTab, confirmFlightRescue, speak,
        showSignature, setShowSignature, currentClaimForSig, setCurrentClaimForSig,
        moveExtraDocToVault,
        userFullName, userIdNumber
    } = useAppContext();

    React.useEffect(() => {
        setHasNewDoc(false);
        if (pendingVIPScroll) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
                setPendingVIPScroll(false);
            }, 500);
        }
    }, [pendingVIPScroll]);

    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [showRights, setShowRights] = useState(false);
    const [rightsTab, setRightsTab] = useState('EUROPE');
    const [hasSigned, setHasSigned] = useState(false);
    const [signedClaimId, setSignedClaimId] = useState<string | null>(null);
    const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
    const [pendingDoc, setPendingDoc] = useState<{ uri: string, type: string } | null>(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [currentActionDoc, setCurrentActionDoc] = useState<any>(null);
    const [isRescuing, setIsRescuing] = useState(false);
    const [rescueProgress, setRescueProgress] = useState(0);
    const [dniInput, setDniInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [pnrInput, setPnrInput] = useState('');

    React.useEffect(() => {
        if (showSignature) {
            setNameInput(userFullName || user?.displayName || currentClaimForSig?.passengerName || '');
            setDniInput(userIdNumber || currentClaimForSig?.passengerDNI || '');
            setPnrInput(currentClaimForSig?.pnr || '');
        }
    }, [showSignature, currentClaimForSig, user, userFullName, userIdNumber]);

    const [showFileMenu, setShowFileMenu] = useState(false);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);

    const webViewRef = useRef<WebView>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const claimsYRef = useRef<number>(0);
    const [showPickMenu, setShowPickMenu] = useState(false);
    const [showConfirmUpload, setShowConfirmUpload] = useState(false);

    const uploadImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("PERMISSION DENIED", "Gallery access required.");
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
            });
            if (!result.canceled) {
                setShowPickMenu(false);
                const uri = result.assets[0].uri;
                const fileType = uri.split('.').pop() || 'jpg';
                setTimeout(() => {
                    setPendingDoc({ uri, type: fileType });
                    setShowConfirmUpload(true);
                }, 400);
            }
        } catch (e) {
            Alert.alert("ERROR", "Could not open the gallery.");
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setShowPickMenu(false);
                const asset = result.assets[0];
                const uri = asset.uri;
                const fileType = asset.name.split('.').pop() || 'pdf';
                setTimeout(() => {
                    setPendingDoc({ uri, type: fileType });
                    setShowConfirmUpload(true);
                }, 400);
            }
        } catch (e) {
            Alert.alert("ERROR", "Could not open file selector.");
        }
    };

    const confirmAndUpload = async (forcedDoc?: { uri: string, type: string }) => {
        const docToUpload = forcedDoc || pendingDoc;
        if (!docToUpload) return;

        try {
            setUploadingDoc(true);
            const formData = new FormData();
            const cleanUri = Platform.OS === 'ios' ? docToUpload.uri.replace('file://', '') : docToUpload.uri;

            // @ts-ignore
            formData.append('file', {
                uri: cleanUri,
                name: `upload_${Date.now()}.${docToUpload.type}`,
                type: 'application/pdf'
            });

            const response = await fetch(`${BACKEND_URL}/api/uploadDocument`, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' },
            });

            const data = await response.json();
            if (response.ok) {
                setExtraDocs([
                    {
                        id: `upload_${Date.now()}`,
                        t: 'PRIVATE FILE',
                        s: 'Added to Private Vault',
                        i: data.url,
                        source: 'DOCS',
                        icon: '📁',
                        verified: true
                    },
                    ...extraDocs
                ]);
                setPendingDoc(null);
                setShowConfirmUpload(false);
                Alert.alert("SUCCESS", "Document saved in your Secure Vault.");
            } else {
                Alert.alert("ERROR", data.error || "Upload failed.");
            }
        } catch (e) {
            Alert.alert("NETWORK ERROR", "Could not contact HQ.");
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleSendClaim = async (sig: string) => {
        if (!sig || sig.length < 100) {
            Alert.alert('Signature Error', 'The signature was not captured correctly. Please try again.');
            setGeneratingPdf(false);
            return;
        }

        try {
            console.log('[Signature] Sending payload...', sig.length);
            const res = await fetch(`${BACKEND_URL}/api/generateClaim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flightNumber: currentClaimForSig?.flight,
                    airline: currentClaimForSig?.airline,
                    // If it is the demo (isDynamic), we force data for a nice PDF. If not, real data.
                    delayMinutes: currentClaimForSig?.isDynamic ? 240 : (currentClaimForSig?.actualDelay || 0),
                    status: currentClaimForSig?.isDynamic ? 'delayed' : (currentClaimForSig?.status || 'delayed'),
                    departureAirport: currentClaimForSig?.route?.split('>')[0]?.trim() || 'MAD',
                    arrivalAirport: currentClaimForSig?.route?.split('>')[1]?.trim() || 'VLC',
                    amount: currentClaimForSig?.isDynamic ? '250' : (currentClaimForSig?.compensation || '0'),
                    userEmail: user?.email || 'passenger@flight-pilot.com',
                    signatureBase64: sig,
                    // Passenger data extracted from inputs and context
                    passengerName: nameInput || user?.displayName || currentClaimForSig?.passengerName || null,
                    passengerDNI: dniInput || currentClaimForSig?.passengerDNI || null,
                    flightDate: currentClaimForSig?.dateTime || null,
                    bookingRef: pnrInput || currentClaimForSig?.pnr || null,
                    airlineAddress: currentClaimForSig?.airlineAddress || null,
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `Error ${res.status}`);
            }

            const json = await res.json();
            if (json.pdfBase64) {
                const fileUri = (FileSystem.cacheDirectory || '') + `EU261_claim_${Date.now()}.pdf`;
                const encoding = (FileSystem.EncodingType as any)?.Base64 || 'base64';
                await FileSystem.writeAsStringAsync(fileUri, json.pdfBase64, { encoding });
                setSignedClaimId(currentClaimForSig?.id);
                setRecoveredMoney((prev: number) => prev + (parseInt(currentClaimForSig?.compensation) || 250));

                webViewRef.current?.injectJavaScript('clearCanvas();true;');
                setShowSignature(false);
                setHasSigned(false);
                setCapturedSignature('');
                setCurrentClaimForSig(null);
                setDniInput('');

                Alert.alert(
                    '✈️ SUMMARY PREPARED',
                    'Your claim has been registered. We are now proceeding to send it to the airline.',
                    [
                        {
                            text: 'CONTINUE AND SEND',
                            onPress: async () => {
                                const canShare = await Sharing.isAvailableAsync();
                                if (canShare) {
                                    await Sharing.shareAsync(fileUri, {
                                        mimeType: 'application/pdf',
                                        dialogTitle: `Send Claim`,
                                        UTI: 'com.adobe.pdf'
                                    });
                                    Alert.alert('✅ PROCESS FINISHED', 'The document has been shared/saved successfully. Legal processing is underway.');
                                } else {
                                    Alert.alert('✅ PROCESS FINISHED', `The legal PDF is ready on your device.`);
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('ERROR', json.error || 'The server did not return the PDF.');
            }
        } catch (e: any) {
            console.error('[Vault] Total failure:', e.message || e);
            Alert.alert('TECHNICAL FAILURE', `Server: ${e.message || 'No connection'}. Refresh the app.`);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const documents = Array.isArray(extraDocs) ? extraDocs : [];

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            "🗑️ DELETE DOCUMENT",
            `Are you sure you want to delete "${name}"?`,
            [
                { text: "CANCEL", style: "cancel" },
                { text: "DELETE", style: "destructive", onPress: () => removeExtraDoc(id) }
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
            <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 220, flexGrow: 1 }}>

                {/* LEGAL SHIELD */}
                {(legalShieldActive || compensationEligible) && (
                    <View style={{
                        backgroundColor: 'rgba(39, 201, 63, 0.08)',
                        padding: 16, borderRadius: 16, marginBottom: 20,
                        borderWidth: 1, borderColor: 'rgba(39, 201, 63, 0.4)',
                        flexDirection: 'row', alignItems: 'center',
                    }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(39, 201, 63, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                            <Text style={{ fontSize: 22 }}>🛡️</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#27C93F', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>LEGAL PROTECTION ACTIVE</Text>
                            <Text style={{ color: '#B0B0B0', fontSize: 11, marginTop: 3 }}>Monitoring your current journey.</Text>
                        </View>
                    </View>
                )}

                {/* ACTIVE ASSISTANT */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => Alert.alert("📊 ACTIVE ASSISTANT", "AES-256 Protection active.")}
                    style={{ backgroundColor: '#111', padding: 16, borderRadius: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#AF52DE', flexDirection: 'row', alignItems: 'center' }}
                >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CD964', marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>🧠 ACTIVE ASSISTANT</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 11, marginTop: 3 }}>Connected and secure</Text>
                    </View>
                    <Text style={{ color: '#B0B0B0', fontSize: 19 }}>›</Text>
                </TouchableOpacity>

                {/* UPDATE EMAIL */}
                <TouchableOpacity
                    onPress={simulateGmailSync}
                    disabled={isExtracting}
                    style={{ backgroundColor: '#1A1A1A', padding: 18, borderRadius: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' }}
                >
                    {isExtracting ? <ActivityIndicator size="small" color="#AF52DE" style={{ marginRight: 10 }} /> : <Text style={{ fontSize: 18, marginRight: 10 }}>📧</Text>}
                    <Text style={{ color: isExtracting ? '#555' : '#AF52DE', fontWeight: '900', fontSize: 14 }}>{isExtracting ? 'SEARCHING DOCUMENTS...' : 'UPDATE FROM MY EMAILS'}</Text>
                </TouchableOpacity>

                <View style={{ height: 20 }} />

                {/* ASSISTANCE RECORDS (AUTOMATIC) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 }}>🔐 ASSISTANCE RECORDS</Text>
                </View>

                {documents.filter(d => d.source !== 'DOCS').length === 0 ? (
                    <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 16, marginBottom: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#555', fontSize: 13 }}>No automatic records yet.</Text>
                    </View>
                ) : (
                    documents.filter(d => d.source !== 'DOCS').map((d, i) => (
                        <View key={d.id || i} style={{ backgroundColor: '#111', borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1A1A1A', overflow: 'hidden' }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (d.t?.includes('VIP')) {
                                        setFlightData((prev: any) => {
                                            if (prev) {
                                                return { ...prev, delayMinutes: d.t.includes('RESCUE') ? 180 : 60, status: 'delayed' };
                                            }
                                            return { delayMinutes: d.t.includes('RESCUE') ? 180 : 60, status: 'delayed', departure: { iata: 'MAD', delay: d.t.includes('RESCUE') ? 180 : 60 }, arrival: { iata: 'CDG' }, airline: 'Airline' };
                                        });
                                        setCurrentActionDoc(d);
                                        setShowVIPAlternatives(true);
                                    }
                                    else if (d.t?.includes('PROPOSAL') || d.t?.includes('ACCOMMODATION')) {
                                        setCurrentActionDoc(d);
                                        setShowActionModal(true);
                                    }
                                    else {
                                        setViewDoc(d);
                                        setIsScanning(true);
                                        setTimeout(() => setIsScanning(false), 2000);
                                    }
                                }}
                                activeOpacity={0.7}
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 18 }}
                            >
                                <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' }}>
                                    {d.i ? <Image source={typeof d.i === 'number' ? d.i : { uri: d.i }} style={{ width: 52, height: 52, borderRadius: 14 }} /> : <Text style={{ fontSize: 21 }}>📄</Text>}
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>{d.t || 'Document'}</Text>
                                        {IS_BETA && d.isDemo && (
                                            <View style={{ marginLeft: 8, backgroundColor: 'rgba(255, 149, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#FF9500' }}>
                                                <Text style={{ color: '#FF9500', fontSize: 8, fontWeight: '900' }}>DEMO</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={{ color: '#B0B0B0', fontSize: 11, marginTop: 3 }}>{d.s || 'Generated by AI'}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        "MOVE TO PRIVATE VAULT?",
                                        "This document will no longer be visible in the public area and will move to your encrypted archive under PIN.",
                                        [
                                            { text: "CANCEL", style: "cancel" },
                                            { text: "MOVE NOW", onPress: () => moveExtraDocToVault(d.id) }
                                        ]
                                    );
                                }}
                                style={{ padding: 20, borderLeftWidth: 1, borderLeftColor: '#222' }}
                            >
                                <Text style={{ color: '#D4AF37', fontSize: 18 }}>🔒</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDelete(d.id, d.t)}
                                style={{ padding: 20, borderLeftWidth: 1, borderLeftColor: '#222' }}
                            >
                                <Text style={{ color: '#FF3B30', fontSize: 18 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                {/* FILE ACTIONS MODAL */}
                <Modal visible={showFileMenu} transparent animationType="slide">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50, borderWidth: 1, borderColor: '#AF52DE' }}>
                            <View style={{ width: 40, height: 5, backgroundColor: '#333', borderRadius: 3, alignSelf: 'center', marginBottom: 25 }} />

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
                                <View style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#AF52DE33' }}>
                                    <Text style={{ fontSize: 24 }}>{selectedFile?.icon || '📄'}</Text>
                                </View>
                                <View style={{ marginLeft: 15, flex: 1 }}>
                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>{selectedFile?.t}</Text>
                                    <Text style={{ color: '#AF52DE', fontSize: 10, fontWeight: 'bold' }}>FLIGHTPILOT RECORD</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    setShowFileMenu(false);
                                    setTimeout(() => {
                                        setViewDoc(selectedFile);
                                        setIsScanning(true);
                                        setTimeout(() => setIsScanning(false), 2500);
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
                                            Alert.alert("VIP NOTIFICATION", "We have not detected an email account configured on this device.");
                                            return;
                                        }
                                        let localUri = null;
                                        const remoteUri = typeof selectedFile.i === 'number' ? null : selectedFile.i;
                                        if (remoteUri && remoteUri.startsWith('http')) {
                                            const ext = remoteUri.split('.').pop() || 'jpg';
                                            const fileName = `FlightPilot_${selectedFile.t.replace(/\s/g, '_')}.${ext}`;
                                            const localPath = `${FileSystem.cacheDirectory}${fileName}`;
                                            const download = await FileSystem.downloadAsync(remoteUri, localPath);
                                            localUri = download.uri;
                                        } else if (remoteUri) { localUri = remoteUri; }

                                        await MailComposer.composeAsync({
                                            recipients: [user?.email || 'passenger@flight-pilot.com'],
                                            subject: `💎 VIP DOCUMENT: ${selectedFile.t}`,
                                            body: `Attached you will find your document "${selectedFile.t}" managed by FlightPilot.`,
                                            attachments: localUri ? [localUri] : [],
                                        });
                                        setShowFileMenu(false);
                                    } catch (e) {
                                        Alert.alert("💎 VIP PRIORITY", "Error sending email. Use 'SHARE'.");
                                    } finally { setIsSending(false); }
                                }}
                                style={{ backgroundColor: '#AF52DE', padding: 18, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                {isSending ? <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 15 }} /> : <Text style={{ fontSize: 20, marginRight: 15 }}>📧</Text>}
                                <Text style={{ color: '#FFF', fontWeight: '900' }}>SEND TO MY EMAIL</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={async () => {
                                    const canShare = await Sharing.isAvailableAsync();
                                    if (canShare && selectedFile?.i) {
                                        setIsSending(true);
                                        try {
                                            const fileUri = typeof selectedFile.i === 'number' ? null : selectedFile.i;
                                            if (fileUri && fileUri.startsWith('http')) {
                                                const fileName = `${selectedFile.t.replace(/\s/g, '_')}.jpg`;
                                                const localPath = `${FileSystem.cacheDirectory}${fileName}`;
                                                const download = await FileSystem.downloadAsync(fileUri, localPath);
                                                await Sharing.shareAsync(download.uri);
                                            } else if (fileUri) { await Sharing.shareAsync(fileUri); }
                                        } catch (e) {
                                            Alert.alert("ERROR", "Could not share.");
                                        } finally { setIsSending(false); }
                                    }
                                    setShowFileMenu(false);
                                }}
                                style={{ backgroundColor: '#1A1A1A', padding: 18, borderRadius: 16, marginBottom: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333' }}
                            >
                                {isSending ? <ActivityIndicator color="#FFF" size="small" style={{ marginRight: 15 }} /> : <Text style={{ fontSize: 20, marginRight: 15 }}>🔗</Text>}
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>SHARE FILE</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowFileMenu(false)} style={{ padding: 10, alignItems: 'center' }}>
                                <Text style={{ color: '#666', fontWeight: 'bold' }}>CANCEL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* PRIVATE VAULT */}
                <View style={{ marginTop: 24, marginBottom: 14 }}>
                    <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 }}>💎 ELITE SECURITY</Text>
                </View>

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowPrivateVault(true)}
                    style={{
                        backgroundColor: '#111', borderRadius: 20, padding: 24, borderWidth: 2, borderColor: '#D4AF3744', flexDirection: 'row', alignItems: 'center',
                        shadowColor: "#D4AF37", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10
                    }}
                >
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' }}>
                        <Text style={{ fontSize: 30 }}>🔒</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 20 }}>
                        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>PRIVATE VAULT</Text>
                        <Text style={{ color: '#D4AF37', fontSize: 10, fontWeight: 'bold', marginTop: 4 }}>RESTRICTED ACCESS</Text>
                    </View>
                    <View style={{ backgroundColor: '#D4AF37', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Text style={{ color: '#000', fontWeight: '900', fontSize: 10 }}>ENTER</Text>
                    </View>
                </TouchableOpacity>

                {/* KNOW YOUR RIGHTS BUTTON */}
                <TouchableOpacity
                    onPress={() => setShowRights(true)}
                    style={{
                        backgroundColor: '#1A1A1A',
                        borderRadius: 16,
                        padding: 18,
                        marginTop: 15,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#AF52DE66'
                    }}
                >
                    <Text style={{ fontSize: 18, marginRight: 12 }}>⚖️</Text>
                    <Text style={{ color: '#AF52DE', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>GUIDE: KNOW YOUR RIGHTS</Text>
                </TouchableOpacity>

                {/* CLAIMS */}
                <View onLayout={(e) => { claimsYRef.current = e.nativeEvent.layout.y; }} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 14 }}>
                    <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 }}>⚖️ EU261 CLAIMS</Text>
                </View>

                {claims.length === 0 ? (
                    <View style={{ backgroundColor: '#0D0D0D', borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222', borderStyle: 'dashed' }}>
                        <Text style={{ fontSize: 31, marginBottom: 12 }}>⚖️</Text>
                        <Text style={{ color: '#B0B0B0', fontSize: 11 }}>No active claims.</Text>
                    </View>
                ) : (
                    claims.map((c: any, i: number) => (
                        <TouchableOpacity
                            key={c.id || i}
                            onPress={() => {
                                if (signedClaimId === c.id) {
                                    Alert.alert("STATUS", "Signed.");
                                } else if (c.isDynamic) {
                                    setCurrentClaimForSig(c);
                                    setShowSignature(true);
                                } else {
                                    Alert.alert("DETAILS", `${c.airline} - ${c.flight}\nStatus: ${c.status}`);
                                }
                            }}
                            style={{ backgroundColor: '#111', borderRadius: 16, padding: 18, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: c.isDynamic ? '#FF9500' : '#27C93F', borderWidth: 1, borderColor: '#1A1A1A' }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>{c.airline}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.isDynamic ? '#FF9500' : '#27C93F', marginRight: 6 }} />
                                        <Text style={{ color: c.isDynamic ? '#FF9500' : '#27C93F', fontSize: 11, fontWeight: 'bold' }}>{c.status}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={(e) => { e.stopPropagation(); removeClaim(c.id); }}
                                    style={{ padding: 5, paddingLeft: 15, zIndex: 10 }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={{ color: '#B0B0B0', fontSize: 20 }}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: '#B0B0B0', fontSize: 11 }}>{c.compensation}€</Text>
                                <Text style={{ color: '#AF52DE', fontSize: 11, fontWeight: 'bold' }}>{signedClaimId === c.id ? 'SIGNED' : 'SIGN ✍️'}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                {/* AI ACTION MODAL (STANDARD MODE) */}
                <Modal visible={showActionModal} transparent animationType="slide">
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 25 }}>
                        <View style={{ backgroundColor: '#111', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#333' }}>
                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 5 }}>{currentActionDoc?.t}</Text>
                            <Text style={{ color: '#B0B0B0', fontSize: 12, marginBottom: 20 }}>{currentActionDoc?.s}</Text>

                            {(currentActionDoc?.t?.includes('BALANCED') || currentActionDoc?.t?.includes('ACCOMMODATION')) && (
                                <View>
                                    <Text style={{ color: '#4CD964', fontSize: 13, lineHeight: 21, marginBottom: 20 }}>
                                        We guide you with a nearby accommodation solution for your rest. Save receipts for reimbursement.
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowActionModal(false)} style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>UNDERSTOOD</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {(currentActionDoc?.t?.includes('FAST') || currentActionDoc?.t?.includes('RAPID')) && (
                                <View>
                                    {!isRescuing ? (
                                        <TouchableOpacity
                                            onPress={async () => {
                                                setIsRescuing(true);
                                                for (let i = 0; i <= 100; i += 20) { setRescueProgress(i); await new Promise(r => setTimeout(r, 100)); }
                                                await confirmFlightRescue(currentActionDoc?.rescueData);
                                                setIsRescuing(false); setShowActionModal(false);
                                            }}
                                            style={{ backgroundColor: '#007AFF', padding: 18, borderRadius: 16, alignItems: 'center' }}>
                                            <Text style={{ color: '#FFF', fontWeight: '900' }}>CONFIRM RESERVATION</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={{ alignItems: 'center' }}><ActivityIndicator color="#007AFF" /><Text style={{ color: '#FFF', marginTop: 10 }}>PROCESSING...</Text></View>
                                    )}
                                </View>
                            )}

                            {currentActionDoc?.t?.includes('ECONOMIC') && (
                                <View>
                                    {compensationEligible ? (
                                        <>
                                            <Text style={{ color: '#4CD964', fontSize: 13, marginBottom: 20 }}>Your legal compensation file is ready to sign.</Text>
                                            <TouchableOpacity onPress={() => { setShowActionModal(false); setTimeout(() => scrollViewRef.current?.scrollTo({ y: claimsYRef.current, animated: true }), 300); }} style={{ backgroundColor: '#4CD964', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                                                <Text style={{ color: '#000', fontWeight: 'bold' }}>GO TO SIGN</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#D4AF37', fontSize: 13, lineHeight: 20, marginBottom: 20 }}>You have chosen the wait plan. Go to the counter to request your free maintenance vouchers.</Text>
                                            <TouchableOpacity onPress={() => setShowActionModal(false)} style={{ backgroundColor: '#222', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' }}>
                                                <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>UNDERSTOOD</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity onPress={() => setShowActionModal(false)} style={{ marginTop: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#555', fontSize: 10 }}>CLOSE WINDOW</Text>
                            </TouchableOpacity>
                 {/* KNOW YOUR RIGHTS MODAL (GLOBAL PROTOCOL) */}
                <Modal visible={showRights} animationType="slide" transparent>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.98)', paddingTop: 60 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginBottom: 20 }}>
                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>GLOBAL PROTECTION GUIDE</Text>
                            <TouchableOpacity onPress={() => setShowRights(false)} style={{ backgroundColor: '#222', padding: 8, borderRadius: 15, width: 40, alignItems: 'center' }}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* REGION SELECTOR (TABS) */}
                        <View style={{ flexDirection: 'row', paddingHorizontal: 25, gap: 10, marginBottom: 20 }}>
                            {['EUROPE', 'USA', 'GLOBAL'].map((tab) => (
                                <TouchableOpacity 
                                    key={tab}
                                    onPress={() => setRightsTab(tab)}
                                    style={{ 
                                        flex: 1, 
                                        paddingVertical: 12, 
                                        borderRadius: 12, 
                                        backgroundColor: rightsTab === tab ? '#AF52DE' : '#111',
                                        borderWidth: 1,
                                        borderColor: rightsTab === tab ? '#AF52DE' : '#333',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: rightsTab === tab ? '#FFF' : '#666', fontSize: 10, fontWeight: '900' }}>{tab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 100 }}>
                            {rightsTab === 'EUROPE' && (
                                <>
                                    <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10 }}>EUROPE (EU261) 🇪🇺</Text>
                                    <Text style={{ color: '#B0B0B0', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                                        European regulations protect you in case of serious incidents. These are the amounts you can claim per passenger:
                                    </Text>
                                    <View style={{ gap: 10, marginBottom: 30 }}>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>250€</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>Short flights (up to 1,500 km)</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>400€</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>Medium flights (1,500 - 3,500 km)</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>600€</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>Long flights (more than 3,500 km)</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {rightsTab === 'USA' && (
                                <>
                                    <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10 }}>USA (DOT RIGHTS) 🇺🇸</Text>
                                    <Text style={{ color: '#B0B0B0', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                                        In the US, federal law focuses on assistance and specific compensations for involuntary boarding denial.
                                    </Text>
                                    <View style={{ gap: 10, marginBottom: 30 }}>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Up to $1,550</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>For Involuntary Overbooking</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>FULL REFUND</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>If you choose not to travel after a significant delay</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>ASSISTANCE</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>The airline must provide food/hotel vouchers</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {rightsTab === 'GLOBAL' && (
                                <>
                                    <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10 }}>INT / LATAM (MONTREAL) 🌎</Text>
                                    <Text style={{ color: '#B0B0B0', fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
                                        The Montreal Convention covers most international flights. It allows claiming for actual damages caused by the delay.
                                    </Text>
                                    <View style={{ gap: 10, marginBottom: 30 }}>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Up to $7,000</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>Maximum liability for damages (SDR 5,346)</Text>
                                        </View>
                                        <View style={{ backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' }}>
                                            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>EXPENSE REFUND</Text>
                                            <Text style={{ color: '#888', fontSize: 12 }}>Hotels, meals and missed transport</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            <Text style={{ color: '#AF52DE', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10 }}>GOLDEN RULES ⚖️</Text>
                            <View style={{ gap: 15, marginBottom: 30 }}>
                                <Text style={{ color: '#B0B0B0', fontSize: 13, lineHeight: 18 }}>• <Text style={{ color: '#FFF', fontWeight: 'bold' }}>DOCUMENTS:</Text> Always keep your boarding pass and all expense receipts (PDF or photo).</Text>
                                <Text style={{ color: '#B0B0B0', fontSize: 13, lineHeight: 18 }}>• <Text style={{ color: '#FFF', fontWeight: 'bold' }}>REPORT:</Text> Request a written certificate of the delay/cancellation at the airline counter.</Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => setShowRights(false)}
                                style={{ backgroundColor: '#AF52DE', padding: 18, borderRadius: 15, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: 'bold', letterSpacing: 1 }}>CLOSE GUIDE</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </Modal>

            </ScrollView>

            {/* SIGNATURE MODAL */}
            <Modal visible={showSignature} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 25 }}>
                    <View style={{ backgroundColor: '#111', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#333' }}>
                        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 20 }}>🖊️ AUTHORIZATION SIGNATURE</Text>

                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>FULL NAME</Text>
                            <TextInput
                                value={nameInput}
                                onChangeText={setNameInput}
                                placeholder="e.g., John Doe"
                                placeholderTextColor="#444"
                                autoCapitalize="words"
                                style={{
                                    backgroundColor: '#000',
                                    borderWidth: 1,
                                    borderColor: '#333',
                                    borderRadius: 12,
                                    padding: 14,
                                    color: '#FFF',
                                    fontSize: 15,
                                    fontWeight: 'bold',
                                    marginBottom: 15
                                }}
                            />

                            <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>ID / PASSPORT</Text>
                            <TextInput
                                value={dniInput}
                                onChangeText={setDniInput}
                                placeholder="e.g., 12345678X"
                                placeholderTextColor="#444"
                                autoCapitalize="characters"
                                style={{
                                    backgroundColor: '#000',
                                    borderWidth: 1,
                                    borderColor: '#333',
                                    borderRadius: 12,
                                    padding: 14,
                                    color: '#FFF',
                                    fontSize: 15,
                                    fontWeight: 'bold',
                                    marginBottom: 15
                                }}
                            />

                            <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>BOOKING REF (PNR)</Text>
                            <TextInput
                                value={pnrInput}
                                onChangeText={setPnrInput}
                                placeholder="e.g., AB12CD"
                                placeholderTextColor="#444"
                                autoCapitalize="characters"
                                maxLength={6}
                                style={{
                                    backgroundColor: '#000',
                                    borderWidth: 1,
                                    borderColor: '#333',
                                    borderRadius: 12,
                                    padding: 14,
                                    color: '#FFF',
                                    fontSize: 15,
                                    fontWeight: 'bold'
                                }}
                            />
                        </View>

                        <Text style={{ color: '#B0B0B0', fontSize: 11, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 }}>DIGITAL SIGNATURE</Text>
                        <View style={{ height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                            <WebView
                                ref={webViewRef} originWhitelist={['*']} scrollEnabled={false}
                                onMessage={async (event) => {
                                    const msg = event.nativeEvent.data;
                                    if (msg.startsWith('SIG_DATA:')) { await handleSendClaim(msg.replace('SIG_DATA:', '')); }
                                    else if (msg === 'HAS_SIGNATURE') { setHasSigned(true); }
                                    else if (msg === 'NO_SIGNATURE') { setHasSigned(false); }
                                }}
                                source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>*{margin:0;padding:0;touch-action:none;}body{background:#EFEFEF;overflow:hidden;}canvas{display:block;width:100%;height:100%;}.ph{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#999;font-size:22px;font-weight:bold;opacity:0.3;pointer-events:none;}</style></head><body><div class="ph" id="ph">Sign here</div><canvas id="c"></canvas><script>var c=document.getElementById('c'),ctx=c.getContext('2d'),ph=document.getElementById('ph'),drawing=false,pts=[];function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}resize();window.onresize=resize;ctx.strokeStyle='#1A1A5E';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';function getXY(e){var t=e.touches[0];var rect=c.getBoundingClientRect();return{x:(t.clientX-rect.left)*(c.width/rect.width),y:(t.clientY-rect.top)*(c.height/rect.height)};}c.addEventListener('touchstart',function(e){e.preventDefault();drawing=true;var p=getXY(e);pts=[p];ctx.beginPath();ctx.moveTo(p.x,p.y);ph.style.display='none';});c.addEventListener('touchmove',function(e){e.preventDefault();if(!drawing)return;var p=getXY(e);pts.push(p);if(pts.length>=3){var l=pts.length,m={x:(pts[l-2].x+pts[l-1].x)/2,y:(pts[l-2].y+pts[l-1].y)/2};ctx.quadraticCurveTo(pts[l-2].x,pts[l-2].y,m.x,m.y);ctx.stroke();}if(pts.length>10)window.ReactNativeWebView.postMessage('HAS_SIGNATURE');});c.addEventListener('touchend',function(){drawing=false;});window.clearCanvas=function(){ctx.clearRect(0,0,c.width,c.height);ph.style.display='block';window.ReactNativeWebView.postMessage('NO_SIGNATURE');};window.getSig=function(){var png=c.toDataURL('image/png');window.ReactNativeWebView.postMessage('SIG_DATA:'+png);};</script></body></html>` }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TouchableOpacity onPress={() => { webViewRef.current?.injectJavaScript('clearCanvas();true;'); setHasSigned(false); }} style={{ flex: 1, padding: 16, alignItems: 'center' }}><Text style={{ color: '#B0B0B0' }}>CLEAR</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { if (!hasSigned) return; setGeneratingPdf(true); webViewRef.current?.injectJavaScript('getSig();true;'); }} style={{ flex: 1, backgroundColor: '#4CD964', padding: 16, borderRadius: 12, alignItems: 'center' }}>
                                {generatingPdf ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold' }}>SEND</Text>}
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => { setShowSignature(false); setDniInput(''); }} style={{ marginTop: 25 }}>
                            <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold', letterSpacing: 1.2 }}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* FAB + */}
            <TouchableOpacity onPress={() => setShowPickMenu(true)} style={{ position: 'absolute', bottom: 130, right: 25, width: 54, height: 54, borderRadius: 27, backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', elevation: 15, borderWidth: 1, borderColor: '#FFF5' }}>
                <Text style={{ color: '#000', fontSize: 28, fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>


            {/* PICK MENU */}
            <Modal visible={showPickMenu} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#111', padding: 30, paddingBottom: 50, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
                        <Text style={{ color: '#D4AF37', textAlign: 'center', marginBottom: 20 }}>ADD TO VAULT</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 }}>
                            <TouchableOpacity onPress={uploadImage} style={{ alignItems: 'center' }}><Text style={{ fontSize: 30 }}>🖼️</Text><Text style={{ color: '#FFF' }}>GALLERY</Text></TouchableOpacity>
                            <TouchableOpacity onPress={pickDocument} style={{ alignItems: 'center' }}><Text style={{ fontSize: 30 }}>📁</Text><Text style={{ color: '#FFF' }}>FILES</Text></TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setShowPickMenu(false)} style={{ backgroundColor: '#222', padding: 18, borderRadius: 16, alignItems: 'center' }}><Text style={{ color: '#888' }}>CANCEL</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* CONFIRM UPLOAD */}
            <Modal visible={showConfirmUpload} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 25 }}>
                    <View style={{ backgroundColor: '#111', borderRadius: 24, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#D4AF37' }}>
                        <Text style={{ color: '#D4AF37', marginBottom: 20 }}>SAVE TO PRIVATE VAULT</Text>
                        <TouchableOpacity onPress={() => confirmAndUpload()} style={{ backgroundColor: '#D4AF37', width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' }}>
                            {uploadingDoc ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold' }}>ENCRYPT & SAVE</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowConfirmUpload(false)} style={{ marginTop: 20 }}><Text style={{ color: '#888' }}>DISCARD</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
