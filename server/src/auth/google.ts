import { config } from '../config.js'
import { HttpError } from '../httpError.js'

interface TokenInfo {
  aud?: string
}

interface GoogleProfile {
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

const VERIFY_FAILED = 'Could not verify your Google account. Please try again.'

export async function verifyGoogleAccessToken(accessToken: string) {
  if (!config.GOOGLE_CLIENT_ID) {
    throw new HttpError(503, 'Google sign-in is not configured.')
  }

  // Confirm the token was issued to our OAuth client, not some other app.
  const infoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  )
  if (!infoResponse.ok) throw new HttpError(401, VERIFY_FAILED)
  const info = (await infoResponse.json()) as TokenInfo
  if (info.aud !== config.GOOGLE_CLIENT_ID) throw new HttpError(401, VERIFY_FAILED)

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!profileResponse.ok) throw new HttpError(401, VERIFY_FAILED)
  const profile = (await profileResponse.json()) as GoogleProfile

  if (!profile.email || profile.email_verified !== true) {
    throw new HttpError(401, 'Your Google email address is not verified.')
  }

  const email = profile.email.toLowerCase()
  return {
    email,
    name: profile.name?.trim() || email.split('@')[0]!,
    avatar: profile.picture,
  }
}
