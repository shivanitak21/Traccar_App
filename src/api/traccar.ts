import { storage } from '../utils/storage';
import { API_CONFIG } from './config';
import { normalizeServerUrl } from '../utils/serverUrl';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
  positionId: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled: boolean;
  attributes?: Record<string, any>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address?: string;
  accuracy: number;
  network?: any;
  attributes: Record<string, any>;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes: Record<string, any>;
}

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes: Record<string, any>;
}

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  administrator?: boolean;
  readonly?: boolean;
  deviceLimit?: number;
  userLimit?: number;
  deviceReadonly?: boolean;
  disabled?: boolean;
  expirationTime?: string;
  attributes?: Record<string, any>;
}

export interface TraccarTrip {
  deviceId: number;
  deviceName: string;
  maxSpeed: number;
  averageSpeed: number;
  distance: number;
  duration: number;
  startOdometer: number;
  endOdometer: number;
  startTime: string;
  startAddress?: string;
  startLat: number;
  startLon: number;
  endTime: string;
  endAddress?: string;
  endLat: number;
  endLon: number;
  driverName?: string;
  driverUniqueId?: string;
  spentFuel?: number;
}

export interface TraccarStop {
  deviceId: number;
  deviceName: string;
  duration: number;
  startTime: string;
  address?: string;
  lat: number;
  lon: number;
  endTime: string;
  spentFuel?: number;
  engineHours?: number;
}

export interface TraccarSummary {
  deviceId: number;
  deviceName: string;
  maxSpeed: number;
  averageSpeed: number;
  distance: number;
  startOdometer: number;
  endOdometer: number;
  spentFuel?: number;
  engineHours?: number;
}

export interface TraccarDriver {
  id: number;
  name: string;
  uniqueId: string;
  attributes?: Record<string, any>;
}

export interface TraccarNotification {
  id: number;
  type: string;
  always: boolean;
  web: boolean;
  mail: boolean;
  sms: boolean;
  calendarId?: number;
  attributes?: Record<string, any>;
}

export interface TraccarGroup {
  id: number;
  name: string;
  groupId?: number;
  attributes?: Record<string, any>;
}

export interface TraccarPermission {
  userId?: number;
  deviceId?: number;
  groupId?: number;
  geofenceId?: number;
  notificationId?: number;
  calendarId?: number;
  attributeId?: number;
  driverId?: number;
  managedUserId?: number;
  commandId?: number;
}

// ── API Client ─────────────────────────────────────────────────────────────────

class TraccarAPI {
  private baseUrl: string = API_CONFIG.DEFAULT_BASE_URL;
  private authHeader: string = '';
  private sessionCookie: string = '';

  async initialize() {
    const savedUrl = await storage.getServerUrl();
    const savedAuth = await storage.getSession();
    const savedCookie = await storage.getSessionCookie();

    this.baseUrl = normalizeServerUrl(savedUrl);
    if (savedAuth) this.authHeader = savedAuth;
    if (savedCookie) this.sessionCookie = savedCookie;
  }

  setBaseUrl(url: string) {
    this.baseUrl = normalizeServerUrl(url);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setSessionCookie(cookie: string) {
    this.sessionCookie = cookie;
  }

  clearAuth() {
    this.authHeader = '';
    this.sessionCookie = '';
  }

  private buildReportQuery(deviceId: number, from: string, to: string): string {
    const params = new URLSearchParams();
    params.append('deviceId', String(deviceId));
    params.append('from', from);
    params.append('to', to);
    return params.toString();
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    const response = await fetch(url, { ...options, headers, credentials: 'include' });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `HTTP ${response.status}`);
      let message = errorText || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.message) message = parsed.message;
      } catch {
        // keep raw text
      }
      throw new Error(message);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = response.headers.get('content-length');

    if (contentLength === '0' || !contentType.includes('application/json')) {
      return null as T;
    }

    const text = await response.text();
    if (!text?.trim()) return null as T;

    return JSON.parse(text) as T;
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<TraccarUser> {
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    // Capture session cookie for WebSocket auth
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const jsessionid = setCookie.match(/JSESSIONID=[^;]+/)?.[0];
      if (jsessionid) {
        this.sessionCookie = jsessionid;
        await storage.saveSessionCookie(jsessionid);
      }
    }

    const user: TraccarUser = await response.json();

    const authString = `${email}:${password}`;
    this.authHeader = `Basic ${btoa(authString)}`;

    await storage.saveSession(this.authHeader);
    await storage.saveUser(user);

    return user;
  }

  async logout(): Promise<void> {
    const hadAuth = Boolean(this.authHeader || this.sessionCookie);
    try {
      if (hadAuth) {
        await this.request('/api/session', { method: 'DELETE' });
      }
    } catch {}
    await storage.clearSession();
    this.clearAuth();
  }

  // ── Devices ──────────────────────────────────────────────────────────────────

  async getDevices(): Promise<TraccarDevice[]> {
    return this.request<TraccarDevice[]>('/api/devices');
  }

  async getDevice(id: number): Promise<TraccarDevice> {
    return this.request<TraccarDevice>(`/api/devices/${id}`);
  }

  async createDevice(device: Partial<TraccarDevice>): Promise<TraccarDevice> {
    return this.request<TraccarDevice>('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
  }

  async updateDevice(id: number, device: Partial<TraccarDevice>): Promise<TraccarDevice> {
    return this.request<TraccarDevice>(`/api/devices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
  }

  async deleteDevice(id: number): Promise<void> {
    await this.request(`/api/devices/${id}`, { method: 'DELETE' });
  }

  // ── Positions ─────────────────────────────────────────────────────────────────

  async getPositions(deviceId?: number): Promise<TraccarPosition[]> {
    const query = deviceId ? `?deviceId=${deviceId}` : '';
    return this.request<TraccarPosition[]>(`/api/positions${query}`);
  }

  // ── Geofences ─────────────────────────────────────────────────────────────────

  async getGeofences(): Promise<TraccarGeofence[]> {
    return this.request<TraccarGeofence[]>('/api/geofences');
  }

  async getGeofence(id: number): Promise<TraccarGeofence> {
    return this.request<TraccarGeofence>(`/api/geofences/${id}`);
  }

  async createGeofence(geofence: Partial<TraccarGeofence>): Promise<TraccarGeofence> {
    return this.request<TraccarGeofence>('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geofence),
    });
  }

  async updateGeofence(id: number, geofence: Partial<TraccarGeofence>): Promise<TraccarGeofence> {
    return this.request<TraccarGeofence>(`/api/geofences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geofence),
    });
  }

  async deleteGeofence(id: number): Promise<void> {
    await this.request(`/api/geofences/${id}`, { method: 'DELETE' });
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  async getEvents(deviceId?: number, from?: string, to?: string): Promise<TraccarEvent[]> {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', String(deviceId));
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const qs = params.toString();
    return this.request<TraccarEvent[]>(`/api/events${qs ? `?${qs}` : ''}`);
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  async getRoute(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
    const params = new URLSearchParams({ deviceId: String(deviceId), from, to });
    return this.request<TraccarPosition[]>(`/api/positions?${params}`);
  }

  async getReportRoute(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
    const params = new URLSearchParams({ deviceId: String(deviceId), from, to });
    return this.request<TraccarPosition[]>(`/api/reports/route?${params}`);
  }

  async getReportTrips(deviceId: number, from: string, to: string): Promise<TraccarTrip[]> {
    const qs = this.buildReportQuery(deviceId, from, to);
    const data = await this.request<TraccarTrip[]>(`/api/reports/trips?${qs}`);
    return Array.isArray(data) ? data : [];
  }

  async getReportSummary(deviceId: number, from: string, to: string): Promise<TraccarSummary[]> {
    const qs = this.buildReportQuery(deviceId, from, to);
    const data = await this.request<TraccarSummary[]>(`/api/reports/summary?${qs}`);
    return Array.isArray(data) ? data : [];
  }

  async getReportStops(deviceId: number, from: string, to: string): Promise<TraccarStop[]> {
    const qs = this.buildReportQuery(deviceId, from, to);
    const data = await this.request<TraccarStop[]>(`/api/reports/stops?${qs}`);
    return Array.isArray(data) ? data : [];
  }

  async getReportEvents(deviceId: number, from: string, to: string): Promise<TraccarEvent[]> {
    const qs = this.buildReportQuery(deviceId, from, to);
    const data = await this.request<TraccarEvent[]>(`/api/reports/events?${qs}`);
    return Array.isArray(data) ? data : [];
  }

  // ── Commands ──────────────────────────────────────────────────────────────────

  async sendCommand(deviceId: number, type: string, attributes: Record<string, any> = {}): Promise<any> {
    return this.request('/api/commands/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, type, attributes }),
    });
  }

  async getSavedCommands(deviceId?: number): Promise<any[]> {
    const qs = deviceId ? `?deviceId=${deviceId}` : '';
    return this.request<any[]>(`/api/commands${qs}`);
  }

  // ── Drivers ───────────────────────────────────────────────────────────────────

  async getDrivers(): Promise<TraccarDriver[]> {
    return this.request<TraccarDriver[]>('/api/drivers');
  }

  async createDriver(driver: Partial<TraccarDriver>): Promise<TraccarDriver> {
    return this.request<TraccarDriver>('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driver),
    });
  }

  async updateDriver(id: number, driver: Partial<TraccarDriver>): Promise<TraccarDriver> {
    return this.request<TraccarDriver>(`/api/drivers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driver),
    });
  }

  async deleteDriver(id: number): Promise<void> {
    await this.request(`/api/drivers/${id}`, { method: 'DELETE' });
  }

  // ── Notifications ─────────────────────────────────────────────────────────────

  async getNotifications(): Promise<TraccarNotification[]> {
    return this.request<TraccarNotification[]>('/api/notifications');
  }

  // ── Groups ────────────────────────────────────────────────────────────────────

  async getGroups(): Promise<TraccarGroup[]> {
    return this.request<TraccarGroup[]>('/api/groups');
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

  async getUsers(): Promise<TraccarUser[]> {
    return this.request<TraccarUser[]>('/api/users');
  }

  async getSession(): Promise<TraccarUser> {
    return this.request<TraccarUser>('/api/session');
  }

  async updateUser(id: number, user: Partial<TraccarUser>): Promise<TraccarUser> {
    return this.request<TraccarUser>(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  }

  async createUser(user: Partial<TraccarUser> & { password?: string }): Promise<TraccarUser> {
    return this.request<TraccarUser>('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.request(`/api/users/${id}`, { method: 'DELETE' });
  }

  // ── Permissions ─────────────────────────────────────────────────────────────
  // Traccar requires exactly two *Id query params (use 0 for "any" on one side).

  async getPermissions(userId: number, deviceId = 0): Promise<TraccarPermission[]> {
    if (userId === 0 && deviceId === 0) {
      throw new Error('getPermissions requires a non-zero userId or deviceId');
    }

    const params = new URLSearchParams({
      userId: String(userId),
      deviceId: String(deviceId),
    });

    const data = await this.request<TraccarPermission[]>(`/api/permissions?${params.toString()}`);
    return Array.isArray(data) ? data : [];
  }

  async getAllUserDevicePermissions(users: TraccarUser[]): Promise<TraccarPermission[]> {
    const results = await Promise.all(
      users.map(async user => {
        try {
          return await this.getPermissions(user.id, 0);
        } catch {
          return [];
        }
      })
    );
    return results.flat();
  }

  async linkPermission(userId: number, deviceId: number): Promise<void> {
    await this.request('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deviceId }),
    });
  }

  async unlinkPermission(userId: number, deviceId: number): Promise<void> {
    await this.request('/api/permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deviceId }),
    });
  }

  async linkDriverPermission(deviceId: number, driverId: number): Promise<void> {
    await this.request('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, driverId }),
    });
  }

  // ── Server ────────────────────────────────────────────────────────────────────

  async getServer(): Promise<any> {
    return this.request('/api/server');
  }

  async updateServer(server: any): Promise<any> {
    return this.request('/api/server', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(server),
    });
  }

  // ── WebSocket URL ─────────────────────────────────────────────────────────────

  getWebSocketUrl(): string {
    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = this.baseUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/api/socket`;
  }
}

export const traccarAPI = new TraccarAPI();
