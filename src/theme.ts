import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  flame: string;
  success: string;
  danger: string;
  track: string;
  shadow: string;
}

const light: Theme = {
  dark: false,
  bg: '#F5F3EE',
  surface: '#FFFFFF',
  surfaceAlt: '#EFECE5',
  text: '#16151A',
  textMuted: '#77737F',
  border: '#E6E2DA',
  accent: '#5B4FE9',
  accentSoft: '#E9E7FD',
  flame: '#FF7A1A',
  success: '#16A34A',
  danger: '#E5484D',
  track: '#ECE9E2',
  shadow: '#2A2140',
};

const dark: Theme = {
  dark: true,
  bg: '#0E0E12',
  surface: '#18181F',
  surfaceAlt: '#22222B',
  text: '#F4F2F8',
  textMuted: '#9A97A6',
  border: '#2A2A34',
  accent: '#8B82FF',
  accentSoft: '#26234A',
  flame: '#FF8A33',
  success: '#34D399',
  danger: '#FF6B6F',
  track: '#2A2A34',
  shadow: '#000000',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.8 },
  title: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.6 },
};

/** Mix a hex color toward white (amount > 0) or black (amount < 0). */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  r = Math.round(r + (target - r) * a);
  g = Math.round(g + (target - g) * a);
  b = Math.round(b + (target - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return hex + a;
}

export function cardShadow(t: Theme) {
  return {
    shadowColor: t.shadow,
    shadowOpacity: t.dark ? 0.4 : 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  };
}
