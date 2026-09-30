import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import type { Vital } from '../../features/checkups/types'
import { Card, SectionTitle, Tag } from './reportUi'
import { LIME, MONO, PINK, RATING_COLOR, YELLOW } from './reportTheme'

/** Where the marker sits on the good / meh / poor bar, as a percentage. */
function markerPosition({ value, good, poor }: Vital) {
  if (value === null) return null
  if (value <= good) return (value / good) * 33
  if (value <= poor) return 33 + ((value - good) / (poor - good)) * 33
  return 66 + Math.min(1, (value - poor) / poor) * 31
}

function VitalCard({ vital }: { vital: Vital }) {
  const marker = markerPosition(vital)
  return (
    <Card sx={{ p: { xs: 2, md: 2.25 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>{vital.key}</Typography>
        <Tag bgcolor={RATING_COLOR[vital.rating]}>{vital.rating === 'unmeasured' ? 'couldn’t measure' : vital.rating}</Tag>
      </Box>
      <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 34, lineHeight: 1.1, mb: 1 }}>
        {vital.display}
      </Typography>
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.4, mb: 1.75, minHeight: 36 }}>
        {vital.label}: {vital.description}
      </Typography>
      <Box sx={{ position: 'relative', mb: 0.75 }}>
        <Box sx={{ display: 'flex', height: 10, border: `2px solid ${INK}`, borderRadius: 999, overflow: 'hidden' }}>
          <Box sx={{ flex: 33, bgcolor: LIME }} />
          <Box sx={{ flex: 33, bgcolor: YELLOW, borderLeft: `2px solid ${INK}`, borderRight: `2px solid ${INK}` }} />
          <Box sx={{ flex: 34, bgcolor: PINK }} />
        </Box>
        {marker !== null && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: -5,
              left: `${marker}%`,
              width: 4,
              height: 20,
              bgcolor: INK,
              borderRadius: 2,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'text.secondary' }}>
        <span>{vital.goodLabel}</span>
        <span>{vital.poorLabel}</span>
      </Box>
    </Card>
  )
}

export default function VitalSigns({ vitals }: { vitals: Vital[] }) {
  return (
    <Box component="section">
      <SectionTitle title="the vital signs" note="Measured on a phone. Google’s own thresholds." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2.5 }}>
        {vitals.map((vital) => (
          <VitalCard key={vital.key} vital={vital} />
        ))}
      </Box>
    </Box>
  )
}
