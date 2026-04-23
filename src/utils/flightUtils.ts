


const EU_AIRPORTS = ['MAD', 'BCN', 'CDG', 'ORY', 'LHR', 'LGW', 'FRA', 'MUC', 'AMS', 'LIS', 'BIO', 'VLC', 'AGP', 'ATH', 'MXP', 'FCO'];
const US_AIRPORTS = ['JFK', 'EWR', 'LAX', 'MIA', 'SFO', 'ORD', 'DFW', 'ATL', 'SEA', 'LAS', 'BOS', 'PHX'];
const LATAM_AIRPORTS = ['MEX', 'BOG', 'GRU', 'GIG', 'EZE', 'AEP', 'SCL', 'LIM', 'PTY', 'UIO', 'GYE', 'SJO', 'MDE', 'CUN', 'GDL'];

export const getEU261Amount = (f: any) => {
    if (!f) return '250';
    const origin = f.departure?.iata?.toUpperCase();
    const dest = f.arrival?.iata?.toUpperCase();
    
    // 🇺🇸 DETECCIÓN US DOMESTIC
    if (US_AIRPORTS.includes(origin) && US_AIRPORTS.includes(dest)) {
        return 'US_DOMESTIC'; 
    }

    // 🌎 DETECCIÓN LATAM DOMESTIC / REGIONAL
    if (LATAM_AIRPORTS.includes(origin) && LATAM_AIRPORTS.includes(dest)) {
        return 'LATAM_DOMESTIC';
    }

    // 🇪🇺 LÓGICA EU261 (Basada en origen o destino internacional largo)
    
    // Rutas comunes cortas en Europa -> 250
    if (EU_AIRPORTS.includes(origin) && EU_AIRPORTS.includes(dest)) return '250';
    
    // Rutas transatlánticas o largas (> 3500km) -> 600
    // Si sale de Europa o llega a Europa desde uno de estos hubs grandes
    const majorHubs = [...US_AIRPORTS, ...LATAM_AIRPORTS, 'DAR', 'SYE', 'NRT', 'HND', 'HAV', 'EZE', 'GRU'];
    if ((EU_AIRPORTS.includes(origin) && majorHubs.includes(dest)) || (EU_AIRPORTS.includes(dest) && majorHubs.includes(origin))) {
        return '600';
    }

    return '400'; // Media distancia / Otros
};


