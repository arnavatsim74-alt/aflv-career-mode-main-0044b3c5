// Airport coordinates database (major ICAO codes)
// This is a simplified dataset - in production, you'd use an API
const airportCoordinates: Record<string, { lat: number; lon: number }> = {
  // Russia
  'UUEE': { lat: 55.9726, lon: 37.4146 }, // Moscow Sheremetyevo
  'UUDD': { lat: 55.4088, lon: 37.9063 }, // Moscow Domodedovo
  'UUWW': { lat: 55.5994, lon: 37.2678 }, // Moscow Vnukovo
  'ULLI': { lat: 59.8003, lon: 30.2625 }, // St. Petersburg Pulkovo
  'USSS': { lat: 56.7431, lon: 60.8028 }, // Yekaterinburg
  'UNNT': { lat: 55.0117, lon: 82.6506 }, // Novosibirsk
  'URRR': { lat: 47.2583, lon: 39.8181 }, // Rostov-on-Don
  'URSS': { lat: 43.4499, lon: 39.9566 }, // Sochi
  'UWWW': { lat: 53.5039, lon: 50.1644 }, // Samara
  'UUOB': { lat: 51.8142, lon: 55.4561 }, // Orenburg
  
  // Europe
  'EGLL': { lat: 51.4700, lon: -0.4543 }, // London Heathrow
  'LFPG': { lat: 49.0097, lon: 2.5478 }, // Paris CDG
  'EDDF': { lat: 50.0264, lon: 8.5431 }, // Frankfurt
  'EHAM': { lat: 52.3086, lon: 4.7639 }, // Amsterdam
  'LEMD': { lat: 40.4719, lon: -3.5626 }, // Madrid
  'LIRF': { lat: 41.8003, lon: 12.2389 }, // Rome Fiumicino
  'LSZH': { lat: 47.4647, lon: 8.5492 }, // Zurich
  'LOWW': { lat: 48.1103, lon: 16.5697 }, // Vienna
  'EPWA': { lat: 52.1657, lon: 20.9671 }, // Warsaw
  'UKBB': { lat: 50.3450, lon: 30.8947 }, // Kyiv Boryspil
  
  // Asia
  'VHHH': { lat: 22.3089, lon: 113.9144 }, // Hong Kong
  'ZBAA': { lat: 40.0799, lon: 116.6031 }, // Beijing
  'ZSPD': { lat: 31.1434, lon: 121.8052 }, // Shanghai Pudong
  'RJTT': { lat: 35.5533, lon: 139.7811 }, // Tokyo Haneda
  'RKSI': { lat: 37.4691, lon: 126.4505 }, // Seoul Incheon
  'WSSS': { lat: 1.3502, lon: 103.9944 }, // Singapore
  'VTBS': { lat: 13.6900, lon: 100.7501 }, // Bangkok
  'VIDP': { lat: 28.5665, lon: 77.1031 }, // Delhi
  'OMDB': { lat: 25.2528, lon: 55.3644 }, // Dubai
  'OEJN': { lat: 21.6796, lon: 39.1565 }, // Jeddah
  
  // Americas
  'KJFK': { lat: 40.6398, lon: -73.7789 }, // New York JFK
  'KLAX': { lat: 33.9425, lon: -118.4081 }, // Los Angeles
  'KORD': { lat: 41.9742, lon: -87.9073 }, // Chicago O'Hare
  'KATL': { lat: 33.6407, lon: -84.4277 }, // Atlanta
  'CYYZ': { lat: 43.6777, lon: -79.6248 }, // Toronto
  'SBGR': { lat: -23.4356, lon: -46.4731 }, // Sao Paulo
  'MMMX': { lat: 19.4363, lon: -99.0721 }, // Mexico City
  
  // Africa & Middle East
  'HECA': { lat: 30.1219, lon: 31.4056 }, // Cairo
  'FAOR': { lat: -26.1392, lon: 28.2460 }, // Johannesburg
  'LLBG': { lat: 32.0094, lon: 34.8767 }, // Tel Aviv
  
  // Oceania
  'YSSY': { lat: -33.9461, lon: 151.1772 }, // Sydney
  'NZAA': { lat: -37.0082, lon: 174.7850 }, // Auckland
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth's radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate route distance and estimated time based on ICAO codes
 * @param departure - Departure airport ICAO code
 * @param arrival - Arrival airport ICAO code
 * @param avgSpeedKnots - Average ground speed in knots (default 450)
 * @returns Object with distance in NM and estimated time in hours, or null if airports not found
 */
export function calculateRouteInfo(
  departure: string,
  arrival: string,
  avgSpeedKnots: number = 450
): { distance_nm: number; estimated_time_hrs: number } | null {
  const depCoords = airportCoordinates[departure.toUpperCase()];
  const arrCoords = airportCoordinates[arrival.toUpperCase()];
  
  if (!depCoords || !arrCoords) {
    return null;
  }
  
  const distance = haversineDistance(depCoords.lat, depCoords.lon, arrCoords.lat, arrCoords.lon);
  const estimatedTime = distance / avgSpeedKnots;
  
  return {
    distance_nm: Math.round(distance),
    estimated_time_hrs: Math.round(estimatedTime * 10) / 10
  };
}

/**
 * Check if an ICAO code exists in our database
 */
export function isKnownAirport(icao: string): boolean {
  return icao.toUpperCase() in airportCoordinates;
}

/**
 * Get list of all known airport ICAO codes
 */
export function getKnownAirports(): string[] {
  return Object.keys(airportCoordinates);
}
