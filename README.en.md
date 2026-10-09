# SmartShift

[🇮🇹 Italiano](README.md) | **🇬🇧 English**

SmartShift is a web application for planning team attendance, remote work and leave. Each user manages their own calendar, while administrators coordinate colleagues' schedules, manage accounts and export monthly summaries to Excel.

## Main features

| Area | Features |
| --- | --- |
| Personal calendar | Add events for a single day or multiple days and remove events. Track office attendance, remote work, vacation, personal leave and sick leave, including half days. |
| Team calendar | View colleagues' schedules by day, available to authenticated users who have completed first-time access. |
| Dashboard | Daily status, the current working week and monthly summaries: personal data for users and team aggregates for administrators. An administrator insight shows consecutive remote-work Fridays that have already occurred in the current month. |
| Administration | Manage users and `user`/`admin` roles, edit colleagues' calendars and remove accounts while retaining anonymized historical records. The Team view shows daily attendance. |
| Invitations and access | Email/password login, invitations with a temporary password valid for 24 hours, a mandatory password change on first-time access and invitation resending. The Account page supports password changes. |
| Export | Monthly team attendance summaries in Excel format, available to administrators only. |
| Interface | Responsive layout with light and dark themes. |

## Technology stack

Declared versions and dependencies are listed in [package.json](package.json); [package-lock.json](package-lock.json) pins the installed versions.

| Area | Technologies |
| --- | --- |
| Application | Next.js 16 (App Router), React 19, TypeScript 5 |
| Interface | Tailwind CSS 4, Radix UI, Lucide React, next-themes |
| Server runtime | Cloudflare Workers with OpenNext (`@opennextjs/cloudflare`) |
| Public entry point | Cloudflare Pages with a service binding to the Worker |
| Database | Cloudflare D1 and versioned SQL migrations |
| Authentication | Better Auth, email/password and sessions stored in D1 |
| Transactional email | Resend for invitations |
| Dates and exports | date-fns, ExcelJS |
| Checks and tooling | Node.js test runner via tsx, ESLint, TypeScript, Wrangler, GitHub Actions |

## Application architecture and Cloudflare

Next.js handles pages, API routes and server operations. Data access lives in the server repository, which checks account status, roles and ownership before querying D1. Better Auth stores users, credentials and sessions in the same database.

```text
Browser
  → Cloudflare Pages (smartshift.pages.dev)
    → Private service binding SMARTSHIFT
      → SmartShift Worker (Next.js / OpenNext)
        → D1 (application data, authentication and sessions)
        → Resend (invitation delivery, when configured)
```

The Pages gateway forwards requests while preserving the public URL, cookies and client IP. The backend has `workers_dev` and `preview_urls` disabled. Configuration files are [wrangler.jsonc](wrangler.jsonc), [cloudflare-pages/wrangler.jsonc](cloudflare-pages/wrangler.jsonc), [open-next.config.ts](open-next.config.ts) and [next.config.ts](next.config.ts).

For resource creation, remote migrations, provisioning and deployment, follow [CLOUDFLARE.md](CLOUDFLARE.md). The `npm run deploy` script publishes the Worker first, then Pages; deploying to another Cloudflare account requires adapting the resources and configuration as described in that guide.

## Prerequisites

- Node.js **22.13 or later** and npm.
- For deployment: a Cloudflare account with access to Workers, Pages and D1.
- For email invitations: a Resend API key and a sender with a verified domain. Email delivery is optional for local development.

## Installation and local development

1. From the repository directory, install dependencies using the lockfile:

   ```sh
   npm ci
   ```

2. Copy the local environment template.

   PowerShell:

   ```powershell
   Copy-Item .dev.vars.example .dev.vars
   ```

   POSIX shell:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

3. Edit `.dev.vars`: keep `APP_URL=http://127.0.0.1:3000` and replace the `BETTER_AUTH_SECRET` placeholder with a random secret of at least 32 characters. Configure Resend only if needed, as described in the next section.

4. Apply the migrations and provision the first local administrator:

   ```sh
   npm run db:migrate:local
   npm run auth:provision -- --local admin@example.com admin
   ```

   Replace the example email with your preferred address. The script saves the initial password in `.wrangler/private/local-login-*.txt`, excluded from Git, without printing it to the terminal. If the account already exists, provisioning replaces its password and revokes its sessions while preserving its existing role and active/inactive status.

5. Start the application:

   ```sh
   npm run dev -- --hostname 127.0.0.1
   ```

   Open `http://127.0.0.1:3000` and sign in using the credentials from the local file. Use the same hostname as `APP_URL` to satisfy origin checks, including the first-time access flow. Change the password from the Account page and delete the initial credentials file.

The local database in `.wrangler/state` is separate from remote D1. Public registration is disabled: add colleagues through the Team panel or provisioning. Forgotten passwords are reset through provisioning; email password recovery is not configured.

## Environment variables

The [.dev.vars.example](.dev.vars.example) template contains a local URL, example values and secret placeholders. Configure `.dev.vars` without committing it.

| Variable | Purpose and configuration |
| --- | --- |
| `APP_URL` | Application origin: `http://127.0.0.1:3000` during development, the public HTTPS URL in production. |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters, required for authentication. Use separate values for local development and production. |
| `RESEND_API_KEY` | Resend secret, required only for email invitation delivery. Remove the placeholder if email delivery is not configured. |
| `EMAIL_FROM` | Sender with a verified domain in Resend, required for email delivery. |
| `EMAIL_FROM_NAME` | Sender display name; the code defaults to `SmartShift`. |

In production, `APP_URL`, `EMAIL_FROM` and `EMAIL_FROM_NAME` are variables in `wrangler.jsonc`; configure `BETTER_AUTH_SECRET` and `RESEND_API_KEY` as Cloudflare secrets. Do not put secrets in versioned files, terminal history or issues. Deployment through GitHub Actions also requires the `CLOUDFLARE_API_TOKEN` repository secret, documented in [CLOUDFLARE.md](CLOUDFLARE.md).

Without valid email configuration, the invited account is still created and delivery is marked as failed. The temporary password is shown once to the administrator as a fallback and must be shared through a secure channel. After correcting the configuration, resending generates a new password and invalidates the previous one.

## Tests and checks

```sh
npm test
npm run lint
npm run typecheck
npm run build:cloudflare
```

Tests cover authentication, logout, password changes, origin/CSRF checks, rate limiting, disabled public registration, calendar operations and half days, user isolation, administrator privileges, dashboard summaries and invitations. Automated tests do not require production credentials.

`npm run preview` builds with OpenNext and starts a local preview of the Workers runtime. To test login, match `APP_URL` to the preview origin. The Next.js build uses Webpack; on Windows, stop the development server before building for Cloudflare to avoid file locks on `.open-next/assets`.

The [deploy.yml](.github/workflows/deploy.yml) workflow runs tests, lint, the Cloudflare build and TypeScript checks on pull requests targeting `main` and on `main`. Production deployment runs only on `main`, with the Cloudflare token configured: it applies remote migrations, publishes the Worker and Pages, and checks the public site. Smoke test scripts are also available as described in [CLOUDFLARE.md](CLOUDFLARE.md).

## Repository structure

```text
src/
  app/                 Next.js pages, API routes and server actions
  components/          UI components, navigation and themes
  lib/                 Authentication, D1 repository, dashboard and invitations
  utils/               Holiday utilities
migrations/            D1 schema and SQL migrations
tests/                 Tests for auth, repository, dashboard and invitations
scripts/               Provisioning and public site checks
cloudflare-pages/      Pages gateway and service binding configuration
public/                Headers for public content
.github/workflows/     CI checks and Cloudflare deployment
wrangler.jsonc         Worker configuration and D1 binding
open-next.config.ts    OpenNext configuration
next.config.ts         Next.js configuration and local Cloudflare integration
```

Reference documents: [Cloudflare guide](CLOUDFLARE.md), [repository audit](REPOSITORY_AUDIT.md) and [changelog](CHANGELOG.md). The operational guide and audit are currently in Italian; the audit records checks performed as of the date stated in that document.

## Security

- Public registration is disabled. Server-side authorization checks account status, roles and ownership.
- D1 queries use parameterized statements; the server repository enforces data access checks.
- Passwords use scrypt hashing. Session cookies are HttpOnly, with the Secure flag over HTTPS. Origin checks and rate limiting are enforced, with rate limits persisted in D1. Login is limited to five requests per minute per IP.
- Application access and export are blocked until the temporary password has been changed. Export is restricted to administrators and uses `Cache-Control: private, no-store`.
- `.dev.vars`, local `.env*` files, `.wrangler/`, `.open-next/`, `.next/` and `node_modules/` are excluded from Git. Do not share passwords, session cookies or tokens in commits or logs.

For findings and limitations of the checks already performed, see [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md).

## MIT license

SmartShift is distributed under the [MIT license](LICENSE).
