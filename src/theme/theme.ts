import { createTheme } from '@mui/material/styles';
import { colors } from './colors';

// Create MUI theme based on the original project colors
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: '#1F1712',
    },
    secondary: {
      main: colors.primaryLight,
      contrastText: '#ffffff',
    },
    error: {
      main: colors.error,
    },
    warning: {
      main: colors.warning,
    },
    info: {
      main: colors.info,
    },
    success: {
      main: colors.success,
    },
    background: {
      default: colors.background,
      paper: '#ffffff',
    },
    text: {
      primary: colors.text,
      secondary: colors.textLight,
    },
    divider: colors.divider,
  },
  typography: {
    fontFamily: 'var(--font-inter)',
    h1: {
      fontFamily: 'var(--font-display), Georgia, serif',
      fontSize: '3rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: 'var(--font-display), Georgia, serif',
      fontSize: '2.25rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: 'var(--font-display), Georgia, serif',
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: 'var(--font-display), Georgia, serif',
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  zIndex: {
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    tooltip: 1500,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          backgroundColor: '#1F1712',
          color: '#F6D58E',
          borderRadius: 999,
          letterSpacing: '0.02em',
          transition: 'background-color 0.2s ease, transform 0.15s ease',
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: '#3A2A14',
          },
          '&:active': { transform: 'scale(0.98)' },
          '&.Mui-disabled': { backgroundColor: '#E6DED1', color: '#9A8F80' },
        },
        outlined: {
          borderRadius: 999,
          borderColor: 'rgba(184, 137, 59, 0.6)',
          color: '#1F1712',
          '&:hover': { borderColor: '#B8893B', backgroundColor: '#F7F0E3' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0 1px 2px rgba(60, 35, 10, 0.05), 0 14px 28px -14px rgba(60, 35, 10, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});
