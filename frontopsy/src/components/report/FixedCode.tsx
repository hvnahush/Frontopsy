import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import { CopyButton, SectionTitle } from './reportUi'
import { MONO, PINK } from './reportTheme'

const COLLAPSED_HEIGHT = 380

export default function FixedCode({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = code.split('\n').length
  const long = lines > 22

  return (
    <Box component="section">
      <SectionTitle title="the fixed code" note="Your code with every fix applied. Review it before you ship it." />
      <Box
        sx={{
          position: 'relative',
          bgcolor: INK,
          color: '#e9e6f5',
          border: `2px solid ${INK}`,
          borderRadius: '22px',
          boxShadow: `8px 8px 0 ${PINK}`,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2.5,
            py: 1.5,
            borderBottom: '1.5px solid rgba(255,255,255,.15)',
          }}
        >
          <Typography sx={{ fontFamily: MONO, fontSize: 12.5, opacity: 0.75 }}>{lines} lines</Typography>
          <CopyButton text={code} label="Copy all" />
        </Box>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2.5,
            fontFamily: MONO,
            fontSize: 12.5,
            lineHeight: 1.6,
            overflow: 'auto',
            maxHeight: long && !expanded ? COLLAPSED_HEIGHT : 'none',
          }}
        >
          {code}
        </Box>
        {long && (
          <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1.5px solid rgba(255,255,255,.15)' }}>
            <Button onClick={() => setExpanded((v) => !v)} sx={{ color: '#fff', border: 0, fontSize: 13 }}>
              {expanded ? 'Show less' : `Show all ${lines} lines`}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
