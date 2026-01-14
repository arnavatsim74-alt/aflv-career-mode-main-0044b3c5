import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Airport coordinates database
const airportCoordinates: Record<string, { lat: number; lon: number }> = {
  // Russia
  'UUEE': { lat: 55.9726, lon: 37.4146 },
  'UUDD': { lat: 55.4088, lon: 37.9063 },
  'UUWW': { lat: 55.5994, lon: 37.2678 },
  'ULLI': { lat: 59.8003, lon: 30.2625 },
  'USSS': { lat: 56.7431, lon: 60.8028 },
  'UNNT': { lat: 55.0117, lon: 82.6506 },
  'URRR': { lat: 47.2583, lon: 39.8181 },
  'URSS': { lat: 43.4499, lon: 39.9566 },
  'UWWW': { lat: 53.5039, lon: 50.1644 },
  'UUOB': { lat: 51.8142, lon: 55.4561 },
  'UNKL': { lat: 56.1729, lon: 92.4931 },
  'UIII': { lat: 52.2680, lon: 104.3889 },
  'UHHH': { lat: 48.5280, lon: 135.1883 },
  'UHWW': { lat: 43.3980, lon: 132.1480 },
  'UHPP': { lat: 53.1679, lon: 158.4536 },
  'UHSS': { lat: 46.8886, lon: 142.7177 },
  // Europe
  'EGLL': { lat: 51.4700, lon: -0.4543 },
  'LFPG': { lat: 49.0097, lon: 2.5478 },
  'EDDF': { lat: 50.0264, lon: 8.5431 },
  'EHAM': { lat: 52.3086, lon: 4.7639 },
  'LEMD': { lat: 40.4719, lon: -3.5626 },
  'LIRF': { lat: 41.8003, lon: 12.2389 },
  'LSZH': { lat: 47.4647, lon: 8.5492 },
  'LOWW': { lat: 48.1103, lon: 16.5697 },
  'EPWA': { lat: 52.1657, lon: 20.9671 },
  'UKBB': { lat: 50.3450, lon: 30.8947 },
  // Asia
  'VHHH': { lat: 22.3089, lon: 113.9144 },
  'ZBAA': { lat: 40.0799, lon: 116.6031 },
  'ZSPD': { lat: 31.1434, lon: 121.8052 },
  'RJTT': { lat: 35.5533, lon: 139.7811 },
  'RKSI': { lat: 37.4691, lon: 126.4505 },
  'WSSS': { lat: 1.3502, lon: 103.9944 },
  'VTBS': { lat: 13.6900, lon: 100.7501 },
  'VIDP': { lat: 28.5665, lon: 77.1031 },
  'OMDB': { lat: 25.2528, lon: 55.3644 },
  'OEJN': { lat: 21.6796, lon: 39.1565 },
  // Americas
  'KJFK': { lat: 40.6398, lon: -73.7789 },
  'KLAX': { lat: 33.9425, lon: -118.4081 },
  'KORD': { lat: 41.9742, lon: -87.9073 },
  'KATL': { lat: 33.6407, lon: -84.4277 },
  'CYYZ': { lat: 43.6777, lon: -79.6248 },
  'SBGR': { lat: -23.4356, lon: -46.4731 },
  'MMMX': { lat: 19.4363, lon: -99.0721 },
  // Africa & Middle East
  'HECA': { lat: 30.1219, lon: 31.4056 },
  'FAOR': { lat: -26.1392, lon: 28.2460 },
  'LLBG': { lat: 32.0094, lon: 34.8767 },
  // Oceania
  'YSSY': { lat: -33.9461, lon: 151.1772 },
  'NZAA': { lat: -37.0082, lon: 174.7850 },
};

interface Flight {
  departure_airport: string;
  arrival_airport: string;
  flight_number: string;
}

interface FlightMapProps {
  flights: Flight[];
}

export function FlightMap({ flights }: FlightMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Russia/Europe
    const map = L.map(mapRef.current, {
      center: [55, 50],
      zoom: 3,
      scrollWheelZoom: true,
    });

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers except tile layer
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    // Count unique airports and routes
    const airportVisits: Record<string, number> = {};
    const routeCounts: Record<string, number> = {};

    flights.forEach(flight => {
      const dep = flight.departure_airport.toUpperCase();
      const arr = flight.arrival_airport.toUpperCase();
      
      airportVisits[dep] = (airportVisits[dep] || 0) + 1;
      airportVisits[arr] = (airportVisits[arr] || 0) + 1;
      
      const routeKey = [dep, arr].sort().join('-');
      routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
    });

    // Draw routes
    const drawnRoutes = new Set<string>();
    
    flights.forEach(flight => {
      const dep = flight.departure_airport.toUpperCase();
      const arr = flight.arrival_airport.toUpperCase();
      const depCoords = airportCoordinates[dep];
      const arrCoords = airportCoordinates[arr];
      
      if (!depCoords || !arrCoords) return;
      
      const routeKey = [dep, arr].sort().join('-');
      if (drawnRoutes.has(routeKey)) return;
      drawnRoutes.add(routeKey);
      
      const count = routeCounts[routeKey];
      const weight = Math.min(1 + count * 0.5, 5);
      const opacity = Math.min(0.4 + count * 0.1, 0.9);

      // Create curved line (great circle approximation)
      const latlngs: L.LatLngExpression[] = [];
      const steps = 50;
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = depCoords.lat + t * (arrCoords.lat - depCoords.lat);
        const lon = depCoords.lon + t * (arrCoords.lon - depCoords.lon);
        // Add slight curve
        const curve = Math.sin(t * Math.PI) * 0.1 * Math.abs(arrCoords.lon - depCoords.lon) * 0.1;
        latlngs.push([lat + curve, lon]);
      }

      L.polyline(latlngs, {
        color: '#3b82f6',
        weight,
        opacity,
        dashArray: '5, 10',
      }).addTo(map);
    });

    // Draw airports as markers
    Object.entries(airportVisits).forEach(([icao, visits]) => {
      const coords = airportCoordinates[icao];
      if (!coords) return;

      const radius = Math.min(4 + visits, 12);
      
      L.circleMarker([coords.lat, coords.lon], {
        radius,
        fillColor: '#ef4444',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })
        .bindPopup(`<strong>${icao}</strong><br/>${visits} flight${visits > 1 ? 's' : ''}`)
        .addTo(map);
    });

    // Fit bounds if we have routes
    const validFlights = flights.filter(f => 
      airportCoordinates[f.departure_airport.toUpperCase()] && 
      airportCoordinates[f.arrival_airport.toUpperCase()]
    );

    if (validFlights.length > 0) {
      const bounds = L.latLngBounds([]);
      validFlights.forEach(f => {
        const dep = airportCoordinates[f.departure_airport.toUpperCase()];
        const arr = airportCoordinates[f.arrival_airport.toUpperCase()];
        if (dep) bounds.extend([dep.lat, dep.lon]);
        if (arr) bounds.extend([arr.lat, arr.lon]);
      });
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [flights]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[400px] rounded-xl overflow-hidden border border-border"
      style={{ background: '#1a1a2e' }}
    />
  );
}
