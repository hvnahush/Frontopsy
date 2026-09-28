import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Dashboard from '../components/Dashboard'
import Logo from '../components/Logo'
import LoginPromptDialog from '../components/LoginPromptDialog'
import { INK } from '../theme'
import { PLAN_ORANGE, SYMPTOMS } from '../utils/constants'

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ marginLeft: 6 }}>
      <path d="M2.5 7.2 5.5 10 11.5 3.5" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoCard({ bgcolor, textColor = INK, title, body, onClick }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        bgcolor,
        color: textColor,
        border: `2px solid ${INK}`,
        borderRadius: '20px',
        p: 3,
        cursor: 'pointer',
        boxShadow: `6px 6px 0 ${INK}`,
      }}
    >
      <Typography variant="h3" sx={{ fontSize: 19, mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 14.5, lineHeight: 1.5, opacity: 0.9 }}>{body}</Typography>
    </Paper>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [promptOpen, setPromptOpen] = useState(false)

  const requireAuth = () => setPromptOpen(true)
  const goToLogin = () => navigate('/login')
  const checkedCount = SYMPTOMS.filter((s) => s.checked).length

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
            onClick={() => navigate('/how-it-works')}
            underline="always"
            sx={{ fontWeight: 700, fontSize: 14.5, color: INK }}
          >
            how it works
          </Link>
          <Button variant="outlined" onClick={requireAuth} sx={{ borderRadius: 999, px: 2.5 }}>
            past checkups
          </Button>
          <Button variant="contained" onClick={goToLogin} sx={{ borderRadius: 999, px: 3 }}>
            Log in
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 5, md: 7 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
          gap: { xs: 7, md: 6 },
          alignItems: 'start',
        }}
      >
        <Box component="section" sx={{ position: 'relative' }}>
          <Chip
            label="free, no signup"
            sx={{
              position: 'absolute',
              top: -34,
              right: { xs: 'auto', md: 60 },
              bgcolor: 'success.main',
              transform: 'rotate(-4deg)',
              fontWeight: 700,
            }}
          />

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 40, sm: 52, md: 60 },
              lineHeight: 1.02,
              letterSpacing: '-1.5px',
              mb: 2,
            }}
          >
            is your site slow, broken, or both?
          </Typography>

          <Typography sx={{ maxWidth: '52ch', fontSize: 17, lineHeight: 1.5, color: 'text.secondary', mb: 4 }}>
            Drop it in. We'll find out why it drags and why it looks cursed, then hand you the exact fixes. No
            gatekeeping.
          </Typography>

          <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 1.5 }}>
            What's going on? Pick all that apply
          </Typography>

          <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', gap: 1.25 }}>
            {SYMPTOMS.map((symptom) => (
              <Chip
                key={symptom.key}
                label={symptom.label}
                onClick={requireAuth}
                icon={symptom.checked ? <CheckMark /> : undefined}
                sx={{
                  bgcolor: symptom.checked ? 'secondary.main' : '#fff',
                  color: INK,
                  fontWeight: 700,
                  px: 0.5,
                  cursor: 'pointer',
                }}
              />
            ))}
          </Stack>
        </Box>

        <Dashboard onRequireAuth={requireAuth} checkedCount={checkedCount} />
      </Box>

      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          pb: { xs: 6, md: 9 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <InfoCard
          bgcolor="warning.main"
          title="Why it's slow"
          body="Blocking scripts, chonky images, bloated bundles, fonts that ghost you."
          onClick={requireAuth}
        />
        <InfoCard
          bgcolor="success.main"
          title="Why it looks broken"
          body="Overlaps, sideways scroll, layout jumps, stuff that only breaks on phones."
          onClick={requireAuth}
        />
        <InfoCard
          bgcolor={PLAN_ORANGE}
          textColor="#fff"
          title="The glow-up plan"
          body="Every fix with copy-paste code, ranked by what helps most."
          onClick={requireAuth}
        />
      </Box>

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
}
