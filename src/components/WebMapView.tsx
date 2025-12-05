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

interface WebMapViewProps {
  markers?: Marker[];
  polylines?: Polyline[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  onMarkerPress?: (markerId: string) => void;
  showUserLocation?: boolean;
  style?: any;
}

export const WebMapView: React.FC<WebMapViewProps> = ({
  markers = [],
  polylines = [],
  center = { latitude: 0, longitude: 0 },
  zoom = 13,
  onMarkerPress,
  showUserLocation = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Small delay to ensure WebView is ready
    const timer = setTimeout(() => {
      updateMap();
    }, 100);
    return () => clearTimeout(timer);
  }, [markers, polylines, center, zoom]);

  const updateMap = () => {
    if (webViewRef.current) {
      const script = `
        if (window.updateMapData) {
          window.updateMapData(${JSON.stringify({ markers, polylines, center, zoom })});
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
  <script>
    let map;
    let markersLayer = [];
    let polylinesLayer = [];

    function initMap() {
      map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([${center.latitude}, ${center.longitude}], ${zoom});

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

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

      updateMapData({
        markers: ${JSON.stringify(markers)},
        polylines: ${JSON.stringify(polylines)},
        center: ${JSON.stringify(center)},
        zoom: ${zoom}
      });
    }

    window.updateMapData = function(data) {
      // Remove all existing markers and polylines
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
      markersLayer = [];
      polylinesLayer = [];

      if (data.center && map) {
        map.setView([data.center.latitude, data.center.longitude], data.zoom || 13);
      }

      if (data.markers) {
        // Use a Set to track unique marker IDs to prevent duplicates
        const seenIds = new Set();
        data.markers.forEach(marker => {
          // Skip if we've already processed this marker ID
          if (seenIds.has(marker.id)) {
            return;
          }
          seenIds.add(marker.id);
          
          const statusClass = marker.status === 'online' ? 'online' : 'offline';
          const icon = L.divIcon({
            className: 'device-marker ' + statusClass,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20],
            html: '<div class="device-marker ' + statusClass + '"></div>'
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
