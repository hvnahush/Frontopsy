import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import { PLAN_ORANGE, WHY_BROKEN_ITEMS, WHY_SLOW_ITEMS } from '../../utils/constants'

function ItemRow({ title, body, dotColor }) {
  return (
    <Paper
      sx={{
        border: `2px solid ${INK}`,
        borderRadius: '14px',
        p: 2,
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          mt: 0.5,
          flexShrink: 0,
          width: 12,
          height: 12,
          borderRadius: '999px',
          bgcolor: dotColor,
          border: `2px solid ${INK}`,
        }}
      />
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{title}</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{body}</Typography>
      </Box>
    </Paper>
  )
}

function LookingForCard({ bgcolor, title, items, dotColor }) {
  return (
    <Paper
      sx={{
        bgcolor,
        border: `2px solid ${INK}`,
        borderRadius: '24px',
        p: { xs: 2.5, sm: 3 },
        boxShadow: `8px 8px 0 ${INK}`,
      }}
    >
      <Typography variant="h3" sx={{ fontSize: 20, color: '#fff', mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {items.map((item) => (
          <ItemRow key={item.title} {...item} dotColor={dotColor} />
        ))}
      </Stack>
    </Paper>
  )
}

export default function LookingForSection() {
  return (
    <Box component="section" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.5px', mb: 3.5 }}>
        What we're looking for
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        <LookingForCard bgcolor="primary.main" title="Why it's slow" items={WHY_SLOW_ITEMS} dotColor="secondary.main" />
        <LookingForCard bgcolor={PLAN_ORANGE} title="Why it looks broken" items={WHY_BROKEN_ITEMS} dotColor="warning.main" />
      </Box>
    </Box>
  )
}
