import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './components/RouteGuards'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import AuthPage from './pages/AuthPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <GuestOnly>
              <HowItWorks />
            </GuestOnly>
          }
        />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <AuthPage />
            </GuestOnly>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
