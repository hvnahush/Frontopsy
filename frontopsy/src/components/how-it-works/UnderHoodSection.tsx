import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import { UNDER_HOOD_ITEMS, type UnderHoodItem } from '../../utils/constants'

function HoodCard({ eyebrow, title, body, accent }: UnderHoodItem) {
  return (
    <Paper
      sx={{
        bgcolor: INK,
        color: '#fff',
        border: `2px solid ${INK}`,
        borderRadius: '20px',
        p: 3,
        borderTop: `6px solid`,
        borderTopColor: accent,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: accent, mb: 1.5, letterSpacing: '0.4px' }}>
        {eyebrow}
      </Typography>
      <Typography variant="h3" sx={{ fontSize: 19, color: '#fff', mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>{body}</Typography>
    </Paper>
  )
}

export default function UnderHoodSection() {
  return (
    <Box component="section" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.5px', mb: 0.5 }}>
        Under the hood
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3.5 }}>For the devs who want receipts.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {UNDER_HOOD_ITEMS.map((item) => (
          <HoodCard key={item.title} {...item} />
        ))}
      </Box>
    </Box>
  )
}
