import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 68;
export const TAB_BAR_MARGIN = Platform.OS === 'ios' ? 24 : 16;

/** Space to reserve above the floating tab bar for bottom overlays. */
export function useTabBarBottomInset(extra = 8): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_MARGIN + TAB_BAR_HEIGHT + Math.max(insets.bottom, 0) + extra;
}
