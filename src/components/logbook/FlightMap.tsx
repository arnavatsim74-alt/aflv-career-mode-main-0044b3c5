import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Comprehensive airport coordinates database from route_catalog and beyond
const airportCoordinates: Record<string, { lat: number; lon: number }> = {
  // Russia - Moscow Region
  'UUEE': { lat: 55.9726, lon: 37.4146 },  // Moscow Sheremetyevo
  'UUDD': { lat: 55.4088, lon: 37.9063 },  // Moscow Domodedovo
  'UUWW': { lat: 55.5994, lon: 37.2678 },  // Moscow Vnukovo
  
  // Russia - Major Cities
  'ULLI': { lat: 59.8003, lon: 30.2625 },  // St. Petersburg Pulkovo
  'USSS': { lat: 56.7431, lon: 60.8028 },  // Yekaterinburg
  'UNNT': { lat: 55.0117, lon: 82.6506 },  // Novosibirsk
  'UNKL': { lat: 56.1729, lon: 92.4931 },  // Krasnoyarsk
  'UIII': { lat: 52.2680, lon: 104.3889 }, // Irkutsk
  'UHHH': { lat: 48.5280, lon: 135.1883 }, // Khabarovsk
  'UHWW': { lat: 43.3980, lon: 132.1480 }, // Vladivostok
  'UHPP': { lat: 53.1679, lon: 158.4536 }, // Petropavlovsk-Kamchatsky
  'UHSS': { lat: 46.8886, lon: 142.7177 }, // Yuzhno-Sakhalinsk
  'UEEE': { lat: 62.0933, lon: 129.7706 }, // Yakutsk
  
  // Russia - Southern & Caucasus
  'URRR': { lat: 47.2583, lon: 39.8181 },  // Rostov-on-Don
  'URSS': { lat: 43.4499, lon: 39.9566 },  // Sochi Adler
  'URKK': { lat: 45.0347, lon: 39.1705 },  // Krasnodar
  'URFF': { lat: 45.0522, lon: 33.9752 },  // Simferopol
  'URMM': { lat: 43.0883, lon: 44.6683 },  // Mineralnyye Vody
  'URKA': { lat: 44.2258, lon: 43.0861 },  // Anapa
  'URRP': { lat: 45.2091, lon: 42.1142 },  // Stavropol
  'URMG': { lat: 43.2981, lon: 45.0861 },  // Grozny
  
  // Russia - Volga Region
  'UWWW': { lat: 53.5039, lon: 50.1644 },  // Samara
  'UWKD': { lat: 55.6047, lon: 49.2833 },  // Kazan
  'UWGG': { lat: 56.2300, lon: 43.7840 },  // Nizhny Novgorod
  'UWUU': { lat: 54.5575, lon: 55.8747 },  // Ufa
  'UWOR': { lat: 51.7958, lon: 58.5942 },  // Orsk
  'UWPP': { lat: 53.1167, lon: 45.0167 },  // Penza
  'UWLL': { lat: 54.4011, lon: 48.8028 },  // Ulyanovsk
  'URWA': { lat: 46.2833, lon: 48.0058 },  // Astrakhan
  'URWW': { lat: 48.7828, lon: 44.3456 },  // Volgograd
  
  // Russia - Ural & Siberia
  'USCC': { lat: 55.3050, lon: 61.5033 },  // Chelyabinsk
  'USCM': { lat: 53.3931, lon: 59.0006 },  // Magnitogorsk
  'USPP': { lat: 57.9144, lon: 56.0217 },  // Perm
  'USTR': { lat: 57.1897, lon: 65.3243 },  // Tyumen
  'USRR': { lat: 61.3431, lon: 73.4019 },  // Surgut
  'UNOO': { lat: 54.9670, lon: 73.3105 },  // Omsk
  'UNBB': { lat: 53.3633, lon: 83.5383 },  // Barnaul
  'UNAA': { lat: 53.7400, lon: 91.3853 },  // Abakan
  'UNBG': { lat: 51.9681, lon: 85.8336 },  // Gorno-Altaysk
  'UNEE': { lat: 55.2706, lon: 86.1072 },  // Kemerovo
  'UNWW': { lat: 53.8114, lon: 87.1536 },  // Novokuznetsk
  'UNTT': { lat: 56.3803, lon: 85.2083 },  // Tomsk
  
  // Russia - Northern
  'UUYY': { lat: 61.6469, lon: 50.8456 },  // Syktyvkar
  'ULAA': { lat: 64.6006, lon: 40.7189 },  // Arkhangelsk
  'ULMM': { lat: 68.7818, lon: 32.7508 },  // Murmansk
  
  // Kazakhstan
  'UAAA': { lat: 43.3521, lon: 77.0405 },  // Almaty
  'UACC': { lat: 51.0222, lon: 71.4667 },  // Astana (Nur-Sultan)
  'UAKK': { lat: 49.6706, lon: 73.3342 },  // Karaganda
  'UAII': { lat: 42.3639, lon: 69.4789 },  // Shymkent
  
  // Uzbekistan
  'UTTT': { lat: 41.2575, lon: 69.2811 },  // Tashkent
  'UTSS': { lat: 39.7006, lon: 66.9847 },  // Samarkand
  'UTSB': { lat: 39.7750, lon: 64.4833 },  // Bukhara
  'UTFF': { lat: 40.3583, lon: 71.7928 },  // Fergana
  'UTNU': { lat: 41.5840, lon: 60.6428 },  // Urgench
  'UTFN': { lat: 40.9853, lon: 71.3517 },  // Namangan
  
  // Kyrgyzstan
  'UCFM': { lat: 43.0613, lon: 74.4776 },  // Bishkek Manas
  'UCFO': { lat: 40.6089, lon: 72.7933 },  // Osh
  'UCFL': { lat: 42.5878, lon: 78.1094 },  // Issyk-Kul
  
  // Tajikistan
  'UTDD': { lat: 38.5433, lon: 68.8250 },  // Dushanbe
  
  // Turkmenistan
  'UTAA': { lat: 37.9867, lon: 58.3608 },  // Ashgabat
  
  // Armenia & Azerbaijan
  'UDYZ': { lat: 40.1475, lon: 44.3959 },  // Yerevan
  'UBBB': { lat: 40.4675, lon: 50.0467 },  // Baku
  
  // Belarus
  'UMMS': { lat: 53.8825, lon: 28.0308 },  // Minsk
  
  // Mongolia
  'ZMCK': { lat: 47.6461, lon: 106.8194 }, // Ulaanbaatar
  
  // Europe - Western
  'EGLL': { lat: 51.4700, lon: -0.4543 },  // London Heathrow
  'LFPG': { lat: 49.0097, lon: 2.5478 },   // Paris CDG
  'EDDF': { lat: 50.0264, lon: 8.5431 },   // Frankfurt
  'EHAM': { lat: 52.3086, lon: 4.7639 },   // Amsterdam
  'EBBR': { lat: 50.9014, lon: 4.4844 },   // Brussels
  'LFML': { lat: 43.4393, lon: 5.2214 },   // Marseille
  'LFLL': { lat: 45.7256, lon: 5.0811 },   // Lyon
  'LFMN': { lat: 43.6584, lon: 7.2159 },   // Nice
  'LSGG': { lat: 46.2381, lon: 6.1089 },   // Geneva
  'LSZH': { lat: 47.4647, lon: 8.5492 },   // Zurich
  'EDDH': { lat: 53.6304, lon: 9.9882 },   // Hamburg
  'EDDC': { lat: 51.1328, lon: 13.7672 },  // Dresden
  'ELLX': { lat: 49.6233, lon: 6.2044 },   // Luxembourg
  'EIDW': { lat: 53.4213, lon: -6.2701 },  // Dublin
  
  // Europe - Southern
  'LEMD': { lat: 40.4719, lon: -3.5626 },  // Madrid
  'LEBL': { lat: 41.2971, lon: 2.0785 },   // Barcelona
  'LEMG': { lat: 36.6749, lon: -4.4991 },  // Malaga
  'LEAL': { lat: 38.2822, lon: -0.5582 },  // Alicante
  'LEPA': { lat: 39.5517, lon: 2.7388 },   // Palma de Mallorca
  'LEVC': { lat: 39.4893, lon: -0.4816 },  // Valencia
  'LPPT': { lat: 38.7813, lon: -9.1359 },  // Lisbon
  'LIRF': { lat: 41.8003, lon: 12.2389 },  // Rome Fiumicino
  'LIMC': { lat: 45.6306, lon: 8.7231 },   // Milan Malpensa
  'LIPZ': { lat: 45.5053, lon: 12.3519 },  // Venice
  'LIRN': { lat: 40.8861, lon: 14.2908 },  // Naples
  'LGAV': { lat: 37.9364, lon: 23.9445 },  // Athens
  'LBBG': { lat: 42.5697, lon: 27.5153 },  // Burgas
  'LDPL': { lat: 44.8935, lon: 13.9222 },  // Pula
  
  // Europe - Central & Northern
  'LOWW': { lat: 48.1103, lon: 16.5697 },  // Vienna
  'EPWA': { lat: 52.1657, lon: 20.9671 },  // Warsaw
  'LHBP': { lat: 47.4369, lon: 19.2556 },  // Budapest
  'LYBE': { lat: 44.8184, lon: 20.3091 },  // Belgrade
  'ESSA': { lat: 59.6519, lon: 17.9186 },  // Stockholm
  'EVRA': { lat: 56.9236, lon: 23.9711 },  // Riga
  'EYVI': { lat: 54.6369, lon: 25.2878 },  // Vilnius
  
  // Turkey
  'LTFM': { lat: 41.2753, lon: 28.7519 },  // Istanbul
  'LTAI': { lat: 36.8987, lon: 30.8005 },  // Antalya
  'LTBS': { lat: 36.7133, lon: 28.7925 },  // Dalaman
  'LTFE': { lat: 37.2505, lon: 27.6697 },  // Bodrum
  'LTBJ': { lat: 38.2924, lon: 27.1570 },  // Izmir
  'LTAF': { lat: 36.9822, lon: 35.2804 },  // Adana
  
  // Middle East
  'OMDB': { lat: 25.2528, lon: 55.3644 },  // Dubai
  'OMDW': { lat: 24.8962, lon: 55.1714 },  // Dubai World Central
  'OMAA': { lat: 24.4440, lon: 54.6511 },  // Abu Dhabi
  'OMSJ': { lat: 25.3286, lon: 55.5172 },  // Sharjah
  'OEJN': { lat: 21.6796, lon: 39.1565 },  // Jeddah
  'OERK': { lat: 24.9578, lon: 46.6989 },  // Riyadh
  'OLBA': { lat: 33.8209, lon: 35.4884 },  // Beirut
  'LLBG': { lat: 32.0094, lon: 34.8767 },  // Tel Aviv
  'OIIE': { lat: 35.4161, lon: 51.1522 },  // Tehran
  
  // Egypt
  'HECA': { lat: 30.1219, lon: 31.4056 },  // Cairo
  'HEGN': { lat: 27.1783, lon: 33.7994 },  // Hurghada
  'HESH': { lat: 27.9773, lon: 34.3950 },  // Sharm El Sheikh
  
  // North Africa
  'GMMN': { lat: 33.3675, lon: -7.5897 },  // Casablanca
  'DTNH': { lat: 36.0758, lon: 10.4386 },  // Enfidha
  
  // Sub-Saharan Africa
  'FAOR': { lat: -26.1392, lon: 28.2460 }, // Johannesburg
  'FSIA': { lat: -4.6719, lon: 55.5219 },  // Seychelles
  'FIMP': { lat: -20.4302, lon: 57.6836 }, // Mauritius
  
  // Asia - East
  'VHHH': { lat: 22.3089, lon: 113.9144 }, // Hong Kong
  'ZBAA': { lat: 40.0799, lon: 116.6031 }, // Beijing Capital
  'ZBAD': { lat: 39.5098, lon: 116.4107 }, // Beijing Daxing
  'ZSPD': { lat: 31.1434, lon: 121.8052 }, // Shanghai Pudong
  'ZGGG': { lat: 23.3924, lon: 113.2988 }, // Guangzhou
  'ZUUU': { lat: 30.5785, lon: 103.9471 }, // Chengdu
  'ZJSY': { lat: 18.3029, lon: 109.4120 }, // Sanya
  'RJTT': { lat: 35.5533, lon: 139.7811 }, // Tokyo Haneda
  'RKSI': { lat: 37.4691, lon: 126.4505 }, // Seoul Incheon
  
  // Asia - Southeast
  'WSSS': { lat: 1.3502, lon: 103.9944 },  // Singapore
  'VTBS': { lat: 13.6900, lon: 100.7501 }, // Bangkok Suvarnabhumi
  'VTSB': { lat: 9.1325, lon: 99.1358 },   // Koh Samui
  'VTSP': { lat: 8.1132, lon: 98.3169 },   // Phuket
  'VVNB': { lat: 21.2212, lon: 105.8072 }, // Hanoi
  'VVTS': { lat: 10.8189, lon: 106.6519 }, // Ho Chi Minh City
  'WADD': { lat: -8.7482, lon: 115.1672 }, // Bali Denpasar
  
  // Asia - South
  'VIDP': { lat: 28.5665, lon: 77.1031 },  // Delhi
  'VABB': { lat: 19.0896, lon: 72.8676 },  // Mumbai
  'VOBL': { lat: 13.1986, lon: 77.7066 },  // Bangalore
  'VOGO': { lat: 15.3808, lon: 73.8314 },  // Goa
  'VOCI': { lat: 9.9474, lon: 76.2739 },   // Kochi
  'VOCL': { lat: 11.0290, lon: 76.0256 },  // Kozhikode
  'VIDX': { lat: 28.3647, lon: 79.4078 },  // Bareilly
  'VRMM': { lat: 4.1918, lon: 73.5291 },   // Male Maldives
  
  // Americas - North
  'KJFK': { lat: 40.6398, lon: -73.7789 }, // New York JFK
  'KIAD': { lat: 38.9445, lon: -77.4558 }, // Washington Dulles
  'KMIA': { lat: 25.7959, lon: -80.2870 }, // Miami
  'KLAX': { lat: 33.9425, lon: -118.4081 },// Los Angeles
  'KORD': { lat: 41.9742, lon: -87.9073 }, // Chicago O'Hare
  'KATL': { lat: 33.6407, lon: -84.4277 }, // Atlanta
  'CYYZ': { lat: 43.6777, lon: -79.6248 }, // Toronto
  
  // Americas - Central & Caribbean
  'MMMX': { lat: 19.4363, lon: -99.0721 }, // Mexico City
  'MMUN': { lat: 21.0365, lon: -86.8771 }, // Cancun
  'MUHA': { lat: 22.9892, lon: -82.4091 }, // Havana
  'MUVR': { lat: 23.0344, lon: -81.4353 }, // Varadero
  'MDPC': { lat: 18.5675, lon: -68.3634 }, // Punta Cana
  
  // Americas - South
  'SBGR': { lat: -23.4356, lon: -46.4731 },// Sao Paulo
  
  // Oceania
  'YSSY': { lat: -33.9461, lon: 151.1772 },// Sydney
  'NZAA': { lat: -37.0082, lon: 174.7850 },// Auckland
  
  // Cyprus
  'LCLK': { lat: 34.8756, lon: 33.6249 },  // Larnaca
  'LCPH': { lat: 34.7180, lon: 32.4857 },  // Paphos
  
  // Canary Islands
  'GCTS': { lat: 28.0445, lon: -16.5725 }, // Tenerife South
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
      className="w-full h-[400px] rounded-xl overflow-hidden border border-border relative z-0"
      style={{ background: '#1a1a2e' }}
    />
  );
}
