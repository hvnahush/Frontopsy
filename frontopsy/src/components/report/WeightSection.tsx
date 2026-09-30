import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import type { Report } from '../../features/checkups/types'

type Weight = NonNullable<Report['weight']>
import { Card } from './reportUi'
import { CATEGORY_COLOR, MONO, formatBytes } from './reportTheme'

function weightNote({ totalBytes, categories }: Weight) {
  const top = [...categories].sort((a, b) => b.bytes - a.bytes)[0]
  if (!top || totalBytes === 0) return 'We couldn’t measure the page weight.'
  const share = top.bytes / totalBytes
  const lead =
    share > 0.5
      ? `${top.category} are more than half your page.`
      : `${top.category} are the biggest chunk, at ${Math.round(share * 100)}% of your page.`
  const mb = totalBytes / 1024 / 1024
  const tail =
    mb > 3
      ? 'A typical phone connection needs several seconds just to download it.'
      : mb > 1.5
        ? 'That’s on the heavy side for a phone.'
        : 'Overall that’s a nice, light page.'
  return `${lead} ${tail}`
}

export default function WeightSection({ weight }: { weight: Weight }) {
  const shown = weight.categories.filter((c) => c.bytes > 0)
  return (
    <Box component="section" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.55fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Card>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, mb: 2 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 24, md: 28 }, letterSpacing: '-0.8px' }}>
            what’s weighing it down
          </Typography>
          <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24, whiteSpace: 'nowrap' }}>
            {formatBytes(weight.totalBytes)}
          </Typography>
        </Box>

        <Box
          role="img"
          aria-label={shown.map((c) => `${c.category} ${formatBytes(c.bytes)}`).join(', ')}
          sx={{ display: 'flex', height: 36, border: `2px solid ${INK}`, borderRadius: '10px', overflow: 'hidden', mb: 2 }}
        >
          {shown.map((c, i) => (
            <Box
              key={c.category}
              sx={{
                flex: c.bytes,
                minWidth: 6,
                bgcolor: CATEGORY_COLOR[c.category],
                borderLeft: i === 0 ? 0 : `2px solid ${INK}`,
              }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 4 }, mb: 2.5 }}>
          {weight.categories.map((c) => (
            <Box key={c.category}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: CATEGORY_COLOR[c.category], border: `1.5px solid ${INK}` }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{c.category}</Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', pl: 2.6 }}>{formatBytes(c.bytes)}</Typography>
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: 13.5, lineHeight: 1.5 }}>{weightNote(weight)}</Typography>
      </Card>

      <Card>
        <Typography variant="h3" sx={{ fontSize: 20, mb: 1.5 }}>
          heaviest files
        </Typography>
        {weight.heaviest.map((file) => (
          <Box
            key={file.url}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              py: 1.1,
              borderBottom: '1.5px dashed rgba(20, 18, 31, 0.25)',
              '&:last-of-type': { borderBottom: 0 },
            }}
          >
            <Box sx={{ width: 11, height: 11, flexShrink: 0, borderRadius: 999, bgcolor: CATEGORY_COLOR[file.category], border: `1.5px solid ${INK}` }} />
            <Typography
              title={file.url}
              sx={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {file.path}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>{formatBytes(file.bytes)}</Typography>
          </Box>
        ))}
      </Card>
    </Box>
  )
}
