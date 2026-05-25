/**
 * Reverse geocoding with in-memory cache and rate limiting for Nominatim (max ~1 req/s).
 */

const addressCache = new Map<string, string>();
let geocodeQueue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function enqueueGeocode<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return task();
  };

  const result = geocodeQueue.then(run, run);
  geocodeQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function reverseGeocodeUncached(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TraccarApp/1.0',
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data?.address) {
      const addr = data.address;
      const parts: string[] = [];

      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts[0] = `${addr.house_number} ${parts[0] || ''}`.trim();
      if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
      if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
      if (addr.state) parts.push(addr.state);
      if (addr.country) parts.push(addr.country);

      return parts.length > 0 ? parts.join(', ') : data.display_name || null;
    }

    return data.display_name || null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const key = cacheKey(latitude, longitude);
  const cached = addressCache.get(key);
  if (cached) return cached;

  return enqueueGeocode(async () => {
    const cachedAfterWait = addressCache.get(key);
    if (cachedAfterWait) return cachedAfterWait;

    const address = await reverseGeocodeUncached(latitude, longitude);
    if (address) addressCache.set(key, address);
    return address;
  });
}

export function primeAddressCache(
  latitude: number,
  longitude: number,
  address: string,
): void {
  if (!address.trim()) return;
  addressCache.set(cacheKey(latitude, longitude), address.trim());
}
