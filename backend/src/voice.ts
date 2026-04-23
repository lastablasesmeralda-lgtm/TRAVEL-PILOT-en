import twilio from 'twilio';

// Initialize the Twilio Client
// Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are in the .env file
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// We only initialize if the variables exist to prevent crashes during design time
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

/**
 * Automates a call to a hotel using Twilio Programmable Voice.
 * This can be used if the AI Agent decides to notify a hotel for a delayed passenger.
 * 
 * @param hotelPhoneNumber The phone number of the target hotel (e.g. "+1234567890")
 * @param passengerName Name of the passenger
 * @param delayMinutes How long the flight is delayed
 * @param passengerPhone The contact number of the passenger
 */
export async function notifyHotelOfDelay(hotelPhoneNumber: string, passengerName: string, delayMinutes: number, passengerPhone: string = "No registrado") {
    let formattedPhone = hotelPhoneNumber.replace(/\s+/g, '');
    if (/^[67]\d{8}$/.test(formattedPhone)) {
        formattedPhone = '+34' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
    }

    if (!client) {
        console.warn("[Voice API] Twilio credentials not fully set. Mocking voice call.");
        return "mock_call_sid_12345";
    }

    console.log(`[Voice API] Preparando llamada al número: ${formattedPhone} (Original: ${hotelPhoneNumber})`);

    try {
        // Volvemos a la voz 'alice' que es la más compatible en todas las cuentas de Twilio
        // Pero mantenemos las pausas para que el mensaje sea elegante y profesional.
        const twimlMessage = `
            <Response>
                <Say voice="alice" language="es-ES">
                    Hola. <Pause length="1"/> 
                    Esta es una llamada automatizada de emergencia de su asistente Travel Pilot. 
                    <Pause length="1"/>
                    Estamos llamando en nombre de su huésped, ${passengerName}. 
                    <Pause length="1"/>
                    Su vuelo ha sufrido un retraso de ${delayMinutes} minutos. 
                    <Pause length="1"/>
                    El pasajero llegará más tarde de lo previsto, pero confirma que mantiene su reserva activa. 
                    <Pause length="1"/>
                    Si necesitan contactar con el huésped para cualquier detalle de la llegada, su número directo de contacto es: ${passengerPhone.split('').join(' ')}. 
                    <Pause length="2"/>
                    Gracias por su atención. Su asistente Travel Pilot ha registrado esta notificación. 
                    Hasta luego.
                </Say>
            </Response>
        `;

        const call = await client.calls.create({
            twiml: twimlMessage,
            to: formattedPhone,
            from: twilioPhoneNumber!
        });

        console.log(`[Voice API] ✅ Llamada REAL iniciada con éxito. SID: ${call.sid}`);
        return call.sid;

    } catch (error: any) {
        console.error(`[Voice API] ❌ Error crítico al lanzar llamada:`, error.message);
        
        // Información de ayuda según el error de Twilio
        if (error.code === 21211) console.error("   └─ Ayuda: El número de destino no es válido.");
        if (error.code === 21608) console.error("   └─ Ayuda: El número de destino no está verificado en tu cuenta Twilio Trial.");
        if (error.code === 20003) console.error("   └─ Ayuda: Credenciales de Twilio (SID/Token) incorrectas.");
        
        throw error;
    }
}
