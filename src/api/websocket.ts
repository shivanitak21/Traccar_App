import { traccarAPI, TraccarPosition, TraccarDevice, TraccarEvent } from './traccar';

type WebSocketListener = (data: any) => void;

class TraccarWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, WebSocketListener[]> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const url = traccarAPI.getWebSocketUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.emit('connected', true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.positions) {
            this.emit('positions', data.positions);
          }

          if (data.devices) {
            this.emit('devices', data.devices);
          }

          if (data.events) {
            this.emit('events', data.events);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnecting = false;
        this.emit('connected', false);
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }

  on(event: string, callback: WebSocketListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: WebSocketListener) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

export const traccarWS = new TraccarWebSocket();
