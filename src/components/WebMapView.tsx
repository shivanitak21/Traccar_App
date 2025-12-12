import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

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
}

interface Polyline {
  coordinates: { latitude: number; longitude: number }[];
  color?: string;
  width?: number;
}

export type MapLayerType = 'normal' | 'satellite' | 'terrain' | 'hybrid';
export type DrawingMode = 'none' | 'polygon' | 'circle';

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
  style?: any;
}

export const WebMapView: React.FC<WebMapViewProps> = ({
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
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Small delay to ensure WebView is ready
    const timer = setTimeout(() => {
      updateMap();
    }, 100);
    return () => clearTimeout(timer);
  }, [markers, polylines, center, zoom, mapLayer, geofences, selectedGeofenceId, drawingMode]);

  const updateMap = () => {
    if (webViewRef.current) {
      const script = `
        if (window.updateMapData) {
          window.updateMapData(${JSON.stringify({ markers, polylines, center, zoom, mapLayer, geofences, selectedGeofenceId, drawingMode })});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.markerId);
      } else if (data.type === 'geofencePress' && onGeofencePress) {
        onGeofencePress(data.geofenceId);
      } else if (data.type === 'geofenceDrawn' && onGeofenceDrawn) {
        onGeofenceDrawn(data.area);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const html = `
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
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #00f3ff;
      border: 3px solid #fff;
      box-shadow: 0 0 15px rgba(0, 243, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      position: relative;
    }
    .device-marker::before {
      content: '🚗';
      font-size: 24px;
    }
    .device-marker.online {
      background: #00ff88;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
    }
    .device-marker.offline {
      background: #666;
      box-shadow: 0 0 15px rgba(102, 102, 102, 0.8);
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

    function getTileLayerUrl(layerType) {
      switch(layerType) {
        case 'satellite':
          return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        case 'terrain':
          return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        case 'hybrid':
          // For hybrid, we'll use satellite as base
          return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        default:
          return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      }
    }

    function setMapLayer(layerType) {
      if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
      }
      
      const url = getTileLayerUrl(layerType);
      currentTileLayer = L.tileLayer(url, {
        maxZoom: 19,
        attribution: ''
      }).addTo(map);

      // For hybrid, add street labels on top
      if (layerType === 'hybrid') {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          opacity: 0.5,
          attribution: ''
        }).addTo(map);
      }
    }

    function initMap() {
      map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([${center.latitude}, ${center.longitude}], ${zoom});

      setMapLayer('${mapLayer}');

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
        markers: ${JSON.stringify(markers)},
        polylines: ${JSON.stringify(polylines)},
        center: ${JSON.stringify(center)},
        zoom: ${zoom},
        mapLayer: '${mapLayer}',
        geofences: ${JSON.stringify(geofences)},
        selectedGeofenceId: ${selectedGeofenceId || 'null'},
        drawingMode: '${drawingMode}'
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

      if (data.center && map) {
        map.setView([data.center.latitude, data.center.longitude], data.zoom || 13);
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
          
          const statusClass = marker.status === 'online' ? 'online' : 'offline';
          
          // Create icon WITHOUT nested div to prevent visual duplication
          const icon = L.divIcon({
            className: 'custom-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
            html: '<div class="device-marker ' + statusClass + '" style="width:100%;height:100%;"></div>'
          });

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

      // Add geofences
      if (data.geofences && Array.isArray(data.geofences)) {
        data.geofences.forEach(geofence => {
          const areaData = parseGeofenceArea(geofence.area);
          if (!areaData) return;

          const isSelected = data.selectedGeofenceId === geofence.id;
          const color = isSelected ? '#ff0055' : (geofence.color || '#00f3ff');
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
          const p = L.polyline(coords, {
            color: polyline.color || '#00f3ff',
            weight: polyline.width || 3,
            opacity: 0.8
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
      } else if (mode === 'circle') {
        const circle = new L.Draw.Circle(map);
        circle.enable();
        
        map.on('draw:created', function(e) {
          const layer = e.layer;
          drawnItems.clearLayers();
          drawnItems.addLayer(layer);
          
          // Convert to Traccar format
          const center = layer.getLatLng();
          const radius = layer.getRadius();
          const area = 'CIRCLE (' + center.lat + ' ' + center.lng + ' ' + Math.round(radius) + ')';
          
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
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
