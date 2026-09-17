# Piano: creazione utenti e primo accesso

Stato: implementazione completata nel worktree il 17 settembre 2026; configurazione e prova reale del mittente email ancora da eseguire prima del rilascio.

## Risultato richiesto

L'amministratore inserisce **nome, cognome ed email** dalla pagina Gestione Team. Il nuovo collega riceve un'email con una **password temporanea** e l'indirizzo di SmartShift. Al primo accesso deve scegliere una nuova password prima di utilizzare l'app.

Si interpreta «mail temporanea» nella richiesta come «password temporanea inviata via email»: l'indirizzo email inserito dall'amministratore resta l'identificativo di login.

Ogni nuovo account nasce con ruolo **user**. Soltanto un amministratore può promuoverlo ad **admin** successivamente, dalla modifica del profilo. Le registrazioni pubbliche restano disabilitate.

## Situazione attuale verificata

| Area | Comportamento attuale | Lavoro necessario |
| --- | --- | --- |
| [Interfaccia Team](src/app/dashboard/team/team-client.tsx) | «Nuovo Collega» mostra istruzioni per richiedere un account; nessun form di creazione | Sostituire le istruzioni con nome, cognome, email e invio |
| [Azioni Team](src/app/dashboard/team/actions.ts) | Solo modifica e disattivazione | Aggiungere creazione e reinvio protetti lato server |
| [Repository](src/lib/repository.ts) | Verifica amministratore; modifica nome, cognome e ruolo; impedisce auto-demozione e auto-disattivazione | Riutilizzare questi controlli e aggiungere quelli sul primo accesso |
| [Provisioning](scripts/provision-sql.mjs) | Crea credenziali Better Auth e profilo; su account esistente reimposta password e revoca sessioni | Non usare il reset implicito per il form «Nuovo utente» |
| [Configurazione auth](src/lib/auth-options.ts) | Better Auth email/password, registrazioni chiuse, limiti ai tentativi | Integrare scadenza della password temporanea e completamento obbligatorio |
| [Login](src/app/login/login-form.tsx) | Dopo il controllo account porta sempre alla dashboard | Distinguere account operativo da primo accesso da completare |
| [Stato account](src/app/api/account-status/route.ts) | Risponde soltanto 204 oppure 401 | Comunicare lo stato del primo accesso senza esporre credenziali |
| [Pagina Account](src/app/dashboard/account/page.tsx) | Cambio password facoltativo tramite Better Auth | Creare un percorso obbligatorio per il primo accesso |
| Email | Non esiste un servizio di invio configurato nel progetto | Scegliere e configurare un servizio e un mittente verificato |

La promozione ad amministratore è già implementata: va mantenuta e testata nel nuovo flusso, non ricreata con un secondo sistema di ruoli. La fonte dei privilegi resta `profili.ruolo`.

## Flusso previsto

1. Un amministratore attivo apre «Nuovo Collega» e compila nome, cognome ed email.
2. Il server ricontrolla sessione e ruolo, valida i campi e normalizza l'email. Nome e cognome obbligatori, massimo 100 caratteri ciascuno; email valida e massimo 254 caratteri.
3. Se l'email esiste già, anche per un account disattivato, la creazione si ferma con un messaggio. Non deve resettare credenziali, riattivare utenti o cambiare privilegi implicitamente.
4. Il server genera una password casuale crittograficamente sicura, compatibile con la policy Better Auth, e salva soltanto l'hash. Crea account e profilo collegati con ruolo `user`, indipendentemente da eventuali valori di ruolo inviati dal browser.
5. L'account viene marcato come «cambio password obbligatorio». Il sistema invia un'email con nome, URL di login, email dell'account, password temporanea e scadenza.
6. Il pannello mostra l'esito reale: account creato e invio accettato, oppure account creato ma invio fallito. L'accettazione del messaggio da parte del servizio non garantisce la consegna in casella.
7. Il collega accede con la password temporanea ed entra in una sessione limitata al cambio password e al logout.
8. Dopo un cambio riuscito, verificato sul server, vengono rimossi l'obbligo e la scadenza, invalidate le altre sessioni e abilitata la normale navigazione. La vecchia password non funziona più.
9. L'amministratore può successivamente modificare nome, cognome e ruolo; la promozione ad admin richiede una sua azione esplicita.

## Interventi tecnici

### Database e creazione account

- Aggiungere una nuova migrazione D1 senza modificare quelle già applicate.
- Definire campi per obbligo di cambio password, scadenza della credenziale temporanea e stato dell'invio. Tenere separati stato di invito, ruolo e `is_active`.
- Gli utenti esistenti devono conservare password, ruolo e accesso: il nuovo obbligo va impostato per i nuovi inviti, non retroattivamente.
- Creare un servizio server per provisioning web, con SQL parametrizzato e creazione coerente delle righe Better Auth `user`, `account` e `profili`. Valutare le API server della versione installata di Better Auth; non aprire la registrazione pubblica per aggirare `disableSignUp`.
- Usare transazioni/batch D1 appropriati e vincoli univoci per evitare record orfani o duplicati, anche con richieste concorrenti. Mantenere coerenti email di autenticazione e email del profilo.
- Non eseguire Wrangler o lo script CLI dal Worker. Lo script attuale resta uno strumento amministrativo di emergenza; documentare e testare la sua interazione con i nuovi stati.

### Cambio password obbligatorio

- Aggiornare [auth.ts](src/lib/auth.ts), [models.ts](src/lib/models.ts) e i controlli nel repository per riconoscere account in attesa del cambio.
- Applicare il blocco a pagine, server action e API, compreso l'export: un redirect nel browser non basta. Rifiutare anche nuove sessioni con password temporanea scaduta e bloccare sessioni già aperte dopo la scadenza.
- Predisporre un percorso dedicato, per esempio `/primo-accesso`, che richieda autenticazione ma non il completamento del primo accesso: evitare cicli di redirect con il layout della dashboard.
- Consentire soltanto stato/sessione, cambio password e logout fino al completamento; verificare anche gli endpoint Better Auth esposti direttamente.
- Richiedere password attuale, nuova password e conferma, rispettando i limiti 12–128 caratteri. Impedire il riutilizzo della password temporanea.
- Rimuovere l'obbligo esclusivamente dopo un cambio effettivo verificato dal server. Rendere coerenti aggiornamento hash, flag e sessioni anche in caso di errore o richieste concorrenti; mai affidarsi a una chiamata client che dichiara «password cambiata».

### Invio email e reinvio

- Il provider scelto per l'implementazione è Resend, tramite API HTTPS e chiave conservata nei secret Cloudflare. Il mittente di prova `onboarding@resend.dev` può scrivere soltanto all'indirizzo proprietario dell'account Resend; per invitare altri colleghi occorre verificare un dominio e usare un mittente appartenente esattamente a quel dominio.
- L'indirizzo `smartshift-164.pages.dev` è l'URL del sito; non identifica automaticamente un mittente email disponibile. Definire esplicitamente il dominio e l'indirizzo da cui spedire.
- Salvare eventuali chiavi come secret del Worker, mai nel browser o in Git. Non usare il token GitHub di deploy per inviare email.
- Usare un template testuale e HTML con contenuti correttamente escapati. Password solo nel messaggio destinato al collega, mai nei log, nella risposta del form, nei file locali del Worker o in tabelle in chiaro.
- Prevedere «Reinvia credenziali» per gli account ancora in attesa: genera una nuova password, invalida la precedente e le sessioni temporanee, aggiorna la scadenza. Non usarlo per resettare utenti già operativi senza un'azione di recupero distinta.
- Un errore email non deve eliminare lo storico o ripetere la creazione dell'account. Definire retry e idempotenza; evitare che reinvii concorrenti spediscano credenziali già superate. Per una prima versione è possibile un invio sincrono con stato persistito e reinvio manuale; un'eventuale coda richiede un progetto specifico per non conservare password in chiaro.
- Limitare creazioni e reinvii; registrare autore, destinatario, data ed esito senza contenuto della password. Non impostare `emailVerified` solo perché il provider ha accettato l'email; definire il criterio di verifica nel flusso di primo accesso.

### Interfaccia e ruoli

- Aggiornare elenco utenti dopo creazione e mostrare email e stato invito/cambio obbligatorio, oltre al ruolo.
- Aggiungere feedback di salvataggio, errori leggibili e protezione dal doppio invio.
- Conservare la modifica del ruolo soltanto per amministratori e il divieto di auto-demozione/auto-disattivazione. Verificare che un ruolo revocato perda immediatamente i privilegi anche con sessione aperta.
- Decidere se i colleghi ancora in attesa vadano conteggiati nelle statistiche «Nessun Turno»; attualmente tutti i profili attivi vengono contati.

## Analisi dei riferimenti al vecchio login

Ricerca effettuata nei file versionati, includendo sorgenti, script, test, migrazioni, configurazioni, workflow e lockfile, per `supabase`, `magic link`, `signInWithOtp`, `onAuthStateChange` e `auth/callback`. Sono stati letti anche i percorsi attuali di login, sessione, cambio password e amministrazione.

**Non sono stati trovati client, dipendenze o chiamate operative al vecchio login Supabase.** Le occorrenze nei documenti seguenti descrivono la migrazione e non devono essere eliminate come se fossero codice ancora attivo:

- [README.md](README.md): confronto fra vecchio magic link e nuovo login, assenza di importazione dati.
- [CLOUDFLARE.md](CLOUDFLARE.md): tabella di migrazione, rimozione delle vecchie variabili/callback e indicazioni sui servizi precedenti.
- [CHANGELOG.md](CHANGELOG.md): cronologia della sostituzione di Supabase.

La verifica riguarda il repository attuale, non i vecchi commit, gli artefatti generati o le configurazioni remote di Supabase/Vercel. La rimozione dei vecchi servizi remoti non è stata verificata in questa analisi.

Sono emersi invece questi testi e comportamenti da rivedere insieme al nuovo flusso:

| Punto | Riscontro | Proposta futura |
| --- | --- | --- |
| Team, «Nuovo Collega» | Istruzioni di creazione manuale e condivisione credenziali | Sostituire con il form e l'invio email |
| Team, modifica profilo | «Per cambiare l'email, contatta il supporto» | Chiarire chi gestisce il cambio; un cambio email completo richiede sincronizzazione e verifica, da valutare separatamente |
| Team, disattivazione | Pulsanti «Elimina account/utente» per un'operazione che disattiva | Uniformare a «Disattiva utente» |
| Login | Recupero password tramite amministratore | Resta valido; documentare se resta via CLI o se aggiungere successivamente un reset dal pannello |
| Pagina Account | Cambio password sempre facoltativo | Conservare il cambio ordinario e aggiungere il percorso obbligatorio |
| Guida Cloudflare | Nessun invio email e provisioning soltanto CLI | Aggiornare quando la nuova funzionalità sarà implementata; preservare il changelog storico |

Questi punti non sono integrazioni Supabase residue: sono limiti e testi del flusso attuale. Nessuno è stato modificato durante questa analisi.

## Verifiche di accettazione

- [x] Solo un admin attivo può creare utenti, reinviare inviti o modificare ruoli, anche chiamando direttamente le azioni server.
- [x] Nome/cognome/email obbligatori; duplicati e richieste concorrenti non creano utenti doppi e non resettano utenti esistenti.
- [x] Nuovi utenti sempre `user`; promozione solo tramite modifica esplicita dell'amministratore.
- [x] Creazione coerente di credenziali e profilo; nessuna password in log, risposte o database in chiaro.
- [ ] Email contiene URL corretto, credenziale temporanea e scadenza; errore di invio visibile e reinvio recuperabile.
- [x] Credenziale sostituita non funziona; il reinvio non riattiva account disabilitati. La scadenza viene controllata prima dell'accesso applicativo.
- [x] Primo accesso limitato al cambio password: URL diretti, API, export e server action non consentono aggiramenti.
- [x] Cambio completato abilita l'app e invalida vecchia password e altre sessioni; errori non sbloccano prematuramente l'account.
- [x] Registrazioni pubbliche ancora chiuse; test CSRF e limiti ai tentativi continuano a passare.
- [x] Password e accesso degli utenti esistenti invariati dopo la migrazione.
- [ ] Configurare il mittente Resend e provare invio e primo accesso con una casella concordata.
- [ ] Applicare la migrazione remota e pubblicare dopo la configurazione email.

## Decisioni da prendere prima dell'implementazione

1. È stata adottata l'interpretazione «password temporanea via email».
2. È stato integrato Resend; la chiave va salvata come secret e resta da verificare il dominio mittente per destinatari diversi dal proprietario dell'account.
3. La durata è 24 ore. Un invito scaduto richiede il reinvio da parte dell'amministratore.
4. Reset degli utenti operativi e cambio email restano fuori da questa modifica. Il provisioning CLI rimane il recupero amministrativo e ora chiude correttamente un eventuale primo accesso pendente.

Ordine suggerito: scelta email → migrazione e servizio di creazione → blocco primo accesso → modulo admin e invio/reinvio → test e documentazione → rilascio. Non avviare l'implementazione con la sola aggiunta del modulo: i controlli del primo accesso devono essere pronti insieme.
