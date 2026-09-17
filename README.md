# SmartShift

SmartShift è un'applicazione web per organizzare presenze, smart working, ferie e assenze del team.

## Funzionalità

- Calendario personale delle presenze.
- Gestione di giornate in ufficio, smart working, ferie e malattia.
- Vista amministrativa del team.
- Creazione, modifica e disattivazione degli utenti.
- Ruoli utente e amministratore.
- Inviti con password temporanea e cambio obbligatorio al primo accesso.
- Esportazione dei dati in formato Excel.
- Interfaccia responsive con tema chiaro e scuro.

## Tecnologie

Il progetto utilizza Next.js, React, TypeScript e Tailwind CSS. L'applicazione è distribuita su Cloudflare e utilizza un database SQL gestito, autenticazione email/password e un servizio transazionale per gli inviti.

## Sviluppo locale

Richiede Node.js 22.13 o successivo.

```sh
npm ci
```

Copiare `.dev.vars.example` in `.dev.vars`, compilare le variabili locali e inizializzare il database di sviluppo:

```sh
npm run db:migrate:local
npm run dev -- --hostname 127.0.0.1
```

I file `.dev.vars`, `.env`, gli artefatti di build e lo stato locale dei servizi sono esclusi da Git. Non inserire credenziali, password o token nel repository.

## Verifiche

```sh
npm test
npm run typecheck
npm run lint
npm run build:cloudflare
```

Gli aggiornamenti del branch principale vengono verificati dalla pipeline CI prima della distribuzione.

## Licenza

[MIT](LICENSE)
