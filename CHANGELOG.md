# Cronologia modifiche

Le voci descrivono le modifiche al repository. La pipeline GitHub pubblica gli aggiornamenti di `main` dopo i controlli, previa configurazione del token Cloudflare.

## 2026-09-17 — Deploy automatico

- Aggiunta GitHub Action per test, lint, build e TypeScript sulle pull request e su `main`.
- Su `main`, applicazione delle migrazioni D1 e pubblicazione in sequenza di Worker e Pages, con verifica pubblica finale.
- Aggiunti avvio manuale da Actions e serializzazione dei rilasci; nessuna credenziale applicativa viene modificata dal deploy.
- Documentata la configurazione una tantum del repository secret `CLOUDFLARE_API_TOKEN`.

## 2026-09-17 — Migrazione a Cloudflare

### Hosting e database

- Sostituito l'hosting Vercel con Next.js su Cloudflare Workers tramite OpenNext.
- Aggiunto l'indirizzo autonomo `smartshift-164.pages.dev` con Cloudflare Pages e collegamento privato al Worker tramite service binding.
- Sostituito PostgreSQL/Supabase con D1 e migrazioni SQL versionate per profili, presenze, autenticazione e sessioni.
- Disabilitati gli indirizzi pubblici e di preview del backend Workers.

### Accesso e autorizzazioni

- Sostituito il magic link Supabase con login email/password tramite Better Auth su Workers e D1.
- Aggiunti password con hash scrypt, sessioni, logout, cambio password e limiti ai tentativi di accesso.
- Disabilitate le registrazioni pubbliche. Creazione e recupero account avvengono con uno script amministrativo che salva le credenziali iniziali solo in un file locale escluso da Git.
- Sostituite le policy RLS con controlli server su account attivo, ruolo e proprietà dei dati.
- Conservata la disattivazione utenti senza cancellare lo storico; protette le operazioni amministrative e l'export.

### Applicazione e manutenzione

- Migrati dashboard, calendario, gestione profili ed export Excel al nuovo database.
- Aggiunta la pagina Account per cambiare password e revocare le altre sessioni.
- Rimosse dipendenze, client, variabili di esempio e callback Supabase.
- Aggiornati Next.js e strumenti Cloudflare; adottata la build Webpack per la compatibilità con Windows.
- Aggiornate le dipendenze segnalate dall'audit e applicato un override compatibile di `uuid` per ExcelJS.
- Aggiunti test per autenticazione, CSRF, limiti ai tentativi, permessi, calendario e disattivazione, oltre a uno script di verifica del sito pubblicato.
- Riscritto il README, aggiunta la guida operativa [CLOUDFLARE.md](CLOUDFLARE.md) e sostituita la vecchia wiki Supabase.

### Indicazioni per l'aggiornamento

- Non vengono importati utenti o dati da Supabase: occorre inizializzare D1 e creare gli account necessari.
- Il login richiede email e password; Cloudflare Access/Zero Trust e invio email non sono necessari.
- Un reset tramite provisioning revoca le sessioni esistenti. La password iniziale va cambiata dalla pagina Account; il file locale va poi eliminato.
- Per distribuire la versione del repository usare la [procedura CLI](CLOUDFLARE.md#sviluppo-e-verifiche) oppure il [deploy automatico](CLOUDFLARE.md#deploy-automatico).
- I vecchi servizi Vercel e Supabase non vengono eliminati automaticamente.
