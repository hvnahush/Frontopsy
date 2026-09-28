import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import {
  authenticateUser,
  clearSession,
  readSession,
  registerUser,
  saveSession,
  upsertOAuthUser,
} from './authStorage'

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ name, email, password }) => {
    const user = await registerUser({ name, email, password })
    saveSession(user)
    return user
  },
)

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }) => {
    const user = await authenticateUser({ email, password })
    saveSession(user)
    return user
  },
)

export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (accessToken) => {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error('Could not verify your Google account. Please try again.')
    }

    const profile = await response.json()
    const user = upsertOAuthUser({
      name: profile.name,
      email: profile.email,
      avatar: profile.picture,
      provider: 'google',
    })

    saveSession(user)
    return user
  },
)

const initialState = {
  user: readSession(),
  status: 'idle',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.status = 'idle'
      state.error = null
      clearSession()
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type.startsWith('auth/') && action.type.endsWith('/pending'),
        (state) => {
          state.status = 'loading'
          state.error = null
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('auth/') && action.type.endsWith('/fulfilled'),
        (state, action) => {
          state.status = 'succeeded'
          state.user = action.payload
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('auth/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.status = 'failed'
          state.error = action.error.message ?? 'Something went wrong.'
        },
      )
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
