/**
 * Global color definitions for the nikfoods app
 * Use these constants throughout the app to maintain consistency
 */

export const colors = {
  // Brand colors
  primary: '#B8893B',
  primaryLight: '#D9B26A',
  primaryDark: '#8A6420',

  // UI colors
  background: '#FBF7F0',
  backgroundDark: '#f5f5f5',
  text: '#1F1712',
  textLight: '#5C4F40',
  textDark: '#1F1712',
  categoryCardBg: '#F7F0E3',

  // Feedback colors
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',

  // Border and shadow
  border: '#e0e0e0',
  shadow: 'rgba(0, 0, 0, 0.1)',

  // Misc
  divider: '#eeeeee',
  overlay: 'rgba(0, 0, 0, 0.5)',
}

// Aliases for common use cases
export const brandColors = {
  nikfoods: colors.primary,
  accent: colors.primaryLight,
}

// Export individual colors for direct imports
export const {
  primary,
  primaryLight,
  primaryDark,
  background,
  backgroundDark,
  text,
  textLight,
  textDark,
  success,
  error,
  warning,
  info,
  border,
  shadow,
  divider,
  overlay,
} = colors
