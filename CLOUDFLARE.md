# SmartShift su Cloudflare

## Architettura

`Browser → smartshift-164.pages.dev → Pages Function → Worker smartshift → D1 smartshift-db`

Pages fornisce un indirizzo autonomo e inoltra le richieste al Worker tramite **service binding**. Il Worker non espone un indirizzo `workers.dev` o URL di preview. Il dominio dell'app non contiene il nome degli altri progetti dell'account.

L'autenticazione usa **Better Auth**, eseguito nel Worker con dati in D1. Nessun Cloudflare Access, team Zero Trust, SMTP o servizio di autenticazione esterno. Restano applicabili le quote dei piani Cloudflare dell'account; il progetto non attiva piani a pagamento.

## Cosa è stato migrato

| Funzione precedente | Implementazione attuale |
| --- | --- |
| Hosting Vercel | Workers/OpenNext e ingresso pubblico Pages |
| Database PostgreSQL Supabase | D1, migrazioni SQL in `migrations/` |
| Magic link Supabase | Email e password; hash scrypt, cookie di sessione HttpOnly/Secure |
| Sessioni Supabase | Sessioni Better Auth in D1, logout e cambio password |
| Trigger di creazione profili | Provisioning esplicito di credenziali e profilo |
| Policy RLS | Repository server: account attivo, ruolo e titolarità delle operazioni |
| Rimozione account | Revoca credenziali e sessioni, archiviazione anonimizzata di presenze e profilo |
| Export Excel | ExcelJS nel Worker, endpoint riservato agli amministratori |

Nel repository non sono stati trovati usi di Supabase Storage, Realtime, Edge Functions separate, login social, upload o job programmati. Non sono stati importati dati da Supabase.

## Risorse

- Progetto Pages: `smartshift-164`, URL `https://smartshift-164.pages.dev`.
- Worker backend: `smartshift`.
- Database: `smartshift-db`, ID `daa4b489-b1df-488d-8e77-c66958b89de4`, località iniziale WEUR.
- Primo amministratore: creato esplicitamente con lo script di provisioning; nessuna registrazione pubblica.
- Configurazione backend: `wrangler.jsonc`.
- Configurazione ingresso Pages: `cloudflare-pages/wrangler.jsonc`.

Gli identificatori nel repository non sono credenziali. `BETTER_AUTH_SECRET`, password e file `.dev.vars` non devono entrare in Git.

## Prima installazione in un altro account

1. Eseguire `npm ci` e `npx wrangler login`.
2. Creare il database con `npx wrangler d1 create smartshift-db --location=weur` e aggiornare ID/account nella configurazione backend. Pages usa l'account del login Wrangler.
3. Creare un progetto Pages con un nome disponibile e impostarlo in `cloudflare-pages/wrangler.jsonc`; aggiornare `APP_URL` nel backend con il corrispondente URL HTTPS.
4. Eseguire `npm run db:migrate:remote`.
5. Generare un segreto casuale e salvarlo con `npx wrangler secret put BETTER_AUTH_SECRET`. Non riutilizzare quello locale.
6. Eseguire `npm run auth:provision -- --remote email@example.com admin` e custodire il file locale indicato.
7. Eseguire `npm run deploy` (backend, poi Pages).

Le versioni recenti di Wrangler possono convertire automaticamente `pages project create` in una creazione Workers. Per richiedere espressamente un progetto con indirizzo **pages.dev** usare `npx wrangler pages project create NOME --production-branch main --force` durante la prima creazione. I deploy successivi usano il progetto Pages già esistente.

## Account e recupero password

Il login pubblico non consente registrazioni. Il provisioning passa da un operatore autenticato su Cloudflare:

```sh
# Nuovo utente ordinario
npm run auth:provision -- --remote collega@example.com user

# Primo amministratore, oppure reset delle sue credenziali
npm run auth:provision -- --remote admin@example.com admin
```

Ogni esecuzione genera una password casuale e la salva in `.wrangler/private/remote-login-*.txt`, senza mostrarla nel terminale. Per un account esistente **sostituisce la password e revoca tutte le sessioni**. Conserva ruolo e stato attivo/disattivo già presenti: non promuove o riattiva automaticamente un account esistente. Il flag del ruolo si applica ai profili nuovi.

Dopo il primo login cambiare la password dalla pagina **Account**, accessibile con l'icona della chiave, e cancellare il file di credenziali iniziali. Il cambio richiede la password attuale e chiude le altre sessioni. Se dimentichi la password, riesegui il provisioning; non è configurato un recupero via email.

Nome, cognome, ruolo e rimozione si gestiscono nella pagina Team. Gli amministratori non possono rimuoversi o rimuovere il proprio ruolo. La rimozione elimina credenziali e sessioni, libera l'indirizzo email e anonimizza il profilo archiviato; le presenze restano disponibili solo come storico tecnico e sono escluse da elenchi attivi ed export. Aggiungere in seguito lo stesso indirizzo crea quindi un utente nuovo, senza nome, privilegi o eventi del precedente.

## Email di invito

Il pannello Team crea nuovi account con ruolo `user` e una password temporanea valida 24 ore. Il collega può accedere soltanto alla procedura di primo accesso finché non sceglie una password nuova. L'amministratore può poi promuoverlo ad `admin` con Modifica. «Reinvia invito» genera una nuova password, invalida quella precedente e revoca le sessioni temporanee.

L'invio usa [Resend](https://resend.com/docs/api-reference/introduction). Il mittente di prova `onboarding@resend.dev` può inviare soltanto all'indirizzo associato all'account Resend. Per invitare altri colleghi bisogna [verificare un dominio](https://resend.com/docs/knowledge-base/403-error-domain-mismatch) e impostare un mittente appartenente esattamente a quel dominio. Cloudflare Email Service non viene usato perché, sul piano Workers Free, l'invio è limitato ai destinatari già verificati nell'account.

Configurazione iniziale:

1. Creare un account Resend. Per le prime prove si può usare `SmartShift <onboarding@resend.dev>` e inviare all'email proprietaria dell'account.
2. Per l'uso reale, aggiungere un dominio in Resend, pubblicare i record DNS richiesti e attendere lo stato Verified. Creare quindi una API key dedicata a SmartShift.
3. Salvare i valori nel Worker, senza inserirli in Git:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put EMAIL_FROM_NAME
```

Per la prova, `EMAIL_FROM` può essere `SmartShift <onboarding@resend.dev>`. In produzione deve contenere un indirizzo del dominio verificato, per esempio `SmartShift <accesso@example.com>`; `EMAIL_FROM_NAME` è usato soltanto quando `EMAIL_FROM` non è impostato. Dopo il deploy creare un utente con una casella di test e verificare ricezione, scadenza, cambio obbligatorio e reinvio. L'app non salva mai la password temporanea in chiaro: se l'invio fallisce, la mostra una sola volta all'amministratore che ha creato o reinviato l'account, così può consegnarla con un canale sicuro. Il reinvio genera una nuova password e invalida quella precedente.

In sviluppo locale gli stessi nomi possono essere inseriti in `.dev.vars`, che è escluso da Git. Senza questi valori l'account viene comunque creato in stato «invio non riuscito», così la configurazione può essere corretta e l'invito reinviato dal pannello.

## Sicurezza

- Better Auth controlla sessioni, cookie e origine delle richieste. L'origine è fissata da `APP_URL`.
- Hash password scrypt; nessuna password in chiaro nel database.
- Limite di 5 richieste di login al minuto per IP, persistente in D1. Il Pages gateway conserva l'IP Cloudflare.
- Le registrazioni sono chiuse e non esistono bypass di autenticazione in sviluppo o produzione.
- Ogni lettura/scrittura applicativa passa dal repository server; D1 non offre le policy PostgreSQL RLS.
- Le pagine personali sono dinamiche; l'export usa `Cache-Control: private, no-store`. Non applicare cache pubbliche a dashboard/API.
- `workers_dev` e `preview_urls` del backend restano disabilitati. Pages raggiunge il backend tramite binding privato, senza un segreto nell'URL.

## Sviluppo e verifiche

Il DB locale in `.wrangler/state` è separato dal DB remoto. `.dev.vars` deve contenere `APP_URL=http://127.0.0.1:3000` e un segreto casuale; usare lo stesso hostname nel browser.

```sh
npm run db:migrate:local
npm run auth:provision -- --local admin@example.com admin
npm run dev -- --hostname 127.0.0.1

npm test
npm run typecheck
npm run lint
npm run build:cloudflare
npx wrangler deploy --dry-run
```

La build usa Webpack per evitare l'errore symlink Turbopack/OpenNext riscontrato su Windows. Arrestare `npm run dev` prima della build Cloudflare, altrimenti Windows può bloccare `.open-next/assets`. Per CI è preferibile Linux.

`npm run preview` prova il runtime Workers localmente. Impostare l'origine locale appropriata in `.dev.vars` per provare anche il login. I test automatici coprono login, logout, cambio password, CSRF, limiti ai tentativi, registrazioni chiuse, calendario, isolamento utenti, privilegi admin e disattivazione.

```sh
# Aggiornamenti successivi
npm run db:migrate:remote
npm run deploy
```

Il deploy può avvenire via CLI oppure con la GitHub Action descritta sotto.

Per una verifica del sito reale: `node scripts/smoke-live.mjs https://smartshift-164.pages.dev PERCORSO_FILE_CREDENZIALI`. Il controllo prova login, pagine, asset, Excel e revoca della sessione senza stampare password o cookie. Il file deve contenere le credenziali attuali.

ExcelJS usa soltanto `uuid.v4`: un override a `uuid@11.1.1` corregge l'avviso della vecchia dipendenza mantenendo questa API CommonJS. Verificare l'export dopo aggiornamenti di ExcelJS.

## Deploy automatico

Il workflow [deploy.yml](.github/workflows/deploy.yml) usa Linux e Node.js 22. Esegue installazione dal lockfile, test, lint, build OpenNext e controllo TypeScript. Sulle pull request esegue soltanto i controlli; su `main` applica le migrazioni D1, pubblica il Worker e poi il gateway Pages. Infine verifica login pubblico, redirect della dashboard, protezione dell'export e assenza di sessioni anonime. Non modifica password, account o `BETTER_AUTH_SECRET` già presente sul Worker.

### Attivazione iniziale

1. Creare un [API token Cloudflare](https://dash.cloudflare.com/profile/api-tokens) personalizzato per l'account indicato in `wrangler.jsonc`, con permessi **Account / Workers Scripts / Edit**, **Account / D1 / Edit** e **Account / Cloudflare Pages / Edit**. Limitare le risorse all'account SmartShift; non occorrono permessi DNS o Zero Trust.
2. Aprire [GitHub → Settings → Secrets and variables → Actions](https://github.com/lucamilano/SmartShift/settings/secrets/actions), scegliere **New repository secret**, nome `CLOUDFLARE_API_TOKEN`, e incollare lì il token. Non inserirlo nel codice, nei commit o in chat.
3. Aprire [Actions](https://github.com/lucamilano/SmartShift/actions), selezionare **Checks and Cloudflare deploy** e scegliere **Run workflow** sul branch `main`. Da quel momento anche ogni push su `main` avvia il rilascio.

Il token è necessario una sola volta, salvo scadenza o revoca. Il login OAuth Wrangler del PC non viene copiato su GitHub. Senza secret i controlli vengono eseguiti, ma il deploy si ferma con un messaggio esplicito.

I rilasci dello stesso branch sono serializzati e non vengono interrotti automaticamente. Le migrazioni devono essere compatibili con la versione precedente, che può restare attiva durante il rilascio; in caso di errore non è previsto un rollback automatico del database. Il controllo pubblico verifica la raggiungibilità e le protezioni, non esegue un login con la password dell'amministratore.

Riferimenti: [GitHub Actions per Workers](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) e [token per Pages](https://developers.cloudflare.com/pages/configuration/api/).

## Vecchi servizi

Il codice non usa più Supabase o Vercel. I relativi servizi remoti non sono stati eliminati: dopo la verifica del nuovo sito puoi disattivarli nei rispettivi dashboard. Le variabili `NEXT_PUBLIC_SUPABASE_*` e le callback Supabase non sono più necessarie.

## Cosa pubblicare su Git

Versionare codice sorgente, test, script, migrazioni SQL, `package.json`, `package-lock.json`, configurazioni Wrangler/OpenNext e documentazione. `.dev.vars.example` è un modello privo di credenziali e deve essere incluso.

Non versionare `.dev.vars`, `.env*` locali, `.wrangler/` (database di sviluppo, log e credenziali iniziali), `.open-next/`, `.next/` o `node_modules/`. Questi percorsi sono esclusi da `.gitignore`. Gli ID Cloudflare nelle configurazioni sono identificatori di risorse, non token di accesso.

Le password iniziali sono destinate soltanto alla consegna locale: dopo il cambio password cancellare il relativo file `.wrangler/private/*-login-*.txt`. Non inserire password, cookie di sessione o token nelle descrizioni dei commit o nei log.

La cronologia delle modifiche è in [CHANGELOG.md](CHANGELOG.md); il [README principale](README.md) presenta il riepilogo visibile su GitHub. Lo storico SQL Supabase rimane consultabile nei commit precedenti alla migrazione.

## Riferimenti

- [OpenNext su Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Pages service bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Better Auth email/password](https://better-auth.com/docs/authentication/email-password)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
