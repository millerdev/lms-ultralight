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
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        color: 'inherit',
        disableElevation: true,
      },
      styleOverrides: {
        containedInherit: ({ theme }) => {
          const dark = theme.palette.mode === 'dark'
          const bgActive = dark ? theme.palette.grey[500] : theme.palette.grey[500]
          return {
            '&:active': { backgroundColor: bgActive },
          }
        },
      },
    },
    MuiButtonGroup: {
      defaultProps: {
        variant: 'contained',
        color: 'inherit',
        disableElevation: true,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorDefault: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => {
          const dark = theme.palette.mode === 'dark'
          const bg = dark ? theme.palette.grey[700] : theme.palette.grey[300]
          const bgHover = dark ? theme.palette.grey[600] : theme.palette.grey[400]
          const bgActive = theme.palette.grey[500]
          return {
            borderRadius: theme.shape.borderRadius,
            backgroundColor: bg,
            '&:hover': { backgroundColor: bgHover },
            '&:active': { backgroundColor: bgActive },
            '&.Mui-disabled': { backgroundColor: bg },
            '.MuiToolbar-root &': {
              borderRadius: 0,
              backgroundColor: 'transparent',
              alignSelf: 'stretch',
              '&:hover': { backgroundColor: theme.palette.action.hover },
              '&:active': { backgroundColor: theme.palette.action.selected },
              '&.Mui-disabled': { backgroundColor: 'transparent' },
            },
          }
        },
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
