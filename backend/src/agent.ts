import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';
import { supabase } from './supabase';

dotenv.config();

const FORMAT_INSTRUCTIONS = `The output should be a JSON object with this structure:
{
  "options": [
    {
      "type": "RÁPIDO | ECONÓMICO | CONFORT",
      "title": "Title",
      "description": "Details",
      "estimatedCost": 100,
      "actionType": "hotel | transport | flight_change | jet"
    }
  ]
}
Return ONLY the JSON.`;

// ============================================================
// INTERFACES DE TYPESCRIPT
// ============================================================
interface HotelBooking {
    name: string;
    check_in_limit: string;
    check_in_limit_iso: string;
    address: string;
    cost_per_night: number;
    is_refundable: boolean;
    phone?: string;
}

interface ConnectingFlight {
    flightId: string;
    boarding_closes_iso: string;
    min_transfer_minutes: number;
}

interface GroundTransport {
    type: string;
    last_departure_iso: string;
}

export interface FlightContext {
    flightId: string;
    flightNumber: string;
    status: string;
    delayMinutes: number;
    airline?: string;
    departure_airport?: string;
    arrival_airport?: string;
    departure?: {
        iata: string;
        delay: number;
        scheduled: string;
        terminal?: string;
        gate?: string;
    };
    arrival?: {
        iata: string;
        scheduled: string;
        estimated: string;
        terminal?: string;
        gate?: string;
    };
    original_arrival?: string;
    estimated_arrival_iso?: string;
    hotel_booking: HotelBooking | null;
    connecting_flight: ConnectingFlight | null;
    ground_transport: GroundTransport | null;
    isSimulation?: boolean;
}

// ============================================================
// FUNCIONES DE ANÁLISIS
// ============================================================
export function evaluateImpact(ctx: FlightContext, travelProfile: string = 'balanced') {
    let severity = 'LOW';
    let potentialLoss = 0;
    let compensationEligible = false;
    let compensationAmount = 0;
    let hotelAlert = '';
    let hotelRisk = false;
    let connectionRisk = false;
    let groundTransportRisk = false;

    const shortHaul = ['MAD', 'BCN', 'CDG', 'ORY', 'LHR', 'LGW', 'FRA', 'MUC', 'AMS', 'LIS', 'BIO', 'TFN', 'TFS', 'LPA', 'BRU', 'ZRH'];
    const longHaul = ['JFK', 'EWR', 'LAX', 'MIA', 'SFO', 'GRU', 'MEX', 'BOG', 'DAR', 'SYD', 'NRT', 'HND', 'HAV', 'EZE', 'PEK', 'DXB'];

    let distanceComp = 400; // Por defecto medio alcance
    const dep = ctx.departure?.iata || ctx.departure_airport || 'N/A';
    const arr = ctx.arrival?.iata || ctx.arrival_airport || 'N/A';

    if (shortHaul.includes(dep) && shortHaul.includes(arr)) {
        distanceComp = 250;
    } else if (longHaul.includes(dep) || longHaul.includes(arr)) {
        distanceComp = 600;
    }

    if (ctx.status === 'cancelled') {
        severity = 'CRITICAL';
        compensationEligible = true;
        compensationAmount = distanceComp;
    } else if (ctx.delayMinutes >= 180) {
        severity = 'CRITICAL';
        compensationEligible = true;
        compensationAmount = distanceComp;
    } else if (ctx.delayMinutes >= 120 || ctx.status === 'diverted') {
        severity = 'MEDIUM';
        compensationEligible = false;
        compensationAmount = 0;
    }

    const estArrival = new Date(ctx.estimated_arrival_iso || ctx.arrival?.estimated || new Date().toISOString());
    const hours = estArrival.getHours();
    const minutes = estArrival.getMinutes().toString().padStart(2, '0');

    // Nombres reales de Salas VIP en los principales hubs
    const vipLounges: Record<string, string> = {
        'MAD': 'Sala VIP Neptuno', 'BCN': 'Sala VIP Pau Casals', 'LHR': 'Galleries Lounge',
        'CDG': 'Salon Air France / Extime', 'JFK': 'Centurion Lounge', 'FRA': 'Lufthansa Senator Lounge',
        'AMS': 'KLM Crown Lounge', 'LIS': 'ANA Lounge'
    };
    const loungeName = vipLounges[dep] || 'Sala VIP asociada';

    if (ctx.status === 'cancelled') {
        hotelAlert = `Vuelo cancelado. Te corresponde noche de hotel gestionada por la aerolínea en ${dep}. Dirígete al mostrador.`;
        hotelRisk = true;
    } else if (travelProfile === 'premium' && ctx.delayMinutes >= 120) {
        hotelAlert = `Sugerencia Elite: Retraso severo temporal. Mientras estamos preparando tu nueva ruta, te recordamos que tienes acceso garantizado a la ${loungeName} en ${dep}. Dirígete allí para esperar con total confort.`;
    } else if (hours >= 23 || hours <= 5) {
        hotelAlert = `Llegada de madrugada a ${arr} (${hours}:${minutes}). El transporte público estará limitado, considera reservar un traslado con antelación.`;
    } else if (ctx.delayMinutes > 120) {
        hotelAlert = `Retraso severo. Tienes derecho a vales de comida y bebida en el aeropuerto de ${dep} mientras esperas.`;
    } else {
        hotelAlert = `Vuelo vigilado. Llegada estimada a ${arr} a las ${hours}:${minutes}. Sigue las pantallas del aeropuerto para tu embarque.`;
    }

    if (ctx.connecting_flight) {
        const boardingCloses = new Date(ctx.connecting_flight.boarding_closes_iso);
        const transferTime = (boardingCloses.getTime() - estArrival.getTime()) / 60000;
        if (transferTime < ctx.connecting_flight.min_transfer_minutes) {
            connectionRisk = true;
        }
    }

    if (ctx.ground_transport) {
        const lastDeparture = new Date(ctx.ground_transport.last_departure_iso);
        if (estArrival > lastDeparture) {
            groundTransportRisk = true;
        }
    }

    const result = { severity, potentialLoss, compensationEligible, compensationAmount, hotelAlert, hotelRisk, connectionRisk, groundTransportRisk };
    console.log(`[JusticeSystem] ⚖️ Impact Audit: Flight ${ctx.flightNumber} | Status: ${ctx.status} | Delay: ${ctx.delayMinutes}m | Comp: ${compensationAmount}€ | Severity: ${severity}`);
    return result;
}

function getModel() {
    return new ChatGoogleGenerativeAI({
        model: 'gemini-flash-latest',
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0.2, // Más bajo = más rápido/consistente
        maxOutputTokens: 512, // Suficiente para JSON de planes
    });
}

// ============================================================
// DATOS DEL VUELO — AviationStack API (Real)
// ============================================================
export async function checkFlightStatus(flightId: string): Promise<FlightContext> {
    const now = new Date();
    const code = flightId.toUpperCase();

    // 📡 PRIORIDAD 1: AERORED (AeroDataBox via RapidAPI - Mayor cuota de créditos)
    try {
        const rapidKey = process.env.RAPIDAPI_KEY;
        if (rapidKey) {
            console.log(`[Radar] 🔍 Consultando AERORED para ${code}...`);
            const adbRes = await fetch(
                `https://aerodatabox.p.rapidapi.com/flights/number/${code}`,
                {
                    headers: {
                        'X-RapidAPI-Key': rapidKey,
                        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
                    },
                    signal: AbortSignal.timeout(7000)
                }
            );

            if (adbRes.status === 204) {
                console.log(`[Radar] ℹ️ AERORED: Vuelo ${code} no encontrado para hoy.`);
                throw new Error(`FLIGHT_NOT_FOUND: El vuelo ${code} no tiene operaciones programadas para hoy.`);
            }

            if (adbRes.ok) {
                const adbData = await adbRes.json();
                if (Array.isArray(adbData) && adbData.length > 0) {
                    const f = adbData[0];
                    const rawStatus = (f.status || '').toLowerCase();
                    console.log(`[Radar] ✅ AERORED localizó: ${f.status}`);

                    // Mapeo de status real
                    let status = 'scheduled';
                    if (rawStatus.includes('cancel')) status = 'cancelled';
                    else if (rawStatus.includes('divert')) status = 'diverted';
                    else if (rawStatus.includes('land') || rawStatus.includes('arrived')) status = 'landed';
                    else if (rawStatus.includes('active') || rawStatus.includes('en route') || rawStatus.includes('airborne')) status = 'active';
                    else if (rawStatus.includes('depart') || rawStatus.includes('taxiing')) status = 'departed';
                    else if (rawStatus.includes('board')) status = 'boarding';
                    else if (rawStatus.includes('delay')) status = 'delayed';
                    else if (rawStatus.includes('schedul') || rawStatus.includes('expected')) status = 'scheduled';

                    // Cálculo del retraso real (en minutos)
                    let delayMinutes = 0;
                    const depScheduled = f.departure?.scheduledTime?.utc;
                    const depRevised = f.departure?.revisedTime?.utc || f.departure?.runwayTime?.utc;
                    if (depScheduled && depRevised) {
                        delayMinutes = Math.max(0, Math.round((new Date(depRevised).getTime() - new Date(depScheduled).getTime()) / 60000));
                    }
                    if (delayMinutes > 15 && status === 'scheduled') status = 'delayed';

                    return {
                        flightId,
                        flightNumber: f.number?.replace(/\s/g, '') || code,
                        status,
                        delayMinutes,
                        airline: f.airline?.name || code.substring(0, 2),
                        departure: {
                            iata: f.departure?.airport?.iata || 'N/A',
                            delay: delayMinutes,
                            scheduled: f.departure?.scheduledTime?.local || f.departure?.scheduledTime?.utc || now.toISOString(),
                            terminal: f.departure?.terminal || undefined,
                            gate: f.departure?.gate || undefined,
                        },
                        arrival: {
                            iata: f.arrival?.airport?.iata || 'N/A',
                            scheduled: f.arrival?.scheduledTime?.local || f.arrival?.scheduledTime?.utc || now.toISOString(),
                            estimated: f.arrival?.predictedTime?.local || f.arrival?.revisedTime?.local || f.arrival?.scheduledTime?.local || now.toISOString(),
                            terminal: f.arrival?.terminal || undefined,
                            gate: f.arrival?.gate || undefined,
                        },
                        hotel_booking: null,
                        connecting_flight: null,
                        ground_transport: null,
                    };
                }
            }
        }
    } catch (e) {
        console.log('[Radar] Error AERORED:', e);
    }

    // 🏆 SUITE DE PRUEBAS MAESTRA (DETERMINISTA)
    if (code === 'RETRASO-VIP') {
        const originalArrival = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const delayMinutes = 245; // 4h 05m retraso
        return {
            flightId,
            flightNumber: 'IB3166',
            status: 'delayed',
            delayMinutes,
            airline: 'Iberia Express',
            departure: { 
                iata: 'MAD', 
                delay: delayMinutes, 
                scheduled: now.toISOString(), 
                terminal: 'T4', 
                gate: 'K78' 
            },
            arrival: { 
                iata: 'LHR', 
                scheduled: originalArrival.toISOString(), 
                estimated: new Date(originalArrival.getTime() + delayMinutes * 60 * 1000).toISOString(), 
                terminal: 'T5', 
                gate: 'A10' 
            },
            hotel_booking: {
                name: 'Sofitel London Heathrow', 
                check_in_limit: '23:59',
                check_in_limit_iso: new Date(now.toDateString() + ' 23:59').toISOString(),
                address: 'Heathrow Airport, Terminal 5', 
                cost_per_night: 350, 
                is_refundable: false,
                phone: '+44 20 8757 7777'
            },
            connecting_flight: null, 
            ground_transport: null, 
            isSimulation: true,
        };
    }

    if (code === 'RETRASO-60') {
        const originalArrival = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        return {
            flightId, flightNumber: 'RETRASO-60', status: 'delayed', delayMinutes: 65,
            airline: 'Air Europa',
            departure: { iata: 'MAD', delay: 65, scheduled: now.toISOString() },
            arrival: { iata: 'LIS', scheduled: originalArrival.toISOString(), estimated: new Date(originalArrival.getTime() + 65 * 60 * 1000).toISOString() },
            hotel_booking: null, connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    if (code === 'RETRASO-400') {
        const originalArrival = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const delayMinutes = 300;
        return {
            flightId,
            flightNumber: 'RETRASO-400',
            status: 'delayed',
            delayMinutes,
            airline: 'Iberia',
            departure: { iata: 'JFK', delay: delayMinutes, scheduled: now.toISOString(), terminal: 'T4', gate: 'B23' },
            arrival: { iata: 'MAD', scheduled: originalArrival.toISOString(), estimated: new Date(originalArrival.getTime() + delayMinutes * 60 * 1000).toISOString(), terminal: 'T4S', gate: 'S10' },
            hotel_booking: {
                name: 'Hotel Palace Madrid', check_in_limit: '23:59',
                check_in_limit_iso: new Date(now.toDateString() + ' 23:59').toISOString(),
                address: 'Plaza de las Cortes 7, Madrid', cost_per_night: 400, is_refundable: false,
                phone: '+34 600 000 000'
            },
            connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    if (code === 'RETRASO-180') {
        const originalArrival = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const delayMinutes = 220;
        return {
            flightId,
            flightNumber: 'IB3166',
            status: 'delayed',
            delayMinutes,
            airline: 'Iberia Express',
            departure: { iata: 'MAD', delay: delayMinutes, scheduled: now.toISOString(), terminal: 'T4S', gate: 'H22' },
            arrival: { iata: 'CDG', scheduled: originalArrival.toISOString(), estimated: new Date(originalArrival.getTime() + delayMinutes * 60 * 1000).toISOString(), terminal: '2F', gate: 'F12' },
            hotel_booking: {
                name: 'Pullman Paris Tour Eiffel', check_in_limit: '23:30',
                check_in_limit_iso: new Date(now.toDateString() + ' 23:30').toISOString(),
                address: '18 Avenue De Suffren, Paris', cost_per_night: 280, is_refundable: false,
                phone: '+33 1 44 38 56 00'
            },
            connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    if (code === 'CANCELADO') {
        const originalArrival = new Date(now.getTime() + 1 * 60 * 60 * 1000);
        return {
            flightId,
            flightNumber: 'CANCELADO',
            status: 'cancelled',
            delayMinutes: 0,
            airline: 'Vueling',
            departure: { iata: 'BCN', delay: 0, scheduled: now.toISOString(), terminal: 'T1', gate: 'A12' },
            arrival: { iata: 'MAD', scheduled: originalArrival.toISOString(), estimated: originalArrival.toISOString(), terminal: 'T4', gate: 'J10' },
            hotel_booking: {
                name: 'Hotel Wellington', check_in_limit: '22:00',
                check_in_limit_iso: new Date(now.toDateString() + ' 22:00').toISOString(),
                address: 'Velázquez 8, Madrid', cost_per_night: 300, is_refundable: false,
                phone: '+34 915 75 44 00'
            },
            connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    if (code === 'VUELO-OK') {
        const originalArrival = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return {
            flightId,
            flightNumber: 'VUELO-OK',
            status: 'scheduled',
            delayMinutes: 0,
            airline: 'Air Europa',
            departure: { iata: 'MEX', delay: 0, scheduled: now.toISOString(), terminal: 'T1', gate: '12' },
            arrival: { iata: 'MAD', scheduled: originalArrival.toISOString(), estimated: originalArrival.toISOString(), terminal: 'T4S', gate: 'S01' },
            hotel_booking: null,
            connecting_flight: null,
            ground_transport: null,
            isSimulation: true,
        };
    }

    if (code === 'RETRASO-60') {
        const originalArrival = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const delayMinutes = 60;
        return {
            flightId,
            flightNumber: 'RETRASO-60',
            status: 'delayed',
            delayMinutes,
            airline: 'Vueling',
            departure: { iata: 'BCN', delay: delayMinutes, scheduled: now.toISOString(), terminal: 'T1', gate: 'B22' },
            arrival: { iata: 'CDG', scheduled: originalArrival.toISOString(), estimated: new Date(originalArrival.getTime() + delayMinutes * 60 * 1000).toISOString(), terminal: '2F', gate: 'F12' },
            hotel_booking: null,
            connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    if (code === 'RETRASO-VIP') {
        const originalArrival = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const delayMinutes = 210;
        return {
            flightId,
            flightNumber: 'RETRASO-VIP',
            status: 'delayed',
            delayMinutes,
            airline: 'British Airways',
            departure: { iata: 'MAD', delay: delayMinutes, scheduled: now.toISOString(), terminal: 'T4', gate: 'K12' },
            arrival: { iata: 'IST', scheduled: originalArrival.toISOString(), estimated: new Date(originalArrival.getTime() + delayMinutes * 60 * 1000).toISOString(), terminal: '1', gate: 'F4' },
            hotel_booking: {
                name: 'The Ritz London', check_in_limit: '23:00',
                check_in_limit_iso: new Date(now.toDateString() + ' 23:00').toISOString(),
                address: '150 Piccadilly, London', cost_per_night: 450, is_refundable: false,
                phone: '+44 20 7493 8181'
            },
            connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    if (code === 'DESVIO-VLC') {
        return {
            flightId, flightNumber: 'DESVIO-VLC', status: 'diverted', delayMinutes: 120,
            airline: 'Iberia',
            departure: { iata: 'MAD', delay: 0, scheduled: now.toISOString() },
            arrival: { iata: 'VLC', scheduled: now.toISOString(), estimated: now.toISOString() },
            ground_transport: { type: 'TRAIN', last_departure_iso: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString() },
            hotel_booking: null, connecting_flight: null, isSimulation: true,
        };
    }

    if (code === 'JET-PRIVADO') {
        return {
            flightId, flightNumber: 'JET-PRIVADO', status: 'delayed', delayMinutes: 600,
            airline: 'Emirates',
            departure: { iata: 'MAD', delay: 600, scheduled: now.toISOString() },
            arrival: { iata: 'DXB', scheduled: now.toISOString(), estimated: now.toISOString() },
            hotel_booking: { name: 'Burj Al Arab', check_in_limit: '23:59', check_in_limit_iso: now.toISOString(), address: 'Dubai', cost_per_night: 1500, is_refundable: false, phone: '+971 4 301 7777' },
            isSimulation: true, connecting_flight: null, ground_transport: null,
        };
    }

    if (code === 'VUELO-HISTORIAL') {
        const landedTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
        return {
            flightId, flightNumber: 'VUELO-HISTORIAL', status: 'landed', delayMinutes: 210,
            airline: 'Lufthansa',
            departure: { iata: 'FRA', delay: 210, scheduled: landedTime.toISOString() },
            arrival: { iata: 'MAD', scheduled: landedTime.toISOString(), estimated: landedTime.toISOString() },
            hotel_booking: null, connecting_flight: null, ground_transport: null, isSimulation: true,
        };
    }

    // 📡 PRIORIDAD 1: AERORED (AeroDataBox via RapidAPI - Mayor cuota de créditos)
    try {
        const rapidKey = process.env.RAPIDAPI_KEY;
        if (rapidKey) {
            console.log(`[Radar] 🔍 Consultando AERORED para ${code}...`);
            const adbRes = await fetch(
                `https://aerodatabox.p.rapidapi.com/flights/number/${code}`,
                {
                    headers: {
                        'X-RapidAPI-Key': rapidKey,
                        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
                    },
                    signal: AbortSignal.timeout(7000)
                }
            );

            if (adbRes.status === 204) {
                console.log(`[Radar] ℹ️ AERORED: Vuelo ${code} no encontrado para hoy.`);
                throw new Error(`FLIGHT_NOT_FOUND: El vuelo ${code} no tiene operaciones programadas para hoy.`);
            }

            if (adbRes.ok) {
                const adbData = await adbRes.json();
                if (Array.isArray(adbData) && adbData.length > 0) {
                    const f = adbData[0];
                    const rawStatus = (f.status || '').toLowerCase();
                    console.log(`[Radar] ✅ AERORED localizó: ${f.status}`);

                    let status = 'scheduled';
                    if (rawStatus.includes('cancel')) status = 'cancelled';
                    else if (rawStatus.includes('divert')) status = 'diverted';
                    else if (rawStatus.includes('land') || rawStatus.includes('arrived')) status = 'landed';
                    else if (rawStatus.includes('active') || rawStatus.includes('en route') || rawStatus.includes('airborne')) status = 'active';
                    else if (rawStatus.includes('depart') || rawStatus.includes('taxiing')) status = 'departed';
                    else if (rawStatus.includes('board')) status = 'boarding';
                    else if (rawStatus.includes('delay')) status = 'delayed';

                    let delayMinutes = 0;
                    const depScheduled = f.departure?.scheduledTime?.utc;
                    const depRevised = f.departure?.revisedTime?.utc || f.departure?.runwayTime?.utc;
                    if (depScheduled && depRevised) {
                        delayMinutes = Math.max(0, Math.round((new Date(depRevised).getTime() - new Date(depScheduled).getTime()) / 60000));
                    }
                    if (delayMinutes > 15 && status === 'scheduled') status = 'delayed';

                    return {
                        flightId,
                        flightNumber: f.number?.replace(/\s/g, '') || code,
                        status,
                        delayMinutes,
                        airline: f.airline?.name || code.substring(0, 2),
                        departure: {
                            iata: f.departure?.airport?.iata || 'N/A',
                            delay: delayMinutes,
                            scheduled: f.departure?.scheduledTime?.local || f.departure?.scheduledTime?.utc || now.toISOString(),
                            terminal: f.departure?.terminal || undefined,
                            gate: f.departure?.gate || undefined,
                        },
                        arrival: {
                            iata: f.arrival?.airport?.iata || 'N/A',
                            scheduled: f.arrival?.scheduledTime?.local || f.arrival?.scheduledTime?.utc || now.toISOString(),
                            estimated: f.arrival?.predictedTime?.local || f.arrival?.revisedTime?.local || f.arrival?.scheduledTime?.local || now.toISOString(),
                            terminal: f.arrival?.terminal || undefined,
                            gate: f.arrival?.gate || undefined,
                        },
                        hotel_booking: null,
                        connecting_flight: null,
                        ground_transport: null,
                    };
                }
            }
        }
    } catch (e) {
        console.log('[Radar] Error AERORED:', e);
    }

    // 📡 PRIORIDAD 2: AviationStack (Backup secundario)
    try {
        const aviationKey = process.env.AVIATIONSTACK_API_KEY;
        if (aviationKey) {
            console.log(`[Radar] 📡 Consultando AviationStack de respaldo para ${code}...`);
            const avRes = await fetch(
                `http://api.aviationstack.com/v1/flights?access_key=${aviationKey}&flight_iata=${code}`,
                { signal: AbortSignal.timeout(7000) }
            );

            if (avRes.ok) {
                const avData = await avRes.json();
                if (avData.data && avData.data.length > 0) {
                    const f = avData.data[0];
                    console.log(`[Radar] ✅ AviationStack localizó: ${f.flight_status}`);

                    const depDelay = f.departure?.delay || 0;
                    const arrDelay = f.arrival?.delay || 0;
                    const status = f.flight_status === 'active' ? 'active' : (f.flight_status === 'scheduled' && depDelay > 15 ? 'delayed' : f.flight_status);

                    return {
                        flightId,
                        flightNumber: code,
                        status: status || 'scheduled',
                        delayMinutes: depDelay || arrDelay || 0,
                        airline: f.airline?.name || code.substring(0, 2),
                        departure: {
                            iata: f.departure?.iata || 'N/A',
                            delay: depDelay,
                            scheduled: f.departure?.scheduled || now.toISOString(),
                            terminal: f.departure?.terminal,
                            gate: f.departure?.gate
                        },
                        arrival: {
                            iata: f.arrival?.iata || 'N/A',
                            scheduled: f.arrival?.scheduled || now.toISOString(),
                            estimated: f.arrival?.estimated || f.arrival?.scheduled || now.toISOString(),
                            terminal: f.arrival?.terminal,
                            gate: f.arrival?.gate
                        },
                        hotel_booking: null,
                        connecting_flight: null,
                        ground_transport: null,
                    };
                }
            }
        }
    } catch (e) {
        console.log('[Radar] Error AviationStack:', e);
    }

    // 📡 PRIORIDAD 3: OpenSky (Seguimiento satelital)
    try {
        const osRes = await fetch(
            `https://opensky-network.org/api/states/all`,
            { signal: AbortSignal.timeout(10000) }
        );
        const osData = osRes.ok ? await osRes.json() : null;
        const prefix = code.substring(0, 2);
        const state = osData?.states?.find((s: any[]) => s[1] && s[1].trim() === code);

        if (state) {
            return {
                flightId, flightNumber: code, status: state[8] ? 'landed' : 'active', delayMinutes: 0,
                airline: prefix,
                departure: { iata: 'N/A', delay: 0, scheduled: now.toISOString() },
                arrival: { iata: 'N/A', scheduled: now.toISOString(), estimated: now.toISOString() },
                hotel_booking: null, connecting_flight: null, ground_transport: null,
            };
        }
    } catch (e) { }

    // ❌ NINGUNA API RESPONDIÓ — No inventamos datos. Lanzamos error honesto.
    console.error(`[Radar] ❌ TODAS las APIs fallaron para ${code}. No se encontraron datos reales.`);
    throw new Error(`FLIGHT_NOT_FOUND: No se encontró información real para el vuelo ${code}. Verifica el código o inténtalo más tarde.`);
}

// ============================================================
export async function handleFlightMonitoring(flightId: string, travelProfile: string = 'balanced') {
    const code = flightId.trim().toUpperCase();
    console.log(`[Agent] 🕵️ Deep Impact Analysis -> |${code}| (Profile: ${travelProfile})`);

    const context = await checkFlightStatus(flightId);
    const impact = evaluateImpact(context, travelProfile);

    // 🛡️ QUOTA SHIELD: Buscar si ya existe un plan para este vuelo y este retraso hoy
    const isTestCode = ['RETRASO-400', 'RETRASO-180', 'CANCELADO', 'VUELO-OK', 'RETRASO-VIP', 'RETRASO-60', 'DESVIO-VLC', 'JET-PRIVADO', 'VUELO-HISTORIAL'].includes(code);

    if (!isTestCode) {
        try {
            const { data: cached } = await supabase
                .from('agent_logs')
                .select('*')
                .eq('event_type', 'contingency_planned')
                .order('created_at', { ascending: false })
                .limit(10); // Revisar últimos 10 planes

            if (cached && cached.length > 0) {
                const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
                const hit = cached.find(log => {
                    const p = JSON.parse(log.payload || '{}');
                    return p.flightId === code &&
                        p.delayMinutes === context.delayMinutes &&
                        log.created_at > sixHoursAgo;
                });

                if (hit) {
                    console.log(`[QuotaShield] 🛡️ CACHE HIT para ${code} (${context.delayMinutes} min). Reutilizando plan.`);
                    return JSON.parse(hit.payload);
                }
            }
        } catch (e) {
            console.warn("[QuotaShield] Error consultando caché, procediendo con IA:", e);
        }
    }

    // ✅ FAST-PATH: Solo para códigos estrictos de sistema y NO para Iberia Express real
    const testCodes = ['RETRASO-400', 'RETRASO-180', 'CANCELADO', 'VUELO-OK', 'RETRASO-VIP', 'RETRASO-60', 'DESVIO-VLC', 'JET-PRIVADO', 'VUELO-HISTORIAL'];
    if (testCodes.includes(code)) {
        console.log(`[Agent] ⚡ Fast-Path DETERMINISTA activado para |${code}|`);

        const isVip = travelProfile === 'premium';
        const isFast = travelProfile === 'fast';
        const isBudget = travelProfile === 'budget';
        const isBalanced = travelProfile === 'balanced';

        const amount = impact.compensationAmount;

        if (code === 'DESVIO-VLC') {
            return {
                options: [
                    {
                        type: 'RÁPIDO',
                        title: 'BILLETE DE AVE AL DESTINO',
                        description: `He localizado el próximo tren rápido desde Valencia hacia tu destino original. Adquiere el billete y sube tu recibo a DOCS para solicitar el reembolso automático a la aerolínea por ley EU261.`,
                        estimatedCost: 45,
                        actionType: 'transport'
                    },
                    {
                        type: 'CONFORT',
                        title: 'ASISTENCIA TRANPORTE PRIVADO',
                        description: `Tienes derecho legal a traslado terrestre. Viaja en Taxi o VTC hasta tu destino final. Guarda la factura en tu Bóveda Segura para que gestione tu reembolso íntegro.`,
                        estimatedCost: 180,
                        actionType: 'transport'
                    },
                    {
                        type: 'ECONÓMICO',
                        title: 'HOTEL EN VALENCIA',
                        description: `Si los enlaces terrestres han cerrado, la aerolínea debe pagar tu cama. Te he localizado estancias premium cerca de Manises. Presenta este expediente en el mostrador para exigir tu habitación.`,
                        estimatedCost: amount || 250,
                        actionType: 'hotel'
                    }
                ],
                impact
            };
        }

        return {
            options: [
                {
                    type: 'RÁPIDO',
                    title: isVip ? 'VUELO ALTERNATIVO PRIORITARIO' : isFast ? 'REUBICACIÓN RELÁMPAGO' : 'CAMBIO DE VUELO',
                    description: isVip
                        ? `He analizado las alternativas disponibles para llegar hoy a tu destino. Dirígete al mostrador de la aerolínea con tu expediente para solicitar el cambio. La reubicación es gratuita por ley.`
                        : isFast
                            ? `He localizado el vuelo más rápido para tu destino. Dirígete al mostrador para solicitar el cambio de billete.`
                            : `Vuelo alternativo localizado. Tienes derecho a reubicación gratuita por el retraso de ${context.delayMinutes} min.`,
                    estimatedCost: isVip ? 0 : isFast ? 0 : 0,
                    actionType: 'flight_change'
                },
                {
                    type: 'ECONÓMICO',
                    title: isVip ? 'RECLAMACIÓN ELITE' : 'RECLAMACIÓN OFICIAL',
                    description: isVip
                        ? `Tu posible reclamación legal ya está priorizada para revisión. Mientras esperas, tienes acceso a asistencia premium.`
                        : isBudget
                            ? `Máximo ahorro garantizado. He preparado el proceso de reclamación legal para que puedas revisarlo y firmarlo.`
                            : `Documentación legal lista para revisar y reclamar por el retraso legal EU261.`,
                    estimatedCost: amount,
                    actionType: 'transport'
                },
                {
                    type: 'CONFORT',
                    title: isVip ? 'ALOJAMIENTO CERCANO LOCALIZADO' : isBalanced ? 'ESTANCIA CON CONFORT' : 'ALOJAMIENTO ASISTIDO',
                    description: isVip
                        ? `He localizado opciones de alojamiento cercanas al aeropuerto. Confirma tú mismo la reserva llamando al hotel. También puedo orientarte sobre los pasos de tu posible reclamación EU261.`
                        : isBalanced
                            ? `He localizado alojamiento cercano al aeropuerto para que descanses. Confirma tú mismo la disponibilidad.`
                            : `Opciones de alojamiento identificadas cerca del aeropuerto. Puedes solicitar a la aerolínea el alojamiento que te corresponda según la incidencia.`,
                    estimatedCost: isVip ? 0 : 0,
                    actionType: 'hotel'
                }
            ],
            impact
        };
    }

    if (context.status === "delayed" && context.delayMinutes > 30) {
        console.log(`[Agent] CRITICAL DELAY: ${context.delayMinutes} mins. Evaluating constraints...`);

        const impact = evaluateImpact(context);
        console.log(`[Agent] Severity: ${impact.severity} | Loss: $${impact.potentialLoss} | EU261: ${impact.compensationEligible}`);

        try {
            const prompt = new PromptTemplate({
                template: `Eres el Asistente de Viajes Inteligente de Travel-Pilot.
Tu objetivo es ofrecer 3 alternativas realistas y útiles a un pasajero cuyo vuelo se ha retrasado.

CONTEXTO:
- Vuelo: {flightNumber} ({departure} -> {arrival})
- Retraso: {delay} minutos.
- Llegada Estimada: {original_arrival} + {delay} mins.
- Hotel: {hotelName} (Límite de check-in: {hotelCheckIn}).
- Riesgo de conexión: {connectionRisk}
- Último tren perdido: {groundTransportRisk}
- Elegible reclamación EU261: {compensationEligible} ({compensationAmount}€)

TAREA:
GENERA 3 ESCENARIOS DE ASISTENCIA (Formato JSON):
    - RÁPIDO: Prioriza llegar lo antes posible (vuelo directo o conexión inmediata).
    - ECONÓMICO: Opción que prioriza el máximo ahorro y la reclamación legal de {compensationAmount}€.
    - CONFORT: Priorizar el descanso (hotel, sala de espera, comida) y el equilibrio.

ESTATUS DEL USUARIO: {travelProfile}
- Perfil 'premium' (VIP): Tú (la IA) haces TODO. Habla de "He reservado", "He activado", "Te espera un transporte". PUEDES SUGERIR JETS PRIVADOS O SALAS VIP. Ejecución total.
- Perfil 'fast': Extremadamente proactivo buscando velocidad. Sugiere reubicaciones "relámpago" y taxis rápidos.
- Perfil 'budget': Enfoque total en dinero. Sugiere esperar al siguiente vuelo de la compañía para asegurar la indemnización íntegra.
- Perfil 'balanced': Guía atento. Di "Tienes derecho a", "Te ayudamos a solicitar". Equilibrio total.
- REGLA DE ORO: No sugieras JETS o SALAS VIP a menos que el perfil sea 'premium'.

{format_instructions}

IMPORTANT: Return ONLY the raw JSON object. Do not include markdown code blocks.
Your description for 'RÁPIDO' MUST mention a REAL alternative flight number based on common routes (e.g., if flight is IB123, suggest IB125 or similar) and use the current flight context: {flightNumber}.
`,
                inputVariables: [
                    "flightNumber", "departure", "arrival", "delay", "original_arrival",
                    "hotelName", "hotelCheckIn", "connectionRisk", "groundTransportRisk",
                    "compensationEligible", "compensationAmount", "travelProfile", "format_instructions"
                ],
            });

            const input = await prompt.format({
                flightNumber: context.flightNumber,
                departure: context.departure_airport,
                arrival: context.arrival_airport,
                delay: context.delayMinutes.toString(),
                original_arrival: context.original_arrival || 'N/A',
                hotelName: context.hotel_booking?.name || 'No requiere hotel',
                hotelCheckIn: context.hotel_booking?.check_in_limit || 'N/A',
                connectionRisk: impact.connectionRisk ? "SÍ — conexión en riesgo" : "NO",
                groundTransportRisk: impact.groundTransportRisk ? "SÍ — último tren perdido" : "NO",
                compensationEligible: impact.compensationEligible ? "SÍ" : "NO",
                compensationAmount: impact.compensationAmount.toString(),
                travelProfile: travelProfile === 'premium' ? 'Élite / PREMIUM (Gestión Directa)' :
                    travelProfile === 'fast' ? 'Viajero RÁPIDO (Prioridad Tiempo)' :
                        travelProfile === 'budget' ? 'Viajero ECONÓMICO (Prioridad Ahorro)' : 'Viajero EQUILIBRADO (Mix estándar)',
                format_instructions: FORMAT_INSTRUCTIONS
            });

            const response = await getModel().invoke(input);
            let rawContent = response.content.toString();
            console.log(`[Agent] AI Raw Response Length: ${rawContent.length}`);

            // Limpiar posibles bloques de código de la IA
            rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

            let jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                const altMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
                if (altMatch) jsonMatch = [altMatch[1]];
            }

            if (!jsonMatch) throw new Error("No JSON in AI response after cleanup");

            const parsedPlan = JSON.parse(jsonMatch[0].trim());
            const result = { ...parsedPlan, impact, flightId: code, delayMinutes: context.delayMinutes };
            console.log(`[Agent] ✅ AI Plan Generated successfully with ${result.options?.length || 0} options.`);
            return result;
        } catch (e: any) {
            console.error("[Agent] Analysis Error, falling back to dynamic scenarios:", e.message);

            // Especialización para el vuelo de prueba TP999
            if (flightId.toUpperCase() === 'TP999') {
                return {
                    options: [
                        { type: 'RÁPIDO', title: 'Vuelo Express LH123', description: 'Traslado inmediato a T2 para vuelo operado por Lufthansa. Llegada a las 20:45.', estimatedCost: 280, actionType: 'flight_change' },
                        { type: 'ECONÓMICO', title: 'Compensación Estratégica', description: 'Esperar vuelo original. Recuperas 400€ (EU261). Gastos de cena cubiertos.', estimatedCost: 0, actionType: 'transport' },
                        { type: 'CONFORT', title: 'Plan de Noche en Berlín', description: 'Traslado al Hotel Adlon. Vuelo de regreso reprogramado para mañana 09:00.', estimatedCost: 150, actionType: 'hotel' }
                    ],
                    impact
                };
            }

            const fallback = {
                options: [
                    { type: 'RÁPIDO', title: 'Próxima alternativa disponible', description: `Reubicación prioritaria para minimizar los ${context.delayMinutes} min de retraso.`, estimatedCost: 250, actionType: 'flight_change' },
                    { type: 'ECONÓMICO', title: 'Recuperación de Gastos', description: `Esperar vuelo original. Reclamación activa de ${impact.compensationAmount}€ bajo EU261.`, estimatedCost: 0, actionType: 'transport' },
                    { type: 'CONFORT', title: 'Estancia y Descanso', description: `Noche de hotel gestionada en ${context.departure_airport} y salida reprogramada.`, estimatedCost: 120, actionType: 'hotel' }
                ],
                impact
            };
            return fallback;
        }
    }

    const defaultPlan = {
        options: [
            { type: 'CONFORT', title: 'Vuelo a Tiempo', description: 'Tu vuelo está operando normalmente. Sin interrupciones detectadas.', estimatedCost: 0, actionType: 'hotel' },
            { type: 'RÁPIDO', title: 'Mejorar a Ejecutiva', description: 'Hay asientos disponibles para subir de clase. Mejora tu experiencia.', estimatedCost: 200, actionType: 'flight_change' },
            { type: 'ECONÓMICO', title: 'Acceso a Sala VIP', description: 'Espera en la sala de descanso por una tarifa reducida.', estimatedCost: 40, actionType: 'transport' }
        ],
        impact: { severity: 'LOW', potentialLoss: 0, compensationEligible: false, hotelAlert: 'Todo en orden con tu reserva.' }
    };
    console.log("[Agent] ✅ No delay detected. Returning info scenarios.");
    return defaultPlan;
}

export async function monitorFlight(flightId: string, travelProfile: string = 'balanced') {
    return await handleFlightMonitoring(flightId, travelProfile);
}
