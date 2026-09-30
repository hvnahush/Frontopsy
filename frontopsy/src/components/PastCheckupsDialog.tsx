import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { fetchCheckups } from '../features/checkups/checkupsApi'
import type { CheckupSummary } from '../features/checkups/types'
import { INK } from '../theme'
import { Tag } from './report/reportUi'
import { LIME, MONO, PINK, YELLOW } from './report/reportTheme'

function scoreColor(score: number) {
  return score >= 90 ? LIME : score >= 50 ? YELLOW : PINK
}

// Mounted only while the dialog is open (MUI unmounts closed dialog content), so each open fetches fresh.
function CheckupList({ onClose }: { onClose: () => void }) {
  const [checkups, setCheckups] = useState<CheckupSummary[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchCheckups()
      .then((list) => !cancelled && setCheckups(list))
      .catch((caught) => !cancelled && setError(caught instanceof Error ? caught.message : 'Something went wrong.'))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {error && <Typography color="error">{error}</Typography>}
      {!error && !checkups && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: PINK }} />
        </Box>
      )}
      {checkups?.length === 0 && (
        <Typography sx={{ py: 2 }}>No past checkups yet. Run your first one to start your history.</Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, pb: 1 }}>
        {checkups?.map((checkup) => (
          <ButtonBase
            key={checkup.id}
            component={RouterLink}
            to={`/checkups/${checkup.id}`}
            onClick={onClose}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              justifyContent: 'space-between',
              border: `2px solid ${INK}`,
              borderRadius: '14px',
              px: 2,
              py: 1.25,
              textAlign: 'left',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {checkup.url}
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {new Date(checkup.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
              {checkup.status === 'done' && checkup.speed !== null && checkup.looks !== null ? (
                <>
                  <Tag bgcolor={scoreColor(checkup.speed)}>speed {checkup.speed}</Tag>
                  <Tag bgcolor={scoreColor(checkup.looks)}>looks {checkup.looks}</Tag>
                </>
              ) : (
                <Tag bgcolor={checkup.status === 'failed' ? '#fff' : YELLOW}>
                  {checkup.status === 'failed' ? 'didn’t finish' : 'running'}
                </Tag>
              )}
            </Box>
          </ButtonBase>
        ))}
      </Box>
    </>
  )
}

export default function PastCheckupsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { border: `2px solid ${INK}`, borderRadius: '22px', boxShadow: `8px 8px 0 ${INK}` } } }}
    >
      <DialogTitle sx={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 24 }}>past checkups</DialogTitle>
      <DialogContent>
        <CheckupList onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
