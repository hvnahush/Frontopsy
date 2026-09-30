import { useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import { INK } from '../../theme'
import { LIME } from './reportTheme'

export function Card({ children, sx, shadow = INK }: { children: ReactNode; sx?: SxProps<Theme>; shadow?: string }) {
  return (
    <Paper
      sx={[
        {
          border: `2px solid ${INK}`,
          borderRadius: '22px',
          boxShadow: `6px 6px 0 ${shadow}`,
          p: { xs: 2.5, md: 3 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Paper>
  )
}

export function Tag({ children, bgcolor, sx }: { children: ReactNode; bgcolor: string; sx?: SxProps<Theme> }) {
  return (
    <Box
      component="span"
      sx={[
        {
          display: 'inline-block',
          bgcolor,
          color: INK,
          border: `1.5px solid ${INK}`,
          borderRadius: 999,
          px: 1,
          py: 0.1,
          fontSize: 11.5,
          fontWeight: 700,
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}

export function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
      <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 34 }, letterSpacing: '-1px' }}>
        {title}
      </Typography>
      {note && <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>{note}</Typography>}
    </Box>
  )
}

export function NumberBadge({ value, color, size = 30 }: { value: string | number; color: string; size?: number }) {
  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: 999,
        bgcolor: color,
        border: `2px solid ${INK}`,
        color: INK,
        fontWeight: 700,
        fontSize: size * 0.45,
      }}
    >
      {value}
    </Box>
  )
}

export function CopyButton({ text, label = 'Copy fix' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard access can be blocked; the code is still selectable.
    }
  }
  return (
    <Button
      size="small"
      onClick={copy}
      sx={{ bgcolor: LIME, color: INK, fontSize: 12, py: 0.25, px: 1.25, minWidth: 0, '&:hover': { bgcolor: LIME } }}
    >
      {copied ? 'Copied!' : label}
    </Button>
  )
}
