import { betterAuth, type BetterAuthOptions } from 'better-auth'

export function createAuth(database: BetterAuthOptions['database'], config: { baseURL: string; secret: string }) {
  if (!config.secret || config.secret.length < 32) throw new Error('BETTER_AUTH_SECRET must have at least 32 characters')
  return betterAuth({
    appName: 'SmartShift', database, baseURL: config.baseURL, secret: config.secret,
    trustedOrigins: [config.baseURL],
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
