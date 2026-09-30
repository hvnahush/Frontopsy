import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import type { Issue, Report, Severity } from '../../features/checkups/types'
import FixedCode from './FixedCode'
import { Card, CopyButton, NumberBadge } from './reportUi'
import { BLUE, LIME, MONO, PINK, YELLOW } from './reportTheme'

// Plain words instead of the full report's slang.
const PRIORITY: Record<Severity, { label: string; color: string }> = {
  'big yikes': { label: 'Fix first', color: PINK },
  'kinda sus': { label: 'Worth fixing', color: YELLOW },
  meh: { label: 'Small thing', color: LIME },
}

function verdict(score: number) {
  return score >= 90 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor'
}

function ScorePill({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: '#fff',
        border: `2px solid ${INK}`,
        borderRadius: '16px',
        px: 2,
        py: 1.25,
        flex: '1 1 200px',
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 999,
          border: `4px solid ${color}`,
          display: 'grid',
          placeItems: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {score}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>
          {verdict(score)} · out of 100
        </Typography>
      </Box>
    </Box>
  )
}

function FixItem({ issue, index }: { issue: Issue; index: number }) {
  const priority = PRIORITY[issue.severity]
  return (
    <Card sx={{ p: { xs: 2.25, md: 3 } }}>
      <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
        <NumberBadge value={index + 1} color={priority.color} size={34} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', mb: 0.25 }}
          >
            {priority.label} · {issue.kind === 'slow' ? 'makes it slow' : 'makes it look broken'}
          </Typography>
          <Typography variant="h3" sx={{ fontSize: 19, lineHeight: 1.3, mb: 1.25 }}>
            {issue.title}
          </Typography>

          <Typography sx={{ fontSize: 14.5, lineHeight: 1.55, mb: 1 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              Why:{' '}
            </Box>
            {issue.whatsUp}
          </Typography>
          <Typography sx={{ fontSize: 14.5, lineHeight: 1.55 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>
              How to fix:{' '}
            </Box>
            {issue.fix}
          </Typography>

          {issue.code && (
            <Box sx={{ mt: 1.75, bgcolor: INK, color: '#e9e6f5', borderRadius: '12px', overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderBottom: '1.5px solid rgba(255,255,255,.12)',
                }}
              >
                <Typography sx={{ fontFamily: MONO, fontSize: 12, opacity: 0.7 }}>
                  {issue.location}
                </Typography>
                <CopyButton text={issue.code} />
              </Box>
              <Box component="pre" sx={{ m: 0, p: 2, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto' }}>
                {issue.code}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  )
}

export default function SimpleReport({ report }: { report: Report }) {
  return (
    <Box sx={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {report.speed && <ScorePill label="Speed" score={report.speed.score} color={PINK} />}
        <ScorePill label="Looks" score={report.looks.score} color={BLUE} />
      </Box>

      <Box component="section">
        <Typography variant="h2" sx={{ fontSize: { xs: 26, md: 30 }, letterSpacing: '-0.8px', mb: 0.5 }}>
          {report.issues.length ? `What to fix (${report.issues.length})` : 'Nothing to fix'}
        </Typography>
        <Typography sx={{ fontSize: 14.5, color: 'text.secondary', mb: 2.5 }}>
          {report.issues.length
            ? 'Start at the top. Each fix is ready to copy and paste.'
            : 'We didn’t find any problems. Your site is in good shape.'}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {report.issues.map((issue, index) => (
            <FixItem key={issue.id} issue={issue} index={index} />
          ))}
        </Box>
      </Box>

      {report.fixedCode && <FixedCode code={report.fixedCode} />}
    </Box>
  )
}
