import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import { PRIVACY_ITEMS } from '../../utils/constants'

function PrivacyCard({ title, body }) {
  return (
    <Paper
      sx={{
        border: `2px solid ${INK}`,
        borderRadius: '16px',
        p: 2.25,
        bgcolor: '#fff',
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14.5, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.45 }}>{body}</Typography>
    </Paper>
  )
}

export default function PrivacySection() {
  return (
    <Box component="section" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Paper
        sx={{
          bgcolor: 'success.main',
          border: `2px solid ${INK}`,
          borderRadius: '28px',
          p: { xs: 3, sm: 4 },
          boxShadow: `10px 10px 0 ${INK}`,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' },
          gap: { xs: 3, md: 4 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 30 }, letterSpacing: '-0.5px', mb: 1 }}>
            Your code stays yours
          </Typography>
          <Typography sx={{ fontSize: 14.5, lineHeight: 1.5 }}>
            You're trusting us with real work. Here's the deal.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          {PRIVACY_ITEMS.map((item) => (
            <PrivacyCard key={item.title} {...item} />
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
