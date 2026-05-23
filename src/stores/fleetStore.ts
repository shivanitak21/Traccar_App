import { create } from 'zustand';
import { TraccarDevice, TraccarPosition, TraccarEvent } from '../api/traccar';

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface DeviceWithPosition extends TraccarDevice {
  position?: TraccarPosition;
  address?: string;
  computedStatus: DeviceStatus;
  speedKmh: number;
  isMoving: boolean;
  ignitionOn: boolean;
}

interface FleetState {
  devices: DeviceWithPosition[];
  positions: Map<number, TraccarPosition>;
  recentEvents: TraccarEvent[];
  selectedDeviceId: number | null;
  filter: 'all' | 'online' | 'offline' | 'moving' | 'idle';
  wsConnected: boolean;

  // Actions
  setDevices: (devices: TraccarDevice[]) => void;
  updateDevices: (updated: TraccarDevice[]) => void;
  updatePositions: (positions: TraccarPosition[]) => void;
  addEvents: (events: TraccarEvent[]) => void;
  setSelectedDevice: (id: number | null) => void;
  setFilter: (filter: FleetState['filter']) => void;
  setWsConnected: (connected: boolean) => void;
  updateDeviceAddress: (deviceId: number, address: string) => void;
  reset: () => void;

  // Computed selectors
  getFilteredDevices: () => DeviceWithPosition[];
  getFleetStats: () => {
    total: number;
    online: number;
    offline: number;
    moving: number;
    idle: number;
  };
}

function computeDeviceStatus(device: TraccarDevice, position?: TraccarPosition): DeviceWithPosition {
  const speedKnots = position?.speed ?? 0;
  const speedKmh = Math.round(speedKnots * 1.852);
  const isMoving = speedKmh >= 1;
  const ignitionOn = position?.attributes?.ignition !== undefined
    ? Boolean(position.attributes.ignition)
    : speedKmh > 0;

  let computedStatus: DeviceStatus = 'unknown';
  if (device.status === 'online') computedStatus = 'online';
  else if (device.status === 'offline') computedStatus = 'offline';

  return {
    ...device,
    position,
    computedStatus,
    speedKmh,
    isMoving,
    ignitionOn,
  };
}

export const useFleetStore = create<FleetState>((set, get) => ({
  devices: [],
  positions: new Map(),
  recentEvents: [],
  selectedDeviceId: null,
  filter: 'all',
  wsConnected: false,

  setDevices: (rawDevices) => {
    const { positions } = get();
    const devices = rawDevices.map(d => computeDeviceStatus(d, positions.get(d.id)));
    set({ devices });
  },

  updateDevices: (updated) => {
    set(state => {
      const deviceMap = new Map(state.devices.map(d => [d.id, d]));
      updated.forEach(d => {
        const existing = deviceMap.get(d.id);
        deviceMap.set(d.id, computeDeviceStatus(d, existing?.position));
      });
      return { devices: Array.from(deviceMap.values()) };
    });
  },

  updatePositions: (newPositions) => {
    set(state => {
      const positions = new Map(state.positions);
      newPositions.forEach(p => positions.set(p.deviceId, p));

      const devices = state.devices.map(d => {
        const updatedPos = positions.get(d.id);
        if (!updatedPos) return d;
        return computeDeviceStatus(d, updatedPos);
      });

      return { positions, devices };
    });
  },

  addEvents: (events) => {
    set(state => ({
      recentEvents: [...events, ...state.recentEvents].slice(0, 100),
    }));
  },

  setSelectedDevice: (id) => set({ selectedDeviceId: id }),

  setFilter: (filter) => set({ filter }),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  updateDeviceAddress: (deviceId, address) => {
    set(state => ({
      devices: state.devices.map(d =>
        d.id === deviceId ? { ...d, address } : d
      ),
    }));
  },

  reset: () =>
    set({
      devices: [],
      positions: new Map(),
      recentEvents: [],
      selectedDeviceId: null,
      filter: 'all',
      wsConnected: false,
    }),

  getFilteredDevices: () => {
    const { devices, filter } = get();
    switch (filter) {
      case 'online': return devices.filter(d => d.computedStatus === 'online');
      case 'offline': return devices.filter(d => d.computedStatus === 'offline');
      case 'moving': return devices.filter(d => d.isMoving);
      case 'idle': return devices.filter(d => !d.isMoving && d.computedStatus === 'online');
      default: return devices;
    }
  },

  getFleetStats: () => {
    const { devices } = get();
    return {
      total: devices.length,
      online: devices.filter(d => d.computedStatus === 'online').length,
      offline: devices.filter(d => d.computedStatus === 'offline').length,
      moving: devices.filter(d => d.isMoving).length,
      idle: devices.filter(d => !d.isMoving && d.computedStatus === 'online').length,
    };
  },
}));
