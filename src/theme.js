import { createTheme } from '@mui/material/styles'

// Must match the minHeight of a dense Toolbar (MUI default: 48px).
export const TOOLBAR_HEIGHT = '48px'

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
        root: ({ theme }) => {
          const dark = theme.palette.mode === 'dark'
          const bgHover = dark ? theme.palette.grey[600] : theme.palette.grey[400]
          return {
          '&.MuiButton-colorInherit.MuiButton-contained': {
            '@media (hover: hover)': {
              '&:hover': { '--variant-containedBg': bgHover },
            },
          },
          '&.MuiButton-contained:active': {
            backgroundColor: theme.palette.grey[500],
          },
          '.MuiMenu-list &': {
            border: 'none',
            '--variant-containedBg': 'transparent',
            '@media (hover: hover)': {
              '&:hover': { '--variant-containedBg': theme.palette.action.hover },
              '&.MuiButton-colorInherit.MuiButton-contained:hover': { '--variant-containedBg': theme.palette.action.hover },
            },
            '&:active': { '--variant-containedBg': theme.palette.action.selected },
          },
        }},
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

const progressBar = {
  base: '#96dbfa',
  songTime: 'linear-gradient(to left, #74e3ec, #c7ffe2)',
  volumeLevel: 'linear-gradient(to left, #ff6e56, #fffd86)',
}

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#4183C4' },
    progressBar,
  },
})

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#4183C4' },
    progressBar,
  },
})
