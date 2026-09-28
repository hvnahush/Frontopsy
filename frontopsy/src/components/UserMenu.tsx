import { useState, type MouseEvent } from 'react'
import Avatar from '@mui/material/Avatar'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'
import { INK } from '../theme'

export default function UserMenu() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  if (!user) return null

  const firstName = user.name.split(' ')[0]

  const handleLogout = () => {
    setAnchor(null)
    dispatch(logout())
  }

  return (
    <>
      <ButtonBase
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        sx={{
          gap: 1,
          pl: 0.5,
          pr: 2,
          py: 0.5,
          bgcolor: '#fff',
          border: `2px solid ${INK}`,
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 14.5,
          fontFamily: 'inherit',
        }}
      >
        <Avatar
          src={user.avatar}
          sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700, border: `2px solid ${INK}` }}
        >
          {user.name[0]?.toUpperCase() ?? '?'}
        </Avatar>
        {firstName}
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { mt: 1, minWidth: 220, border: `2px solid ${INK}`, borderRadius: '16px', boxShadow: `5px 5px 0 ${INK}` },
          },
        }}
      >
        <Typography sx={{ px: 2, pt: 1, fontWeight: 700 }}>{user.name}</Typography>
        <Typography sx={{ px: 2, pb: 1, fontSize: 13, color: 'text.secondary' }}>{user.email}</Typography>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ fontWeight: 700 }}>
          Log out
        </MenuItem>
      </Menu>
    </>
  )
}
