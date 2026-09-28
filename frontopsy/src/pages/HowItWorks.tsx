import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import { useAppSelector } from '../app/hooks'
import FaqSection from '../components/how-it-works/FaqSection'
import FixExampleSection from '../components/how-it-works/FixExampleSection'
import LookingForSection from '../components/how-it-works/LookingForSection'
import PrivacySection from '../components/how-it-works/PrivacySection'
import StepsSection from '../components/how-it-works/StepsSection'
import UnderHoodSection from '../components/how-it-works/UnderHoodSection'
import Logo from '../components/Logo'
import LoginPromptDialog from '../components/LoginPromptDialog'
import UserMenu from '../components/UserMenu'
import { INK } from '../theme'
import { STEP_ORANGE } from '../utils/constants'

export default function HowItWorks() {
  const navigate = useNavigate()
  const { user, sessionChecked } = useAppSelector((state) => state.auth)
  const [promptOpen, setPromptOpen] = useState(false)

  const goToLogin = () => navigate('/login')
  const startCheckup = () => (user ? navigate('/dashboard') : setPromptOpen(true))

  return (
    <Box sx={pageBgSx}>
      <Box
        component="header"
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          pt: { xs: 3, md: 4 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Logo />

        <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
          <Link
            component="button"
            onClick={() => navigate(user ? '/how-it-works' : '/')}
            underline="always"
            sx={{ fontWeight: 700, fontSize: 14.5, color: INK }}
          >
            How it works
          </Link>
          {user ? (
            <>
              <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ borderRadius: 999, px: 2.5 }}>
                Dashboard
              </Button>
              <UserMenu />
            </>
          ) : (
            sessionChecked && (
              <>
                <Button variant="outlined" onClick={goToLogin} sx={{ borderRadius: 999, px: 2.5 }}>
                  Log in
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/login?mode=signup')}
                  sx={{ borderRadius: 999, px: 3, bgcolor: INK, '&:hover': { bgcolor: INK, filter: 'brightness(1.15)' } }}
                >
                  Sign up free
                </Button>
              </>
            )
          )}
        </Stack>
      </Box>

      <Box
        component="section"
        sx={{
          maxWidth: 900,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          pt: { xs: 6, md: 8 },
          pb: { xs: 4, md: 5 },
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Chip
          label="no cap"
          sx={{
            position: 'absolute',
            top: { xs: 24, md: 40 },
            left: { xs: 4, md: 30 },
            bgcolor: 'success.main',
            transform: 'rotate(-4deg)',
            fontWeight: 700,
          }}
        />

        <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: { xs: '100%', sm: 480, md: 600 } }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 34, sm: 44, md: 52 },
              lineHeight: 1.08,
              letterSpacing: '-1.2px',
            }}
          >
            We autopsy your frontend so you don't have to.
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              top: { xs: -14, md: -22 },
              right: { xs: -6, md: -20 },
              width: 78,
              height: 78,
              borderRadius: '999px',
              bgcolor: STEP_ORANGE,
              border: `2px solid ${INK}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: 1.1,
              fontSize: 11.5,
              fontWeight: 700,
              transform: 'rotate(8deg)',
            }}
          >
            ~30 sec<br />checkup
          </Box>
        </Box>

        <Typography sx={{ maxWidth: '56ch', mx: 'auto', fontSize: 16, lineHeight: 1.55, color: 'text.secondary', mt: 3, mb: 4 }}>
          Here's exactly what happens between you dropping in a link and getting a list of fixes. No black box, no
          vibes-based guessing.
        </Typography>

        <Button variant="contained" size="large" onClick={startCheckup} sx={{ px: 4, py: 1.4, fontSize: 16 }}>
          Run my first checkup
        </Button>
      </Box>

      <StepsSection />
      <LookingForSection />
      <FixExampleSection />
      <UnderHoodSection />
      <PrivacySection />
      <FaqSection />

      <LoginPromptDialog open={promptOpen} onClose={() => setPromptOpen(false)} onLogin={goToLogin} />
    </Box>
  )
}

const pageBgSx = {
  position: 'relative',
  minHeight: '100vh',
  bgcolor: 'background.default',
  backgroundImage: 'radial-gradient(rgba(20, 18, 31, 0.14) 1.4px, transparent 1.4px)',
  backgroundSize: '22px 22px',
  overflowX: 'hidden',
  pb: 6,
}
