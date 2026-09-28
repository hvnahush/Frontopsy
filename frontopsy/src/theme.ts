import { createTheme } from '@mui/material/styles'

export const INK = '#14121f'

export const theme = createTheme({
  palette: {
    primary: { main: '#4a5df9', contrastText: '#fff' },
    secondary: { main: '#ff2f8b', contrastText: '#14121f' },
    warning: { main: '#ffc93d' },
    success: { main: '#c6ff3d', contrastText: '#14121f' },
    background: { default: '#ece7fb', paper: '#ffffff' },
    text: { primary: '#14121f', secondary: '#5c5867' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '2px solid #14121f',
        },
        outlined: {
          borderColor: '#14121f',
          color: '#14121f',
          '&:hover': { borderColor: '#14121f', background: '#ece7fb' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '& fieldset': { borderColor: '#14121f', borderWidth: 2 },
          '&:hover fieldset': { borderColor: '#14121f' },
          '&.Mui-focused fieldset': { borderColor: '#4a5df9', borderWidth: 2 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { border: '2px solid #14121f', fontWeight: 700 },
      },
    },
  },
})
