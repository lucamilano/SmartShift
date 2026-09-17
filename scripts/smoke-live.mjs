// Read credentials locally; never print passwords, session cookies, or auth bodies.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

const [base, credentialFile] = process.argv.slice(2);
if (!base || !credentialFile) throw new Error('Usage: node scripts/smoke-live.mjs URL LOCAL_CREDENTIAL_FILE');
const credentialText = readFileSync(credentialFile, 'utf8');
const email = credentialText.match(/^Email: (.+)$/m)?.[1];
const password = credentialText.match(/^Password: (.+)$/m)?.[1];
assert.ok(email && password, 'Missing local credentials');
let cookie = '';
const request = (path, options = {}) => fetch(base + path, { redirect: 'manual', ...options, headers: { Cookie: cookie, ...options.headers } });
let signedIn = false;
try {
  const anonymous = await request('/api/export-excel');
  assert.equal(anonymous.status, 401);
  const login = await request('/api/auth/sign-in/email', {
    method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200, 'Login must succeed');
  cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert.ok(cookie, 'Session cookie is required');
  signedIn = true;
  console.log('Login: OK (session cookie received)');
  for (const route of ['/dashboard', '/dashboard/calendario', '/dashboard/team', '/dashboard/esporta', '/dashboard/account']) {
    const response = await request(route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(html.includes('SmartShift'), route);
    // Verify that assets are served through the Pages-to-Worker binding too.
    const asset = html.match(/src="(\/_next\/static\/[^"?]+\.js)/)?.[1];
    if (asset) assert.equal((await request(asset)).status, 200, 'JavaScript asset');
    console.log(`${route}: OK`);
  }
  const exported = await request('/api/export-excel?month=8&year=2026');
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get('cache-control'), /no-store/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  assert.equal(workbook.worksheets[0].name, 'settembre 2026');
  console.log('Excel: OK (valid workbook)');
  assert.equal((await request('/api/export-excel?month=12&year=2026')).status, 400);
} finally {
  if (signedIn) {
    const logout = await request('/api/auth/sign-out', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(logout.status, 200, 'Logout must succeed');
    assert.equal((await request('/api/export-excel')).status, 401, 'Session must be revoked');
    console.log('Logout and session revocation: OK');
  }
}
