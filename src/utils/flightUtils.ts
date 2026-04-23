

const EU_AIRPORTS = ['MAD', 'BCN', 'CDG', 'ORY', 'LHR', 'LGW', 'FRA', 'MUC', 'AMS', 'LIS', 'BIO', 'VLC', 'AGP', 'ATH', 'MXP', 'FCO'];
const US_AIRPORTS = ['JFK', 'EWR', 'LAX', 'MIA', 'SFO', 'ORD', 'DFW', 'ATL', 'SEA', 'LAS', 'BOS', 'PHX'];

export const getEU261Amount = (f: any) => {
    if (!f) return '250';
    const origin = f.departure?.iata?.toUpperCase();
    const dest = f.arrival?.iata?.toUpperCase();
    
    // 🇺🇸 DETECCIÓN US DOMESTIC: Si ambos aeropuertos son de EE.UU.
    if (US_AIRPORTS.includes(origin) && US_AIRPORTS.includes(dest)) {
        return 'US_DOMESTIC'; 
    }

    // 🇪🇺 LÓGICA EU261 (Simplificada por distancia)
    
    // Rutas comunes cortas (< 1500km) -> 250
    if (EU_AIRPORTS.includes(origin) && EU_AIRPORTS.includes(dest)) return '250';
    
    // Rutas transatlánticas o largas (> 3500km) -> 600
    const longHaulDestinations = ['JFK', 'EWR', 'LAX', 'MIA', 'SFO', 'GRU', 'MEX', 'BOG', 'DAR', 'SYE', 'NRT', 'HND', 'HAV', 'EZE'];
    if (longHaulDestinations.includes(origin) || longHaulDestinations.includes(dest)) return '600';

    return '400'; // Por defecto para media distancia
};

