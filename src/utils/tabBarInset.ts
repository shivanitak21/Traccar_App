import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Must stay in sync with `app/(tabs)/_layout.tsx`. */
export const TAB_BAR_HEIGHT = 62;
export const TAB_BAR_FLOAT_GAP = 12;
export const TAB_BAR_SIDE_INSET = 16;

/** Space to reserve above the floating tab bar for scroll content / overlays. */
export function useTabBarBottomInset(extra = 8): number {
  const insets = useSafeAreaInsets();
  const bottomPad =
    Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : Math.max(insets.bottom, 0);
  return TAB_BAR_FLOAT_GAP + TAB_BAR_HEIGHT + bottomPad + extra;
}
