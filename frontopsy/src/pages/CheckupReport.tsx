import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { useAppSelector } from '../app/hooks'
import { ApiError } from '../app/apiClient'
import Logo from '../components/Logo'
import SiteFooter from '../components/SiteFooter'
import UserMenu from '../components/UserMenu'
import CheckupLoading from '../components/report/CheckupLoading'
import FixedCode from '../components/report/FixedCode'
import GlowUpPlan from '../components/report/GlowUpPlan'
import SimpleReport from '../components/report/SimpleReport'
import { Card } from '../components/report/reportUi'
import { BLUE, MONO, PINK } from '../components/report/reportTheme'
import ScoreCards from '../components/report/ScoreCards'
import VitalSigns from '../components/report/VitalSigns'
import WeightSection from '../components/report/WeightSection'
import WhereItHurts from '../components/report/WhereItHurts'
import { fetchCheckup, startCheckup } from '../features/checkups/checkupsApi'
import type { Checkup } from '../features/checkups/types'
import { INK } from '../theme'

const POLL_MS = 1500
const VIEW_KEY = 'frontopsy:report-view'

type ReportView = 'simple' | 'full'

function loadView(): ReportView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'full' ? 'full' : 'simple'
  } catch {
    return 'simple'
  }
}

function ViewToggle({ value, onChange }: { value: ReportView; onChange: (view: ReportView) => void }) {
  return (
    <Box
      role="group"
      aria-label="Report view"
      sx={{ display: 'inline-flex', bgcolor: '#fff', border: `2px solid ${INK}`, borderRadius: 999, p: 0.5, gap: 0.5 }}
    >
      {(
        [
          ['simple', 'Simple'],
          ['full', 'Full report'],
        ] as const
      ).map(([view, label]) => (
        <ButtonBase
          key={view}
          onClick={() => onChange(view)}
          aria-pressed={value === view}
          sx={{
            px: 2,
            py: 0.75,
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 13.5,
            fontFamily: 'inherit',
            bgcolor: value === view ? INK : 'transparent',
            color: value === view ? '#fff' : INK,
          }}
        >
          {label}
        </ButtonBase>
      ))}
    </Box>
  )
}
const MAX_RETRIES = 4
// A wrong link shouldn't leave people waiting long, but one miss is worth a second look.
const MAX_NOT_FOUND_RETRIES = 2

function hostOf(url: string) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// Keyed by id so moving to another report (e.g. after a re-run) starts from a clean slate.
export default function CheckupReportRoute() {
  const { id = '' } = useParams()
  return <CheckupReport key={id} id={id} />
}

function CheckupReport({ id }: { id: string }) {
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [checkup, setCheckup] = useState<Checkup | null>(null)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState('')
  const [rerunning, setRerunning] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState<ReportView>(loadView)

  const changeView = (next: ReportView) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // The choice just won't be remembered.
    }
  }

  // Load the checkup, then keep polling while it's still in progress.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let loaded = false

    const load = async () => {
      try {
        const next = await fetchCheckup(id)
        if (cancelled) return
        failures = 0
        loaded = true
        setCheckup(next)
        if (next.status === 'queued' || next.status === 'running') timer = setTimeout(load, POLL_MS)
      } catch (error) {
        if (cancelled) return
        // Network blips, server restarts and one-off misses shouldn't throw away a checkup
        // that's running or already on screen, so retry a few times before giving up.
        failures += 1
        const status = error instanceof ApiError ? error.status : 0
        const retries = status === 404 ? MAX_NOT_FOUND_RETRIES : status === 0 || status >= 500 ? MAX_RETRIES : 0
        if (failures <= retries) {
          timer = setTimeout(load, status === 404 ? 1000 : POLL_MS * failures)
        } else if (!loaded) {
          setLoadError(error instanceof Error ? error.message : 'Something went wrong.')
        }
      }
    }
    void load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, attempt])

  const retryLoad = () => {
    setLoadError('')
    setAttempt((n) => n + 1)
  }

  const rerun = async () => {
    if (!checkup) return
    setRerunning(true)
    setActionError('')
    try {
      const next = await startCheckup(
        checkup.source === 'code' ? { code: checkup.code ?? '', symptoms: checkup.symptoms } : { url: checkup.url },
      )
      navigate(`/checkups/${next.id}`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setRerunning(false)
    }
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('Link copied. Anyone with it can view this report.')
    } catch {
      setToast('Couldn’t copy automatically. Copy the link from your address bar.')
    }
  }

  const report = checkup?.report
  // Code checkups can only be re-run by the owner, who is the only one sent the code. Screenshot
  // checkups can't be re-run at all: after fixing, you'd upload a new screenshot.
  const canRerun = Boolean(
    checkup?.isOwner && user && (checkup.source === 'url' || (checkup.source === 'code' && checkup.code)),
  )
  const source = report?.source ?? 'url'
  const isLink = source === 'url'

  return (
    <Box sx={pageBgSx}>
      <Box
        component="header"
        className="no-print"
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          pt: { xs: 3, md: 4 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <RouterLink to={user ? '/dashboard' : '/'} aria-label="Frontopsy home" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Logo />
        </RouterLink>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button variant="outlined" component={RouterLink} to={user ? '/dashboard' : '/'} sx={{ borderRadius: 999, px: 2.5, bgcolor: '#fff' }}>
            New checkup
          </Button>
          {user ? (
            <UserMenu />
          ) : (
            <Button variant="contained" component={RouterLink} to="/login" sx={{ borderRadius: 999, px: 2.5 }}>
              Log in
            </Button>
          )}
        </Box>
      </Box>

      <Box component="main" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 5 } }}>
        {loadError && (
          <Card sx={{ maxWidth: 560, mx: 'auto', mt: 6 }}>
            <Typography variant="h2" sx={{ fontSize: 24, mb: 1 }}>
              Couldn’t open that report
            </Typography>
            <Typography sx={{ mb: 2.5 }}>{loadError}</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={retryLoad}>
                Try again
              </Button>
              <Button variant="outlined" component={RouterLink} to={user ? '/dashboard' : '/'}>
                {user ? 'Back to your checkups' : 'Start a new checkup'}
              </Button>
            </Box>
          </Card>
        )}

        {!checkup && !loadError && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 12 }}>
            <CircularProgress sx={{ color: PINK }} />
          </Box>
        )}

        {checkup && (checkup.status === 'queued' || checkup.status === 'running') && <CheckupLoading checkup={checkup} />}

        {checkup?.status === 'failed' && (
          <Card sx={{ maxWidth: 560, mx: 'auto', mt: { xs: 4, md: 8 } }}>
            <Typography variant="h2" sx={{ fontSize: 26, mb: 1 }}>
              The checkup didn’t finish
            </Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: 13, color: 'text.secondary', mb: 2, wordBreak: 'break-all' }}>
              {checkup.url}
            </Typography>
            <Typography sx={{ mb: 3 }}>{checkup.error ?? 'Something went wrong.'}</Typography>
            {actionError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {actionError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {canRerun && (
                <Button variant="contained" onClick={rerun} disabled={rerunning}>
                  {rerunning ? 'Starting…' : 'Try again'}
                </Button>
              )}
              <Button variant="outlined" component={RouterLink} to={user ? '/dashboard' : '/'}>
                Check a different link
              </Button>
            </Box>
          </Card>
        )}

        {checkup?.status === 'done' && report && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 6, md: 7 } }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 2 }}>
                <Box
                  {...(isLink
                    ? { component: 'a' as const, href: report.finalUrl, target: '_blank', rel: 'noreferrer noopener' }
                    : { component: 'span' as const })}
                  sx={{
                    fontFamily: MONO,
                    fontSize: 13,
                    fontWeight: 700,
                    color: INK,
                    textDecoration: 'none',
                    bgcolor: '#fff',
                    border: `2px solid ${INK}`,
                    borderRadius: 999,
                    px: 1.5,
                    py: 0.5,
                  }}
                >
                  {{ url: hostOf(report.finalUrl), code: 'pasted code', screenshot: 'uploaded screenshot' }[source]}
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Checked {formatDate(report.checkedAt)} ·{' '}
                  {source === 'code'
                    ? `AI diagnosis${report.screenshots.phone ? ' · rendered on phone + laptop' : ''}`
                    : source === 'screenshot'
                      ? 'AI diagnosis from your screenshot'
                      : 'phone + laptop'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ maxWidth: 760 }}>
                  <Typography variant="h1" sx={{ fontSize: { xs: 44, md: 64 }, letterSpacing: '-2px', lineHeight: 1, mb: 2 }}>
                    {view === 'simple' ? 'Your checkup results.' : 'The full autopsy.'}
                  </Typography>
                  <Typography sx={{ fontSize: 16.5, lineHeight: 1.5 }}>{report.summary}</Typography>
                </Box>
                <Box className="no-print" sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
                  <ViewToggle value={view} onChange={changeView} />
                  <Button variant="contained" onClick={share} sx={{ bgcolor: BLUE, boxShadow: `3px 3px 0 ${INK}` }}>
                    Share report
                  </Button>
                  <Button variant="outlined" onClick={() => window.print()} sx={{ bgcolor: '#fff', boxShadow: `3px 3px 0 ${INK}` }}>
                    Download PDF
                  </Button>
                  {canRerun && (
                    <Button variant="outlined" onClick={rerun} disabled={rerunning} sx={{ bgcolor: '#fff', boxShadow: `3px 3px 0 ${INK}` }}>
                      {rerunning ? 'Starting…' : 'Re-run'}
                    </Button>
                  )}
                </Box>
              </Box>
              {actionError && (
                <Alert severity="error" onClose={() => setActionError('')} sx={{ mt: 2 }}>
                  {actionError}
                </Alert>
              )}
            </Box>

            {view === 'simple' ? (
              <SimpleReport report={report} />
            ) : (
              <>
                <ScoreCards report={report} />
                {report.vitals.length > 0 && <VitalSigns vitals={report.vitals} />}
                <WhereItHurts checkupId={checkup.id} report={report} />
                {report.fixedCode && <FixedCode code={report.fixedCode} />}
                {report.weight && <WeightSection weight={report.weight} />}
                <GlowUpPlan checkupId={checkup.id} report={report} canRerun={canRerun} onRerun={rerun} />
              </>
            )}

            <Box
              component="footer"
              sx={{
                borderTop: `2px solid ${INK}`,
                pt: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Typography sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 720 }}>
                {
                  {
                    url: 'Measured with Lighthouse and Playwright in Chrome on a simulated phone and laptop. Fixes are generated from what we measured, and score gains are estimates, so test before you ship.',
                    code: 'Diagnosed by Google Gemini from your code and how it rendered in Chrome with no network access. Scores are estimates and AI can be wrong, so test the fixes before you ship.',
                    screenshot: 'Diagnosed by Google Gemini from your screenshot. It can’t see your code, so the CSS fixes are best guesses: adjust the selectors to match your site. AI can be wrong, so test before you ship.',
                  }[source]
                }
              </Typography>
              <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>frontopsy</Typography>
            </Box>
          </Box>
        )}
      </Box>

      <SiteFooter />

      <Snackbar
        open={toast !== ''}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

const pageBgSx = {
  position: 'relative',
  minHeight: '100vh',
  bgcolor: 'background.default',
  backgroundImage: 'radial-gradient(rgba(20, 18, 31, 0.14) 1.4px, transparent 1.4px)',
  backgroundSize: '22px 22px',
  overflowX: 'hidden',
}
