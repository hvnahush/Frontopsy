import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import { INK } from '../../theme'
import { screenshotUrl } from '../../features/checkups/checkupsApi'
import type { Device, Issue, IssueKind, Report } from '../../features/checkups/types'
import { CopyButton, NumberBadge, SectionTitle, Tag } from './reportUi'
import { KIND_COLOR, MONO, PINK, SEVERITY_COLOR } from './reportTheme'

type Filter = 'all' | IssueKind

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <Box
      role="group"
      aria-label={label}
      sx={{ display: 'inline-flex', bgcolor: '#fff', border: `2px solid ${INK}`, borderRadius: 999, p: 0.5, gap: 0.5 }}
    >
      {options.map((option) => (
        <ButtonBase
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          sx={{
            px: 2,
            py: 0.75,
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 13.5,
            fontFamily: 'inherit',
            bgcolor: value === option.value ? INK : 'transparent',
            color: value === option.value ? '#fff' : INK,
          }}
        >
          {option.label}
        </ButtonBase>
      ))}
    </Box>
  )
}

function IssueCard({
  issue,
  number,
  open,
  onToggle,
}: {
  issue: Issue
  number: number
  open: boolean
  onToggle: () => void
}) {
  const unit = issue.kind === 'slow' ? 'speed' : 'looks'
  return (
    <Box
      id={`issue-${issue.id}`}
      sx={{
        bgcolor: '#fff',
        border: `2px solid ${INK}`,
        borderRadius: '16px',
        boxShadow: open ? `4px 4px 0 ${PINK}` : `4px 4px 0 ${INK}`,
        scrollMarginTop: 12,
      }}
    >
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, textAlign: 'left', borderRadius: '16px' }}
      >
        <NumberBadge value={number} color={SEVERITY_COLOR[issue.severity]} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{issue.severity}</Typography>
            <Tag bgcolor={KIND_COLOR[issue.kind]}>{issue.kind}</Tag>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>· {issue.where}</Typography>
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{issue.title}</Typography>
          <Typography
            sx={{ fontFamily: MONO, fontSize: 11.5, color: 'text.secondary', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {issue.location}
          </Typography>
        </Box>
        <Box component="span" aria-hidden sx={{ fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          ⌄
        </Box>
      </ButtonBase>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ borderTop: `2px dashed ${INK}`, p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.5 }}>What’s up</Typography>
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.5 }}>{issue.whatsUp}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.5 }}>The fix</Typography>
              <Typography sx={{ fontSize: 13.5, lineHeight: 1.5 }}>{issue.fix}</Typography>
            </Box>
          </Box>
          {issue.code && (
            <Box sx={{ position: 'relative', bgcolor: INK, color: '#e9e6f5', borderRadius: '12px', p: 2, pr: 11, mb: 2 }}>
              <Box component="pre" sx={{ m: 0, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.6, overflowX: 'auto' }}>
                {issue.code}
              </Box>
              <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                <CopyButton text={issue.code} />
              </Box>
            </Box>
          )}
          {issue.gain > 0 && (
            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
              Expected gain: +{issue.gain} {unit} (estimated)
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

function Screenshot({
  checkupId,
  device,
  size,
  issues,
  activeId,
  onPin,
}: {
  checkupId: string
  device: Device
  size: { width: number; height: number } | undefined
  issues: Issue[]
  activeId: string | null
  onPin: (id: string) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const isPhone = device === 'phone'
  const frameWidth = isPhone ? 290 : '100%'
  const pins = issues.flatMap((issue) => issue.pins.filter((pin) => pin.device === device).map((pin) => ({ issue, pin })))

  const activeY = pins.find((p) => p.issue.id === activeId)?.pin.y

  // Bring the selected problem's pin into view.
  useEffect(() => {
    const scroller = scrollerRef.current
    const inner = scroller?.firstElementChild as HTMLElement | null | undefined
    if (!scroller || !inner || activeY === undefined) return
    scroller.scrollTo({ top: activeY * inner.offsetHeight - scroller.clientHeight / 3, behavior: 'smooth' })
  }, [activeId, activeY, device])

  return (
    <Box
      sx={{
        width: frameWidth,
        maxWidth: '100%',
        mx: 'auto',
        bgcolor: INK,
        border: '3px solid #fff',
        outline: `2px solid ${INK}`,
        borderRadius: isPhone ? '38px' : '14px',
        p: isPhone ? 1.25 : 1,
      }}
    >
      <Box
        ref={scrollerRef}
        sx={{
          position: 'relative',
          height: isPhone ? 540 : 420,
          overflowY: 'auto',
          borderRadius: isPhone ? '28px' : '8px',
          bgcolor: '#fff',
        }}
      >
        <Box sx={{ position: 'relative' }}>
          {size ? (
            <Box
              component="img"
              src={screenshotUrl(checkupId, device)}
              alt={`Your site on a ${device}`}
              sx={{ display: 'block', width: '100%', aspectRatio: `${size.width} / ${size.height}`, bgcolor: '#f1edfc' }}
            />
          ) : (
            <Typography sx={{ p: 3, fontSize: 14 }}>No screenshot for this device.</Typography>
          )}
          {pins.map(({ issue, pin }, index) => {
            const number = issue.id
            const active = issue.id === activeId
            return (
              <ButtonBase
                key={`${issue.id}-${index}`}
                onClick={() => onPin(issue.id)}
                aria-label={`Problem ${number}: ${issue.title}`}
                sx={{
                  position: 'absolute',
                  left: `${pin.x * 100}%`,
                  top: `${pin.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${active ? 1.2 : 1})`,
                  transition: 'transform .15s',
                  borderRadius: 999,
                  zIndex: active ? 2 : 1,
                  boxShadow: active ? `0 0 0 4px ${PINK}` : 'none',
                }}
              >
                <NumberBadge value={number} color={active ? PINK : '#fff'} size={28} />
              </ButtonBase>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}

export default function WhereItHurts({ checkupId, report }: { checkupId: string; report: Report }) {
  const hasScreenshots = Boolean(report.screenshots.phone || report.screenshots.laptop)
  const [device, setDevice] = useState<Device>(report.screenshots.phone || !report.screenshots.laptop ? 'phone' : 'laptop')
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(report.issues[0]?.id ?? null)

  const visible = report.issues.filter((issue) => filter === 'all' || issue.kind === filter)
  const count = (kind: IssueKind) => report.issues.filter((issue) => issue.kind === kind).length

  const selectFromPin = (id: string) => {
    setFilter((current) => (current === 'all' || report.issues.find((i) => i.id === id)?.kind === current ? current : 'all'))
    setOpenId(id)
    requestAnimationFrame(() => document.getElementById(`issue-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  const toggle = (issue: Issue) => {
    const opening = openId !== issue.id
    setOpenId(opening ? issue.id : null)
    // Show the problem on whichever device it was found on.
    if (opening && issue.pins.length && !issue.pins.some((pin) => pin.device === device)) setDevice(issue.pins[0]!.device)
  }

  return (
    <Box component="section">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <SectionTitle
          title="where it hurts"
          note={hasScreenshots ? 'Tap a pin on the screenshot to jump to that problem.' : 'Every problem we found, most important first.'}
        />
        {report.screenshots.phone && report.screenshots.laptop && (
          <Segmented
            label="Device"
            value={device}
            onChange={setDevice}
            options={[
              { value: 'phone', label: 'Phone' },
              { value: 'laptop', label: 'Laptop' },
            ]}
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: hasScreenshots && device === 'phone' ? '5fr 7fr' : '1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {hasScreenshots && (
          <Box
            sx={{
              bgcolor: INK,
              border: `2px solid ${INK}`,
              borderRadius: '24px',
              boxShadow: `8px 8px 0 ${PINK}`,
              p: { xs: 2.5, md: 4 },
            }}
          >
            <Screenshot
              checkupId={checkupId}
              device={device}
              size={report.screenshots[device]}
              issues={visible}
              activeId={openId}
              onPin={selectFromPin}
            />
          </Box>
        )}

        {/* minWidth 0 stops long code blocks from stretching the grid column past the screen. */}
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {(
              [
                ['all', `Everything ${report.issues.length}`],
                ['slow', `Why it’s slow ${count('slow')}`],
                ['broken', `Why it looks broken ${count('broken')}`],
              ] as const
            )
              // A screenshot can't show speed, so there's nothing to filter to.
              .filter(([value]) => !(value === 'slow' && report.source === 'screenshot'))
              .map(([value, label]) => (
                <ButtonBase
                  key={value}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  sx={{
                    px: 1.75,
                    py: 0.75,
                    borderRadius: 999,
                    border: `2px solid ${INK}`,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    bgcolor: filter === value ? INK : '#fff',
                    color: filter === value ? '#fff' : INK,
                  }}
                >
                  {label}
                </ButtonBase>
              ))}
          </Box>

          {visible.length === 0 ? (
            <Typography sx={{ fontSize: 15, py: 4 }}>Nothing here. Nice work.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, maxHeight: { md: 640 }, overflowY: { md: 'auto' }, pr: { md: 1.5 }, pb: 1 }}>
              {visible.map((issue) => (
                <IssueCard key={issue.id} issue={issue} number={Number(issue.id)} open={openId === issue.id} onToggle={() => toggle(issue)} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
