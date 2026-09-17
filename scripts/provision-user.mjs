import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { provisionSql } from './provision-sql.mjs';

const [scope, email, role = 'user'] = process.argv.slice(2);
if (!['--local', '--remote'].includes(scope) || !email) {
  throw new Error('Usage: npm run auth:provision -- --local|--remote email admin|user');
}
const password = randomBytes(24).toString('base64url');
const sql = await provisionSql(email, password, role);
const folder = resolve('.wrangler/private');
mkdirSync(folder, { recursive: true });
const nonce = randomBytes(8).toString('hex');
const sqlFile = resolve(folder, `provision-${nonce}.sql`);
const credentialFile = resolve(folder, `${scope.slice(2)}-login-${nonce}.txt`);
writeFileSync(sqlFile, sql, { mode: 0o600 });
// Save before updating the DB so a process interruption never loses the password.
writeFileSync(credentialFile, `SmartShift\nEmail: ${email.toLowerCase()}\nPassword: ${password}\n\nChange the password from Account after signing in, then delete this file.\n`, { mode: 0o600 });
try {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', scope, `--file=${sqlFile}`], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (result.status !== 0) {
    // Never print CLI diagnostics: they can contain SQL/password hashes.
    throw new Error('Provisioning failed. Check Cloudflare login, migrations and database configuration.');
  }
  console.log(`Account ready. Credentials saved locally in ${credentialFile}`);
} finally { unlinkSync(sqlFile); }
