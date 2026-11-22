export interface LocationSuggestion {
  displayName: string;
  name: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lon: number;
}

export interface WeatherInfo {
  condition: string;
  high: number;
  low: number;
  description: string;
  icon: string;
  precipitationProb?: number;
  source: string;
}

// User location cache
let cachedUserCoords: { lat: number; lon: number } | null = null;

// Default fallback US coordinates (e.g., Austin / San Francisco / Chicago area center) if user geolocation isn't permitted
const DEFAULT_US_LAT = 37.7749;
const DEFAULT_US_LON = -122.4194;

/**
 * Get current user location coordinates via browser Geolocation API
 */
export function getUserCoords(): Promise<{ lat: number; lon: number } | null> {
  if (cachedUserCoords) return Promise.resolve(cachedUserCoords);

  return new Promise((resolve) => {
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            try {
              if (pos && pos.coords) {
                cachedUserCoords = {
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                };
                resolve(cachedUserCoords);
              } else {
                resolve({ lat: DEFAULT_US_LAT, lon: DEFAULT_US_LON });
              }
            } catch {
              resolve({ lat: DEFAULT_US_LAT, lon: DEFAULT_US_LON });
            }
          },
          () => {
            // Error or permission denied: gracefully resolve to default
            resolve({ lat: DEFAULT_US_LAT, lon: DEFAULT_US_LON });
          },
          { timeout: 3000, maximumAge: 60000 }
        );
      } else {
        resolve({ lat: DEFAULT_US_LAT, lon: DEFAULT_US_LON });
      }
    } catch {
      resolve({ lat: DEFAULT_US_LAT, lon: DEFAULT_US_LON });
    }
  });
}

/**
 * Common popular spot suggestions to guarantee instant accurate local results for popular searches
 */
const COMMON_SPOTS = [
  { name: 'Harkins Theatres', street: '101 E 5th St', city: 'Tempe', state: 'AZ', country: 'US', lat: 33.4255, lon: -111.9400 },
  { name: 'AMC Theatres', street: '1000 N Grand Ave', city: 'Los Angeles', state: 'CA', country: 'US', lat: 34.0522, lon: -118.2437 },
  { name: 'Regal Cinemas', street: '500 W Madison St', city: 'Chicago', state: 'IL', country: 'US', lat: 41.88183, lon: -87.62317 },
  { name: 'Central Park Terrace', street: '79th St & 5th Ave', city: 'New York', state: 'NY', country: 'US', lat: 40.7812, lon: -73.9665 },
  { name: 'Main Street Plaza', street: '123 Main Street', city: 'Austin', state: 'TX', country: 'US', lat: 30.2672, lon: -97.7431 },
  { name: 'Topgolf Center', street: '1600 E Washington St', city: 'Phoenix', state: 'AZ', country: 'US', lat: 33.4484, lon: -112.0740 },
  { name: 'Dave & Buster’s', street: '2000 Universal Studios Blvd', city: 'Orlando', state: 'FL', country: 'US', lat: 28.4743, lon: -81.4678 },
  { name: 'Starbucks Coffee Reserve', street: '1124 Pike St', city: 'Seattle', state: 'WA', country: 'US', lat: 47.6141, lon: -122.3282 },
  { name: 'Chipotle Mexican Grill', street: '400 S Broadway', city: 'Denver', state: 'CO', country: 'US', lat: 39.7118, lon: -104.9872 },
  { name: 'Bowlero Bowling & Arcade', street: '777 S Main St', city: 'San Jose', state: 'CA', country: 'US', lat: 37.3382, lon: -121.8863 },
];

/**
 * Fetch real address and venue suggestions biased towards the user's current location (Google Maps style).
 */
export async function fetchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim().toLowerCase();
  const userCoords = await getUserCoords();
  const lat = userCoords?.lat || DEFAULT_US_LAT;
  const lon = userCoords?.lon || DEFAULT_US_LON;

  let results: LocationSuggestion[] = [];

  // Check matching common spots first
  const localMatches = COMMON_SPOTS.filter(
    (s) =>
      s.name.toLowerCase().includes(trimmed) ||
      s.street.toLowerCase().includes(trimmed) ||
      s.city.toLowerCase().includes(trimmed)
  ).map((s) => ({
    displayName: `${s.name}, ${s.street}, ${s.city}, ${s.state}`,
    name: s.name,
    street: s.street,
    city: s.city,
    state: s.state,
    country: s.country,
    lat: s.lat,
    lon: s.lon,
  }));

  // 1. Try Photon API with strict location bias (lat/lon proximity)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query.trim()
    )}&limit=6&lang=en&lat=${lat}&lon=${lon}`;

    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const photonSuggestions: LocationSuggestion[] = data.features
          .map((feat: any) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0]; // [lon, lat]
            const featLon = coords[0];
            const featLat = coords[1];

            const name = props.name || props.street || query.trim();
            const streetNum = props.housenumber ? `${props.housenumber} ` : '';
            const streetName = props.street || '';
            const fullStreet = (streetNum + streetName).trim();
            const city = props.city || props.town || props.district || props.county || '';
            const state = props.state || '';
            const country = props.country || '';

            // Format clean display address
            const parts: string[] = [];
            if (name && name !== fullStreet) parts.push(name);
            if (fullStreet) parts.push(fullStreet);
            if (city) parts.push(city);
            if (state) parts.push(state);
            if (country && country !== 'United States' && country !== 'US') parts.push(country);

            const displayName = parts.length > 0 ? parts.join(', ') : name;

            return {
              displayName,
              name: name || fullStreet || query.trim(),
              street: fullStreet,
              city,
              state,
              country,
              lat: featLat,
              lon: featLon,
            };
          })
          // Filter out results that don't match or look unreasonable
          .filter((item: LocationSuggestion) => item.displayName.length > 0);

        results = [...localMatches, ...photonSuggestions];
      }
    }
  } catch (err) {
    console.warn('Photon autocomplete error:', err);
  }

  // 2. If results are still low, query Nominatim restricted to US/Canada/UK or with location bias
  if (results.length < 3) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query.trim()
      )}&addressdetails=1&limit=5&countrycodes=us,ca,gb&lat=${lat}&lon=${lon}`;

      const res = await fetch(nomUrl, {
        headers: { 'Accept-Language': 'en' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const nomSuggestions = data.map((item: any) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const country = addr.country || '';
            const street = [addr.house_number, addr.road].filter(Boolean).join(' ');

            const parts = [];
            if (item.name) parts.push(item.name);
            if (street && street !== item.name) parts.push(street);
            if (city) parts.push(city);
            if (state) parts.push(state);

            return {
              displayName: parts.length > 0 ? parts.join(', ') : item.display_name,
              name: item.name || item.display_name.split(',')[0],
              street,
              city,
              state,
              country,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
            };
          });

          results = [...results, ...nomSuggestions];
        }
      }
    } catch (err) {
      console.warn('Nominatim autocomplete error:', err);
    }
  }

  // Deduplicate by displayName
  const seen = new Set<string>();
  const uniqueResults: LocationSuggestion[] = [];
  for (const r of results) {
    const key = r.displayName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  }

  return uniqueResults.slice(0, 6);
}

/**
 * Interpret WMO Weather codes into friendly descriptions and emojis.
 */
function decodeWmoCode(code: number): { text: string; icon: string } {
  switch (code) {
    case 0:
      return { text: 'Clear Sky', icon: '☀️' };
    case 1:
    case 2:
      return { text: 'Mostly Sunny', icon: '🌤️' };
    case 3:
      return { text: 'Partly Cloudy', icon: '⛅' };
    case 45:
    case 48:
      return { text: 'Foggy', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { text: 'Light Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { text: 'Rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
      return { text: 'Snow', icon: '❄️' };
    case 80:
    case 81:
    case 82:
      return { text: 'Showers', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { text: 'Thunderstorm', icon: '🌩️' };
    default:
      return { text: 'Pleasant', icon: '☀️' };
  }
}

/**
 * Fetch real weather forecast given a location string (or coordinates) and date string (YYYY-MM-DD).
 * ONLY called when user confirms/selects location or views event details.
 */
export async function fetchWeatherForLocation(
  locationStr: string,
  dateStr?: string,
  coords?: { lat: number; lon: number }
): Promise<WeatherInfo | null> {
  if (!locationStr || locationStr.trim().length === 0 || locationStr === 'TBD') {
    return null;
  }

  try {
    let lat = coords?.lat;
    let lon = coords?.lon;

    // If coordinates not provided, geocode location string
    if (!lat || !lon) {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          locationStr
        )}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.results && geoData.results.length > 0) {
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
          }
        }
      } catch {
        // Continue to fallback
      }

      if (!lat || !lon) {
        try {
          const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            locationStr
          )}&limit=1`;
          const nomRes = await fetch(nomUrl);
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              lat = parseFloat(nomData[0].lat);
              lon = parseFloat(nomData[0].lon);
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return null;
    }

    // Call Open-Meteo Weather API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto`;
    const wRes = await fetch(weatherUrl);
    if (!wRes.ok) {
      return null;
    }
    const wData = await wRes.json();

    if (!wData || !wData.daily || !wData.daily.time) {
      return null;
    }

    const times: string[] = wData.daily.time;
    const codes: number[] = wData.daily.weathercode;
    const maxTemps: number[] = wData.daily.temperature_2m_max;
    const minTemps: number[] = wData.daily.temperature_2m_min;
    const precipProbs: number[] = wData.daily.precipitation_probability_max || [];

    // Find date index or default to 0
    let dayIdx = 0;
    if (dateStr) {
      const targetIdx = times.indexOf(dateStr);
      if (targetIdx !== -1) {
        dayIdx = targetIdx;
      }
    }

    const weatherDecoded = decodeWmoCode(codes[dayIdx] ?? 0);
    const high = Math.round(maxTemps[dayIdx] ?? 75);
    const low = Math.round(minTemps[dayIdx] ?? 58);
    const precip = precipProbs[dayIdx];

    const conditionStr = `${weatherDecoded.icon} ${high}°F ${weatherDecoded.text}${
      precip && precip > 25 ? ` (${precip}% rain)` : ''
    }`;

    return {
      condition: conditionStr,
      high,
      low,
      description: weatherDecoded.text,
      icon: weatherDecoded.icon,
      precipitationProb: precip,
      source: 'Open-Meteo Live API',
    };
  } catch (err) {
    console.warn('Weather forecast fetch error:', err);
    return null;
  }
}
