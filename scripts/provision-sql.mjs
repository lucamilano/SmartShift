import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';

const quote = value => "'" + value.replaceAll("'", "''") + "'";

export async function provisionSql(email, password, role) {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['admin', 'user'].includes(role)) throw new Error('Invalid email or role');
  if (password.length < 12 || password.length > 128) throw new Error('Password must have 12-128 characters');
  const id = quote(randomUUID());
  const mail = quote(email);
  const hash = quote(await hashPassword(password));
  const now = Date.now();
  // Existing roles and disabled status are retained. Explicit reset revokes all sessions.
  return `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (${id}, '', ${mail}, 0, ${now}, ${now}) ON CONFLICT(email) DO NOTHING;
INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    SELECT id || ':credential', id, 'credential', id, ${hash}, ${now}, ${now} FROM "user" WHERE email = ${mail}
    ON CONFLICT(id) DO UPDATE SET password = excluded.password, "updatedAt" = excluded."updatedAt";
INSERT INTO profili (id, email, ruolo, auth_user_id)
    SELECT id, email, ${quote(role)}, id FROM "user" WHERE email = ${mail}
    ON CONFLICT(email) DO UPDATE SET auth_user_id = excluded.auth_user_id;
DELETE FROM session WHERE "userId" IN (SELECT id FROM "user" WHERE email = ${mail});
`;
}
