import { useWindowDimensions } from 'react-native';

export type SizeClass = 'small' | 'medium' | 'large';

export const useResponsiveSize = (): SizeClass => {
  const { height } = useWindowDimensions();

  if (height <= 667) return 'small';   // iPhone SE/8
  if (height <= 812) return 'medium';  // iPhone X/11 Pro
  return 'large';                      // iPhone 12/13/14/15+
};

export const getMetrics = (sizeClass: SizeClass) => {
  const metrics = {
    small: {
      h1: 24,
      tagline: 13,
      body: 13,
      row: 64,
      btn: 48,
      btnSmall: 44,
      gap: 12,
      pad: 16,
      cardPad: 12,
      maxTaglineWidth: 280
    },
    medium: {
      h1: 26,
      tagline: 14,
      body: 14,
      row: 72,
      btn: 48,
      btnSmall: 44,
      gap: 14,
      pad: 16,
      cardPad: 16,
      maxTaglineWidth: 300
    },
    large: {
      h1: 28,
      tagline: 15,
      body: 15,
      row: 80,
      btn: 52,
      btnSmall: 48,
      gap: 16,
      pad: 20,
      cardPad: 20,
      maxTaglineWidth: 320
    },
  };

  return metrics[sizeClass];
};