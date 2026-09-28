import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import { INK } from '../../theme'
import { PLAN_ORANGE, FAQ_ITEMS, type FaqItem } from '../../utils/constants'

function ToggleIcon({ open }: { open: boolean }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        width: 30,
        height: 30,
        borderRadius: '999px',
        border: `2px solid ${INK}`,
        bgcolor: open ? PLAN_ORANGE : '#fff',
        color: open ? '#fff' : INK,
        fontWeight: 700,
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      {open ? '×' : '+'}
    </Box>
  )
}

interface FaqRowProps extends FaqItem {
  open: boolean
  onToggle: () => void
}

function FaqRow({ question, answer, open, onToggle }: FaqRowProps) {
  return (
    <Paper
      onClick={onToggle}
      sx={{
        border: `2px solid ${INK}`,
        borderRadius: '16px',
        px: 2.5,
        py: 2,
        cursor: 'pointer',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15.5 }}>{question}</Typography>
        <ToggleIcon open={open} />
      </Stack>
      <Collapse in={open}>
        <Typography sx={{ fontSize: 14, lineHeight: 1.55, color: 'text.secondary', mt: 1.5 }}>{answer}</Typography>
      </Collapse>
    </Paper>
  )
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <Box component="section" sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.5px', mb: 3.5 }}>
        Questions? we got you
      </Typography>
      <Stack spacing={2}>
        {FAQ_ITEMS.map((item, index) => (
          <FaqRow
            key={item.question}
            {...item}
            open={openIndex === index}
            onToggle={() => setOpenIndex((current) => (current === index ? -1 : index))}
          />
        ))}
      </Stack>
    </Box>
  )
}
