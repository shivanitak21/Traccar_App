import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  large?: boolean;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  right,
  large = true,
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.textBlock}>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <Text style={[styles.title, large && styles.titleLarge]}>{title}</Text>
    </View>
    {right && <View style={styles.right}>{right}</View>}
  </View>
);

interface HeaderIconButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  badge?: boolean;
  badgeCount?: number;
}

export const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  onPress,
  children,
  badge,
  badgeCount,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
  >
    {children}
    {badgeCount != null && badgeCount > 0 ? (
      <View style={styles.badgeCount}>
        <Text style={styles.badgeCountText}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </Text>
      </View>
    ) : badge ? (
      <View style={styles.badge} />
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.2,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  titleLarge: {
    ...typography.h1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeCount: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 11,
  },
});
