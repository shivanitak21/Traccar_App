import type { MapLayerType } from '../components/WebMapView';

/** Base map style for the current app theme. */
export function getThemeBaseMapLayer(isDark: boolean): MapLayerType {
  return isDark ? 'normal' : 'streets';
}

/** Keeps satellite/terrain/hybrid overrides; syncs standard tiles with theme. */
export function resolveMapLayer(layer: MapLayerType, isDark: boolean): MapLayerType {
  if (layer === 'normal' || layer === 'streets') {
    return getThemeBaseMapLayer(isDark);
  }
  return layer;
}
