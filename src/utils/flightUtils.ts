
export const getEU261Amount = (f: any) => {
    if (!f) return '250';
    const origin = f.departure?.iata;
    const dest = f.arrival?.iata;
    
    // Rutas comunes cortas (< 1500km) -> 250
    const shortHaul = ['MAD', 'BCN', 'CDG', 'ORY', 'LHR', 'LGW', 'FRA', 'MUC', 'AMS', 'LIS', 'BIO'];
    if (shortHaul.includes(origin) && shortHaul.includes(dest)) return '250';
    
    // Rutas transatlánticas o largas (> 3500km) -> 600
    const longHaul = ['JFK', 'EWR', 'LAX', 'MIA', 'SFO', 'GRU', 'MEX', 'BOG', 'DAR', 'SYE', 'NRT', 'HND', 'HAV', 'EZE'];
    if (longHaul.includes(origin) || longHaul.includes(dest)) return '600';

    return '400'; // Por defecto para media distancia
};
