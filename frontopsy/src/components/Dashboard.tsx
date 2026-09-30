import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { startCheckup } from '../features/checkups/checkupsApi'
import { INK } from '../theme'
import { CHECKUP_TABS, STEP_ORANGE, type CheckupTab } from '../utils/constants'

const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024

interface DashboardProps {
  /** Labels of the symptoms ticked on the page, passed to the AI as context. */
  symptoms: string[]
}

interface Screenshot {
  file: File
  previewUrl: string
}

interface PanelProps<T> {
  value: T
  onChange: (value: T) => void
}

function isValidSiteUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

function LinkPanel({ value, onChange }: PanelProps<string>) {
  const showError = value.trim() !== '' && !isValidSiteUrl(value)

  return (
    <Box>
      <Typography sx={labelSx}>Your site's link</Typography>
      <TextField
        fullWidth
        type="url"
        placeholder="https://yourwebsite.com"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={showError}
        helperText={showError ? 'Enter a full link, like https://yourwebsite.com' : undefined}
        sx={{ mb: 1 }}
      />
      <Typography sx={helperSx}>
        We load it on a real phone and a real laptop, time every request, and screenshot both.
      </Typography>
    </Box>
  )
}

function PasteCodePanel({ value, onChange }: PanelProps<string>) {
  return (
    <Box>
      <Typography sx={labelSx}>Paste your code</Typography>
      <TextField
        fullWidth
        multiline
        minRows={4}
        maxRows={12}
        placeholder="<html>...</html>"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={{ mb: 1, '& textarea': { fontFamily: 'ui-monospace, monospace', fontSize: 13 } }}
      />
      <Typography sx={helperSx}>
        We render it in a sandboxed browser on a phone and a laptop, then AI debugs it and writes the fix.
      </Typography>
    </Box>
  )
}

function ScreenshotPanel({ value, onChange }: PanelProps<Screenshot | null>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const acceptFile = (file: File | undefined) => {
    if (!file) return
    if (!SCREENSHOT_TYPES.includes(file.type)) return setError('That file isn’t a PNG, JPG or WebP image.')
    if (file.size > MAX_SCREENSHOT_BYTES) return setError('Screenshots need to be under 10 MB.')
    setError('')

    const reader = new FileReader()
    reader.onload = () => onChange({ file, previewUrl: reader.result as string })
    reader.onerror = () => setError('Couldn’t read that file. Try another one.')
    reader.readAsDataURL(file)
  }

  const openPicker = () => inputRef.current?.click()

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    acceptFile(event.dataTransfer.files[0])
  }

  return (
    <Box>
      <Typography sx={labelSx}>Upload a screenshot</Typography>
      <input
        ref={inputRef}
        type="file"
        accept={SCREENSHOT_TYPES.join(',')}
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          acceptFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <Box
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && openPicker()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        sx={{
          border: `2px dashed ${INK}`,
          borderRadius: '12px',
          p: value ? 1.5 : 3,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 1,
        }}
      >
        {value ? (
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <Box
              component="img"
              src={value.previewUrl}
              alt="Screenshot preview"
              sx={{ maxWidth: '100%', maxHeight: 180, borderRadius: '8px', border: `2px solid ${INK}` }}
            />
            <Typography sx={{ fontSize: 13, fontWeight: 700, wordBreak: 'break-all' }}>{value.file.name}</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Click to swap it for another</Typography>
          </Stack>
        ) : (
          <Typography sx={{ fontWeight: 700 }}>Click or drop a PNG, JPG or WebP here</Typography>
        )}
      </Box>
      {error && (
        <Typography sx={{ ...helperSx, color: 'error.main', mb: 1 }} role="alert">
          {error}
        </Typography>
      )}
      <Typography sx={helperSx}>AI looks it over for overlaps, cut-off text, spacing and broken layout, then writes the fixes.</Typography>
    </Box>
  )
}

export default function Dashboard({ symptoms }: DashboardProps) {
  const checkedCount = symptoms.length
  const [tab, setTab] = useState<CheckupTab>('Link')
  const [link, setLink] = useState('')
  const [code, setCode] = useState('')
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const navigate = useNavigate()

  const ready = {
    Link: isValidSiteUrl(link),
    'Paste code': code.trim() !== '',
    Screenshot: screenshot !== null,
  }[tab]

  const selectTab = (label: CheckupTab) => {
    setTab(label)
    setError('')
  }

  const runCheckup = async () => {
    setError('')
    setStarting(true)
    try {
      const checkup = await startCheckup(
        tab === 'Link'
          ? { url: link.trim() }
          : tab === 'Paste code'
            ? { code, symptoms }
            : { screenshot: screenshot!.previewUrl, symptoms },
      )
      navigate(`/checkups/${checkup.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
      setStarting(false)
    }
  }

  return (
    <Box component="section" sx={{ position: 'relative', justifySelf: 'center', width: '100%', maxWidth: 460 }}>
      <Box
        sx={{
          position: 'absolute',
          top: -34,
          left: -8,
          zIndex: 2,
          width: 76,
          height: 76,
          borderRadius: '999px',
          bgcolor: STEP_ORANGE,
          border: `2px solid ${INK}`,
          color: INK,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1.1,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        step<br />one
      </Box>

      <Paper
        sx={{
          position: 'relative',
          border: `2px solid ${INK}`,
          borderRadius: '28px',
          p: { xs: 3, sm: 4 },
          pt: 5,
          boxShadow: `10px 10px 0 ${INK}`,
        }}
      >
        <Typography variant="h2" sx={{ fontSize: 24, letterSpacing: '-0.3px', mb: 2.5 }}>
          Show us the patient
        </Typography>

        <Stack
          direction="row"
          sx={{
            bgcolor: 'background.default',
            border: `2px solid ${INK}`,
            borderRadius: 999,
            p: 0.5,
            mb: 2.5,
          }}
        >
          {CHECKUP_TABS.map((label) => (
            <Box
              key={label}
              component="button"
              onClick={() => selectTab(label)}
              sx={{
                flex: 1,
                border: 0,
                borderRadius: 999,
                py: 1,
                fontWeight: 700,
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: tab === label ? INK : 'transparent',
                color: tab === label ? '#fff' : INK,
              }}
            >
              {label}
            </Box>
          ))}
        </Stack>

        {tab === 'Link' && <LinkPanel value={link} onChange={setLink} />}
        {tab === 'Paste code' && <PasteCodePanel value={code} onChange={setCode} />}
        {tab === 'Screenshot' && <ScreenshotPanel value={screenshot} onChange={setScreenshot} />}

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={runCheckup}
          disabled={!ready || starting}
          startIcon={starting ? <CircularProgress size={18} thickness={6} color="inherit" /> : undefined}
          sx={{ py: 1.5, fontSize: 16, mt: 3 }}
        >
          {starting ? 'Starting the checkup…' : 'Run the vibe check'}
        </Button>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}


        <Typography sx={{ textAlign: 'center', fontSize: 12.5, color: 'text.secondary', mt: 2 }}>
          {checkedCount} symptoms picked. Takes about 30 seconds.
        </Typography>
      </Paper>
    </Box>
  )
}

const labelSx = { fontSize: 13, fontWeight: 700, mb: 1 }
const helperSx = { fontSize: 12.5, color: 'text.secondary', mb: 3 }
