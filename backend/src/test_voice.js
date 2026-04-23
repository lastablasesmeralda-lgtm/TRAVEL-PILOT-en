require('dotenv').config({ path: '../.env' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken) {
    console.error("Missing Twilio credentials");
    process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testCall() {
    console.log("Initiating test call to +34623986708...");
    try {
        const call = await client.calls.create({
            twiml: '<Response><Say voice="alice" language="es-ES">Hola. Esta es una llamada de prueba desde el motor cerebral de Travel Pilot. El sistema principal de comunicaciones tácticas está en línea y cooperativo. Que tengas un excelente día.</Say></Response>',
            to: '+34623986708',
            from: twilioPhoneNumber
        });
        console.log("Call initiated successfully! Call SID:", call.sid);
    } catch (e) {
        console.error("Call failed:", e);
    }
}

testCall();
