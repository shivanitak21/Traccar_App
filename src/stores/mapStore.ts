import { create } from 'zustand';

export type MapStyle = 'dark' | 'satellite' | 'terrain' | 'streets';

interface MapCamera {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

interface MapState {
  style: MapStyle;
  camera: MapCamera;
  selectedDeviceId: number | null;
  showTrails: boolean;
  showGeofences: boolean;
  showClusters: boolean;
  isFullscreen: boolean;

  // Actions
  setStyle: (style: MapStyle) => void;
  setCamera: (camera: Partial<MapCamera>) => void;
  setSelectedDevice: (id: number | null) => void;
  toggleTrails: () => void;
  toggleGeofences: () => void;
  toggleClusters: () => void;
  setFullscreen: (full: boolean) => void;
  flyToDevice: (lat: number, lng: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  style: 'dark',
  camera: {
    latitude: 20.5937,
    longitude: 78.9629,
    zoom: 5,
    bearing: 0,
    pitch: 0,
  },
  selectedDeviceId: null,
  showTrails: true,
  showGeofences: true,
  showClusters: true,
  isFullscreen: false,

  setStyle: (style) => set({ style }),

  setCamera: (camera) =>
    set(state => ({ camera: { ...state.camera, ...camera } })),

  setSelectedDevice: (id) => set({ selectedDeviceId: id }),

  toggleTrails: () => set(state => ({ showTrails: !state.showTrails })),

  toggleGeofences: () => set(state => ({ showGeofences: !state.showGeofences })),

  toggleClusters: () => set(state => ({ showClusters: !state.showClusters })),

  setFullscreen: (full) => set({ isFullscreen: full }),

  flyToDevice: (lat, lng) =>
    set(state => ({
      camera: { ...state.camera, latitude: lat, longitude: lng, zoom: 15 },
    })),
}));
