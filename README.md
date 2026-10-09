# SmartShift

**🇮🇹 Italiano** | [🇬🇧 English](README.en.md)

SmartShift è un'applicazione web per pianificare presenze, smartworking e assenze di un team. Ogni utente gestisce il proprio calendario; gli amministratori coordinano le pianificazioni dei colleghi, gestiscono gli account ed esportano i riepiloghi mensili in Excel.

## Funzionalità principali

| Area | Funzionalità |
| --- | --- |
| Calendario personale | Inserimento di eventi singoli o su più giorni e rimozione degli eventi. Presenze in ufficio, smartworking, ferie, permesso e malattia, anche per mezza giornata. |
| Calendario del team | Consultazione della pianificazione dei colleghi per giorno, disponibile agli utenti autenticati che hanno completato il primo accesso. |
| Dashboard | Situazione giornaliera, settimana lavorativa corrente e riepilogo mensile: personali per gli utenti, aggregati per gli amministratori. Indicatore amministrativo delle serie di venerdì consecutivi in smartworking già trascorsi nel mese. |
| Amministrazione | Gestione di utenti e ruoli `user`/`admin`, modifica dei calendari dei colleghi e rimozione degli account con archiviazione anonimizzata dello storico. Vista Team con situazione giornaliera. |
| Inviti e accesso | Login email/password, inviti con password temporanea valida 24 ore, cambio obbligatorio al primo accesso e reinvio degli inviti. Pagina Account per il cambio password. |
| Esportazione | Riepilogo mensile del team in formato Excel, riservato agli amministratori. |
| Interfaccia | Layout responsive e tema chiaro/scuro. |

## Stack tecnologico

Le versioni e le dipendenze dichiarate sono consultabili in [package.json](package.json); [package-lock.json](package-lock.json) fissa le versioni installate.

| Ambito | Tecnologie |
| --- | --- |
| Applicazione | Next.js 16 (App Router), React 19, TypeScript 5 |
| Interfaccia | Tailwind CSS 4, Radix UI, Lucide React, next-themes |
| Runtime server | Cloudflare Workers con OpenNext (`@opennextjs/cloudflare`) |
| Ingresso pubblico | Cloudflare Pages con service binding verso il Worker |
| Database | Cloudflare D1 e migrazioni SQL versionate |
| Autenticazione | Better Auth, email/password e sessioni in D1 |
| Email transazionali | Resend per gli inviti |
| Date ed esportazioni | date-fns, ExcelJS |
| Verifiche e strumenti | Node.js test runner tramite tsx, ESLint, TypeScript, Wrangler, GitHub Actions |

## Architettura applicativa e Cloudflare

Next.js gestisce pagine, API route e operazioni server. La logica di accesso ai dati risiede nel repository server, che verifica account attivo, ruolo e titolarità delle operazioni prima di interrogare D1. Better Auth conserva utenti, credenziali e sessioni nello stesso database.

```text
Browser
  → Cloudflare Pages (smartshift.pages.dev)
    → Service binding privato SMARTSHIFT
      → Worker SmartShift (Next.js / OpenNext)
        → D1 (dati applicativi, autenticazione e sessioni)
        → Resend (invio degli inviti, se configurato)
```

Il gateway Pages inoltra le richieste preservando URL pubblico, cookie e IP del client. Il backend ha `workers_dev` e `preview_urls` disabilitati. Le configurazioni sono in [wrangler.jsonc](wrangler.jsonc), [cloudflare-pages/wrangler.jsonc](cloudflare-pages/wrangler.jsonc), [open-next.config.ts](open-next.config.ts) e [next.config.ts](next.config.ts).

Per creazione delle risorse, migrazioni remote, provisioning e deployment, seguire [CLOUDFLARE.md](CLOUDFLARE.md). Lo script `npm run deploy` pubblica prima il Worker e poi Pages; per un altro account Cloudflare occorre prima adattare le risorse e la configurazione come descritto nella guida.

## Prerequisiti

- Node.js **22.13 o successivo** e npm.
- Per il deployment: un account Cloudflare con accesso a Workers, Pages e D1.
- Per inviare inviti via email: una API key Resend e un mittente con dominio verificato. L'invio email è facoltativo per lo sviluppo locale.

## Installazione e avvio in locale

1. Dalla directory del repository, installare le dipendenze dal lockfile:

   ```sh
   npm ci
   ```

2. Copiare il modello delle variabili locali.

   PowerShell:

   ```powershell
   Copy-Item .dev.vars.example .dev.vars
   ```

   Shell POSIX:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

3. Modificare `.dev.vars`: mantenere `APP_URL=http://127.0.0.1:3000` e sostituire il placeholder di `BETTER_AUTH_SECRET` con un secret casuale di almeno 32 caratteri. Configurare Resend soltanto se necessario, come indicato nella sezione seguente.

4. Applicare le migrazioni e creare il primo amministratore locale:

   ```sh
   npm run db:migrate:local
   npm run auth:provision -- --local admin@example.com admin
   ```

   Sostituire l'email di esempio con quella desiderata. Lo script salva la password iniziale in `.wrangler/private/local-login-*.txt`, escluso da Git, senza mostrarla nel terminale. Se l'account esiste già, il provisioning sostituisce la password e revoca le sessioni; conserva ruolo e stato attivo/disattivo esistenti.

5. Avviare l'applicazione:

   ```sh
   npm run dev -- --hostname 127.0.0.1
   ```

   Aprire `http://127.0.0.1:3000` e accedere con le credenziali del file locale. Usare lo stesso hostname di `APP_URL` per rispettare i controlli di origine, inclusa la procedura di primo accesso. Cambiare la password dalla pagina Account e cancellare il file delle credenziali iniziali.

Il database locale in `.wrangler/state` è separato da D1 remoto. La registrazione pubblica è disabilitata: i colleghi si aggiungono dal pannello Team oppure tramite provisioning. Il recupero di una password dimenticata passa dal provisioning; non è configurato un recupero via email.

## Variabili d'ambiente

Il modello [.dev.vars.example](.dev.vars.example) contiene un URL locale, valori di esempio e placeholder per i secret. Configurare `.dev.vars` senza committarlo.

| Variabile | Scopo e configurazione |
| --- | --- |
| `APP_URL` | Origine dell'applicazione: `http://127.0.0.1:3000` in sviluppo, URL pubblico HTTPS in produzione. |
| `BETTER_AUTH_SECRET` | Secret casuale di almeno 32 caratteri, necessario per l'autenticazione. Usare valori distinti per locale e produzione. |
| `RESEND_API_KEY` | Secret Resend, necessario soltanto per inviare inviti via email. Rimuovere il placeholder se non si configura l'invio. |
| `EMAIL_FROM` | Mittente con dominio verificato in Resend, necessario per l'invio email. |
| `EMAIL_FROM_NAME` | Nome visualizzato del mittente; il codice usa `SmartShift` come valore predefinito. |

In produzione `APP_URL`, `EMAIL_FROM` e `EMAIL_FROM_NAME` sono variabili in `wrangler.jsonc`; `BETTER_AUTH_SECRET` e `RESEND_API_KEY` vanno configurati come secret Cloudflare. Non inserire secret in file versionati, cronologia del terminale o issue. Per il deploy tramite GitHub Actions occorre anche il repository secret `CLOUDFLARE_API_TOKEN`, descritto in [CLOUDFLARE.md](CLOUDFLARE.md).

Senza configurazione email valida, l'account invitato viene comunque creato e l'invio risulta non riuscito. La password temporanea viene mostrata una sola volta all'amministratore come fallback, da consegnare tramite un canale sicuro. Dopo aver corretto la configurazione, il reinvio genera una nuova password e invalida quella precedente.

## Test e verifiche

```sh
npm test
npm run lint
npm run typecheck
npm run build:cloudflare
```

I test coprono autenticazione, logout, cambio password, controlli di origine/CSRF, rate limiting, registrazioni chiuse, calendario e mezze giornate, isolamento utenti, privilegi amministrativi, dashboard e inviti. Non occorrono credenziali di produzione per i test automatici.

`npm run preview` esegue la build OpenNext e avvia un'anteprima locale del runtime Workers. Per provare il login, allineare `APP_URL` all'origine dell'anteprima. La build Next.js usa Webpack; su Windows arrestare il server di sviluppo prima della build Cloudflare per evitare blocchi su `.open-next/assets`.

Il workflow [deploy.yml](.github/workflows/deploy.yml) esegue test, lint, build Cloudflare e controllo TypeScript su pull request verso `main` e su `main`. Il deployment di produzione avviene soltanto su `main`, con il token Cloudflare configurato: applica le migrazioni remote, pubblica Worker e Pages e verifica il sito pubblico. Sono disponibili anche gli script di smoke test descritti in [CLOUDFLARE.md](CLOUDFLARE.md).

## Struttura del repository

```text
src/
  app/                 Pagine Next.js, API route e server action
  components/          Componenti UI, navigazione e tema
  lib/                 Autenticazione, repository D1, dashboard e inviti
  utils/               Utilità per le festività
migrations/            Schema e migrazioni SQL D1
tests/                 Test per auth, repository, dashboard e inviti
scripts/               Provisioning e verifiche del sito pubblico
cloudflare-pages/      Gateway Pages e configurazione del service binding
public/                Header per i contenuti pubblici
.github/workflows/     Controlli CI e deployment Cloudflare
wrangler.jsonc         Configurazione del Worker e binding D1
open-next.config.ts    Configurazione OpenNext
next.config.ts         Configurazione Next.js e integrazione Cloudflare locale
```

Documenti di riferimento: [guida Cloudflare](CLOUDFLARE.md), [audit del repository](REPOSITORY_AUDIT.md) e [cronologia delle modifiche](CHANGELOG.md). La guida operativa e l'audit sono attualmente in italiano; l'audit riporta verifiche svolte alla data indicata nel documento.

## Sicurezza

- Registrazione pubblica disabilitata e autorizzazione lato server su account attivo, ruolo e titolarità delle operazioni.
- Query D1 parametrizzate; il repository server applica i controlli di accesso ai dati.
- Password con hash scrypt, cookie di sessione HttpOnly e flag Secure in HTTPS, controllo delle origini e rate limiting persistente in D1. Il login è limitato a cinque richieste al minuto per IP.
- Accesso all'applicazione ed export bloccati finché non è completato il cambio della password temporanea. Export riservato agli amministratori con `Cache-Control: private, no-store`.
- `.dev.vars`, `.env*` locali, `.wrangler/`, `.open-next/`, `.next/` e `node_modules/` esclusi da Git. Non condividere password, cookie di sessione o token in commit e log.

Per i rilievi e i limiti delle verifiche già eseguite, consultare [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md).

## Licenza MIT

SmartShift è distribuito con [licenza MIT](LICENSE).
