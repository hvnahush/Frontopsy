import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { store } from './app/store'
import { restoreSession } from './features/auth/authSlice'
import { theme } from './theme'
import './index.css'
import App from './App'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

store.dispatch(restoreSession())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GoogleOAuthProvider clientId={googleClientId ?? ''}>
        <Provider store={store}>
          <App />
        </Provider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
