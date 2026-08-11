import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'arth_session'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

function getSecretKey() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}

export async function signSession(user) {
  return new SignJWT({ sub: user.id, email: user.email, accountType: user.accountType, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey())
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
}
