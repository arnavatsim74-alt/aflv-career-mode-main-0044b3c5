import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader } from 'lucide-react';

interface MetarData {
  icao: string;
  metar: string;
  time: string;
  flightCategory: string;
}

const MetarCard: React.FC<{ airportCode: string }> = ({ airportCode }) => {
  const [metar, setMetar] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  const API_BASE = 'https://avwx.rest/api/metar/';
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  const fetchMetar = async () => {
    try {
      setLoading(true);
      setError(null);

      const encodedUrl = encodeURIComponent(`${API_BASE}${airportCode}`);
      const proxyUrl = `${CORS_PROXY}${encodedUrl}`;

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error || 'Failed to fetch METAR data');
      }

      // Extract flight category and ensure we have valid data
      const flightCategory = data.flight_category || 'UNKNOWN';
      const metarText = data.raw || 'No METAR available';
      const timestamp = data.time?.dt || new Date().toISOString();

      setMetar({
        icao: data.icao || airportCode.toUpperCase(),
        metar: metarText,
        time: timestamp,
        flightCategory,
      });

      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('METAR fetch error:', errorMessage);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        setError(`Failed to fetch METAR. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          setRetryCount(retryCount + 1);
        }, RETRY_DELAY);
      } else {
        setError(`Unable to fetch METAR data after ${MAX_RETRIES} attempts. ${errorMessage}`);
      }

      setMetar(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (airportCode) {
      fetchMetar();
    }
  }, [airportCode, retryCount]);

  const getFlightCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      VFR: 'bg-green-100 border-green-500 text-green-900',
      MVFR: 'bg-blue-100 border-blue-500 text-blue-900',
      IFR: 'bg-red-100 border-red-500 text-red-900',
      LIFR: 'bg-purple-100 border-purple-500 text-purple-900',
      UNKNOWN: 'bg-gray-100 border-gray-500 text-gray-900',
    };
    return colors[category] || colors.UNKNOWN;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{airportCode.toUpperCase()}</h2>
          {metar && (
            <p className="text-sm text-gray-600">
              {new Date(metar.time).toLocaleString()}
            </p>
          )}
        </div>
        {loading && <Loader className="animate-spin text-blue-500" />}
      </div>

      {/* Flight Category Badge */}
      {metar && (
        <div className={`inline-block px-3 py-1 rounded-full border-2 font-semibold text-sm mb-4 ${getFlightCategoryColor(metar.flightCategory)}`}>
          {metar.flightCategory}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-yellow-800 font-semibold">Warning</p>
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* METAR Data */}
      {metar && !error && (
        <div className="bg-gray-50 rounded-md p-4 font-mono text-sm border border-gray-300">
          <p className="text-gray-800 break-words">{metar.metar}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !metar && !error && (
        <div className="text-gray-500 text-center py-4">
          <p>No data available for {airportCode.toUpperCase()}</p>
        </div>
      )}

      {/* Retry Button */}
      {error && !loading && (
        <button
          onClick={() => {
            setRetryCount(0);
            fetchMetar();
          }}
          className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default MetarCard;
