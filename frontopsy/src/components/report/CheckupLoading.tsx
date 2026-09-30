import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/material/styles'
import type { Checkup } from '../../features/checkups/types'
import { INK } from '../../theme'
import { Card } from './reportUi'
import { BLUE, LIME, MONO, PINK, YELLOW } from './reportTheme'

// Matches the stage names the server reports, with roughly where each one ends on
// the progress bar. Lighthouse's timing pass is by far the longest step.
const URL_STAGES = [
  { name: 'Opening your site', until: 8 },
  { name: 'Timing every request', until: 58 },
  { name: 'Checking it on a phone', until: 78 },
  { name: 'Checking it on a laptop', until: 92 },
  { name: 'Writing up the diagnosis', until: 99 },
]

// For pasted code the AI step dominates, and rendering is quick.
const CODE_STAGES = [
  { name: 'Rendering your code', until: 4 },
  { name: 'Checking it on a phone', until: 10 },
  { name: 'Checking it on a laptop', until: 16 },
  { name: 'Asking the AI doctor', until: 94 },
  { name: 'Writing up the diagnosis', until: 99 },
]

const SCREENSHOT_STAGES = [
  { name: 'Reading your screenshot', until: 6 },
  { name: 'Asking the AI doctor', until: 94 },
  { name: 'Writing up the diagnosis', until: 99 },
]

const SCREENSHOT_TIPS = [
  'Looking for things that overlap…',
  'Checking for text that’s cut off…',
  'Eyeballing the spacing and alignment…',
  'Spotting anything too small to read or tap…',
  'Writing up the fixes…',
]

const CODE_TIPS = [
  'Reading your code line by line…',
  'Tracing why the layout breaks on a phone…',
  'Looking for scripts that block the page…',
  'Checking for JavaScript that will crash…',
  'Writing copy-paste fixes…',
  'Putting your fixed code together…',
]

const URL_TIPS = [
  'Weighing every image and script…',
  'Counting how long the page ignores taps…',
  'Hunting for stuff that scrolls sideways…',
  'Checking whether anything sits on top of your text…',
  'Measuring when the main thing shows up…',
  'Looking for text too tiny to read on a phone…',
  'Squinting at your layout on a small screen…',
]

const scan = keyframes`
  0%   { top: 6%; }
  50%  { top: 88%; }
  100% { top: 6%; }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.45; }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

function ScanningPhone() {
  const block = (width: string, height: number, color: string, delay: number) => (
    <Box
      sx={{
        width,
        height,
        bgcolor: color,
        border: `1.5px solid ${INK}`,
        borderRadius: '6px',
        animation: `${pulse} 1.6s ease-in-out ${delay}s infinite`,
      }}
    />
  )
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: 150,
        height: 280,
        flexShrink: 0,
        mx: 'auto',
        bgcolor: INK,
        borderRadius: '30px',
        p: 1,
        boxShadow: `6px 6px 0 ${PINK}`,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          bgcolor: '#fff',
          borderRadius: '22px',
          overflow: 'hidden',
          p: 1.5,
          pt: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {block('100%', 14, BLUE, 0)}
        {block('80%', 12, '#e3dcfa', 0.15)}
        {block('60%', 12, '#e3dcfa', 0.3)}
        {block('100%', 70, YELLOW, 0.45)}
        {block('100%', 16, '#ff9a3d', 0.6)}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {block('50%', 48, '#e3dcfa', 0.75)}
          {block('50%', 48, '#e3dcfa', 0.9)}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 3,
            bgcolor: PINK,
            boxShadow: `0 0 14px 4px rgba(255, 47, 139, 0.45)`,
            animation: `${scan} 2.6s ease-in-out infinite`,
          }}
        />
      </Box>
    </Box>
  )
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function CheckupLoading({ checkup }: { checkup: Checkup }) {
  const STAGES = { url: URL_STAGES, code: CODE_STAGES, screenshot: SCREENSHOT_STAGES }[checkup.source]
  const TIPS = { url: URL_TIPS, code: CODE_TIPS, screenshot: SCREENSHOT_TIPS }[checkup.source]
  const [now, setNow] = useState(() => Date.now())
  const stageIndex = STAGES.findIndex((stage) => stage.name === checkup.stage)
  const [stageSince, setStageSince] = useState({ index: stageIndex, at: now })

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

  // Remember when each stage started, so the bar can creep forward within it.
  if (stageSince.index !== stageIndex) setStageSince({ index: stageIndex, at: now })

  const queued = checkup.status === 'queued' || stageIndex === -1
  const elapsed = Math.max(0, Math.floor((now - new Date(checkup.createdAt).getTime()) / 1000))
  const start = stageIndex > 0 ? STAGES[stageIndex - 1]!.until : 0
  const end = stageIndex >= 0 ? STAGES[stageIndex]!.until : 3
  // Eases toward the end of the current stage but never reaches it until the server moves on.
  // The AI step runs much longer than the others, so it fills more slowly.
  const easeSeconds = checkup.stage === 'Asking the AI doctor' ? 22 : 7
  const inStage = 1 - Math.exp(-(now - stageSince.at) / 1000 / easeSeconds)
  const percent = Math.round(start + (end - start) * 0.9 * inStage)
  const tip = TIPS[Math.floor(elapsed / 4) % TIPS.length]

  return (
    <Card sx={{ maxWidth: 780, mx: 'auto', mt: { xs: 3, md: 6 }, p: { xs: 3, md: 4.5 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
          gap: { xs: 3, sm: 5 },
          alignItems: 'center',
        }}
      >
        <ScanningPhone />

        <Box sx={{ minWidth: 0 }} role="status" aria-live="polite">
          <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 30 }, letterSpacing: '-0.8px', mb: 0.5 }}>
            {queued ? 'In line for the doctor…' : 'Running the checkup…'}
          </Typography>
          <Typography sx={{ fontFamily: MONO, fontSize: 13, color: 'text.secondary', mb: 2.5, wordBreak: 'break-all' }}>
            {checkup.source === 'code'
              ? `${checkup.code?.split('\n').length ?? 0} lines of pasted code`
              : checkup.source === 'screenshot'
                ? 'Your uploaded screenshot'
                : checkup.url}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{queued ? 'Waiting to start' : checkup.stage}</Typography>
            <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>{percent}%</Typography>
          </Box>
          <Box
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Checkup progress"
            sx={{ height: 16, bgcolor: '#fff', border: `2px solid ${INK}`, borderRadius: 999, overflow: 'hidden', mb: 1 }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${percent}%`,
                bgcolor: PINK,
                borderRight: percent > 0 ? `2px solid ${INK}` : 0,
                transition: 'width .4s ease-out',
                backgroundImage:
                  'repeating-linear-gradient(-45deg, rgba(255,255,255,.25) 0 8px, transparent 8px 16px)',
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2.5, minHeight: 20 }}>{tip}</Typography>

          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {STAGES.map((stage, index) => {
              const state = index < stageIndex ? 'done' : index === stageIndex ? 'now' : 'todo'
              return (
                <Box
                  component="li"
                  key={stage.name}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, opacity: state === 'todo' ? 0.45 : 1 }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      borderRadius: 999,
                      border: `2px solid ${INK}`,
                      bgcolor: state === 'done' ? LIME : state === 'now' ? YELLOW : '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {state === 'done' && '✓'}
                    {state === 'now' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: -6,
                          borderRadius: 999,
                          border: '2px solid transparent',
                          borderTopColor: PINK,
                          animation: `${spin} .9s linear infinite`,
                        }}
                      />
                    )}
                  </Box>
                  <Typography sx={{ fontWeight: state === 'now' ? 700 : 500, fontSize: 14.5 }}>{stage.name}</Typography>
                </Box>
              )
            })}
          </Box>

          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 2.5 }}>
            <Box component="span" sx={{ fontWeight: 700, color: INK }}>
              {formatElapsed(elapsed)}
            </Box>{' '}
            elapsed · usually {{ url: '15–40', code: '20–60', screenshot: '10–30' }[checkup.source]} seconds. Results appear here on their own.
          </Typography>
        </Box>
      </Box>
    </Card>
  )
}
