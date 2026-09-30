import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Logo from '../components/Logo'
import { INK } from '../theme'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../utils/constants'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearAuthError, login, loginWithGoogle, signup } from '../features/auth/authSlice'

type AuthMode = 'login' | 'signup'

interface AuthForm {
  name: string
  email: string
  password: string
  confirm: string
}

interface GoogleContinueButtonProps {
  onToken: (accessToken: string) => void
  onError: (message: string) => void
  disabled: boolean
}

interface FieldLabelProps {
  htmlFor: string
  children: ReactNode
  action?: ReactNode
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
)

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

function GoogleContinueButton({ onToken, onError, disabled }: GoogleContinueButtonProps) {
  const googleLoginHandler = useGoogleLogin({
    onSuccess: (tokenResponse) => onToken(tokenResponse.access_token),
    onError: () => onError('Google sign-in failed. Please try again.'),
  })

  return (
    <Button
      fullWidth
      variant="outlined"
      startIcon={<GoogleIcon />}
      onClick={() => googleLoginHandler()}
      disabled={disabled}
    >
      Continue with Google
    </Button>
  )
}

function FieldLabel({ htmlFor, children, action }: FieldLabelProps) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
      <Typography component="label" htmlFor={htmlFor} sx={{ fontSize: 13, fontWeight: 700 }}>
        {children}
      </Typography>
      {action}
    </Stack>
  )
}

export default function AuthPage() {
  const dispatch = useAppDispatch()
  const { status, error } = useAppSelector((state) => state.auth)

  const [searchParams, setSearchParams] = useSearchParams()
  const mode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<AuthForm>({ name: '', email: '', password: '', confirm: '' })
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  const isLoading = status === 'loading'

  // Don't show an error left over from an earlier visit to this page.
  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const switchMode = (_event: MouseEvent<HTMLElement>, nextMode: AuthMode | null) => {
    if (!nextMode || nextMode === mode) return
    setSearchParams(nextMode === 'signup' ? { mode: 'signup' } : {}, { replace: true })
    setFormError('')
    setNotice('')
    dispatch(clearAuthError())
  }

  const handleChange = (field: keyof AuthForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    setNotice('')

    if (mode === 'signup') {
      if (!form.name.trim()) return setFormError('Tell us your name.')
      if (form.password.length < 6) return setFormError('Password needs at least 6 characters.')
      if (form.password !== form.confirm) return setFormError('Passwords don’t match.')
      dispatch(signup({ name: form.name, email: form.email, password: form.password }))
      return
    }

    dispatch(login({ email: form.email, password: form.password }))
  }

  return (
    <Box sx={pageBgSx}>
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 5, md: 7 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
          gap: { xs: 7, md: 6 },
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Box component="section" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
          <ButtonBase component={RouterLink} to="/" aria-label="Frontopsy home" sx={{ borderRadius: 999 }}>
            <Logo />
          </ButtonBase>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 40, sm: 52, md: 62 },
              lineHeight: 1.02,
              letterSpacing: '-1.5px',
              mt: 3.5,
              mb: 2,
            }}
          >
            {mode === 'login' ? (
              <>Welcome back,<br />bestie.</>
            ) : (
              <>let's fix this,<br />together.</>
            )}
          </Typography>

          <Typography
            sx={{ maxWidth: '46ch', fontSize: 17, lineHeight: 1.5, color: 'text.secondary', mb: 5, mx: { xs: 'auto', md: 0 } }}
          >
            {mode === 'login'
              ? 'Your past checkups and glow-up plans are right where you left them.'
              : 'Sign up for free scans, glow-up plans, and a paper trail of every fix you ship.'}
          </Typography>

          <Box sx={{ position: 'relative', maxWidth: 480, pb: 7, mx: { xs: 'auto', md: 0 } }}>
            <Paper
              sx={{
                position: 'relative',
                border: `2px solid ${INK}`,
                borderRadius: '20px',
                p: 2.75,
                boxShadow: `6px 6px 0 ${INK}`,
              }}
            >
              <Chip
                label="big yikes"
                size="small"
                sx={{ bgcolor: '#ffe0ef', color: '#c40f68', fontWeight: 700 }}
              />
              <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: '-0.2px', my: 1.5 }}>
                3 scripts block your first paint
              </Typography>
              <Box sx={{ bgcolor: INK, borderRadius: '10px', px: 1.75, py: 1.25 }}>
                <Typography component="code" sx={{ color: '#d7ffb8', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                  &lt;script src="app.js" defer&gt;
                </Typography>
              </Box>
            </Paper>

            <Box
              sx={{
                position: 'absolute',
                top: -34,
                right: -18,
                width: 128,
                height: 128,
                borderRadius: '999px',
                bgcolor: 'primary.main',
                border: `2px solid ${INK}`,
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: `5px 5px 0 ${INK}`,
              }}
            >
              <Typography sx={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 34, lineHeight: 1 }}>94</Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, maxWidth: 84, lineHeight: 1.2 }}>
                after the glow-up
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} sx={{ position: 'absolute', bottom: 0, left: { xs: '50%', md: -8 }, transform: { xs: 'translateX(-50%)', md: 'none' } }}>
              <Chip label="no more sideways scroll" sx={{ bgcolor: 'warning.main', transform: 'rotate(-4deg)', fontWeight: 700 }} />
              <Chip label="5/5 fixes done" sx={{ bgcolor: 'success.main', transform: 'rotate(3deg)', fontWeight: 700 }} />
            </Stack>
          </Box>
        </Box>

        <Box component="section" sx={{ position: 'relative', justifySelf: 'center', width: '100%', maxWidth: 460 }}>
          <Chip
            label={mode === 'login' ? 'missed you' : "let's go"}
            sx={{
              position: 'absolute',
              top: -18,
              right: 24,
              zIndex: 2,
              bgcolor: 'success.main',
              transform: 'rotate(4deg)',
              fontWeight: 700,
            }}
          />

          <Paper
            sx={{
              position: 'relative',
              border: `2px solid ${INK}`,
              borderRadius: '28px',
              p: { xs: 3, sm: 4 },
              boxShadow: `10px 10px 0 ${INK}`,
            }}
          >
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={switchMode}
              fullWidth
              sx={{
                bgcolor: 'background.default',
                border: `2px solid ${INK}`,
                borderRadius: 999,
                p: 0.5,
                mb: 3,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 0,
                  borderRadius: '999px !important',
                  fontWeight: 600,
                  color: INK,
                  py: 1,
                },
                '& .Mui-selected': {
                  bgcolor: `${INK} !important`,
                  color: '#fff !important',
                },
              }}
            >
              <ToggleButton value="login">Log in</ToggleButton>
              <ToggleButton value="signup">Sign up</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="h2" sx={{ fontSize: 26, letterSpacing: '-0.4px', mb: 2.5 }}>
              {mode === 'login' ? 'Log in to Frontopsy' : 'Create your Frontopsy account'}
            </Typography>

            <Box sx={{ mb: 2.5 }}>
              {googleClientId ? (
                <GoogleContinueButton
                  onToken={(accessToken) => dispatch(loginWithGoogle(accessToken))}
                  onError={setFormError}
                  disabled={isLoading}
                />
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  disabled
                  title="Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in"
                >
                  Continue with Google
                </Button>
              )}
            </Box>

            <Divider
              sx={{
                mb: 2.5,
                color: 'text.secondary',
                fontSize: 12.5,
                fontWeight: 600,
                '&::before, &::after': { borderColor: INK, borderTopWidth: 2 },
              }}
            >
              or use your email
            </Divider>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2}>
                {mode === 'signup' && (
                  <Box>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <TextField
                      id="name"
                      fullWidth
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange('name')}
                      required
                    />
                  </Box>
                )}

                <Box>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <TextField
                    id="email"
                    type="email"
                    fullWidth
                    placeholder="you@email.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                  />
                </Box>

                <Box>
                  <FieldLabel
                    htmlFor="password"
                    action={
                      mode === 'login' && (
                        <Link
                          component="button"
                          type="button"
                          onClick={() => setNotice('Password reset isn’t available yet. Email us and we’ll sort it out.')}
                          sx={{ fontSize: 12.5, fontWeight: 600 }}
                        >
                          Forgot it?
                        </Link>
                      )
                    }
                  >
                    Password
                  </FieldLabel>
                  <TextField
                    id="password"
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                    slotProps={{
                      htmlInput: { minLength: 6 },
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword((s) => !s)}
                              edge="end"
                              size="small"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                {mode === 'signup' && (
                  <Box>
                    <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                    <TextField
                      id="confirm"
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={form.confirm}
                      onChange={handleChange('confirm')}
                      required
                    />
                  </Box>
                )}

                {(formError || error) && <Alert severity="error">{formError || error}</Alert>}
                {notice && <Alert severity="info">{notice}</Alert>}

                <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
                  {isLoading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
                </Button>
              </Stack>
            </Box>

            <Typography sx={{ textAlign: 'center', fontSize: 13.5, color: 'text.secondary', mt: 2.5 }}>
              {mode === 'login' ? (
                <>New here? Hit Sign up above. It takes 20 seconds.</>
              ) : (
                <>Already have an account? Hit Log in above.</>
              )}
            </Typography>
            <Typography sx={{ textAlign: 'center', fontSize: 13, color: 'text.secondary', mt: 1 }}>
              Trouble getting in? Email{' '}
              <Link href={SUPPORT_MAILTO} sx={{ fontWeight: 700, color: INK }}>
                {SUPPORT_EMAIL}
              </Link>
            </Typography>
          </Paper>
        </Box>
      </Box>
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
