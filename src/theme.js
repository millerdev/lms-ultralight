import { createTheme } from '@mui/material/styles'

const shared = {
  typography: {
    fontFamily: '"Helvetica Neue", Arial, Helvetica, sans-serif',
    fontSize: 14,
    button: { textTransform: 'none' },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.rc-slider-tooltip': { zIndex: 200 },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        color: 'inherit',
        disableElevation: true,
      },
    },
    MuiButtonGroup: {
      defaultProps: {
        variant: 'contained',
        color: 'inherit',
        disableElevation: true,
      },
    },
  },
}

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#4183C4' },
  },
})

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#4183C4' },
  },
})
