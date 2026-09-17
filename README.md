# SmartShift

Gestione presenze, smartworking, ferie e malattia con calendario, amministrazione utenti ed export Excel.

Corporate attendance and shift planner with personal calendars, user administration, and Excel reports.

[Apri SmartShift](https://smartshift-164.pages.dev) · [Guida Cloudflare](CLOUDFLARE.md) · [Cronologia modifiche](CHANGELOG.md)

## Novità: migrazione a Cloudflare

Dal 17 settembre 2026 il progetto usa Cloudflare per hosting, database e autenticazione. Il login passa dal magic link a **email e password**, con cambio password nella pagina Account. Calendario, gestione dei profili, disattivazione utenti ed esportazione Excel restano disponibili.

La migrazione parte da un database nuovo: utenti e dati di Supabase non vengono importati. Non occorre configurare Cloudflare Access o un team Zero Trust. I dettagli delle modifiche sono nel [changelog](CHANGELOG.md#2026-09-17--migrazione-a-cloudflare).

## Stack

- **Cloudflare Pages**: indirizzo pubblico `smartshift-164.pages.dev`.
- **Cloudflare Workers**: applicazione Next.js App Router con OpenNext.
- **Cloudflare D1**: profili, presenze, credenziali e sessioni.
- **Better Auth**: login email/password, sessioni, cambio password e limiti ai tentativi.
- React, Tailwind CSS, Shadcn/Radix UI, date-fns ed ExcelJS.

Non servono Supabase, Vercel o Cloudflare Access/Zero Trust. Le registrazioni pubbliche sono disabilitate. Il database parte vuoto, senza importare dati precedenti.

## Sviluppo locale

Richiede Node.js 22.13+. Su PowerShell con script disabilitati usare `npm.cmd` e `npx.cmd`.

```sh
npm ci
```

Copiare `.dev.vars.example` in `.dev.vars` e impostare un segreto casuale di almeno 32 caratteri, poi:

```sh
npm run db:migrate:local
npm run auth:provision -- --local admin@example.com admin
npm run dev -- --hostname 127.0.0.1
```

Sostituire `admin@example.com` con la propria email. Il comando di provisioning salva le credenziali iniziali in un file locale dentro `.wrangler/private`, escluso da Git. Usarle su [127.0.0.1:3000](http://127.0.0.1:3000), cambiare la password dalla pagina Account (icona della chiave) e cancellare il file iniziale. Rieseguire il provisioning per un account esistente ne reimposta la password.

## Test e distribuzione

```sh
npm test
npm run typecheck
npm run lint
npm run deploy
```

Configurazione, recupero password, database e pubblicazione: **[CLOUDFLARE.md](CLOUDFLARE.md)**.

Cloudflare setup and deployment instructions are documented in [CLOUDFLARE.md](CLOUDFLARE.md) (Italian).

Il push su GitHub aggiorna il codice e questa documentazione; **non avvia automaticamente un deploy**. La pubblicazione su Cloudflare avviene con `npm run deploy`. La guida descrive anche le migrazioni del database e il recupero dell'accesso.

## Documentazione

| Documento | Contenuto |
| --- | --- |
| [README](README.md) | Panoramica, novità e avvio rapido |
| [Guida Cloudflare](CLOUDFLARE.md) | Architettura, configurazione, account, database e deploy |
| [Changelog](CHANGELOG.md) | Modifiche datate e cambiamenti da considerare negli aggiornamenti |

## Licenza

[MIT](LICENSE)
