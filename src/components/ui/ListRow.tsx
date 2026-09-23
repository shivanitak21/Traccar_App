import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
  grouped?: boolean;
  divider?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron = !!onPress,
  danger,
  grouped = false,
  divider = false,
  style,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const rowStyle = [
    grouped ? styles.groupedRow : styles.row,
    divider && styles.divider,
    style,
  ];

  const content = (
    <>
      {left ? <View style={grouped ? styles.leftPlain : styles.left}>{left}</View> : null}
      <View style={styles.textBlock}>
        <Text style={[styles.title, danger && { color: colors.error }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {showChevron ? (
        <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    groupedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
      backgroundColor: 'transparent',
    },
    divider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
    },
    pressed: {
      opacity: 0.75,
      backgroundColor: colors.surfaceElevated,
    },
    leftPlain: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    left: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    title: {
      ...typography.bodyMd,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.text.tertiary,
    },
    right: {
      marginLeft: spacing.xs,
      flexShrink: 1,
      maxWidth: '50%',
    },
  });
