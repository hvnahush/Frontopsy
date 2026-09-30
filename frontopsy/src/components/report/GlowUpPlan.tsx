import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import type { Report } from '../../features/checkups/types'
import { NumberBadge, Tag } from './reportUi'
import { KIND_COLOR, LIME, PINK, SEVERITY_COLOR, YELLOW } from './reportTheme'

function storageKey(checkupId: string) {
  return `frontopsy:plan:${checkupId}`
}

function loadDone(checkupId: string): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(checkupId)) ?? '[]')
    return new Set(Array.isArray(saved) ? saved.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

function ProjectedScore({ label, from, to, color }: { label: string; from: number; to: number; color: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{label}</Typography>
        <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 28 }}>
          {from} <Box component="span" sx={{ fontSize: 20, opacity: 0.7 }}>→</Box>{' '}
          <Box component="span" sx={{ color }}>{to}</Box>
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', height: 14, bgcolor: '#fff', border: '2px solid #fff', borderRadius: 999, overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, width: `${to}%`, bgcolor: color, opacity: 0.45, transition: 'width .3s' }} />
        <Box sx={{ position: 'absolute', inset: 0, width: `${from}%`, bgcolor: color }} />
      </Box>
    </Box>
  )
}

export default function GlowUpPlan({
  checkupId,
  report,
  canRerun,
  onRerun,
}: {
  checkupId: string
  report: Report
  canRerun: boolean
  onRerun: () => void
}) {
  const [done, setDone] = useState(() => loadDone(checkupId))

  const toggle = (id: string) => {
    setDone((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(storageKey(checkupId), JSON.stringify([...next]))
      } catch {
        // Ticks just won't survive a reload.
      }
      return next
    })
  }

  const gained = (kind: 'slow' | 'broken') =>
    report.issues.filter((i) => i.kind === kind && done.has(i.id)).reduce((sum, i) => sum + i.gain, 0)
  const speedAfter = report.speed ? Math.min(100, report.speed.score + gained('slow')) : null
  const looksAfter = Math.min(100, report.looks.score + gained('broken'))

  return (
    <Box
      component="section"
      sx={{
        bgcolor: LIME,
        border: `2px solid ${INK}`,
        borderRadius: '28px',
        boxShadow: `8px 8px 0 ${INK}`,
        p: { xs: 2.5, md: 4 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' },
        gap: { xs: 3, md: 4 },
        alignItems: 'start',
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 34 }, letterSpacing: '-1px' }}>
            the glow-up plan
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
            {report.issues.filter((i) => done.has(i.id)).length}/{report.issues.length} done
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 13.5, mb: 2.5 }}>
          Ranked by impact. Tick what you’ve fixed and watch your projected scores climb.
        </Typography>

        {report.issues.length === 0 ? (
          <Typography sx={{ fontWeight: 700 }}>Nothing on the list. Enjoy your fast, tidy site.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {report.issues.map((issue) => {
              const checked = done.has(issue.id)
              return (
                <ButtonBase
                  key={issue.id}
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(issue.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: '#fff',
                    border: `2px solid ${INK}`,
                    borderRadius: '14px',
                    boxShadow: `3px 3px 0 ${INK}`,
                    px: 1.75,
                    py: 1.25,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      border: `2px solid ${INK}`,
                      borderRadius: '6px',
                      bgcolor: checked ? INK : '#fff',
                      color: LIME,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {checked ? '✓' : ''}
                  </Box>
                  <NumberBadge value={issue.id} color={SEVERITY_COLOR[issue.severity]} size={24} />
                  <Typography
                    sx={{ flex: 1, fontWeight: 700, fontSize: 14, textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.6 : 1 }}
                  >
                    {issue.title}
                  </Typography>
                  {issue.gain > 0 && (
                    <Tag bgcolor={KIND_COLOR[issue.kind]}>
                      +{issue.gain} {issue.kind === 'slow' ? 'speed' : 'looks'}
                    </Tag>
                  )}
                </ButtonBase>
              )
            })}
          </Box>
        )}
      </Box>

      <Box sx={{ position: 'relative', bgcolor: INK, color: '#fff', borderRadius: '22px', p: { xs: 2.5, md: 3 } }}>
        <Tag bgcolor={YELLOW} sx={{ position: 'absolute', top: -12, right: 20, transform: 'rotate(3deg)' }}>
          projected
        </Tag>
        <Typography variant="h3" sx={{ fontSize: 22, mb: 3 }}>
          your scores after fixes
        </Typography>
        {report.speed && speedAfter !== null && (
          <ProjectedScore label="Speed" from={report.speed.score} to={speedAfter} color={PINK} />
        )}
        <ProjectedScore label="Looks" from={report.looks.score} to={looksAfter} color={LIME} />
        <Typography sx={{ fontSize: 12.5, opacity: 0.75, mb: 2.5 }}>
          Estimates. Re-run the checkup after you ship to see your real scores.
        </Typography>
        {canRerun && (
          <Button fullWidth onClick={onRerun} sx={{ bgcolor: LIME, color: INK, py: 1.25, boxShadow: `4px 4px 0 ${PINK}`, '&:hover': { bgcolor: LIME } }}>
            Re-run after fixing
          </Button>
        )}
      </Box>
    </Box>
  )
}
