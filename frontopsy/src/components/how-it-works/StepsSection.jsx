import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { INK } from '../../theme'
import { HOW_IT_WORKS_STEPS } from '../../utils/constants'

function StepCard({ number, color, title, body, chips }) {
  return (
    <Paper
      sx={{
        border: `2px solid ${INK}`,
        borderRadius: '20px',
        p: 3,
        boxShadow: `6px 6px 0 ${INK}`,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 40,
          height: 40,
          borderRadius: '999px',
          bgcolor: color,
          border: `2px solid ${INK}`,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          mb: 2,
        }}
      >
        {number}
      </Box>
      <Typography variant="h3" sx={{ fontSize: 19, mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 14.5, lineHeight: 1.5, color: 'text.secondary', mb: 2 }}>{body}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {chips.map((chip) => (
          <Chip
            key={chip}
            label={chip}
            size="small"
            sx={{ bgcolor: 'background.default', fontWeight: 700, fontSize: 12.5 }}
          />
        ))}
      </Stack>
    </Paper>
  )
}

export default function StepsSection() {
  return (
    <Box component="section" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.5px', mb: 3.5 }}>
        three steps. that's it.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        {HOW_IT_WORKS_STEPS.map((step) => (
          <StepCard key={step.number} {...step} />
        ))}
      </Box>
    </Box>
  )
}
