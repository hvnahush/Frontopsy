import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { INK } from '../theme'

const LogoMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 3v6a5 5 0 0 0 10 0V3" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    <circle cx="18" cy="15" r="3" stroke={INK} strokeWidth="2" />
    <path d="M11 14v-1" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export default function Logo() {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        bgcolor: 'secondary.main',
        border: `2px solid ${INK}`,
        borderRadius: 999,
        pl: 0.5,
        pr: 2.5,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 30,
          height: 30,
          bgcolor: '#fff',
          border: `2px solid ${INK}`,
          borderRadius: 999,
        }}
      >
        <LogoMark />
      </Box>
      <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>
        frontopsy
      </Typography>
    </Box>
  )
}
