import { createAsyncThunk, createSlice, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit'
import {
  authenticateUser,
  clearSession,
  readSession,
  registerUser,
  saveSession,
  upsertOAuthUser,
  type Credentials,
  type SignupDetails,
  type User,
} from './authStorage'

interface GoogleProfile {
  name: string
  email: string
  picture?: string
}

export const signup = createAsyncThunk<User, SignupDetails>(
  'auth/signup',
  async ({ name, email, password }) => {
    const user = await registerUser({ name, email, password })
    saveSession(user)
    return user
  },
)

export const login = createAsyncThunk<User, Credentials>(
  'auth/login',
  async ({ email, password }) => {
    const user = await authenticateUser({ email, password })
    saveSession(user)
    return user
  },
)

export const loginWithGoogle = createAsyncThunk<User, string>(
  'auth/loginWithGoogle',
  async (accessToken) => {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!response.ok) {
      throw new Error('Could not verify your Google account. Please try again.')
    }

    const profile: GoogleProfile = await response.json()
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

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface AuthState {
  user: User | null
  status: AuthStatus
  error: string | null
}

const initialState: AuthState = {
  user: readSession(),
  status: 'idle',
  error: null,
}

const authThunks = [signup, login, loginWithGoogle] as const

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
      .addMatcher(isPending(...authThunks), (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addMatcher(isFulfilled(...authThunks), (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
      })
      .addMatcher(isRejected(...authThunks), (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Something went wrong.'
      })
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
