// Production Traccar API configuration
export const API_CONFIG = {
  DEFAULT_BASE_URL: 'https://elevaticsiot.com',
  API_PATH: '/api',
  WS_PATH: '/api/socket',

  // Endpoints — mirrors web interface structure
  ENDPOINTS: {
    SESSION: '/api/session',
    DEVICES: '/api/devices',
    POSITIONS: '/api/positions',
    GEOFENCES: '/api/geofences',
    EVENTS: '/api/events',
    REPORTS_ROUTE: '/api/reports/route',
    REPORTS_EVENTS: '/api/reports/events',
    REPORTS_SUMMARY: '/api/reports/summary',
    REPORTS_TRIPS: '/api/reports/trips',
    REPORTS_STOPS: '/api/reports/stops',
    COMMANDS: '/api/commands',
    COMMANDS_SEND: '/api/commands/send',
    USERS: '/api/users',
    GROUPS: '/api/groups',
    DRIVERS: '/api/drivers',
    ATTRIBUTES: '/api/attributes/computed',
    CALENDARS: '/api/calendars',
    MAINTENANCE: '/api/maintenance',
    NOTIFICATIONS: '/api/notifications',
    PERMISSIONS: '/api/permissions',
    SERVER: '/api/server',
    STATISTICS: '/api/statistics',
  },
} as const;

// React Query cache key constants
export const QUERY_KEYS = {
  devices: ['devices'] as const,
  device: (id: number) => ['devices', id] as const,
  positions: ['positions'] as const,
  position: (deviceId: number) => ['positions', deviceId] as const,
  geofences: ['geofences'] as const,
  events: (deviceId?: number) => ['events', deviceId] as const,
  reports: {
    route: (deviceId: number, from: string, to: string) => ['reports', 'route', deviceId, from, to] as const,
    trips: (deviceId: number, from: string, to: string) => ['reports', 'trips', deviceId, from, to] as const,
    events: (deviceId: number, from: string, to: string) => ['reports', 'events', deviceId, from, to] as const,
    summary: (deviceId: number, from: string, to: string) => ['reports', 'summary', deviceId, from, to] as const,
    stops: (deviceId: number, from: string, to: string) => ['reports', 'stops', deviceId, from, to] as const,
  },
  drivers: ['drivers'] as const,
  groups: ['groups'] as const,
  users: ['users'] as const,
  notifications: ['notifications'] as const,
  server: ['server'] as const,
} as const;

// WebSocket reconnect timing
export const WS_RECONNECT_DELAY = 5000;
export const WS_MAX_RECONNECT_DELAY = 30000;

// Mapbox — loaded from EXPO_PUBLIC_MAPBOX_TOKEN in .env
export const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export const MAPBOX_STYLES = {
  dark: 'mapbox/dark-v11',
  satellite: 'mapbox/satellite-streets-v12',
  terrain: 'mapbox/outdoors-v12',
  streets: 'mapbox/streets-v12',
} as const;

export function getMapboxStyleUrl(
  styleId: string,
  token: string = MAPBOX_ACCESS_TOKEN
): string {
  return `https://api.mapbox.com/styles/v1/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`;
}

export const AI_COMPANION_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_AI_COMPANION_URL ?? 'https://traccar-agent-v2.elevatics.site',
  CHAT_PATH: '/api/v1/chat',
} as const;
