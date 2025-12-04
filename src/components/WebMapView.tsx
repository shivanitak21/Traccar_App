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
    updateMap();
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
      markersLayer.forEach(m => map.removeLayer(m));
      polylinesLayer.forEach(p => map.removeLayer(p));
      markersLayer = [];
      polylinesLayer = [];

      if (data.center && map) {
        map.setView([data.center.latitude, data.center.longitude], data.zoom || 13);
      }

      if (data.markers) {
        data.markers.forEach(marker => {
          const icon = L.divIcon({
            className: 'pulse-marker',
            iconSize: [30, 30],
            html: '<div class="pulse-marker"></div>'
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
