import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import type { Issue, Report } from '../../features/checkups/types'
import { Card, Tag } from './reportUi'
import { BLUE, LIME, PINK, YELLOW } from './reportTheme'

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  return (
    <Box sx={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="44" fill="#fff" stroke={INK} strokeWidth="2" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#ece7fb" strokeWidth="9" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <Typography
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 32,
        }}
      >
        {score}
      </Typography>
    </Box>
  )
}

function ScoreCard({ title, score, label, note, color }: { title: string; score: number; label: string; note: string; color: string }) {
  const tagColor = score >= 90 ? LIME : score >= 50 ? YELLOW : PINK
  return (
    <Card sx={{ display: 'flex', alignItems: 'center', gap: 2.5, height: '100%' }}>
      <ScoreRing score={score} color={color} />
      <Box>
        <Typography variant="h3" sx={{ fontSize: 22, mb: 0.5 }}>
          {title}
        </Typography>
        <Tag bgcolor={tagColor}>{label}</Tag>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1, lineHeight: 1.45 }}>{note}</Typography>
      </Box>
    </Card>
  )
}

function BiggestWin({ issue }: { issue: Issue | undefined }) {
  return (
    <Card sx={{ position: 'relative', bgcolor: LIME, overflow: 'visible', height: '100%' }}>
      {issue && (
        <Tag bgcolor={PINK} sx={{ position: 'absolute', top: -12, right: 18, transform: 'rotate(3deg)' }}>
          do this first
        </Tag>
      )}
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', mb: 0.75 }}>
        Biggest single win
      </Typography>
      {issue ? (
        <>
          <Typography variant="h3" sx={{ fontSize: 21, lineHeight: 1.2, mb: 1 }}>
            {issue.title}
          </Typography>
          <Typography sx={{ fontSize: 13.5, lineHeight: 1.45, mb: 1.5 }}>{issue.fix}</Typography>
          {issue.gain > 0 && (
            <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
              +{issue.gain} {issue.kind === 'slow' ? 'speed' : 'looks'}{' '}
              <Box component="span" sx={{ fontSize: 12, fontWeight: 500 }}>
                estimated
              </Box>
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="h3" sx={{ fontSize: 21 }}>
          Nothing to fix. Your site is in great shape.
        </Typography>
      )}
    </Card>
  )
}

export default function ScoreCards({ report }: { report: Report }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: report.speed
          ? { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1.15fr' }
          : { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1.15fr' },
        gap: 3,
        alignItems: 'stretch',
      }}
    >
      {report.speed && <ScoreCard title="Speed" color={PINK} {...report.speed} />}
      <ScoreCard title="Looks" color={BLUE} {...report.looks} />
      <Box sx={{ gridColumn: report.speed ? { sm: '1 / -1', lg: 'auto' } : 'auto' }}>
        <BiggestWin issue={report.issues[0]} />
      </Box>
    </Box>
  )
}
