# SmartShift

SmartShift è un'applicazione web per pianificare e monitorare presenze, smartworking e assenze di un team. Gli utenti gestiscono il proprio calendario; gli amministratori possono gestire colleghi, pianificazioni ed esportazioni Excel.

## Funzionalità

- Calendario individuale con inserimento singolo o su più giorni.
- Presenze in ufficio, smartworking, ferie, permesso e malattia, anche per mezza giornata.
- Dashboard con situazione giornaliera, settimana corrente e riepilogo mensile.
- Vista team per giorno e indicatore dei venerdì consecutivi in smartworking.
- Gestione amministrativa di utenti e ruoli, inviti con password temporanea e cambio obbligatorio al primo accesso.
- Esportazione mensile in Excel per amministratori.
- Interfaccia responsive con tema chiaro e scuro.

## Stack e architettura

- Next.js 16, React 19, TypeScript e Tailwind CSS.
- Cloudflare Workers tramite OpenNext per l'applicazione server.
- Cloudflare Pages come ingresso pubblico su `smartshift.pages.dev` con service binding privato verso il Worker.
- Cloudflare D1 e migrazioni SQL versionate per dati, autenticazione e sessioni.
- Better Auth per login email/password, cookie HttpOnly e rate limiting.
- Resend per l'invio degli inviti, configurato esclusivamente tramite secret/variabili d'ambiente.

```text
Browser → Cloudflare Pages → Worker SmartShift → D1
```

Per il dettaglio operativo dell'infrastruttura, vedere [CLOUDFLARE.md](CLOUDFLARE.md).

## Requisiti

- Node.js 22.13 o successivo.
- Un account Cloudflare con accesso a Workers, Pages e D1 per il deploy.
- Una chiave Resend soltanto se si vogliono inviare inviti via email.

## Installazione locale

```sh
npm ci
copy .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev -- --hostname 127.0.0.1
```

Su shell POSIX usare `cp .dev.vars.example .dev.vars` al posto di `copy`.

Aprire quindi `http://127.0.0.1:3000`. La configurazione locale usa `127.0.0.1` anche per allinearsi alle origini autorizzate dell'autenticazione.

## Configurazione

Impostare in `.dev.vars` i valori necessari, senza committare il file:

| Variabile | Scopo |
| --- | --- |
| `APP_URL` | URL pubblico o locale dell'applicazione. |
| `BETTER_AUTH_SECRET` | Secret casuale di almeno 32 caratteri per le sessioni. |
| `RESEND_API_KEY` | Secret Resend per gli inviti email. |
| `EMAIL_FROM` | Indirizzo mittente verificato in Resend. |
| `EMAIL_FROM_NAME` | Nome visualizzato del mittente. |

Il file [.dev.vars.example](.dev.vars.example) contiene solo placeholder. In produzione `BETTER_AUTH_SECRET` e `RESEND_API_KEY` devono essere configurati come secret Cloudflare; non inserirli in file versionati, terminal history o issue.

## Verifiche

```sh
npm test
npm run lint
npm run typecheck
npm run build:cloudflare
```

La pipeline GitHub Actions esegue gli stessi controlli su pull request e `main`; il deploy di produzione avviene solo su `main` con i secret Cloudflare configurati.

## Struttura

```text
src/          App Next.js, API route, componenti e logica server
migrations/   Schema e migrazioni D1
tests/        Test automatici per auth, repository, dashboard e inviti
scripts/      Provisioning locale/amministrativo e smoke test pubblici
cloudflare-pages/  Ingresso Pages che inoltra al Worker
```

## Sicurezza

Registrazioni pubbliche disabilitate, autorizzazione server-side per ruolo/proprietà e query D1 parametrizzate sono parte dell'applicazione. Per l'analisi puntuale dello stato del repository, vedere [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md).

## Licenza

[MIT](LICENSE)
