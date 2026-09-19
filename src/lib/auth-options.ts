import { betterAuth, type BetterAuthOptions } from 'better-auth'

export function createAuth(database: BetterAuthOptions['database'], config: { baseURL: string; secret: string }) {
  if (!config.secret || config.secret.length < 32) throw new Error('BETTER_AUTH_SECRET must have at least 32 characters')
  const configuredURL = new URL(config.baseURL)
  const trustedOrigins = [configuredURL.origin]
  if (configuredURL.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(configuredURL.hostname)) {
    const alternateHost = configuredURL.hostname === 'localhost' ? '127.0.0.1' : 'localhost'
    trustedOrigins.push(`${configuredURL.protocol}//${alternateHost}${configuredURL.port ? `:${configuredURL.port}` : ''}`)
  }
  return betterAuth({
    appName: 'SmartShift', database, baseURL: config.baseURL, secret: config.secret,
    trustedOrigins,
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: {
      enabled: true, storage: 'database', window: 60, max: 100,
      customRules: { '/sign-in/email': { window: 60, max: 5 }, '/change-password': { window: 60, max: 5 } },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      useSecureCookies: config.baseURL.startsWith('https://'),
    },
  })
}
