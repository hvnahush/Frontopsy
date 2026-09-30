import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { INK } from '../theme'
import { FEEDBACK_MAILTO, SUPPORT_EMAIL, SUPPORT_MAILTO } from '../utils/constants'

/** Contact and feedback strip shown at the bottom of the main pages. */
export default function SiteFooter() {
  return (
    <Box component="footer" className="no-print" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, pb: 5 }}>
      <Box
        sx={{
          bgcolor: '#fff',
          border: `2px solid ${INK}`,
          borderRadius: '20px',
          boxShadow: `5px 5px 0 ${INK}`,
          p: { xs: 2.5, md: 3 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2.5,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, mb: 0.5 }}>
            Need a hand? Feedback welcome.
          </Typography>
          <Typography sx={{ fontSize: 14.5, color: 'text.secondary', lineHeight: 1.5 }}>
            Stuck, found a bug, or have an idea? Email{' '}
            <Link href={SUPPORT_MAILTO} sx={{ fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>
              {SUPPORT_EMAIL}
            </Link>
            . We read every message.
          </Typography>
        </Box>
        <Button
          variant="contained"
          href={FEEDBACK_MAILTO}
          sx={{ bgcolor: 'success.main', color: INK, borderRadius: 999, px: 2.5, boxShadow: `3px 3px 0 ${INK}`, flexShrink: 0, '&:hover': { bgcolor: 'success.main' } }}
        >
          Send feedback
        </Button>
      </Box>
    </Box>
  )
}
