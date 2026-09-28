import { createAsyncThunk, createSlice, isFulfilled, isPending, isRejected } from '@reduxjs/toolkit'
import {
  authenticateUser,
  authenticateWithGoogle,
  endSession,
  fetchSessionUser,
  registerUser,
  type Credentials,
  type SignupDetails,
  type User,
} from './authApi'

export const signup = createAsyncThunk<User, SignupDetails>('auth/signup', registerUser)

export const login = createAsyncThunk<User, Credentials>('auth/login', authenticateUser)

export const loginWithGoogle = createAsyncThunk<User, string>('auth/loginWithGoogle', authenticateWithGoogle)

export const restoreSession = createAsyncThunk<User | null>('auth/restoreSession', fetchSessionUser)

export const logout = createAsyncThunk('auth/logout', endSession)

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface AuthState {
  user: User | null
  status: AuthStatus
  error: string | null
  /** False until the initial session lookup finishes, so pages don't flash logged-out UI. */
  sessionChecked: boolean
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  sessionChecked: false,
}

const authThunks = [signup, login, loginWithGoogle] as const

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload
        state.sessionChecked = true
      })
      .addCase(restoreSession.rejected, (state) => {
        state.sessionChecked = true
      })
      .addCase(logout.pending, (state) => {
        state.user = null
        state.status = 'idle'
        state.error = null
      })
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

export const { clearAuthError } = authSlice.actions
export default authSlice.reducer
