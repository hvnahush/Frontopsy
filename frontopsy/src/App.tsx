import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { GuestOnly, RequireAuth } from './components/RouteGuards'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import AuthPage from './pages/AuthPage'
import CheckupReport from './pages/CheckupReport'

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
        {/* Public so reports can be shared by link. */}
        <Route path="/checkups/:id" element={<CheckupReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
