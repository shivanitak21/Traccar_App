import { elevaticsAPI } from './elevatics';
import { storage } from '../utils/storage';
import { WS_RECONNECT_DELAY, WS_MAX_RECONNECT_DELAY } from './config';

type WebSocketEvent = 'connected' | 'positions' | 'devices' | 'events';
type WebSocketListener = (data: any) => void;

class ElevaticsWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, WebSocketListener[]> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = WS_RECONNECT_DELAY;
  private isConnecting = false;
  private shouldReconnect = true;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

    const session = await storage.getSession();
    if (!session) return;

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      const url = elevaticsAPI.getWebSocketUrl();
      // Append session cookie as query param for WS auth if available
      const cookie = await storage.getSessionCookie();
      const wsUrl = cookie
        ? `${url}?${cookie.replace('JSESSIONID=', 'token=').replace(/;.*/, '')}`
        : url;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectDelay = WS_RECONNECT_DELAY;
        this.emit('connected', true);
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.positions?.length) this.emit('positions', data.positions);
          if (data.devices?.length) this.emit('devices', data.devices);
          if (data.events?.length) this.emit('events', data.events);
        } catch {
          // ignore malformed frames
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopPing();
        this.emit('connected', false);
        if (this.shouldReconnect) this.scheduleReconnect();
      };
    } catch {
      this.isConnecting = false;
      if (this.shouldReconnect) this.scheduleReconnect();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopPing();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startPing() {
    this.stopPing();
    // Keep-alive every 25 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try { this.ws.send('ping'); } catch {}
      }
    }, 25_000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      // Exponential backoff capped at max delay
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, WS_MAX_RECONNECT_DELAY);
      this.connect();
    }, this.reconnectDelay);
  }

  on(event: WebSocketEvent | string, callback: WebSocketListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: WebSocketEvent | string, callback: WebSocketListener) {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx > -1) list.splice(idx, 1);
    }
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const elevaticsWS = new ElevaticsWebSocket();
