export type DistanceUnit = 'km' | 'mi' | 'nm';
export type SpeedUnit = 'kmh' | 'mph' | 'kn';
export type FuelUnit = 'liters' | 'us_gallons' | 'imp_gallons';

const METERS_PER_MILE = 1609.344;
const METERS_PER_NM = 1852;
const KNOTS_TO_KMH = 1.852;
const KNOTS_TO_MPH = 1.15078;

export function normalizeDurationSec(duration: number): number {
  if (!duration || duration <= 0) return 0;
  // Elevatics IoT may return ms or seconds depending on server version
  return duration > 86400 ? duration / 1000 : duration;
}

export function formatDuration(seconds: number): string {
  const sec = normalizeDurationSec(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDistance(
  meters: number,
  unit: DistanceUnit = 'km',
  digits = 1
): string {
  if (!meters || meters <= 0) return unit === 'nm' ? '0 nm' : `0 ${unit}`;
  switch (unit) {
    case 'mi':
      return `${(meters / METERS_PER_MILE).toFixed(digits)} mi`;
    case 'nm':
      return `${(meters / METERS_PER_NM).toFixed(digits)} nm`;
    default:
      if (meters >= 1000) return `${(meters / 1000).toFixed(digits)} km`;
      return `${Math.round(meters)} m`;
  }
}

export function formatSpeed(
  knots: number,
  unit: SpeedUnit = 'kmh',
  digits = 0
): string {
  const value = knots || 0;
  switch (unit) {
    case 'mph':
      return `${(value * KNOTS_TO_MPH).toFixed(digits)} mph`;
    case 'kn':
      return `${value.toFixed(digits)} kn`;
    default:
      return `${(value * KNOTS_TO_KMH).toFixed(digits)} km/h`;
  }
}

export function formatFuel(
  liters: number,
  unit: FuelUnit = 'liters',
  digits = 1
): string {
  if (!liters || liters <= 0) return unit === 'liters' ? '0 L' : '0 gal';
  switch (unit) {
    case 'us_gallons':
      return `${(liters * 0.264172).toFixed(digits)} gal`;
    case 'imp_gallons':
      return `${(liters * 0.219969).toFixed(digits)} gal (Imp)`;
    default:
      return `${liters.toFixed(digits)} L`;
  }
}

export function formatCoordinate(value: number, format: 'decimal' | 'dms' | 'ddm' = 'decimal'): string {
  if (format === 'decimal') return value.toFixed(6);
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const sign = value < 0 ? '-' : '';
  if (format === 'dms') return `${sign}${deg}° ${min}' ${sec}"`;
  return `${sign}${deg}° ${minFloat.toFixed(4)}'`;
}
