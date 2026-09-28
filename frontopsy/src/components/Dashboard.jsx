import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { INK } from '../theme'
import { CHECKUP_TABS, STEP_ORANGE } from '../utils/constants'

function LinkPanel({ onRequireAuth }) {
  return (
    <Box>
      <Typography sx={labelSx}>Your site's link</Typography>
      <TextField
        fullWidth
        placeholder="https://yourwebsite.com"
        onClick={onRequireAuth}
        onFocus={onRequireAuth}
        slotProps={{ htmlInput: { readOnly: true } }}
        sx={{ mb: 1 }}
      />
      <Typography sx={helperSx}>
        We load it on a real phone and a real laptop, time every request, and screenshot both.
      </Typography>
    </Box>
  )
}

function PasteCodePanel({ onRequireAuth }) {
  return (
    <Box>
      <Typography sx={labelSx}>Paste your HTML / CSS</Typography>
      <TextField
        fullWidth
        multiline
        minRows={4}
        placeholder="<html>...</html>"
        onClick={onRequireAuth}
        onFocus={onRequireAuth}
        slotProps={{ htmlInput: { readOnly: true } }}
        sx={{ mb: 1 }}
      />
      <Typography sx={helperSx}>We render it in a sandboxed page and run the same checks.</Typography>
    </Box>
  )
}

function ScreenshotPanel({ onRequireAuth }) {
  return (
    <Box>
      <Typography sx={labelSx}>Upload a screenshot</Typography>
      <Box
        onClick={onRequireAuth}
        sx={{
          border: `2px dashed ${INK}`,
          borderRadius: '12px',
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 1,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>Click to upload a PNG or JPG</Typography>
      </Box>
      <Typography sx={helperSx}>We'll eyeball it for overlaps, spacing, and broken layout.</Typography>
    </Box>
  )
}

const TAB_PANELS = {
  Link: LinkPanel,
  'Paste code': PasteCodePanel,
  Screenshot: ScreenshotPanel,
}

export default function Dashboard({ onRequireAuth, checkedCount }) {
  const [tab, setTab] = useState('Link')
  const TabPanel = TAB_PANELS[tab]

  return (
    <Box component="section" sx={{ position: 'relative', justifySelf: 'center', width: '100%', maxWidth: 460 }}>
      <Box
        sx={{
          position: 'absolute',
          top: -34,
          left: -8,
          zIndex: 2,
          width: 76,
          height: 76,
          borderRadius: '999px',
          bgcolor: STEP_ORANGE,
          border: `2px solid ${INK}`,
          color: INK,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1.1,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        step<br />one
      </Box>

      <Paper
        sx={{
          position: 'relative',
          border: `2px solid ${INK}`,
          borderRadius: '28px',
          p: { xs: 3, sm: 4 },
          pt: 5,
          boxShadow: `10px 10px 0 ${INK}`,
        }}
      >
        <Typography variant="h2" sx={{ fontSize: 24, letterSpacing: '-0.3px', mb: 2.5 }}>
          Show us the patient
        </Typography>

        <Stack
          direction="row"
          sx={{
            bgcolor: 'background.default',
            border: `2px solid ${INK}`,
            borderRadius: 999,
            p: 0.5,
            mb: 2.5,
          }}
        >
          {CHECKUP_TABS.map((label) => (
            <Box
              key={label}
              component="button"
              onClick={() => setTab(label)}
              sx={{
                flex: 1,
                border: 0,
                borderRadius: 999,
                py: 1,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: tab === label ? INK : 'transparent',
                color: tab === label ? '#fff' : INK,
              }}
            >
              {label}
            </Box>
          ))}
        </Stack>

        <TabPanel onRequireAuth={onRequireAuth} />

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onRequireAuth}
          sx={{ py: 1.5, fontSize: 16, mt: 3 }}
        >
          Run the vibe check
        </Button>

        <Typography sx={{ textAlign: 'center', fontSize: 12.5, color: 'text.secondary', mt: 2 }}>
          {checkedCount} symptoms picked. Takes about 30 seconds.
        </Typography>
      </Paper>
    </Box>
  )
}

const labelSx = { fontSize: 13, fontWeight: 700, mb: 1 }
const helperSx = { fontSize: 12.5, color: 'text.secondary', mb: 3 }
