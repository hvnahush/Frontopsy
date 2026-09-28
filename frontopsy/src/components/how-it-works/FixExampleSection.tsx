import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { INK } from '../../theme'
import { FIX_EXAMPLE, type FixExampleView } from '../../utils/constants'

function PhonePreview({ broken }: { broken: boolean }) {
  return (
    <Box
      sx={{
        width: 190,
        flexShrink: 0,
        border: `2px solid ${INK}`,
        borderRadius: '22px',
        p: 1,
        bgcolor: '#fff',
        mx: { xs: 'auto', md: 0 },
      }}
    >
      <Box
        sx={{
          border: `2px solid ${INK}`,
          borderRadius: '14px',
          overflow: 'hidden',
          position: 'relative',
          height: 220,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: broken ? -30 : 0,
            width: broken ? 260 : '100%',
            bgcolor: 'primary.main',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            px: 1,
            py: 0.75,
            display: 'flex',
            gap: 1,
          }}
        >
          <span>Handmade</span>
          <span style={{ marginLeft: 'auto' }}>Contact</span>
          <span>Blog</span>
        </Box>
        <Box sx={{ pt: broken ? 4.5 : 3.5, px: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>
            candles for cozy nights
          </Typography>
          <Box sx={{ bgcolor: 'warning.main', border: `2px solid ${INK}`, borderRadius: '8px', height: 60, mt: 1 }} />
          <Box sx={{ mt: 1, height: 6, bgcolor: '#e3ddfb', borderRadius: 4 }} />
          <Box sx={{ mt: 0.75, height: 6, width: '70%', bgcolor: '#e3ddfb', borderRadius: 4 }} />
        </Box>
      </Box>
      <Chip
        label={broken ? 'nav on top of headline + sideways scroll' : 'nav wraps cleanly, no overflow'}
        size="small"
        sx={{
          mt: 1,
          bgcolor: broken ? 'secondary.main' : 'success.main',
          fontWeight: 700,
          fontSize: 10.5,
          height: 'auto',
          '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5, textAlign: 'center' },
        }}
      />
    </Box>
  )
}

export default function FixExampleSection() {
  const [state, setState] = useState<FixExampleView>('before')
  const data = FIX_EXAMPLE[state]

  return (
    <Box component="section" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 5, md: 7 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1 }}
      >
        <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 32 }, letterSpacing: '-0.5px' }}>
          see one fix, start to finish
        </Typography>
        <ToggleButtonGroup
          value={state}
          exclusive
          onChange={(_e, next: FixExampleView | null) => next && setState(next)}
          sx={{
            bgcolor: '#fff',
            border: `2px solid ${INK}`,
            borderRadius: 999,
            p: 0.5,
            alignSelf: { xs: 'flex-start', sm: 'auto' },
            '& .MuiToggleButtonGroup-grouped': {
              border: 0,
              borderRadius: '999px !important',
              fontWeight: 700,
              color: INK,
              px: 2,
              py: 0.5,
            },
            '& .Mui-selected': { bgcolor: `${INK} !important`, color: '#fff !important' },
          }}
        >
          <ToggleButton value="before">Before</ToggleButton>
          <ToggleButton value="after">After</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Typography sx={{ color: 'text.secondary', mb: 3 }}>An example finding. Flip between before and after.</Typography>

      <Paper
        sx={{
          border: `2px solid ${INK}`,
          borderRadius: '28px',
          p: { xs: 2.5, sm: 4 },
          boxShadow: `10px 10px 0 ${INK}`,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        <PhonePreview broken={state === 'before'} />

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              {data.chips.map((chip) => (
                <Chip
                  key={chip}
                  label={chip}
                  size="small"
                  sx={{
                    bgcolor: state === 'before' ? 'secondary.main' : 'success.main',
                    fontWeight: 700,
                  }}
                />
              ))}
            </Stack>
            <Typography variant="h3" sx={{ fontSize: 21, mb: 1 }}>
              {data.title}
            </Typography>
            <Typography sx={{ fontSize: 14.5, lineHeight: 1.5, color: 'text.secondary', mb: 2 }}>
              {data.body}
            </Typography>
            <Box sx={{ bgcolor: INK, borderRadius: '10px', px: 2, py: 1.5, mb: 2.5 }}>
              <Typography
                component="pre"
                sx={{ color: '#d7ffb8', fontFamily: 'ui-monospace, monospace', fontSize: 12.5, m: 0, whiteSpace: 'pre-wrap' }}
              >
                {data.code}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '999px',
                  bgcolor: 'secondary.main',
                  border: `2px solid ${INK}`,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {data.score}
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{data.scoreLabel}</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{data.scoreNote}</Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
