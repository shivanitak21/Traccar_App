import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLES } from '../api/config';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  deviceName?: string;
  deviceModel?: string;
  status?: string;
  course?: number;
}

interface Polyline {
  id?: string;
  coordinates: { latitude: number; longitude: number }[];
  color?: string;
  width?: number;
  opacity?: number;
  dashed?: boolean;
}

export type MapLayerType = 'normal' | 'satellite' | 'terrain' | 'hybrid' | 'streets';
export type DrawingMode = 'none' | 'polygon' | 'rectangle';

interface WebMapViewProps {
  markers?: Marker[];
  polylines?: Polyline[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  onMarkerPress?: (markerId: string) => void;
  showUserLocation?: boolean;
  mapLayer?: MapLayerType;
  geofences?: Array<{
    id: number;
    name: string;
    area: string;
    color?: string;
  }>;
  selectedGeofenceId?: number;
  onGeofencePress?: (geofenceId: number) => void;
  drawingMode?: DrawingMode;
  onGeofenceDrawn?: (area: string) => void;
  fitToMarkers?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  style?: any;
  smoothPlayback?: boolean;
  followMarker?: boolean;
}

export const WebMapView: React.FC<WebMapViewProps> = React.memo(({
  markers = [],
  polylines = [],
  center = { latitude: 0, longitude: 0 },
  zoom = 13,
  onMarkerPress,
  showUserLocation = false,
  mapLayer = 'normal',
  geofences = [],
  selectedGeofenceId,
  onGeofencePress,
  drawingMode = 'none',
  onGeofenceDrawn,
  fitToMarkers = false,
  onInteractionStart,
  onInteractionEnd,
  style,
  smoothPlayback = false,
  followMarker = false,
}) => {
  const webViewRef = useRef<WebView>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInteractionStartRef = useRef(onInteractionStart);
  const onInteractionEndRef = useRef(onInteractionEnd);

  useEffect(() => {
    onInteractionStartRef.current = onInteractionStart;
    onInteractionEndRef.current = onInteractionEnd;
  }, [onInteractionStart, onInteractionEnd]);

  // Memoize map data to prevent unnecessary updates
  const mapData = useMemo(() => ({
    markers,
    polylines,
    center,
    zoom,
    mapLayer,
    geofences,
    selectedGeofenceId,
    drawingMode,
    smoothPlayback,
    followMarker,
    fitToMarkers,
  }), [markers, polylines, center, zoom, mapLayer, geofences, selectedGeofenceId, drawingMode, smoothPlayback, followMarker, fitToMarkers]);

  const updateMap = useCallback(() => {
    if (webViewRef.current) {
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Throttle updates to prevent excessive re-renders
      updateTimeoutRef.current = setTimeout(() => {
        if (webViewRef.current) {
          const script = `
            if (window.updateMapData) {
              window.updateMapData(${JSON.stringify(mapData)});
            }
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
      }, 50);
    }
  }, [mapData]);

  useEffect(() => {
    // Small delay to ensure WebView is ready
    const timer = setTimeout(() => {
      updateMap();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateMap]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.markerId);
      } else if (data.type === 'geofencePress' && onGeofencePress) {
        onGeofencePress(data.geofenceId);
      } else if (data.type === 'geofenceDrawn' && onGeofenceDrawn) {
        onGeofenceDrawn(data.area);
      } else if (data.type === 'interactionStart') {
        onInteractionStartRef.current?.();
      } else if (data.type === 'interactionEnd') {
        onInteractionEndRef.current?.();
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  }, [onMarkerPress, onGeofencePress, onGeofenceDrawn]);

  const mapboxToken = MAPBOX_ACCESS_TOKEN;

  const html = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
    #map {
      width: 100%;
      height: 100%;
      background: #1a1a2e;
    }
    .leaflet-popup-content-wrapper {
      background: rgba(26, 26, 46, 0.95);
      color: #00f3ff;
      border: 1px solid #00f3ff;
      border-radius: 8px;
    }
    .leaflet-popup-tip {
      background: rgba(26, 26, 46, 0.95);
    }
    .geofence-label {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    .geofence-label::before {
      display: none !important;
    }
    .pulse-marker {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #00f3ff;
      box-shadow: 0 0 20px #00f3ff;
      animation: pulse 2s infinite;
    }
    .device-marker {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .device-marker svg {
      width: 18px;
      height: 18px;
      fill: #ffffff;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
    }
    .device-marker.online {
      background: #10b981;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.9);
    }
    .device-marker.offline {
      background: #64748b;
      box-shadow: 0 0 10px rgba(100, 116, 139, 0.6);
    }
    .device-marker.moving {
      background: #3b82f6;
      box-shadow: 0 0 14px rgba(59, 130, 246, 0.9);
    }
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.7;
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>
  <script>
    let map;
    let markersLayer = [];
    let polylinesLayer = [];

    let currentTileLayer;
    let currentLayerType = '${mapLayer}';
    let geofencesLayer = [];
    let playbackMarker = null;
    let playbackTrail = null;
    let playbackTrailOutline = null;
    let playbackInitialized = false;

    function buildMarkerIcon(marker) {
      const statusClass = marker.status === 'online' ? 'online'
        : marker.status === 'moving' ? 'moving'
        : 'offline';
      const heading = marker.course || 0;
      const navSvg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5L19.5 20.5L12 16.5L4.5 20.5Z"/></svg>';
      return L.divIcon({
        className: 'custom-marker-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
        html: '<div class="device-marker ' + statusClass + '" style="transform:rotate(' + heading + 'deg);">' + navSvg + '</div>'
      });
    }

    function updateMarkerRotation(markerLayer, course) {
      if (!markerLayer || !markerLayer._icon) return;
      const el = markerLayer._icon.querySelector('.device-marker');
      if (el) el.style.transform = 'rotate(' + (course || 0) + 'deg)';
    }

    function updateSmoothPlayback(data) {
      if (!map) return;

      const marker = data.markers && data.markers[0];
      const trailPoly = data.polylines && data.polylines.find(p => p.id === 'trail')
        || (data.polylines && data.polylines[data.polylines.length - 1]);

      if (marker) {
        if (!playbackMarker) {
          playbackMarker = L.marker([marker.latitude, marker.longitude], {
            icon: buildMarkerIcon(marker),
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          playbackMarker.setLatLng([marker.latitude, marker.longitude]);
          updateMarkerRotation(playbackMarker, marker.course);
        }
      }

      if (trailPoly && trailPoly.coordinates && trailPoly.coordinates.length > 1) {
        const coords = trailPoly.coordinates.map(c => [c.latitude, c.longitude]);
        const weight = trailPoly.width || 6;
        const opacity = trailPoly.opacity !== undefined ? trailPoly.opacity : 1;

        if (!playbackTrail) {
          playbackTrailOutline = L.polyline(coords, {
            color: '#ffffff',
            weight: weight + 4,
            opacity: 0.45,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          playbackTrail = L.polyline(coords, {
            color: trailPoly.color || '#22c55e',
            weight: weight,
            opacity: opacity,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        } else {
          playbackTrailOutline.setLatLngs(coords);
          playbackTrail.setLatLngs(coords);
        }
      }

      if (data.followMarker && marker) {
        map.panTo([marker.latitude, marker.longitude], {
          animate: false,
          noMoveStart: true,
        });
      } else if (!playbackInitialized && data.center) {
        map.setView([data.center.latitude, data.center.longitude], data.zoom || 14);
        playbackInitialized = true;
      }
    }

    function resetPlaybackLayers() {
      if (playbackMarker && map.hasLayer(playbackMarker)) map.removeLayer(playbackMarker);
      if (playbackTrail && map.hasLayer(playbackTrail)) map.removeLayer(playbackTrail);
      if (playbackTrailOutline && map.hasLayer(playbackTrailOutline)) map.removeLayer(playbackTrailOutline);
      playbackMarker = null;
      playbackTrail = null;
      playbackTrailOutline = null;
      playbackInitialized = false;
    }

    function getTileLayerUrl(layerType) {
      const token = '${mapboxToken}';
      if (!token) {
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      }
      const styleMap = {
        normal: '${MAPBOX_STYLES.dark}',
        streets: '${MAPBOX_STYLES.streets}',
        satellite: '${MAPBOX_STYLES.satellite}',
        terrain: '${MAPBOX_STYLES.terrain}',
        hybrid: '${MAPBOX_STYLES.satellite}',
      };
      const styleId = styleMap[layerType] || styleMap.normal;
      return 'https://api.mapbox.com/styles/v1/' + styleId + '/tiles/256/{z}/{x}/{y}@2x?access_token=' + token;
    }

    function setMapLayer(layerType) {
      if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
      }
      
      const url = getTileLayerUrl(layerType);
      currentTileLayer = L.tileLayer(url, {
        maxZoom: 22,
        tileSize: 256,
        zoomOffset: 0,
        attribution: '© Mapbox © OpenStreetMap'
      }).addTo(map);
    }

    function initMap() {
      map = L.map('map', {
        zoomControl: true,
        attributionControl: false,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        dragging: true,
      }).setView([20.5937, 78.9629], 5);

      function notifyInteraction(active) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: active ? 'interactionStart' : 'interactionEnd'
        }));
      }

      map.on('touchstart', () => notifyInteraction(true));
      map.on('touchend', () => notifyInteraction(false));
      map.on('touchcancel', () => notifyInteraction(false));

      setMapLayer('normal');

      ${showUserLocation ? `
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            L.circle([position.coords.latitude, position.coords.longitude], {
              color: '#ff00ff',
              fillColor: '#ff00ff',
              fillOpacity: 0.3,
              radius: 100
            }).addTo(map);
          });
        }
      ` : ''}

      // Initialize drawing layer
      drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      updateMapData({
        markers: [],
        polylines: [],
        center: { latitude: 20.5937, longitude: 78.9629 },
        zoom: 5,
        mapLayer: 'normal',
        geofences: [],
        selectedGeofenceId: null,
        drawingMode: 'none'
      });
    }
    
    // Drawing state - declare outside initMap
    let drawingLayer = null;
    let drawnItems = null;

    function parseGeofenceArea(area) {
      try {
        // Traccar geofence area format: "CIRCLE (lat lon radius)" or "POLYGON ((lat1 lon1, lat2 lon2, ...))"
        if (area.startsWith('CIRCLE')) {
          const match = area.match(/CIRCLE\\s*\\(([^)]+)\\)/);
          if (match) {
            const parts = match[1].trim().split(/\\s+/);
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            const radius = parseFloat(parts[2]) || 100;
            return { type: 'circle', center: [lat, lon], radius: radius };
          }
        } else if (area.startsWith('POLYGON')) {
          const match = area.match(/POLYGON\\s*\\(\\(([^)]+)\\)\\)/);
          if (match) {
            const coords = match[1].split(',').map(c => {
              const parts = c.trim().split(/\\s+/);
              return [parseFloat(parts[0]), parseFloat(parts[1])];
            });
            return { type: 'polygon', coordinates: coords };
          }
        }
      } catch (e) {
        console.error('Error parsing geofence area:', e);
      }
      return null;
    }

    window.updateMapData = function(data) {
      if (data.smoothPlayback && map) {
        updateSmoothPlayback(data);
        return;
      }

      resetPlaybackLayers();

      // Update map layer if changed
      if (data.mapLayer && data.mapLayer !== currentLayerType) {
        currentLayerType = data.mapLayer;
        setMapLayer(data.mapLayer);
      }

      // Remove all existing markers, polylines, and geofences
      markersLayer.forEach(m => {
        if (map.hasLayer(m)) {
          map.removeLayer(m);
        }
      });
      polylinesLayer.forEach(p => {
        if (map.hasLayer(p)) {
          map.removeLayer(p);
        }
      });
      geofencesLayer.forEach(g => {
        if (map.hasLayer(g)) {
          map.removeLayer(g);
        }
      });
      markersLayer = [];
      polylinesLayer = [];
      geofencesLayer = [];

      // Handle drawing mode changes
      if (data.drawingMode && data.drawingMode !== 'none') {
        enableDrawing(data.drawingMode);
      } else {
        disableDrawing();
      }

      if (data.markers && Array.isArray(data.markers)) {
        // STRICT deduplication - only ONE marker per unique ID
        const processedIds = new Set();
        
        data.markers.forEach(marker => {
          // Skip if already processed
          if (processedIds.has(marker.id)) {
            console.warn('WebMapView: Skipping duplicate marker ID:', marker.id);
            return;
          }
          processedIds.add(marker.id);
          
          const statusClass = marker.status === 'online' ? 'online'
            : marker.status === 'moving' ? 'moving'
            : 'offline';
          const heading = marker.course || 0;
          const icon = buildMarkerIcon(marker);

          const m = L.marker([marker.latitude, marker.longitude], { icon })
            .addTo(map);

          if (marker.title || marker.description) {
            m.bindPopup(\`
              <div style="color: #00f3ff; font-weight: bold;">\${marker.title || 'Device'}</div>
              <div style="color: #fff; font-size: 12px; margin-top: 5px;">\${marker.description || ''}</div>
            \`);
          }

          m.on('click', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerPress',
              markerId: marker.id
            }));
          });

          markersLayer.push(m);
        });
        
        console.log('WebMapView: Added', processedIds.size, 'unique markers');
      }

      if (data.fitToMarkers && markersLayer.length > 0) {
        const group = L.featureGroup(markersLayer);
        map.fitBounds(group.getBounds(), {
          padding: [48, 48],
          maxZoom: 14,
          animate: false,
        });
      } else if (data.center && map && !data.smoothPlayback) {
        map.setView([data.center.latitude, data.center.longitude], data.zoom || 13);
      }

      // Add geofences
      if (data.geofences && Array.isArray(data.geofences)) {
        data.geofences.forEach(geofence => {
          const areaData = parseGeofenceArea(geofence.area);
          if (!areaData) return;

          const isSelected = data.selectedGeofenceId === geofence.id;
          const color = isSelected ? '#E8A84A' : (geofence.color || '#00f3ff');
          const opacity = isSelected ? 0.4 : 0.2;
          const weight = isSelected ? 3 : 2;

          let layer;
          if (areaData.type === 'circle') {
            layer = L.circle(areaData.center, {
              radius: areaData.radius,
              color: color,
              fillColor: color,
              fillOpacity: opacity,
              weight: weight
            }).addTo(map);
          } else if (areaData.type === 'polygon') {
            layer = L.polygon(areaData.coordinates, {
              color: color,
              fillColor: color,
              fillOpacity: opacity,
              weight: weight
            }).addTo(map);
          }

          if (layer) {
            // Add permanent label with geofence name
            const labelHtml = \`
              <div style="
                background: rgba(0, 0, 0, 0.8);
                color: \${color};
                padding: 6px 12px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
                border: 2px solid \${color};
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              ">
                \${geofence.name || 'Geofence'}
              </div>
            \`;
            
            const tooltip = L.tooltip({
              permanent: true,
              direction: 'center',
              className: 'geofence-label',
              opacity: 1
            }).setContent(labelHtml);
            
            layer.bindTooltip(tooltip);

            // Popup on click
            layer.bindPopup(\`
              <div style="color: #00f3ff; font-weight: bold;">\${geofence.name || 'Geofence'}</div>
              <div style="color: #999; font-size: 12px; margin-top: 4px;">\${geofence.description || 'No description'}</div>
            \`);

            layer.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'geofencePress',
                geofenceId: geofence.id
              }));
            });

            geofencesLayer.push(layer);
          }
        });
      }

      if (data.polylines) {
        data.polylines.forEach(polyline => {
          const coords = polyline.coordinates.map(c => [c.latitude, c.longitude]);
          const weight = polyline.width || 4;
          const opacity = polyline.opacity !== undefined ? polyline.opacity : 0.9;

          // White halo for visibility on dark maps
          const outline = L.polyline(coords, {
            color: '#ffffff',
            weight: weight + 5,
            opacity: Math.min(0.55, opacity * 0.45),
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          polylinesLayer.push(outline);

          const p = L.polyline(coords, {
            color: polyline.color || '#10b981',
            weight: weight,
            opacity: opacity,
            dashArray: polyline.dashed ? '10, 12' : null,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          polylinesLayer.push(p);
        });
      }
    };
    
    // Drawing functionality
    function enableDrawing(mode) {
      console.log('Enabling drawing mode:', mode);
      disableDrawing(); // Clear any previous drawing
      
      if (mode === 'polygon') {
        const polygon = new L.Draw.Polygon(map);
        polygon.enable();
        
        map.on('draw:created', function(e) {
          const layer = e.layer;
          drawnItems.clearLayers();
          drawnItems.addLayer(layer);
          
          // Convert to Traccar format
          const latlngs = layer.getLatLngs()[0];
          const coords = latlngs.map(ll => ll.lat + ' ' + ll.lng).join(', ');
          const area = 'POLYGON ((' + coords + '))';
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'geofenceDrawn',
            area: area
          }));
        });
       } else if (mode === 'rectangle') {
         const rectangle = new L.Draw.Rectangle(map);
         rectangle.enable();
         
         map.on('draw:created', function(e) {
           const layer = e.layer;
           drawnItems.clearLayers();
           drawnItems.addLayer(layer);
           
           // Convert rectangle to Traccar POLYGON format
           // Get the bounds of the rectangle
           const bounds = layer.getBounds();
           const sw = bounds.getSouthWest(); // Southwest corner
           const ne = bounds.getNorthEast(); // Northeast corner
           const se = bounds.getSouthEast(); // Southeast corner
           const nw = bounds.getNorthWest(); // Northwest corner
           
           // Create polygon coordinates in clockwise order: SW -> SE -> NE -> NW -> SW (closed)
           // Format: POLYGON ((lat1 lon1, lat2 lon2, lat3 lon3, lat4 lon4, lat1 lon1))
           const coords = [
             sw.lat + ' ' + sw.lng,  // Southwest
             se.lat + ' ' + se.lng,  // Southeast
             ne.lat + ' ' + ne.lng,  // Northeast
             nw.lat + ' ' + nw.lng,  // Northwest
             sw.lat + ' ' + sw.lng   // Close the polygon
           ].join(', ');
           
           const area = 'POLYGON ((' + coords + '))';
           
           window.ReactNativeWebView.postMessage(JSON.stringify({
             type: 'geofenceDrawn',
             area: area
           }));
         });
       }
    }
    
    function disableDrawing() {
      map.off('draw:created');
      drawnItems.clearLayers();
    }

    document.addEventListener('DOMContentLoaded', initMap);
  </script>
</body>
</html>
  `, [mapboxToken, showUserLocation]);

  const webViewSource = useMemo(() => ({ html }), [html]);

  return (
    <View style={[styles.container, style]}>
      {!mapboxToken ? (
        <View style={styles.tokenWarning}>
          <Text style={styles.tokenWarningText}>
            Mapbox token missing. Add EXPO_PUBLIC_MAPBOX_TOKEN to your .env file.
          </Text>
        </View>
      ) : null}
      <WebView
        ref={webViewRef}
        source={webViewSource}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        nestedScrollEnabled
        onLoadEnd={updateMap}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  if (prevProps.smoothPlayback && nextProps.smoothPlayback) {
    return false;
  }

  const markersEqual = prevProps.markers?.length === nextProps.markers?.length &&
    (!prevProps.markers || !nextProps.markers || 
     prevProps.markers.every((m, i) => 
       m.id === nextProps.markers![i].id &&
       m.latitude === nextProps.markers![i].latitude &&
       m.longitude === nextProps.markers![i].longitude &&
       m.course === nextProps.markers![i].course &&
       m.status === nextProps.markers![i].status
     ));
  
  const polylinesEqual = prevProps.polylines?.length === nextProps.polylines?.length &&
    (!prevProps.polylines || !nextProps.polylines ||
     prevProps.polylines.every((p, i) => {
       const next = nextProps.polylines![i];
       return p.coordinates.length === next.coordinates.length &&
         p.color === next.color &&
         p.width === next.width &&
         p.opacity === next.opacity &&
         p.dashed === next.dashed;
     }));
  
  const geofencesEqual = prevProps.geofences?.length === nextProps.geofences?.length &&
    (!prevProps.geofences || !nextProps.geofences ||
     prevProps.geofences.every((g, i) => 
       g.id === nextProps.geofences![i].id
     ));

  return (
    markersEqual &&
    polylinesEqual &&
    prevProps.center?.latitude === nextProps.center?.latitude &&
    prevProps.center?.longitude === nextProps.center?.longitude &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.mapLayer === nextProps.mapLayer &&
    geofencesEqual &&
    prevProps.selectedGeofenceId === nextProps.selectedGeofenceId &&
    prevProps.drawingMode === nextProps.drawingMode &&
    prevProps.smoothPlayback === nextProps.smoothPlayback &&
    prevProps.followMarker === nextProps.followMarker &&
    prevProps.fitToMarkers === nextProps.fitToMarkers
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
    backgroundColor: colors.backgroundSecondary,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tokenWarning: {
    padding: 8,
    backgroundColor: colors.warningMuted,
  },
  tokenWarningText: {
    ...typography.small,
    color: colors.warning,
    textAlign: 'center',
  },
});
