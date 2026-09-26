import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { WebMapView } from '../WebMapView';
import { getThemeBaseMapLayer } from '../../utils/mapTheme';
import { CompanionMapBlock } from '../../api/aiCompanion';

export const CompanionMap: React.FC<{ map: CompanionMapBlock }> = ({ map }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const route = map.path && map.path.length > 1 ? map.path : map.markers;
  const pins = map.markers.length > 8 && route.length > 2
    ? [map.markers[0], map.markers[map.markers.length - 1]]
    : map.markers;

  const markers = pins.map((point, index) => ({
    id: `companion-${index}`,
    latitude: point.latitude,
    longitude: point.longitude,
    title: point.title ?? (map.markers.length > 1 ? `Point ${index + 1}` : 'Location'),
    description: point.description,
    color: index === 0
      ? colors.success
      : index === pins.length - 1 && pins.length > 1
        ? colors.error
        : colors.primary,
  }));

  const polylines = route.length > 1
    ? [{
        id: 'companion-path',
        coordinates: route.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        })),
        color: colors.primary,
        width: 4,
      }]
    : [];

  const first = markers[0];
  if (!first) return null;

  return (
    <View style={styles.wrap}>
      {map.title ? <Text style={styles.title}>{map.title}</Text> : null}
      <View style={styles.mapFrame}>
        <WebMapView
          markers={markers}
          polylines={polylines}
          center={{ latitude: first.latitude, longitude: first.longitude }}
          zoom={route.length > 1 ? 12 : 14}
          fitToMarkers
          mapLayer={getThemeBaseMapLayer(isDark)}
        />
      </View>
      {route.length > 1 ? (
        <Text style={styles.caption}>{route.length} route points</Text>
      ) : null}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  wrap: { gap: 8 },
  title: { ...typography.smallMd, color: colors.text.primary, fontWeight: '600' },
  mapFrame: {
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  caption: { ...typography.tiny, color: colors.text.tertiary },
});
