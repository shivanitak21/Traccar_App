import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { darkColors, lightColors, ThemeColors, ThemeMode } from './themes';
import { storage } from '../utils/storage';

const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  isDark: true,
  themeMode: 'dark',
  setThemeMode: () => {},
});

function resolveColors(mode: ThemeMode, systemScheme: ColorSchemeName): ThemeColors {
  if (mode === 'light') return lightColors;
  if (mode === 'dark') return darkColors;
  return systemScheme === 'light' ? lightColors : darkColors;
}

function resolveIsDark(mode: ThemeMode, systemScheme: ColorSchemeName): boolean {
  if (mode === 'light') return false;
  if (mode === 'dark') return true;
  return systemScheme !== 'light';
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load persisted theme on mount
  useEffect(() => {
    storage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    }).catch(() => {});
  }, []);

  // Listen for system scheme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const colors = resolveColors(themeMode, systemScheme);
  const isDark = resolveIsDark(themeMode, systemScheme);

  return (
    <ThemeContext value={{ colors, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext>
  );
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
