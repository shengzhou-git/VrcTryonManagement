'use client'

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js'
import { jwtDecode } from 'jwt-decode'
import { cognitoConfig } from './config'

export type CognitoGroup = 'Admin' | 'ViewData'| 'SuperAdmin'

const AUTH_LOG_ENABLED = process.env.NODE_ENV !== 'production'
const AUTH_LOG_PREFIX = '[CognitoAuth]'

function maskEmail(email: string): string {
  const e = (email || '').trim()
  const at = e.indexOf('@')
  if (at <= 1) return e ? `${e[0] ?? ''}***` : ''
  const name = e.slice(0, at)
  const domain = e.slice(at)
  const head = name.slice(0, 2)
  return `${head}***${domain}`
}

function logInfo(message: string, extra?: Record<string, unknown>) {
  if (!AUTH_LOG_ENABLED) return
  if (extra) console.info(AUTH_LOG_PREFIX, message, extra)
  else console.info(AUTH_LOG_PREFIX, message)
}

function logWarn(message: string, extra?: Record<string, unknown>) {
  if (!AUTH_LOG_ENABLED) return
  if (extra) console.warn(AUTH_LOG_PREFIX, message, extra)
  else console.warn(AUTH_LOG_PREFIX, message)
}

function logError(message: string, err?: unknown, extra?: Record<string, unknown>) {
  if (!AUTH_LOG_ENABLED) return
  const e = err instanceof Error ? { name: err.name, message: err.message } : err
  if (extra) console.error(AUTH_LOG_PREFIX, message, e, extra)
  else console.error(AUTH_LOG_PREFIX, message, e)
}

export interface CognitoUserInfo {
  id: string
  name?: string
  email?: string
  phone?: string
  locale?: string
  bid?: string
  groups?: CognitoGroup[]
}

type JwtPayloadWithGroups = {
  'cognito:groups'?: string[] | string
}

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.userPoolClientId,
})

function normalizeGroups(groups?: string[] | string): CognitoGroup[] | undefined {
  if (!groups) return undefined
  if (Array.isArray(groups)) return groups as CognitoGroup[]
  return groups
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as CognitoGroup[]
}

export async function authCheck(): Promise<{ token: string | null; userinfo: CognitoUserInfo | null }> {
  logInfo('authCheck: start')
  const cognitoUser = userPool.getCurrentUser()
  if (!cognitoUser) {
    logInfo('authCheck: no current user')
    return { token: null, userinfo: null }
  }

  const username = cognitoUser.getUsername()
  logInfo('authCheck: got current user', { username })

  const session = await new Promise<any>((resolve, reject) => {
    cognitoUser.getSession((err: Error | null, s: any) => {
      if (err) return reject(err)
      return resolve(s)
    })
  })

  if (!session?.isValid?.()) {
    logWarn('authCheck: session is invalid', { username })
    return { token: null, userinfo: null }
  }

  const userinfo: CognitoUserInfo = {
    id: username,
  }

  const attrs = await new Promise<any[]>((resolve, reject) => {
    cognitoUser.getUserAttributes((err: Error | undefined, result: any[] | undefined) => {
      if (err) return reject(err)
      resolve(result || [])
    })
  })

  for (const a of attrs) {
    const name = a.getName?.()
    const value = a.getValue?.()
    if (name === 'name') userinfo.name = value
    if (name === 'email') userinfo.email = value
    if (name === 'phone_number') userinfo.phone = value
    if (name === 'locale') userinfo.locale = value
    if (name === 'custom:Bid') userinfo.bid = value
  }

  const jwtToken = session.getIdToken().getJwtToken() as string
  const decoded = jwtDecode<JwtPayloadWithGroups>(jwtToken)
  userinfo.groups = normalizeGroups(decoded['cognito:groups'])

  logInfo('authCheck: success', { username, groups: userinfo.groups })
  return { token: jwtToken, userinfo }
}

export async function getIdTokenOrThrow(): Promise<string> {
  const { token } = await authCheck()
  if (!token) throw new Error('NOT_AUTHENTICATED')
  return token
}

export function hasGroup(user: CognitoUserInfo | null, group: CognitoGroup): boolean {
  return !!user?.groups?.includes(group)
}

export async function signIn(email: string, password: string): Promise<{ token: string; userinfo: CognitoUserInfo }> {
  logInfo('signIn: start', { email: maskEmail(email) })
  const authenticationDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  })

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  })

  await new Promise<void>((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: () => {
        logInfo('signIn: authenticateUser success', { email: maskEmail(email) })
        resolve()
      },
      onFailure: (err: any) => {
        logError('signIn: authenticateUser failed', err, { email: maskEmail(email) })
        reject(err)
      },
      newPasswordRequired: () => {
        // 本需求不提供注册/强制改密流程。需要的话可后续补 UI。
        logWarn('signIn: newPasswordRequired', { email: maskEmail(email) })
        reject(new Error('NEW_PASSWORD_REQUIRED'))
      },
    })
  })

  const { token, userinfo } = await authCheck()
  if (!token || !userinfo) throw new Error('LOGIN_FAILED')
  logInfo('signIn: done', { userId: userinfo.id, groups: userinfo.groups })
  return { token, userinfo }
}

export function signOut(): void {
  const cognitoUser = userPool.getCurrentUser()
  logInfo('signOut: start', { hasCurrentUser: !!cognitoUser })
  cognitoUser?.signOut()
  logInfo('signOut: done')
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  logInfo('changePassword: start')
  const cognitoUser = userPool.getCurrentUser()
  if (!cognitoUser) {
    logWarn('changePassword: no current user')
    throw new Error('NOT_AUTHENTICATED')
  }

  const session = await new Promise<any>((resolve, reject) => {
    cognitoUser.getSession((err: Error | null, s: any) => {
      if (err) return reject(err)
      resolve(s)
    })
  })
  if (!session?.isValid?.()) {
    logWarn('changePassword: session invalid', { username: cognitoUser.getUsername() })
    throw new Error('NOT_AUTHENTICATED')
  }

  await new Promise<void>((resolve, reject) => {
    cognitoUser.changePassword(oldPassword, newPassword, (err: Error | undefined) => {
      if (err) return reject(err)
      resolve()
    })
  })
  logInfo('changePassword: success', { username: cognitoUser.getUsername() })
}


