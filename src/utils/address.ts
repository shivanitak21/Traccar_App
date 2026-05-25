import { reverseGeocode, primeAddressCache } from './geocoding';
import type { TraccarPosition } from '../api/traccar';

const RESOLVING_LABEL = 'Resolving address...';
const UNAVAILABLE_LABEL = 'Address unavailable';

export function getLocationLabel(options: {
  address?: string | null;
  positionAddress?: string | null;
  latitude?: number;
  longitude?: number;
}): string {
  const address = options.address?.trim() || options.positionAddress?.trim();
  if (address) return address;
  if (options.latitude != null && options.longitude != null) return RESOLVING_LABEL;
  return UNAVAILABLE_LABEL;
}

export async function resolveAddressForPosition(
  position: Pick<TraccarPosition, 'latitude' | 'longitude' | 'address'>,
): Promise<string | null> {
  if (position.address?.trim()) {
    primeAddressCache(position.latitude, position.longitude, position.address);
    return position.address.trim();
  }
  return reverseGeocode(position.latitude, position.longitude);
}

/** Resolve addresses one-by-one to respect geocoder rate limits. */
export async function resolveAddressesForPositions(
  positions: TraccarPosition[],
  onResolved: (deviceId: number, address: string) => void,
  shouldSkip?: (deviceId: number) => boolean,
): Promise<void> {
  for (const pos of positions) {
    if (shouldSkip?.(pos.deviceId)) continue;

    if (pos.address?.trim()) {
      primeAddressCache(pos.latitude, pos.longitude, pos.address);
      onResolved(pos.deviceId, pos.address.trim());
      continue;
    }

    const address = await resolveAddressForPosition(pos);
    if (address) onResolved(pos.deviceId, address);
  }
}

export function isLocationQuestion(text: string): boolean {
  return /\b(where|location|address|position|located|current place|what place)\b/i.test(text);
}

/** Replace raw coordinate strings in AI text with a known address. */
export function preferAddressInText(text: string, address: string | null): string {
  if (!address?.trim()) return text;

  return text
    .replace(/-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/g, address)
    .replace(/latitude\s*:?\s*-?\d+\.?\d*\s*,?\s*longitude\s*:?\s*-?\d+\.?\d*/gi, address)
    .replace(/lat\s*:?\s*-?\d+\.?\d*\s*,?\s*lon(g(?:itude)?)?\s*:?\s*-?\d+\.?\d*/gi, address);
}

export { RESOLVING_LABEL, UNAVAILABLE_LABEL };
