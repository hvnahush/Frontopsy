import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { INK } from '../theme'

interface LoginPromptDialogProps {
  open: boolean
  onClose: () => void
  onLogin: () => void
}

export default function LoginPromptDialog({ open, onClose, onLogin }: LoginPromptDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            border: `2px solid ${INK}`,
            borderRadius: '24px',
            boxShadow: `8px 8px 0 ${INK}`,
            maxWidth: 380,
          },
        },
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ fontSize: 22, letterSpacing: '-0.3px', mb: 1 }}>
          Hold up, bestie.
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>
          You need an account to run a vibe check or see your past checkups. It's free and takes 20 seconds.
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
          <Button variant="outlined" onClick={onClose}>
            Not now
          </Button>
          <Button variant="contained" onClick={onLogin}>
            Log in
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
