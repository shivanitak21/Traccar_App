import { storage } from '../utils/storage';

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
  attributes: any;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes: any;
}

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId?: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes: any;
}

class TraccarAPI {
  private baseUrl: string = '';
  private authHeader: string = '';

  async initialize() {
    const savedUrl = await storage.getServerUrl();
    const savedAuth = await storage.getSession();

    if (savedUrl) this.baseUrl = savedUrl;
    if (savedAuth) this.authHeader = savedAuth;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: any = {
      ...options.headers,
    };

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    console.log('API Request:', { url, method: options.method || 'GET', hasAuth: !!this.authHeader });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('API Response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      throw new Error(error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API Data:', data);
    return data;
  }

  async login(email: string, password: string) {
    console.log('Logging in with:', { email, baseUrl: this.baseUrl });

    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log('Login response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const error = await response.text();
      console.error('Login error:', error);
      throw new Error('Invalid credentials');
    }

    const user = await response.json();
    console.log('Login successful:', user);

    const authString = `${email}:${password}`;
    const encodedAuth = btoa(authString);
    this.authHeader = `Basic ${encodedAuth}`;

    await storage.saveSession(this.authHeader);
    await storage.saveUser(user);

    return user;
  }

  async logout() {
    try {
      await this.request('/api/session', { method: 'DELETE' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    await storage.clearAll();
    this.authHeader = '';
  }

  async getDevices(): Promise<TraccarDevice[]> {
    return this.request('/api/devices');
  }

  async getDevice(id: number): Promise<TraccarDevice> {
    return this.request(`/api/devices/${id}`);
  }

  async getPositions(deviceId?: number): Promise<TraccarPosition[]> {
    const query = deviceId ? `?deviceId=${deviceId}` : '';
    return this.request(`/api/positions${query}`);
  }

  async getGeofences(): Promise<TraccarGeofence[]> {
    return this.request('/api/geofences');
  }

  async createGeofence(geofence: Partial<TraccarGeofence>): Promise<TraccarGeofence> {
    return this.request('/api/geofences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geofence),
    });
  }

  async getEvents(deviceId?: number, from?: string, to?: string): Promise<TraccarEvent[]> {
    const params = new URLSearchParams();
    if (deviceId) params.append('deviceId', String(deviceId));
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    return this.request(`/api/events?${params.toString()}`);
  }

  async sendCommand(deviceId: number, type: string, attributes: any = {}) {
    return this.request('/api/commands/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        type,
        attributes,
      }),
    });
  }

  async getRoute(deviceId: number, from: string, to: string): Promise<TraccarPosition[]> {
    const params = new URLSearchParams({
      deviceId: String(deviceId),
      from,
      to,
    });

    return this.request(`/api/positions?${params.toString()}`);
  }

  getWebSocketUrl(): string {
    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = this.baseUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/api/socket`;
  }
}

export const traccarAPI = new TraccarAPI();
