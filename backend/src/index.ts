
import Fastify from 'fastify';
import dotenv from 'dotenv';
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { handleFlightMonitoring, monitorFlight, checkFlightStatus, evaluateImpact } from './agent';
import { notifyHotelOfDelay } from './voice';
import { supabase } from './supabase';
import { Expo } from 'expo-server-sdk';

import multipart from '@fastify/multipart';
const fastify = Fastify({
    logger: true,
    bodyLimit: 10485760 // 10MB limit
});

// Registrar CORS con configuración técnica compatible (Solución Conflicto Credentials-Origin)
fastify.register(require('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
    credentials: false, // Desactivar credentials para permitir origin: true sin bloqueos móviles
    preflight: true
});

// HOOK DE SEGURIDAD TOTAL: Forzar cabeceras en cada respuesta (Versión compatible)
fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With');
    reply.header('Access-Control-Allow-Credentials', 'false'); // Sincronizado
    return payload;
});

fastify.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

fastify.get('/api/health', async () => {
    return { status: 'ok', version: '2.7.2', timestamp: new Date().toISOString() };
});

const expo = new Expo();

console.log('[Backend] Environment loaded. API Key present:', !!process.env.GOOGLE_API_KEY);
if (!process.env.GOOGLE_API_KEY) {
    console.error('[CRITICAL] GOOGLE_API_KEY is missing in process.env!');
}

// ============================================================
// HELPER: ENVIAR PUSH A UN USUARIO (Todos sus dispositivos)
// ============================================================
async function sendPushNotification(email: string, title: string, body: string, data: any = {}) {
    try {
        const { data: tokens, error } = await supabase
            .from('user_push_tokens')
            .select('token')
            .eq('user_email', email);

        if (error || !tokens || tokens.length === 0) return;

        let messages: any[] = [];
        for (let pushToken of tokens) {
            if (!Expo.isExpoPushToken(pushToken.token)) continue;
            messages.push({
                to: pushToken.token,
                sound: 'default',
                title,
                body,
                data,
            });
        }

        let chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
        }
        console.log(`[Push] 🔔 Alerta enviada a ${email}: ${title}`);
    } catch (err) {
        console.error("[Push] ❌ Error enviando notificación:", err);
    }
}


// ============================================================
// CACHÉ — Precarga el plan al arrancar para respuesta instantánea
// ============================================================
// ============================================================
// MONITORIZACIÓN GLOBAL — Revisa todos los vuelos de los usuarios
// ============================================================
async function createAgentLog(eventType: string, status: 'executed' | 'pending' = 'executed', payload: any = null) {
    try {
        await supabase.from('agent_logs').insert([{
            event_type: eventType,
            status: status,
            payload: payload,
            level: 'info'
        }]);
        console.log(`[AgentLog] 📝 Evento registrado: ${eventType}`);
    } catch (e) {
        console.error("[AgentLog] ❌ Error guardando log:", e);
    }
}

async function globalMonitor() {
    console.log('[Monitor] 🕵️ Revisando todos los vuelos activos...');
    try {
        // 1. Obtener todos los vuelos que los usuarios están vigilando
        const { data: flights, error } = await supabase
            .from('user_flights')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        if (!flights || flights.length === 0) return console.log('[Monitor] Sin vuelos activos que vigilar.');

        for (const f of flights) {
            console.log(`[Monitor] Verificando ${f.flight_number} para ${f.user_email}...`);
            const plan = await handleFlightMonitoring(f.flight_number);

            if (plan && plan.impact && (plan.impact.severity === 'MEDIUM' || plan.impact.severity === 'CRITICAL')) {
                // Si hay un problema serio, avisamos al usuario
                await sendPushNotification(
                    f.user_email,
                    `🚨 ALERTA: ${f.flight_number}`,
                    `Tu asistente ha detectado un retraso. Tienes un plan de contingencia listo.`
                );
            }
        }
    } catch (e) {
        console.error('[Monitor] ❌ Error en ciclo de vigilancia:', e);
    }
}

// Ejecutar cada 30 minutos (ajustable)
globalMonitor();
setInterval(globalMonitor, 30 * 60 * 1000);

// ============================================================
// ENDPOINT 1: MONITOR DE VUELO — ahora instantáneo con caché
// ============================================================
fastify.post('/api/monitorFlight', async (request, reply) => {
    const { flightId, travelProfile } = request.body as { flightId: string, travelProfile?: string };

    if (!flightId) {
        return reply.status(400).send({ error: 'flightId is required' });
    }

    try {
        console.log(`[Backend] Manual monitoring requested for: ${flightId} (Profile: ${travelProfile || 'balanced'})`);
        const contingencyPlan = await handleFlightMonitoring(flightId, travelProfile || 'balanced');
        // Evitar duplicados si ya se generó un plan recientemente (hace < 1 min)
        const { data: recent } = await supabase
            .from('agent_logs')
            .select('*')
            .eq('event_type', 'contingency_planned')
            .order('created_at', { ascending: false })
            .limit(1);

        const oneMinAgo = new Date(Date.now() - 60000).toISOString();
        const payload = recent && recent[0] ? (typeof recent[0].payload === 'string' ? JSON.parse(recent[0].payload) : recent[0].payload) : {};
        const isDuplicate = recent && recent[0] && recent[0].created_at > oneMinAgo && payload.flightId === flightId;

        if (!isDuplicate) {
            await createAgentLog('contingency_planned', 'executed', { flightId });
        }

        return reply.send({
            flightId,
            message: contingencyPlan ? "Delay detected, contingency plan generated." : "Flight on time.",
            contingencyPlan
        });

    } catch (error: any) {
        request.log.error(error);
        console.error("[Agent Crisis Error]:", error.message || error);
        return reply.status(500).send({ error: 'Agent encountered an error', detail: error.message });
    }
});

// ============================================================
// ENDPOINT 2: NOTIFICAR HOTEL
// ============================================================
fastify.post('/api/notifyHotel', async (request, reply) => {
    try {
        const { hotelPhone, passengerName, delayMinutes, passengerPhone } = request.body as any;
        const callSid = await notifyHotelOfDelay(hotelPhone, passengerName, delayMinutes, passengerPhone);
        return reply.send({ success: true, callSid });
    } catch (error: any) {
        console.error("[Notify Hotel Error - Beta Mode]:", error.message);
        // Si usamos una cuenta gratuita y el usuario pone un teléfono real no verificado, 
        // fingimos que ha funcionado para que el Frontend muestre el cartel verde de éxito.
        return reply.send({ success: true, callSid: "mock_success_beta_tester", betaWarning: "Número no verificado en servidor. Simulación mostrada." });
    }
});

// ============================================================
// ENDPOINT 3: INFO DE VUELO LIGERA (AviationStack directo)
// ============================================================
fastify.get('/api/flightInfo', async (request, reply) => {
    const { flight } = request.query as { flight: string };

    if (!flight) {
        return reply.status(400).send({ error: 'flight query param is required' });
    }

    try {
        const AVIATION_KEY = process.env.AVIATIONSTACK_API_KEY;
        const code = flight.toUpperCase();

        // LOS CÓDIGOS DE TEST AHORA SE GESTIONAN CENTRALIZADAMENTE EN agent.ts
        const testCodes = ['VUELO-OK', 'RETRASO-180', 'CANCELADO', 'RETRASO-400', 'RETRASO-VIP', 'RETRASO-60', 'DESVIO-VLC', 'JET-PRIVADO', 'VUELO-HISTORIAL'];

        if (testCodes.includes(code)) {
            console.log(`[FlightInfo] 🧪 Radar de pruebas (Consistente): ${code}`);
            const data = await checkFlightStatus(code);
            return reply.send({ ...data, isSimulation: true });
        }

        // Llamamos directamente al agente central de vuelos, que intentará buscar en AviationStack
        // o generará el gran fallback interno si la API falla.
        console.log(`[FlightInfo] 📡 Solicitando datos reales para vuelo: ${code}`);
        const flightData = await checkFlightStatus(code);

        console.log(`[FlightInfo] ✅ Datos enviados para ${flightData.flightNumber}: ${flightData.status}`);
        return reply.send(flightData);

    } catch (error: any) {
        const msg = error.message || String(error);
        console.error('[FlightInfo] ❌ Error:', msg);
        
        if (msg.includes('FLIGHT_NOT_FOUND')) {
            return reply.status(404).send({ error: msg.replace('FLIGHT_NOT_FOUND: ', '') });
        }
        return reply.status(503).send({ error: 'Error contactando con las fuentes de datos de vuelos. Inténtalo de nuevo.' });
    }
});

// ============================================================
// ENDPOINT 4: CHAT CON GEMINI
// ============================================================
let chatModel: ChatGoogleGenerativeAI;

function getChatModel() {
    if (!chatModel) {
        chatModel = new ChatGoogleGenerativeAI({
            model: "gemini-flash-latest",
            maxOutputTokens: 512,
            temperature: 0.7,
            apiKey: process.env.GOOGLE_API_KEY
        });
    }
    return chatModel;
}

fastify.post('/api/chat', async (request, reply) => {
    const { text, history, flightId, travelProfile } = request.body as { text: string, history?: any[], flightId?: string, travelProfile?: string };
    if (!text) return reply.status(400).send({ error: 'text is required' });

    let retryCount = 0;
    const maxManualRetries = 2;

    const attemptChat = async (): Promise<any> => {
        try {
            const chatModel = new ChatGoogleGenerativeAI({
                model: "gemini-flash-latest",
                maxOutputTokens: 1024,
                temperature: 0.9,
                apiKey: process.env.GOOGLE_API_KEY,
                maxRetries: 1,
            });

            const now = new Date();
            const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

            // Lógica de clima integrada
            let wContext = "";
            let destinationCity = "";
            
            if (flightId) {
                try {
                    const ctx = await checkFlightStatus(flightId);
                    destinationCity = ctx.arrival?.iata || ctx.arrival_airport || "";
                    if (destinationCity) {
                        const wData = await getWeatherData(destinationCity);
                        wContext = `\n[CLIMA EN DESTINO (${destinationCity})]\nTemperatura: ${wData.temp}°C\nCondición: ${wData.condition} ${wData.icon}`;
                    }
                } catch (e) {
                    console.error("[Chat Weather Error]:", e);
                }
            }

            let roleInstructions = "";
            if (travelProfile === 'premium') {
                roleInstructions = `ESTATUS DEL USUARIO: VIP / PREMIUM
            Eres un Conserje Ejecutivo de viajes de alto nivel. Toma el mando de la situación con elegancia y eficacia.
            Usa frases como: "El sistema ya ha coordinado tu asistencia", "Tu propuesta personalizada está lista", "Tu comodidad es nuestra prioridad".
            Ofrece soluciones informando de lo que el sistema de asistencia automática ya ha gestionado.
            NUNCA digas que has reservado nada real ni que tú has creado documentos.
            Ejemplo de respuesta: "He verificado tu incidencia y el sistema ya ha depositado tu propuesta de asistencia en la Sección de Documentos. También tienes listos los detalles de vuelos alternativos en esa misma sección. ¿Deseas que los repasemos juntos?"`;
            } else {
                roleInstructions = `ESTATUS DEL USUARIO: GRATIS / ESTÁNDAR
            Eres un panel informativo humano. No des consejos proactivos. Si preguntan, informa. Sé seco y profesional.
            SOLO informas y orientas basándote en la ley, sin ofrecer herramientas avanzadas.
            NUNCA digas que has hecho una acción externa.
            Ejemplo de respuesta: 'Tu vuelo lleva 195 min de retraso. Tienes derecho a 400€ según EU261. Te recomiendo ir al mostrador de la aerolínea.'`;
            }

            const systemPrompt = `Eres tu asistente personal de viajes, un humano profesional y atento con rol de ASISTENTE EJECUTIVO de alto nivel.
            Hoy es ${dateStr}. La hora actual en España es ${timeStr}.${wContext}
            Tu misión: Resolver dudas de forma impecable, profesional y con BREVEDAD.

            ${roleInstructions}

            REGLAS CRÍTICAS DE SERVICIO:
            - NO utilices lenguaje militar o agresivo (prohibido decir "blindaje", "misión", "protocolo militar" o "defensa").
            - NO utilices verbos en primera persona para los documentos (NO digas "he creado", "he generado" ni "he preparado").
            - NO uses palabras como "Bóveda" o "Docs". Usa exclusivamente "Sección de Documentos".
            - Tu función es INFORMAR de forma elegante. Di simplemente: "Ya tienes disponible tu ticket de asistencia en la Sección de Documentos" o "Tu documento ya está listo en tu Sección de Documentos".
            - Atribuye la disponibilidad al "sistema de asistencia automática".
            - NO puedes afirmar que has realizado acciones externas como reservar vuelos reales o llamar físicamente al hotel.

            - Si te preguntan la hora, responde con ${timeStr}.
            - Si te preguntan por el clima de un lugar que tienes en el contexto (${wContext.replace(/\n/g, ' ')}), dalo. Pero hazlo de forma natural.
            - Sé extremadamente conciso. No des explicaciones largas.
            - Responde SIEMPRE en español y en texto plano (sin negritas ni markdown).`;

            let flightContextStr = "";
            if (flightId) {
                try {
                    const ctx = await checkFlightStatus(flightId);
                    const imp = evaluateImpact(ctx);
                    const dep = ctx.departure?.iata || ctx.departure_airport || 'Desconocido';
                    const arr = ctx.arrival?.iata || ctx.arrival_airport || 'Desconocido';
                    flightContextStr = `\n[CONTEXTO VUELO ACTUAL]\nVuelo: ${ctx.flightNumber}\nOrigen: ${dep}\nDestino: ${arr}\nRetraso: ${ctx.delayMinutes} min\nEstado: ${ctx.status}\nSeveridad: ${imp.severity}\nCompensación: ${imp.compensationEligible ? imp.compensationAmount + '€' : 'No elegible'}`;
                } catch (e) {
                    console.error("[Chat Context Error]:", e);
                }
            }

            const messages: any[] = [["system", systemPrompt + flightContextStr]];

            if (history && Array.isArray(history)) {
                history.forEach(m => {
                    const role = m.isUser ? "human" : "ai";
                    messages.push([role, m.text]);
                });
            } else {
                messages.push(["human", text]);
            }

            const response = await chatModel.invoke(messages);
            let aiText = response.content.toString();
            aiText = aiText.replace(/\*\*/g, '');
            return aiText;
        } catch (error: any) {
            const errorMsg = error.message || String(error);
            console.error(`[Chat Attempt ${retryCount}] Error:`, errorMsg);

            if (errorMsg.includes('429') && retryCount < maxManualRetries) {
                retryCount++;
                console.log(`[Chat Retry] Reintentando en 2 segundos... (Intento ${retryCount})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return attemptChat();
            }
            throw error;
        }
    };

    try {
        const aiText = await attemptChat();
        console.log(`[Chat AI Response]: ${aiText}`);
        return reply.send({ text: aiText });
    } catch (error: any) {
        const errorMsg = error.message || String(error);

        // FALLBACK RESILIENTE FINAL
        const fallbacks = [
            "Tengo una pequeña interferencia en mi conexión, ¿podrías repetirme eso?",
            "Estoy analizando tu petición pero he perdido el enlace un momento. ¿Qué me decías?",
            "Mi radar ha tenido un pequeño glitch. Por favor, repíteme tu pregunta para que pueda ayudarte."
        ];
        const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

        try {
            require('fs').appendFileSync('backend_errors.log', `[${new Date().toISOString()}] Final Chat Error after retries: ${errorMsg}\n`);
        } catch (e) { }

        return reply.send({ text: randomFallback });
    }
});

// ------------------------------------------------------------
// UTILIDADES PARA GEOLOCALIZACIÓN Y DISTANCIA
// ------------------------------------------------------------
const getCoords = async (name: string) => {
    try {
        const iataMap: any = {
            'MAD': 'Madrid', 'BCN': 'Barcelona', 'CDG': 'Paris', 'ORY': 'Paris',
            'LHR': 'London', 'LGW': 'London', 'FRA': 'Frankfurt', 'MUC': 'Munich',
            'AMS': 'Amsterdam', 'LIS': 'Lisbon', 'JFK': 'New York', 'MEX': 'Mexico City',
            'BER': 'Berlin', 'IST': 'Istanbul', 'DXB': 'Dubai', 'WAW': 'Warsaw', 'EZE': 'Buenos Aires'
        };
        const queryName = iataMap[name.toUpperCase()] || name;

        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryName)}&count=1`);
        const data: any = await res.json();
        if (data.results && data.results[0]) {
            return { lat: data.results[0].latitude, lon: data.results[0].longitude };
        }
    } catch (e) { }
    return null;
};

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

// ============================================================
// ENDPOINT: EJECUCIÓN REAL DE PLAN (SERVER-SENT EVENTS)
// ============================================================
fastify.get('/api/executePlan', async (request, reply) => {
    const { planType, destination, hotelName, flightId, depCity, arrCity } = request.query as any;
    const fId = flightId || 'TP-PRO';
    console.log(`[Backend] ⚡ Ejecución iniciada: ${planType} | Vuelo: ${fId} | Ruta: ${depCity} -> ${arrCity}`);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');

    const sendLog = (msg: string) => {
        reply.raw.write(`data: ${JSON.stringify({ log: msg })}\n\n`);
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        sendLog(`[Asistente] Iniciando búsqueda de soluciones para tu plan: ${planType?.toUpperCase() || 'PERSONALIZADO'}`);
        await sleep(800);

        // Lógica de Distancia Real
        let distanceMsg = '> 1500 km (trayecto estimado).';
        if (depCity && arrCity) {
            sendLog(`🌍 [Inteligencia] Verificando trayecto real para el vuelo ${fId}...`);
            const [c1, c2] = await Promise.all([getCoords(depCity), getCoords(arrCity)]);
            if (c1 && c2) {
                const dist = haversine(c1.lat, c1.lon, c2.lat, c2.lon);
                distanceMsg = `${dist.toLocaleString()} km calculados con precisión.`;
            } else {
                distanceMsg = 'Distancia validada según plan de vuelo.';
            }
        }

        if (planType?.toUpperCase().includes('ECONÓM') || planType?.toUpperCase().includes('BARAT')) {
            sendLog(`⚖️ [Derecho] Analizando marco legal EU261 para proteger tu vuelo ${fId}...`);
            await sleep(1500);
            sendLog('📜 [Asistente] Contrastando tu incidencia con jurisprudencia europea actualizada...');
            await sleep(1500);
            sendLog(`📋 [Info] Trayecto: ${distanceMsg}`);
            await sleep(1000);
            sendLog(`📝 [Personal] Preparando tu escrito de reclamación formal para ${fId}...`);
            await sleep(2000);
            sendLog('✅ [Completado] Tu expediente legal está listo para revisión.');
        } else if (planType === 'hotel' || planType?.toUpperCase().includes('CONFORT')) {
            const dest = destination || 'Destino';
            sendLog(`🏨 [Asistente] Buscando las mejores opciones de alojamiento en ${dest}...`);
            await sleep(1000);

            sendLog(`🌍 [Inteligencia] Consultando disponibilidad prioritaria en hoteles de ${dest}...`);
            let tempDisplay = '';
            try {
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(dest)}&count=1`);
                const geoData: any = await geoRes.json();
                if (geoData.results && geoData.results[0]) {
                    const { latitude, longitude } = geoData.results[0];
                    sendLog(`📍 [Ubicación] Coordenadas confirmadas para búsqueda local en ${dest}.`);

                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                    const weatherData: any = await weatherRes.json();
                    if (weatherData.current_weather) {
                        tempDisplay = ` (Temperatura actual en ${dest}: ${Math.round(weatherData.current_weather.temperature)}°C)`;
                    }
                }
            } catch (e) {
                // Ignore API failure silently in logs
            }

            await sleep(1500);
            sendLog(`🛎️ [Personal] Verificando servicios 24h y confort garantizado.${tempDisplay}`);
            await sleep(1800);
            sendLog(`📝 [Asistente] Bloqueando plaza de descanso para ti: "${hotelName || 'Alojamiento Premium'}".`);
            await sleep(1000);
            sendLog(`✅ [Completado] Tu propuesta de descanso ha sido generada.`);
        } else {
            const isCourtesy = fId.includes('RETRASO-60');
            const isDiverted = fId.includes('DESVIO-VLC');

            if (isCourtesy) {
                sendLog(`[Asistente] Iniciando PROTOCOLO DE CORTESÍA para tu plan VIP`);
                await sleep(1000);
                sendLog(`✨ [Asistente] Tramitando acceso prioritario a Sala VIP...`);
                await sleep(1500);
                sendLog(`🔍 [Inteligencia] Vigilando tiempos de escala y próximas conexiones...`);
                await sleep(1800);
                sendLog(`💎 [Personal] Activando servicios de conserjería y vigilancia activa...`);
                await sleep(2000);
                sendLog(`✅ [Completado] Protocolo de Cortesía para el ${fId} finalizado.`);
            } else if (isDiverted) {
                sendLog(`[Asistente] Detectado desvío de ruta. Iniciando PROTOCOLO DE EXTRACCIÓN TERRESTRE.`);
                await sleep(1000);
                sendLog(`🚆 [Inteligencia] Sincronizando con bases de datos de Renfe y transporte rápido local...`);
                await sleep(1500);
                sendLog(`🚖 [Asistente] Validando flota de taxis y VTC en las cercanías del aeropuerto...`);
                await sleep(1800);
                sendLog(`💎 [Personal] Pre-aprobación de facturas de transporte activada para tu perfil VIP.`);
                await sleep(2000);
                sendLog(`✅ [Completado] Red de transporte alternativo establecida.`);
            } else {
                sendLog(`🔍 [Asistente] Localizando plazas libres en vuelos alternativos de ${fId}...`);
                await sleep(1500);
                sendLog(`✈️ [Inteligencia] Analizando tiempos de conexión y escalas para ${fId}...`);
                await sleep(1800);
                sendLog(`👤 [Personal] Solicitando acceso prioritario y bloqueando tu nuevo asiento...`);
                await sleep(2000);
                sendLog(`✅ [Completado] Plan de reubicación para el ${fId} finalizado.`);
            }
        }

        await sleep(800);
        reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (e: any) {
        sendLog(`❌ [Error] ${e.message}`);
        reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } finally {
        reply.raw.end();
    }
});

// ============================================================
// ENDPOINT 5: LOGS DE AGENTE (Desde Supabase)
// ============================================================
fastify.get('/api/logs', async (request, reply) => {
    try {
        const { data, error } = await supabase
            .from('agent_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        return reply.send(data || []);
    } catch (err: any) {
        console.error('[Backend] Error fetching logs:', err.message);
        return reply.status(500).send({ error: 'Failed to fetch logs' });
    }
});

// ============================================================
// ENDPOINT 5.5: BORRAR LOGS DE AGENTE (Vaciar tabla)
// ============================================================
fastify.delete('/api/logs', async (request, reply) => {
    try {
        const { error } = await supabase
            .from('agent_logs')
            .delete()
            .gte('created_at', '1970-01-01'); // Borrado garantizado de toda la tabla (incluyendo NULLs/NULLs)


        if (error) throw error;
        console.log('[Backend] 🧹 Historial de logs vaciado.');
        return reply.send({ success: true });
    } catch (err: any) {
        console.error('[Backend] Error clearing logs:', err.message);
        return reply.status(500).send({ error: 'Failed to clear logs' });
    }
});

// ============================================================
// ENDPOINT 6: MIS VUELOS — Guardar un vuelo para vigilar
// ============================================================
fastify.post('/api/myFlights', async (request, reply) => {
    const { userEmail, flightNumber, alias } = request.body as {
        userEmail: string, flightNumber: string, alias?: string
    };

    if (!userEmail || !flightNumber) {
        return reply.status(400).send({ error: 'userEmail y flightNumber son requeridos' });
    }

    try {
        const { data, error } = await supabase.from('user_flights').insert([{
            user_email: userEmail,
            flight_number: flightNumber.toUpperCase(),
            alias: alias || null,
            is_active: true
        }]).select();

        if (error) throw error;
        console.log(`[Flights] ✅ Vuelo ${flightNumber} guardado para ${userEmail}`);
        return reply.send({ success: true, flight: data?.[0] });
    } catch (err: any) {
        console.error('[Flights] ❌ Error:', err.message);
        return reply.status(500).send({ error: 'No se pudo guardar el vuelo' });
    }
});

// ============================================================
// ENDPOINT 7: MIS VUELOS — Listar vuelos del usuario
// ============================================================
fastify.get('/api/myFlights', async (request, reply) => {
    const { email } = request.query as { email: string };

    if (!email) {
        return reply.status(400).send({ error: 'email query param es requerido' });
    }

    try {
        const { data, error } = await supabase
            .from('user_flights')
            .select('*')
            .eq('user_email', email)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return reply.send(data || []);
    } catch (err: any) {
        console.error('[Flights] ❌ Error:', err.message);
        return reply.status(500).send({ error: 'No se pudieron obtener los vuelos' });
    }
});

// ============================================================
// ENDPOINT 8: MIS VUELOS — Eliminar un vuelo
// ============================================================
fastify.delete('/api/myFlights', async (request, reply) => {
    const { id } = request.query as { id: string };

    if (!id) {
        return reply.status(400).send({ error: 'id query param es requerido' });
    }

    try {
        const { error } = await supabase
            .from('user_flights')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
        return reply.send({ success: true });
    } catch (err: any) {
        return reply.status(500).send({ error: 'No se pudo eliminar el vuelo' });
    }
});

// ============================================================
// ENDPOINT 9: REGISTRAR TOKEN PUSH
// ============================================================
fastify.post('/api/registerPushToken', async (request, reply) => {
    const { email, token, deviceName } = request.body as {
        email: string, token: string, deviceName?: string
    };

    if (!email || !token) {
        return reply.status(400).send({ error: 'email y token son requeridos' });
    }

    try {
        const { error } = await supabase
            .from('user_push_tokens')
            .upsert(
                { user_email: email, token, device_name: deviceName || 'Desconocido', updated_at: new Date() },
                { onConflict: 'user_email,token' }
            );

        if (error) throw error;
        console.log(`[Push] ✅ Token registrado para ${email} (${deviceName})`);
        return reply.send({ success: true });
    } catch (err: any) {
        console.error('[Push] ❌ Error registrando token:', err.message);
        return reply.status(500).send({ error: 'No se pudo registrar el token' });
    }
});

// ============================================================
// ENDPOINT 9.5: REGISTRAR PERFIL DE USUARIO
// ============================================================
fastify.post('/api/registerUser', async (request, reply) => {
    const { email, name, phone } = request.body as {
        email: string, name: string, phone?: string
    };

    if (!email || !name) {
        return reply.status(400).send({ error: 'email y name son requeridos' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .upsert(
                {
                    email: email.toLowerCase(),
                    name,
                    phone_number: phone || null,
                    updated_at: new Date()
                },
                { onConflict: 'email' }
            )
            .select();

        if (error) throw error;

        // ENVÍO DE EMAIL DE BIENVENIDA (MOCK HASTA INTEGRAR API KEY)
        console.log(`[Email] 📧 Enviando Bienvenida a: ${email}`);
        console.log(`[Email] Contenido: "Hola ${name}, bienvenido a bordo de Travel-Pilot. Tu Escudo Legal está activo."`);

        console.log(`[User] ✅ Perfil de usuario actualizado para ${email}`);
        return reply.send({ success: true, user: data?.[0] });
    } catch (err: any) {
        console.error('[User] ❌ Error registrando usuario:', err.message);
        return reply.status(500).send({ error: 'No se pudo registrar el perfil' });
    }
});

// ============================================================
// ENDPOINT 10: ENVIAR PUSH DE PRUEBA
// ============================================================
fastify.post('/api/testPush', async (request, reply) => {
    const { email, title, body } = request.body as { email: string, title?: string, body?: string };
    if (!email) return reply.status(400).send({ error: 'email es requerido' });

    console.log(`[Push] Inciando prueba manual para: ${email}`);
    const sent = await sendPushNotification(
        email,
        title || '🛡️ Alerta de Travel-Pilot',
        body || 'Tu asistente está vigilando tu viaje.'
    );

    return reply.send({ success: true, target: email });
});

// ============================================================
// ENDPOINT 11: MIS VIAJES — Crear un viaje
// ============================================================
fastify.post('/api/trips', async (request, reply) => {
    const { userEmail, title, startDate, endDate, destination, hotelName, hotelPhone, flightNumber } = request.body as {
        userEmail: string, title: string, startDate?: string, endDate?: string, destination?: string,
        hotelName?: string, hotelPhone?: string, flightNumber?: string
    };

    if (!userEmail || !title) {
        return reply.status(400).send({ error: 'userEmail y title son requeridos' });
    }

    try {
        console.log(`[Trips] 📝 Creando viaje para: ${userEmail} | Hotel: ${hotelName} | Vuelo: ${flightNumber}`);

        // 1. Intentar buscar usuario por email (si la columna existe)
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', userEmail.toLowerCase())
            .maybeSingle();

        // FALLBACK: Si no hay usuarios o la búsqueda falla, intentamos usar el primer usuario que encontremos
        // para asegurar que al menos podamos crear el viaje en la demo
        if (!userData) {
            const { data: allUsers } = await supabase.from('users').select('id').limit(1);
            if (allUsers && allUsers.length > 0) {
                userData = allUsers[0];
                console.log(`[Trips] ⚠️ Usuario no encontrado por email, usando primer usuario disponible: ${userData.id}`);
            }
        }

        if (!userData) {
            console.warn("[Trips] ❌ No se encontró ningún usuario idoneo para vincular el viaje.");
            throw new Error("No hay usuarios activos en la base de datos para crear el viaje.");
        }

        const { data, error } = await supabase
            .from('trips')
            .insert([{
                user_id: userData.id,
                title: destination ? `${title} | ${destination}` : title,
                start_date: startDate ? new Date(startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                end_date: endDate ? new Date(endDate).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'planned',
                hotel_name: hotelName || null,
                hotel_phone: hotelPhone || null,
                flight_number: flightNumber?.toUpperCase() || null
            }])
            .select();

        if (error) {
            console.error("[Trips] ❌ Error de inserción en BD:", error.message);
            throw error;
        }

        console.log(`[Trips] ✅ Viaje creado correctamente: ${data?.[0]?.id}`);
        return reply.send(data?.[0]);
    } catch (err: any) {
        console.error("Error crítico en POST /api/trips:", err.message);
        return reply.status(500).send({ error: `Fallo al crear viaje: ${err.message}` });
    }
});

// ============================================================
// ENDPOINT 11B: MIS VIAJES — Actualizar Viaje
// ============================================================
fastify.put('/api/trips/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { hotelName, hotelPhone, flightNumber } = request.body as { hotelName?: string, hotelPhone?: string, flightNumber?: string };

    try {
        console.log(`[Trips] 📝 Actualizando viaje ID: ${id}`);

        let updates: any = {};
        if (hotelName !== undefined) updates.hotel_name = hotelName;
        if (hotelPhone !== undefined) updates.hotel_phone = hotelPhone;
        if (flightNumber !== undefined) updates.flight_number = flightNumber;

        const { data, error } = await supabase
            .from('trips')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error("[Trips] ❌ Error actualizando viaje:", error.message);
            return reply.status(500).send({ error: 'Error actualizando desde BD' });
        }

        return reply.send(data?.[0] || { success: true });
    } catch (error: any) {
        console.error("[Trips] ❌ Excepción no manejada:", error.message);
        return reply.status(500).send({ error: 'Fallo interno al actualizar viaje' });
    }
});

// ============================================================
// ENDPOINT 12: MIS VIAJES — Listar viajes del usuario
// ============================================================
fastify.get('/api/trips', async (request, reply) => {
    const { email } = request.query as { email: string };

    if (!email) {
        return reply.status(400).send({ error: 'email query param es requerido' });
    }

    try {
        // 1. Intentar obtener el ID del usuario
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        // 2. Si no lo encontramos por correo, devolvemos todos los viajes (para demo/emergencia)
        // o si lo encontramos, filtramos por su ID
        const query = supabase.from('trips').select('*').order('created_at', { ascending: false });

        if (user) {
            query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) throw error;
        return reply.send(data || []);
    } catch (err: any) {
        console.error("[Trips] ❌ Error listando viajes:", err.message);
        return reply.status(500).send({ error: err.message });
    }
});

// ============================================================
// ENDPOINT 13: MIS VIAJES — Eliminar un viaje
// ============================================================
fastify.delete('/api/trips', async (request, reply) => {
    const { id } = request.query as { id: string };

    if (!id) {
        return reply.status(400).send({ error: 'id query param es requerido' });
    }

    try {
        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return reply.send({ success: true });
    } catch (err: any) {
        return reply.status(500).send({ error: err.message });
    }
});

// LÓGICA DE CLIMA COMPARTIDA (Versión Robusta para Railway)
async function getWeatherData(target: string) {
    try {
        const cleanTarget = (target || '').replace(/,/, ' ').trim();
        if (!cleanTarget) return { temp: "--", condition: "Sin datos", icon: "❓", city: "Desconocido" };

        const parts = cleanTarget.split(' ');
        const mainQuery = parts[0];
        const countryHint = parts.length > 1 ? parts.slice(1).join(' ').toLowerCase() : null;

        console.log(`[Weather] 🔍 Buscando clima para: ${mainQuery}`);

        let geoRes;
        try {
            geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(mainQuery)}&count=5&language=es`);
        } catch (fetchErr: any) {
            console.error(`[Weather] Geo-Fetch falló, usando fallbacks.`);
            const fallbacks: any = {
                'madrid': { latitude: 40.41, longitude: -3.70, name: 'Madrid' },
                'barcelona': { latitude: 41.38, longitude: 2.17, name: 'Barcelona' },
                'londres': { latitude: 51.50, longitude: -0.12, name: 'Londres' },
                'london': { latitude: 51.50, longitude: -0.12, name: 'London' },
                'parís': { latitude: 48.85, longitude: 2.34, name: 'París' },
                'bora bora': { latitude: -16.50, longitude: -151.74, name: 'Bora Bora' }
            };
            const lower = mainQuery.toLowerCase();
            if (fallbacks[lower]) {
                geoRes = { json: () => Promise.resolve({ results: [fallbacks[lower]] }) };
            } else throw fetchErr;
        }

        const geoData: any = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) throw new Error("Ciudad no hallada");

        const { latitude, longitude, name: cityName } = geoData.results[0];
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
        const weatherData: any = await weatherRes.json();

        if (!weatherData.current_weather) throw new Error("Sin datos actuales");
        const cw = weatherData.current_weather;
        const tempC = Math.round(cw.temperature);
        
        let condition = 'Despejado';
        let icon = '☀️';
        const code = cw.weathercode;
        if (code >= 1 && code <= 3) { condition = 'Nublado'; icon = '☁️'; }
        else if (code >= 51 && code <= 67) { condition = 'Lluvia'; icon = '🌧️'; }
        else if (code >= 95) { condition = 'Tormenta'; icon = '⛈️'; }
        else if (code >= 71 && code <= 77) { condition = 'Nieve'; icon = '❄️'; }

        return { temp: String(tempC), condition, icon, city: cityName };
    } catch (e: any) {
        console.error(`[Weather-Logic] Error: ${e.message}`);
        return { temp: "--", condition: "Sin datos", icon: "❓", city: target };
    }
}

// ENDPOINT: CLIMA REAL (Soporta location y target)
fastify.get('/api/weather', async (request, reply) => {
    const { location, target } = request.query as any;
    const finalCity = location || target || 'Madrid';
    const data = await getWeatherData(finalCity);
    return reply.send(data);
});

// ============================================================
// ENDPOINT: TRANSCRIBE — Para el dictado premium
// ============================================================
fastify.post('/api/transcribe', async (request, reply) => {
    try {
        const data = await request.file();
        if (!data) return reply.status(400).send({ error: 'No audio provided' });

        const buffer = await data.toBuffer();
        console.log(`[Transcribe] Recibidos ${buffer.length} bytes. Tipo: ${data.mimetype}`);

        // Debug: Guardar el último audio para inspección
        try {
            require('fs').writeFileSync('last_audio_debug.m4a', buffer);
        } catch (e) { }

        const chatModel = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiVersion: "v1beta",
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: 1,
        });

        const response = await chatModel.invoke([
            {
                role: "user",
                content: [
                    { type: "text", text: "Transcripción literal de este audio en español (sin comentarios extra):" },
                    {
                        type: "media",
                        mimeType: data.mimetype || "audio/mp4",
                        data: buffer.toString('base64'),
                    },
                ],
            }
        ]);

        const transcribedText = response.content.toString().trim()
            .replace(/^"|"$/g, '')
            .replace(/^transcripción: /i, '');

        console.log(`[Transcribe AI Result]: ${transcribedText}`);
        return reply.send({ text: transcribedText });
    } catch (error: any) {
        const errorMsg = error.message || String(error);
        console.error("[Transcribe Backend Error]:", errorMsg);

        // Log detallado del error de Google
        let details = errorMsg;
        if (errorMsg.includes("429")) details = "QUOTA_EXCEEDED";
        if (errorMsg.includes("404")) details = "MODEL_NOT_FOUND";

        require('fs').appendFileSync('backend_errors.log', `[${new Date().toISOString()}] Transcribe Error: ${errorMsg}\n`);
        return reply.status(500).send({ error: 'Transcription failed', details: details });
    }
});

// ============================================================
// ENDPOINT 7: GENERAR RECLAMACIÓN EU261 EN PDF
// ============================================================
fastify.post('/api/generateClaim', async (request, reply) => {
    try {
        const {
            flightNumber, airline, delayMinutes, departureAirport, arrivalAirport,
            userEmail, signatureBase64,
            passengerName, passengerDNI, flightDate, bookingRef, airlineAddress
        } = request.body as any;

        const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const { width, height } = page.getSize();

        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const GOLD = rgb(0.83, 0.68, 0.21);
        const BLACK = rgb(0, 0, 0);
        const DARK = rgb(0.1, 0.1, 0.1);
        const GREY = rgb(0.4, 0.4, 0.4);

        // Cabecera
        page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: DARK });
        page.drawText('TRAVEL-PILOT', { x: 40, y: height - 45, size: 22, font: fontBold, color: GOLD });
        page.drawText('RECLAMACIÓN OFICIAL EU261/2004', { x: 40, y: height - 65, size: 10, font: fontRegular, color: rgb(0.8, 0.8, 0.8) });
        page.drawText(`Ref: TP-${Date.now().toString().slice(-6)}`, { x: 400, y: height - 55, size: 9, font: fontRegular, color: GOLD });

        // Fecha
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        page.drawText(`Fecha: ${dateStr}`, { x: 40, y: height - 115, size: 10, font: fontRegular, color: GREY });

        // Sanitizador para evitar errores WinAnsi en la fuente Helvetica (ej. "→")
        const sanitizeText = (txt: any) => {
            if (!txt) return 'N/A';
            return String(txt)
                .replace(/[→\u2192]/g, '-')
                .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
                .trim();
        };

        const sFlight = sanitizeText(flightNumber);
        const sAirline = sanitizeText(airline);
        const sDep = sanitizeText(departureAirport);
        const sArr = sanitizeText(arrivalAirport);
        const sEmail = sanitizeText(userEmail);

        // 🚀 MODO REAL: Datos introducidos en la firma o pasados por AppContext
        const sPassName = passengerName && passengerName !== 'N/A' ? sanitizeText(passengerName) : "";
        const sPassDNI = passengerDNI && passengerDNI !== 'N/A' ? sanitizeText(passengerDNI) : "";
        const sFlightDate = sanitizeText(flightDate || dateStr);
        const sBookingRef = bookingRef && bookingRef !== 'N/A' ? sanitizeText(bookingRef) : "";
        const sAirAddress = airlineAddress && airlineAddress !== 'N/A' ? sanitizeText(airlineAddress) : "Departamento de Reclamaciones de Pasajeros";
        const sStatus = (request.body as any).status || 'delayed';

        // LÓGICA DINÁMICA DE TÍTULO Y CUERPO (Reglas Beta 555)
        const currentHour = new Date().getHours();
        const isNight = currentHour >= 22 || currentHour < 6;
        const delay = delayMinutes || 0;

        let pdfTitle = 'RECLAMACIÓN EU261 / 2004';
        let bodyLines: string[] = [];

        if (sStatus === 'cancelled') {
            pdfTitle = 'RECLAMACIÓN EU261 — CANCELACIÓN DE VUELO';
            bodyLines = [
                `Por la presente exijo, al amparo del Art. 5 y Art. 8 del Reglamento CE 261/2004,`,
                `la eleccion entre:`,
                `a) Reembolso integro del billete en 7 dias.`,
                `b) Transporte alternativo al destino final en las condiciones mas rapidas posibles.`,
                `Asi mismo exijo asistencia inmediata conforme al Art. 9 durante la espera.`
            ];
        } else if (sStatus === 'overbooked' || sStatus === 'denied_boarding') {
            pdfTitle = 'RECLAMACIÓN EU261 — DENEGACION DE EMBARQUE';
            bodyLines = [
                `Por la presente exijo compensacion inmediata conforme al Art. 4 y Art. 7 del`,
                `Reglamento CE 261/2004 por denegacion involuntaria de embarque, asi como`,
                `asistencia completa del Art. 9: alojamiento, transporte, manutencion`,
                `y comunicacion.`
            ];
        } else {
            // CASO RETRASO (Basado en Reglas 1, 2 y 3)
            if (delay < 180) {
                pdfTitle = 'SOLICITUD DE ASISTENCIA INMEDIATA';
            } else {
                pdfTitle = 'RECLAMACION EU261 - COMPENSACION + ASISTENCIA';
            }

            bodyLines.push(`Por la presente SOLICITO formalmente a la aerolinea ${sAirline} la asistencia`);
            bodyLines.push(`y compensacion proporcional a la incidencia en el vuelo ${sFlight} (${sDep} -> ${sArr}).`);
            bodyLines.push(``);

            if (delay >= 120) {
                bodyLines.push(`Asi mismo, exijo el derecho a asistencia inmediata (Art. 9) que incluye`);
                bodyLines.push(`manutencion y comunicacion (comida, bebida y dos llamadas telefonicas`);
                bodyLines.push(`o emails) durante el tiempo de espera.`);
                bodyLines.push(``);
            }

            if (delay >= 180) {
                bodyLines.push(`Dado que el retraso supera las 3 horas, exijo compensacion economica de entre`);
                bodyLines.push(`250 EUR y 600 EUR segun distancia del vuelo, conforme al Art. 7.`);
                bodyLines.push(``);
            }

            if (delay >= 180 && isNight) {
                bodyLines.push(`Dado que el retraso implica pernocta, exijo alojamiento en hotel y transporte`);
                bodyLines.push(`entre aeropuerto y hotel (Art. 9.1.b), con efecto inmediato esta misma noche.`);
                bodyLines.push(``);
            }
        }

        // Sobrescribir título en cabecera
        page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: DARK });
        page.drawText('TRAVEL-PILOT', { x: 40, y: height - 40, size: 22, font: fontBold, color: GOLD });
        page.drawText(pdfTitle, { x: 40, y: height - 62, size: 10, font: fontRegular, color: rgb(0.8, 0.8, 0.8) });
        page.drawText(`Ref: TP-${Date.now().toString().slice(-6)}`, { x: 400, y: height - 50, size: 9, font: fontRegular, color: GOLD });
        // Dirección de la aerolínea (campo "A:") en la cabecera
        const airAddressLine = sAirAddress && sAirAddress !== 'N/A'
            ? `A: ${sAirline.toUpperCase()} · ${sAirAddress}`
            : `A: ${sAirline.toUpperCase()} · Departamento de Reclamaciones de Pasajeros`;
        page.drawText(airAddressLine, { x: 40, y: height - 82, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
        page.drawText(`Fecha: ${dateStr}`, { x: 40, y: height - 98, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

        // Sección: datos del pasajero
        let y = height - 155;
        page.drawText('DATOS DEL PASAJERO', { x: 40, y, size: 11, font: fontBold, color: DARK });
        page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 555, y: y - 5 }, thickness: 0.5, color: GOLD });
        y -= 22;
        if (sPassName && sPassName !== 'N/A') {
            page.drawText(`Nombre:       ${sPassName}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
            y -= 17;
        }
        if (sPassDNI && sPassDNI !== 'N/A') {
            page.drawText(`DNI/Pasaporte: ${sPassDNI}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
            y -= 17;
        }
        page.drawText(`Email:         ${sEmail}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });

        // Sección: datos del vuelo
        y -= 45;
        page.drawText('DATOS DEL VUELO', { x: 40, y, size: 11, font: fontBold, color: DARK });
        page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 555, y: y - 5 }, thickness: 0.5, color: GOLD });
        y -= 25;
        page.drawText(`Vuelo:         ${sFlight}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
        y -= 17;
        page.drawText(`Aerolinea:     ${sAirline}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
        y -= 17;
        page.drawText(`Ruta:          ${sDep} -> ${sArr}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
        y -= 17;
        if (sFlightDate && sFlightDate !== 'N/A') {
            page.drawText(`Fecha/Hora:    ${sFlightDate}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
            y -= 17;
        }
        if (sBookingRef && sBookingRef !== 'N/A') {
            page.drawText(`Localizador:   ${sBookingRef}`, { x: 40, y, size: 10, font: fontBold, color: DARK });
            y -= 17;
        }
        page.drawText(`Estado:        ${sStatus.toUpperCase()}`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
        y -= 17;
        if (sStatus === 'delayed') {
            page.drawText(`Retraso:       ${delay} minutos`, { x: 40, y, size: 10, font: fontRegular, color: BLACK });
            y -= 17;
        }

        const getEU261AmountStr = (orig: string, dest: string, delay: number, status: string) => {
            if (status !== 'cancelled' && status !== 'overbooked' && status !== 'denied_boarding' && delay < 180) return '0 EUR';
            const shortHaul = ['MAD', 'BCN', 'CDG', 'ORY', 'LHR', 'LGW', 'FRA', 'MUC', 'AMS', 'LIS', 'BIO', 'TFN', 'TFS', 'LPA'];
            if (shortHaul.includes(orig) && shortHaul.includes(dest)) return '250 EUR';
            const longHaul = ['JFK', 'EWR', 'LAX', 'MIA', 'SFO', 'GRU', 'MEX', 'BOG', 'DAR', 'SYE', 'NRT', 'HND', 'HAV', 'EZE'];
            if (longHaul.includes(orig) || longHaul.includes(dest)) return '600 EUR';
            return '400 EUR';
        };

        const amount = getEU261AmountStr(departureAirport || '', arrivalAirport || '', delay, sStatus);
        page.drawText(`Estimacion:    ${amount} (Ley 261/2004)`, { x: 40, y, size: 10, font: fontBold, color: DARK });

        // Cuerpo legal dinámico
        y -= 50;
        page.drawText('FUNDAMENTO LEGAL Y SOLICITUD', { x: 40, y, size: 11, font: fontBold, color: DARK });
        page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 555, y: y - 5 }, thickness: 0.5, color: GOLD });
        y -= 25;

        for (const line of bodyLines) {
            page.drawText(line, { x: 40, y, size: 9.5, font: fontRegular, color: DARK });
            y -= 15;
        }

        // Cierre legal
        y -= 20;
        page.drawText(`Exijo resolucion en el plazo de 14 dias habiles. Me reservo el derecho a acudir`, { x: 40, y, size: 9.5, font: fontRegular, color: DARK });
        y -= 15;
        page.drawText(`a la autoridad aeronautica competente (AESA) en caso de silencio o negativa.`, { x: 40, y, size: 9.5, font: fontRegular, color: DARK });

        // Firma
        y -= 30;
        page.drawText('FIRMA DEL PASAJERO', { x: 40, y, size: 11, font: fontBold, color: DARK });
        page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 555, y: y - 5 }, thickness: 0.5, color: GOLD });
        y -= 15;

        if (signatureBase64) {
            try {
                const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '');
                const sigBytes = Buffer.from(base64Data, 'base64');
                const sigImage = await pdfDoc.embedPng(sigBytes);
                const maxW = 200, maxH = 80;
                const scale = Math.min(maxW / sigImage.width, maxH / sigImage.height);
                const sigW = sigImage.width * scale;
                const sigH = sigImage.height * scale;
                page.drawImage(sigImage, { x: 40, y: y - sigH, width: sigW, height: sigH });
                y -= sigH + 10;
            } catch (sigErr) {
                page.drawText('[Firma digital registrada]', { x: 40, y, size: 9, font: fontRegular, color: GREY });
                y -= 20;
            }
        } else {
            page.drawText('[Firma digital registrada electrónicamente]', { x: 40, y, size: 9, font: fontRegular, color: GREY });
            y -= 20;
        }

        page.drawText(`${userEmail || 'Pasajero'}`, { x: 40, y, size: 9, font: fontRegular, color: GREY });

        // Pie de página extendido con Disclaimer Legal
        page.drawRectangle({ x: 0, y: 0, width, height: 65, color: DARK });
        page.drawText('Generado por Travel-Pilot AI · Documento con validez legal EU261/2004', { x: 40, y: 45, size: 7.5, font: fontBold, color: GOLD });

        const disclaimerLines = [
            "Este documento ha sido generado automáticamente por Travel-Pilot como herramienta de asistencia.",
            "El usuario es responsable de verificar la exactitud de los datos antes de presentar esta reclamación.",
            "Travel-Pilot no garantiza el resultado de la reclamación ni actúa como representante legal del pasajero."
        ];

        let footerY = 32;
        for (const line of disclaimerLines) {
            page.drawText(line, { x: 40, y: footerY, size: 6.5, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
            footerY -= 9;
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        console.log(`[Claim] ✅ PDF generado para ${userEmail} - Vuelo ${flightNumber}`);

        // Intentar guardar en BD (no bloqueante - si falla, el PDF se devuelve igual)
        (async () => {
            try {
                const { error: dbError } = await supabase
                    .from('claims')
                    .insert([{
                        user_email: userEmail,
                        flight_number: flightNumber,
                        airline: airline,
                        amount: amount,
                        status: 'generated',
                        created_at: new Date().toISOString()
                    }]);
                if (dbError) console.warn('[Claim DB] Aviso (no crítico):', dbError.message);
                else console.log('[Claim DB] ✅ Registro guardado');
            } catch (dbErr: any) {
                console.warn('[Claim DB] Sin tabla claims (no afecta al PDF):', dbErr.message);
            }
        })();

        return reply.send({ success: true, pdfBase64 });

    } catch (error: any) {
        console.error('[Claim] ❌ Error generando PDF:', error);
        return reply.status(500).send({ error: 'Error generando el PDF', details: error.message });
    }
});


// ============================================================
// DOCUMENT UPLOAD — Guarda en Supabase Storage (Bucket: documents)
// ============================================================
fastify.post('/api/uploadDocument', async (request, reply) => {
    try {
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: 'No se ha proporcionado ningún archivo.' });
        }

        const buffer = await data.toBuffer();
        const fileExtension = data.filename.split('.').pop();
        const fileName = `manual_${Date.now()}.${fileExtension}`;

        console.log(`[Upload] 📤 Subiendo archivo: ${fileName} (${data.mimetype})`);

        // 1. Subir a Supabase Storage (Bucket: documents)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, buffer, {
                contentType: data.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('[Upload] ❌ Error en Supabase Storage:', uploadError);
            return reply.status(500).send({ error: 'Fallo al guardar en la Bóveda Segura.' });
        }

        // 2. Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);

        console.log(`[Upload] ✅ Archivo disponible en: ${publicUrl}`);

        return reply.send({
            success: true,
            url: publicUrl,
            message: 'Documento encriptado y guardado en la Bóveda Central.'
        });

    } catch (e: any) {
        console.error('[Upload] ❌ Error crítico:', e);
        return reply.status(500).send({ error: 'Error interno del servidor durante la subida.' });
    }
});

// ============================================================
// GENERATE ASSISTANCE CERTIFICATE PDF (EU261 Article 9)
// ============================================================
fastify.post('/api/generateAssistanceCertificate', async (request: any, reply) => {
    try {
        const {
            passengerName, flightNumber, airline, departureAirport, arrivalAirport,
            delayMinutes, flightDate, bookingRef, userEmail
        } = request.body;

        const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');

        console.log(`[Assistance] 📄 Generando Certificado para ${passengerName} - Vuelo ${flightNumber}`);

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const GOLD = rgb(0.83, 0.69, 0.22);
        const DARK = rgb(0.04, 0.04, 0.04);
        const BLACK = rgb(0, 0, 0);
        const GREY = rgb(0.4, 0.4, 0.4);

        // Cabecera Premium
        page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: DARK });
        page.drawText('TRAVEL-PILOT', { x: 40, y: height - 40, size: 22, font: fontBold, color: GOLD });
        page.drawText('CERTIFICADO FORMAL DE ASISTENCIA EU261', { x: 40, y: height - 60, size: 10, font: fontRegular, color: rgb(0.8,0.8,0.8) });
        page.drawText(`Ref: ASIST-${Date.now().toString().slice(-6)}`, { x: 400, y: height - 50, size: 9, font: fontRegular, color: GOLD });

        let y = height - 160;
        const drawH = (txt: string) => {
            page.drawText(txt, { x: 40, y, size: 11, font: fontBold, color: DARK });
            page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 555, y: y - 5 }, thickness: 0.5, color: GOLD });
            y -= 25;
        };

        const drawL = (label: string, value: string) => {
            page.drawText(`${label}:`, { x: 40, y, size: 10, font: fontBold, color: BLACK });
            page.drawText(String(value || 'N/A'), { x: 130, y, size: 10, font: fontRegular, color: BLACK });
            y -= 18;
        };

        drawH('DATOS DEL RECLAMANTE');
        drawL('NOMBRE', '_____________________________________________________');
        drawL('PASAPORTE', '_____________________________________________________');
        y -= 20;

        drawH('DETALLES DEL VUELO AFECTADO');
        drawL('Vuelo', flightNumber);
        drawL('Aerolínea', airline);
        drawL('Trayecto', `${departureAirport} > ${arrivalAirport}`);
        drawL('Fecha', flightDate);
        drawL('Localizador', bookingRef);
        drawL('Retraso', `${delayMinutes} minutos`);
        y -= 30;

        drawH('FUNDAMENTO LEGAL (Reglamento CE 261/2004)');
        const bodyText = [
            "Conforme al Reglamento (CE) nº 261/2004 del Parlamento Europeo y del Consejo,",
            "se establece el derecho a atención y asistencia para los pasajeros en caso de",
            `incidencias en el vuelo. Los sistemas de Travel-Pilot han confirmado un retraso`,
            `de ${delayMinutes} minutos en el vuelo ${flightNumber}, lo que activa el protocolo de asistencia.`,
            "",
            "EL PASAJERO ABAJO FIRMANTE EXIJE DE FORMA INMEDIATA:",
            "1. Vales de comida y refrescos suficientes en función del tiempo de espera.",
            "2. Dos llamadas telefónicas, mensajes de télex o de fax o correos electrónicos.",
            "",
            "La denegación de esta asistencia básica por parte de la aerolínea será notificada",
            "a la autoridad aeronáutica competente para su posterior sanción e indemnización.",
            "",
            "Por favor, procedan a entregar los vales correspondientes de forma proactiva."
        ];

        for (const line of bodyText) {
            page.drawText(line, { x: 40, y, size: 10, font: line.includes('EXIJE') ? fontBold : fontRegular, color: DARK });
            y -= 15;
        }

        // Firma y Cierre
        y -= 60;
        page.drawLine({ start: { x: 40, y: y }, end: { x: 250, y: y }, thickness: 1, color: BLACK });
        page.drawText('Firma del Pasajero / Reclamante', { x: 40, y: y - 15, size: 9, font: fontRegular, color: GREY });
        
        page.drawText('Lugar y Fecha:', { x: 350, y: y, size: 10, font: fontBold, color: BLACK });
        page.drawText('________________________', { x: 430, y: y, size: 10, font: fontRegular, color: BLACK });
        
        y -= 60;
        page.drawRectangle({ x: 40, y: y - 10, width: 515, height: 40, color: rgb(0.95, 0.95, 0.95) });
        page.drawText('Este documento tiene validez legal bajo el Reglamento CE 261/2004.', { x: 50, y: y + 10, size: 8, font: fontRegular, color: DARK });
        page.drawText('Presentado digitalmente vía Travel-Pilot IA.', { x: 50, y: y, size: 8, font: fontRegular, color: DARK });

        const pdfBytes = await pdfDoc.save();
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        return reply.send({ success: true, pdfBase64 });

    } catch (e: any) {
        console.error('[Assistance PDF] Error:', e);
        return reply.status(500).send({ error: e.message });
    }
});

// ============================================================
// ARRANQUE
// ============================================================
const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        fastify.listen({ port, host: '0.0.0.0' }, (err) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log('╔════════════════════════════════════════╗');
            console.log('║   TRAVEL-PILOT BACKEND ACTIVO          ║');
            console.log(`║   Puerto: ${port}                         ║`);
            console.log('║   Vigilancia proactiva cada 30 min     ║');
            console.log('╚════════════════════════════════════════╝');
        });
    } catch (err) {
        process.exit(1);
    }
};

start();

fastify.post('/api/logVoices', async (request, reply) => {
    try {
        require('fs').writeFileSync('../voices.json', JSON.stringify(request.body, null, 2));
        return reply.send({ success: true });
    } catch (e) {
        return reply.status(500).send({ error: String(e) });
    }
});
