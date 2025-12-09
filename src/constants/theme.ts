import { Platform } from 'react-native';

// Buddi brand colors
export const buddiColors = {
  // Brand
  primary: '#F97316',        // orange-500
  primaryDark: '#EA580C',    // orange-600
  primaryLight: '#FDBA74',   // orange-300
  primaryMuted: '#FFF7ED',   // orange-50

  // Neutral surfaces
  background: '#FAFAFA',     // zinc-50
  surface: '#FFFFFF',        // white cards/nav
  surfaceMuted: '#F4F4F5',   // zinc-100
  surfaceBorder: '#E4E4E7', // zinc-200

  // Typography
  textPrimary: '#18181B',    // zinc-900
  textSecondary: '#52525B',  // zinc-600
  textTertiary: '#71717A',   // zinc-500
  textOnDark: '#FFFFFF',

  // Status & feedback
  successBackground: '#DCFCE7', // green-100
  successText: '#166534',       // green-700/800
  warningBackground: '#FEF3C7', // amber-100
  warningText: '#B45309',       // amber-700
  dangerBackground: '#FEE2E2',  // red-100
  dangerText: '#B91C1C',        // red-700

  // Special accents
  accentGradientStart: 'rgba(251, 146, 60, 0.8)', // orange-400/80
  accentGradientEnd: 'rgba(249, 115, 22, 0.8)',   // orange-500/80
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  overlayHeavy: 'rgba(0, 0, 0, 0.4)',

  // Misc
  badgeHighlight: '#22C55E', // used for active indicators
  star: '#FACC15',           // amber-400 for ratings
};

const tintColorLight = buddiColors.primary;
const tintColorDark = buddiColors.primaryLight;

export const Colors = {
  light: {
    text: buddiColors.textPrimary,
    background: buddiColors.background,
    tint: tintColorLight,
    icon: buddiColors.textSecondary,
    tabIconDefault: buddiColors.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
