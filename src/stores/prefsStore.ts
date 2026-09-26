import { create } from 'zustand';
import { elevaticsAPI } from '../api/elevatics';
import { storage } from '../utils/storage';
import type { DistanceUnit, SpeedUnit, FuelUnit } from '../utils/units';

export interface TrackingPrefs {
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
  fuelUnit: FuelUnit;
  coordinateFormat: 'decimal' | 'dms' | 'ddm';
  timezone: string;
}

const DEFAULT_PREFS: TrackingPrefs = {
  distanceUnit: 'km',
  speedUnit: 'kmh',
  fuelUnit: 'liters',
  coordinateFormat: 'decimal',
  timezone: 'UTC',
};

function fromServer(server: any): Partial<TrackingPrefs> {
  if (!server) return {};
  const mapUnit = (v: string): DistanceUnit =>
    v === 'mi' ? 'mi' : v === 'nm' ? 'nm' : 'km';
  const mapSpeed = (v: string): SpeedUnit =>
    v === 'mph' ? 'mph' : v === 'kn' ? 'kn' : 'kmh';
  const mapFuel = (v: string): FuelUnit => {
    if (v === 'usGal' || v === 'us_gallons') return 'us_gallons';
    if (v === 'impGal' || v === 'imp_gallons') return 'imp_gallons';
    return 'liters';
  };
  const mapCoord = (v: string): TrackingPrefs['coordinateFormat'] =>
    v === 'dms' ? 'dms' : v === 'ddm' ? 'ddm' : 'decimal';

  return {
    distanceUnit: mapUnit(server.distanceUnit),
    speedUnit: mapSpeed(server.speedUnit),
    fuelUnit: mapFuel(server.attributes?.volumeUnit || server.volumeUnit || 'ltr'),
    coordinateFormat: mapCoord(server.coordinateFormat),
    timezone: server.attributes?.timezone || server.timezone || 'UTC',
  };
}

function toServer(prefs: TrackingPrefs, currentServer: any) {
  const volumeUnit =
    prefs.fuelUnit === 'us_gallons' ? 'usGal'
    : prefs.fuelUnit === 'imp_gallons' ? 'impGal'
    : 'ltr';

  return {
    ...currentServer,
    distanceUnit: prefs.distanceUnit,
    speedUnit: prefs.speedUnit,
    coordinateFormat: prefs.coordinateFormat === 'dms' ? 'dms' : prefs.coordinateFormat === 'ddm' ? 'ddm' : 'dd',
    attributes: {
      ...(currentServer?.attributes || {}),
      volumeUnit,
      timezone: prefs.timezone,
    },
  };
}

interface PrefsState {
  prefs: TrackingPrefs;
  loading: boolean;
  serverConfig: any | null;
  initialize: () => Promise<void>;
  setPref: <K extends keyof TrackingPrefs>(key: K, value: TrackingPrefs[K]) => void;
  savePrefs: () => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  loading: false,
  serverConfig: null,

  initialize: async () => {
    set({ loading: true });
    try {
      const saved = await storage.getPreferences();
      let serverConfig: any = null;
      try {
        serverConfig = await elevaticsAPI.getServer();
      } catch {
        // offline or no permission
      }
      const merged: TrackingPrefs = {
        ...DEFAULT_PREFS,
        ...saved,
        ...(serverConfig ? fromServer(serverConfig) : {}),
      };
      set({ prefs: merged, serverConfig, loading: false });
      await storage.savePreferences(merged);
    } catch {
      set({ loading: false });
    }
  },

  setPref: (key, value) => {
    set(state => ({ prefs: { ...state.prefs, [key]: value } }));
  },

  savePrefs: async () => {
    const { prefs, serverConfig } = get();
    await storage.savePreferences(prefs);
    if (serverConfig) {
      try {
        const payload = toServer(prefs, serverConfig);
        const updated = await elevaticsAPI.updateServer(payload);
        set({ serverConfig: updated });
      } catch (err) {
        console.error('Failed to sync prefs to server:', err);
        throw err;
      }
    }
  },
}));
