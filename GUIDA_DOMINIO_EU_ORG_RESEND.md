# Configurare un dominio EU.org con Cloudflare, SmartShift e Resend

Questa guida descrive l'intera configurazione, dalla scelta del dominio gratuito EU.org fino all'invio degli inviti SmartShift attraverso Resend. È pensata per l'architettura attuale del progetto:

```text
Browser → dominio personalizzato → Cloudflare Pages → Worker SmartShift → D1
                                                     └→ Resend → email del collega
```

La configurazione coinvolge tre servizi distinti:

| Servizio | Responsabilità |
| --- | --- |
| EU.org | Assegna il dominio richiesto e delega la gestione DNS |
| Cloudflare | Gestisce DNS, HTTPS e il dominio pubblico dell'applicazione |
| Resend | Firma e spedisce le email di invito dal dominio verificato |

Non inserire in Git password, token, API key o valori copiati da pagine che li mostrano una sola volta. Gli unici dati da versionare sono i nomi delle variabili e la configurazione pubblica.

## Struttura consigliata

Negli esempi viene usato il dominio ipotetico:

```text
smartshiftapp.eu.org
```

Sostituirlo ovunque con il dominio effettivamente richiesto e approvato. La struttura consigliata è:

| Utilizzo | Valore di esempio |
| --- | --- |
| Zona DNS gestita da Cloudflare | `smartshiftapp.eu.org` |
| Indirizzo dell'applicazione | `app.smartshiftapp.eu.org` |
| Mittente degli inviti | `SmartShift <accesso@smartshiftapp.eu.org>` |
| Indirizzo attuale da sostituire | `https://smartshift-164.pages.dev` |

L'applicazione usa il sottodominio `app`, mentre Resend verifica il dominio principale. In questo modo il sito e il mittente sono riconoscibili, ma possono essere configurati separatamente.

Prima di iniziare scegliere due o tre nomi alternativi, perché la disponibilità e l'approvazione non sono garantite. Evitare riferimenti a marchi di terzi, nomi eccessivamente generici o nomi pensati per rivendere il dominio. EU.org raccomanda inoltre di consultare le proprie policy e segnala che le richieste direttamente sotto `eu.org` hanno vincoli più severi e richiedono approvazione manuale.

## Fase 1 — Preparare la zona su Cloudflare

EU.org richiede nameserver già configurati al momento della domanda. Per questo conviene creare prima la zona Cloudflare e copiare i due nameserver che Cloudflare assegna.

1. Accedere a [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Aprire **Domains**.
3. Selezionare **Onboard a domain**, **Add a domain** o la voce equivalente mostrata dal dashboard.
4. Inserire il dominio completo desiderato:

   ```text
   smartshiftapp.eu.org
   ```

5. Selezionare il piano **Free**.
6. Proseguire anche se la scansione automatica non trova record DNS. È normale per un dominio non ancora delegato.
7. Arrivare alla schermata che mostra due nameserver Cloudflare. Avranno una forma simile a questa:

   ```text
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```

8. Copiare entrambi esattamente, senza aggiungere `https://`, indirizzi IP o il nome del dominio.

I nomi reali sono diversi per ogni zona. Per la richiesta EU.org servono **solo questi due nameserver**. Non servono:

- Account ID Cloudflare;
- ID del database D1;
- indirizzo `pages.dev`;
- API token Cloudflare;
- API key Resend;
- indirizzo IP del Worker.

Cloudflare mostrerà probabilmente la zona come **Pending nameserver update**. Rimarrà in questo stato finché EU.org non approverà la domanda e pubblicherà la delega.

### Se Cloudflare non accetta ancora il dominio

Controllare che il nome sia stato inserito come dominio registrabile completo, per esempio `smartshiftapp.eu.org`, e non come `app.smartshiftapp.eu.org`. La zona da aggiungere è il dominio assegnato da EU.org; `app` verrà creato successivamente come record interno.

Se Cloudflare dichiara che il dominio non è registrato e non permette di ottenere i nameserver, non inventare nameserver e non usare quelli di un'altra zona. Consultare le opzioni di hosting DNS indicate da EU.org oppure riprovare dopo aver iniziato la domanda. La procedura EU.org richiede comunque nameserver autorevoli correttamente configurati prima della validazione tecnica.

## Fase 2 — Creare l'account e richiedere il dominio EU.org

1. Aprire il [pannello di registrazione EU.org](https://nic.eu.org/arf/).
2. Creare un account/handle personale.
3. Usare dati di contatto reali e un indirizzo email accessibile.
4. Confermare l'indirizzo email se EU.org invia una richiesta di verifica.
5. Accedere al pannello e scegliere **New domain**.
6. Inserire il dominio completo:

   ```text
   smartshiftapp.eu.org
   ```

7. Compilare i contatti richiesti, incluso il contatto amministrativo e quello tecnico. Se si gestisce tutto personalmente, i contatti possono coincidere quando la procedura lo consente.
8. Nella sezione nameserver inserire i due nameserver assegnati da Cloudflare, uno per riga:

   ```text
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```

9. Non inserire IP o glue record per nameserver `*.ns.cloudflare.com`, salvo una richiesta esplicita e motivata del pannello.
10. Rileggere la domanda e inviarla.

La [procedura ufficiale EU.org](https://nic.eu.org/register.html) specifica che la validazione richiede intervento umano e può impiegare alcuni giorni. Non creare domande duplicate mentre la prima è in attesa: controllare invece lo stato nel pannello e l'email usata per la registrazione.

### Possibili stati della richiesta

| Stato o situazione | Significato pratico |
| --- | --- |
| Domanda inviata | La richiesta è in coda o in valutazione |
| Controllo nameserver fallito | La zona Cloudflare non risponde correttamente o i nameserver non coincidono |
| Richiesta di informazioni | EU.org vuole chiarimenti sul progetto o sui contatti |
| Approvata | Il dominio è stato delegato ai nameserver indicati |
| Rifiutata | Leggere la motivazione prima di presentare un nuovo nome |

SmartShift è un progetto reale di gestione presenze, ferie, smart working e utenti. Se EU.org chiede lo scopo del dominio, descriverlo in modo semplice e veritiero.

## Fase 3 — Verificare la delega DNS

Dopo l'approvazione EU.org:

1. Tornare nel dashboard Cloudflare.
2. Aprire la zona `smartshiftapp.eu.org`.
3. Se presente, usare **Check nameservers** o **Re-check now**.
4. Attendere che lo stato passi da **Pending** ad **Active**.

Da PowerShell è possibile controllare i nameserver pubblici con:

```powershell
Resolve-DnsName -Type NS smartshiftapp.eu.org
```

In alternativa:

```powershell
nslookup -type=NS smartshiftapp.eu.org
```

Il risultato deve mostrare gli stessi due nameserver indicati da Cloudflare. Resolver e cache DNS possono aggiornarsi in momenti diversi; una breve differenza tra dashboard e comando locale è normale.

### DNSSEC

Lasciare DNSSEC disabilitato durante l'attivazione iniziale. Abilitarlo prima che la delega e gli eventuali record DS siano coerenti può rendere il dominio irraggiungibile e impedire l'emissione del certificato HTTPS. Potrà essere configurato in un secondo momento, verificando che EU.org consenta di pubblicare il record DS fornito da Cloudflare.

## Fase 4 — Collegare il dominio a Cloudflare Pages

Non creare per prima cosa un CNAME manuale. Cloudflare avverte che un record diretto verso `pages.dev`, se il dominio non è stato prima associato al progetto Pages, può produrre un errore `522`.

Procedere così:

1. Nel dashboard Cloudflare aprire **Workers & Pages**.
2. Selezionare il progetto Pages **`smartshift-164`**. Non selezionare il Worker backend `smartshift`.
3. Aprire **Custom domains**.
4. Selezionare **Set up a domain**.
5. Inserire:

   ```text
   app.smartshiftapp.eu.org
   ```

6. Proseguire con **Continue** e **Activate domain**.
7. Lasciare che Cloudflare crei o proponga il record DNS necessario.
8. Attendere che sia il dominio sia il certificato HTTPS risultino attivi.

La procedura corretta è descritta nella [documentazione dei domini personalizzati Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/).

### Controlli da eseguire

Aprire nel browser:

```text
https://app.smartshiftapp.eu.org/login
```

Verificare che:

- il certificato HTTPS sia valido;
- non appaia un errore `522`;
- venga mostrata la pagina di login SmartShift;
- `/dashboard` rimandi al login quando non si è autenticati;
- `https://smartshift-164.pages.dev` continui temporaneamente a rispondere fino al completamento della migrazione.

Cloudflare può mostrare per il certificato gli stati **Pending Validation**, **Pending Issuance**, **Pending Deployment** e infine **Active**. Attendere lo stato Active prima di modificare l'origine usata dall'autenticazione.

## Fase 5 — Aggiornare l'origine di SmartShift

Better Auth controlla l'origine delle richieste. Aggiungere il dominio a Pages non è sufficiente: il progetto deve passare dal vecchio URL a quello nuovo.

Nel file `wrangler.jsonc` occorrerà sostituire:

```json
"APP_URL": "https://smartshift-164.pages.dev"
```

con:

```json
"APP_URL": "https://app.smartshiftapp.eu.org"
```

Dopo la modifica bisogna eseguire test, commit e push su `main`. La GitHub Action pubblicherà il Worker e Pages. Da quel momento il login deve essere eseguito dal dominio personalizzato, perché l'origine autorizzata sarà quella nuova.

Questa modifica può essere eseguita da Codex quando il dominio Pages risulta attivo. È sufficiente comunicare il nome del dominio; non occorre fornire token o password.

### Indirizzo pages.dev dopo il passaggio

Il vecchio indirizzo può restare tecnicamente raggiungibile, ma il login da quell'origine non sarà più quello principale. In seguito si può configurare un redirect verso il dominio personalizzato. Evitare di applicare redirect o regole WAF durante la validazione iniziale del certificato, in particolare sul percorso `/.well-known/acme-challenge/*`.

## Fase 6 — Aggiungere il dominio in Resend

Quando la zona è Active in Cloudflare:

1. Accedere a [Resend Domains](https://resend.com/domains).
2. Selezionare **Add Domain**.
3. Inserire:

   ```text
   smartshiftapp.eu.org
   ```

4. Abilitare la capacità di invio. La ricezione email non è necessaria per SmartShift.
5. Se Resend permette di scegliere la regione, scegliere la regione europea, normalmente **Ireland / `eu-west-1`**, per mantenere il servizio più vicino agli utenti europei.
6. Confermare la creazione.

Resend mostrerà un insieme di record DNS specifici. I record reali del proprio account sono l'unica fonte da seguire: non copiare chiavi DKIM, destinazioni o valori SPF dagli esempi di questa guida.

In genere possono comparire:

| Scopo | Tipo possibile | Esempio del nome, non del valore |
| --- | --- | --- |
| SPF/gestione bounce | MX | `send` |
| SPF | TXT | `send` |
| Firma DKIM | TXT | `resend._domainkey` |
| Tracking opzionale | CNAME | `links` |

I nomi e i valori dipendono dalla regione e dalla configurazione Resend.

## Fase 7 — Copiare i record Resend in Cloudflare DNS

Per ogni record mostrato da Resend:

1. Aprire Cloudflare → `smartshiftapp.eu.org` → **DNS → Records**.
2. Selezionare **Add record**.
3. Copiare esattamente:

   - tipo;
   - nome/host;
   - contenuto o destinazione;
   - priorità per i record MX;
   - TTL, lasciando **Auto** se Resend non richiede altro.

4. Salvare il record.

### Come compilare il campo Name

Se Resend mostra il nome completo:

```text
resend._domainkey.smartshiftapp.eu.org
```

Cloudflare normalmente permette di inserire soltanto:

```text
resend._domainkey
```

Dopo il salvataggio controllare che il dashboard mostri il nome completo desiderato. Non duplicare il dominio, evitando risultati come:

```text
resend._domainkey.smartshiftapp.eu.org.smartshiftapp.eu.org
```

### Proxy Cloudflare

I record email non devono passare attraverso il proxy HTTP di Cloudflare:

- TXT e MX non hanno proxy;
- eventuali CNAME Resend devono essere impostati su **DNS only**, con nuvola grigia;
- non trasformare un record Resend in un record proxied con nuvola arancione.

### Record TXT e virgolette

Copiare il contenuto visualizzato da Resend. Il dashboard Cloudflare gestisce normalmente la rappresentazione delle virgolette dei TXT; non aggiungere coppie di virgolette ulteriori se l'interfaccia non le richiede.

### Record MX e priorità

Inserire anche la priorità indicata da Resend, spesso `10`. Il record MX mostrato per il dominio di invio/bounce non equivale necessariamente ad attivare la ricezione della posta personale. Non abilitare **Receiving** in Resend e non sostituire eventuali MX usati da un servizio di posta senza averne prima verificato l'impatto.

## Fase 8 — Verificare SPF e DKIM in Resend

Dopo aver salvato tutti i record:

1. Tornare alla pagina del dominio in Resend.
2. Selezionare **Verify DNS Records**.
3. Controllare lo stato di ogni record.
4. Attendere che il dominio complessivo risulti **Verified**.

La propagazione può richiedere alcuni minuti o, in casi meno comuni, diverse ore. Evitare di cancellare e ricreare continuamente il dominio: prima confrontare carattere per carattere nome, valore e priorità.

Controlli da PowerShell, usando i nomi effettivi mostrati da Resend:

```powershell
Resolve-DnsName -Type TXT resend._domainkey.smartshiftapp.eu.org
Resolve-DnsName -Type TXT send.smartshiftapp.eu.org
Resolve-DnsName -Type MX send.smartshiftapp.eu.org
```

Un dominio Resend verificato sta superando SPF e DKIM. Resend richiede inoltre che il dominio del campo `From` coincida esattamente con il dominio o sottodominio verificato; una differenza può causare un errore `403`.

## Fase 9 — Aggiungere DMARC

DMARC aiuta i destinatari a distinguere i messaggi legittimi da quelli falsificati. Configurarlo dopo che SPF e DKIM risultano verificati.

In Cloudflare aggiungere inizialmente:

| Tipo | Nome | Valore |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

La policy `p=none` raccoglie segnali senza chiedere ai destinatari di rifiutare la posta. Dopo aver verificato per un certo periodo che gli inviti arrivano e mostrano `spf=pass`, `dkim=pass` e `dmarc=pass`, si potrà valutare una policy più restrittiva come `quarantine` o `reject`.

Se si dispone di una casella adatta a ricevere report aggregati, è possibile aggiungere un parametro `rua`, seguendo la [guida DMARC di Resend](https://resend.com/docs/dashboard/domains/dmarc). Non indicare un indirizzo inesistente soltanto per completare l'esempio.

## Fase 10 — Configurare il mittente e una nuova API key

Quando il dominio è Verified, usare un mittente coerente:

```text
SmartShift <accesso@smartshiftapp.eu.org>
```

L'indirizzo serve come identità di invio. Per il flusso attuale non è obbligatorio che riceva risposte, ma è consigliabile scegliere un nome chiaro come `accesso`, `noreply` o `inviti`.

### Ruotare la API key

La chiave Resend fornita durante lo sviluppo è stata condivisa in chat. Dopo la verifica del dominio:

1. Aprire Resend → **API Keys**.
2. Creare una nuova chiave chiamata, per esempio, `SmartShift Production`.
3. Se disponibile, assegnare soltanto **Sending access**.
4. Limitare la chiave al dominio `smartshiftapp.eu.org`.
5. Copiare la chiave: Resend potrebbe mostrarla una sola volta.
6. Salvare la nuova chiave direttamente in Cloudflare.
7. Revocare la chiave precedente dopo aver verificato il nuovo invio.

Non incollare la nuova chiave in chat, issue GitHub, commit, screenshot o documenti.

### Salvare i valori dal dashboard Cloudflare

Aprire:

```text
Workers & Pages → smartshift → Settings → Variables and Secrets
```

Impostare:

| Nome | Valore | Tipo consigliato |
| --- | --- | --- |
| `RESEND_API_KEY` | nuova chiave Resend | Secret |
| `EMAIL_FROM` | `SmartShift <accesso@smartshiftapp.eu.org>` | Secret o variabile |
| `EMAIL_FROM_NAME` | `SmartShift` | Facoltativo; non serve se `EMAIL_FROM` include già il nome |

Quando si modifica un secret del Worker, controllare che Cloudflare completi la nuova versione/deployment senza rimuovere `BETTER_AUTH_SECRET`.

### Alternativa tramite terminale

Dal repository, con Wrangler autenticato:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
```

Wrangler chiederà il valore in modo interattivo. Non mettere la chiave direttamente dopo il comando e non salvarla nella cronologia della shell.

## Fase 11 — Prova completa del flusso

Eseguire il test con una casella controllata che non appartenga già a un utente SmartShift:

1. Accedere come amministratore.
2. Aprire **Team**.
3. Selezionare **Nuovo Collega**.
4. Inserire nome, cognome ed email di test.
5. Confermare la creazione.
6. Controllare che il pannello mostri l'invito in attesa e non «invito non inviato».
7. Controllare posta in arrivo e spam.
8. Aprire `https://app.smartshiftapp.eu.org/login`.
9. Accedere con email e password temporanea.
10. Verificare che SmartShift imponga il cambio password e non permetta di aprire dashboard o export.
11. Scegliere una password nuova di almeno 12 caratteri.
12. Verificare l'accesso alla dashboard.
13. Verificare che la password temporanea non funzioni più.
14. Dal pannello admin, assegnare il ruolo admin soltanto se desiderato.

Per testare il reinvio:

1. Creare un secondo account di prova oppure far scadere un invito controllato.
2. Selezionare **Reinvia invito**.
3. Verificare la ricezione della nuova email.
4. Verificare che la password temporanea precedente sia stata invalidata.

Non usare il proprio amministratore principale come account di prova e non eseguire lo script di provisioning su di esso: lo script reimposta la password e revoca le sessioni.

## Diagnosi dei problemi più comuni

### Cloudflare resta Pending

- Verificare che EU.org abbia approvato la richiesta.
- Confrontare i nameserver pubblici con quelli mostrati da Cloudflare.
- Verificare di non aver copiato `https://` o spazi nei nameserver.
- Attendere la propagazione prima di cambiare nuovamente configurazione.

### EU.org segnala nameserver non configurati

- Verificare che la zona Cloudflare esista ancora e sia in attesa, non eliminata.
- Controllare che il dominio richiesto e la zona Cloudflare coincidano esattamente.
- Non usare nameserver assegnati a un'altra zona Cloudflare.
- Controllare eventuali comunicazioni tecniche inviate da EU.org.

### Il dominio Pages mostra 522

- Associare il dominio dalla sezione **Custom domains** del progetto Pages prima di creare record manuali.
- Verificare che sia stato scelto il progetto `smartshift-164`.
- Controllare che non esistano record A/AAAA/CNAME concorrenti per `app`.
- Attendere che il certificato HTTPS sia Active.

### Il certificato resta Pending Validation

- Non bloccare `/.well-known/acme-challenge/*` con Access, WAF o redirect.
- Verificare che DNSSEC non sia in stato errato/bogus.
- Controllare eventuali record CAA troppo restrittivi.
- Attendere la propagazione DNS prima di ricreare il dominio.

### Resend non verifica DKIM o SPF

- Confrontare il nome completo dopo il salvataggio su Cloudflare.
- Controllare di non aver duplicato il suffisso del dominio.
- Verificare il tipo del record e la priorità MX.
- Impostare eventuali CNAME Resend su DNS only.
- Non creare un secondo record SPF concorrente sullo stesso hostname; unire le autorizzazioni solo se realmente necessario.

### Resend restituisce 403 Domain mismatch

- Controllare che il dominio sia **Verified**.
- Confrontare il dominio dopo `@` in `EMAIL_FROM` con quello verificato.
- Se è stato verificato un sottodominio, usare esattamente quel sottodominio nel mittente.
- Controllare che la nuova API key abbia accesso al dominio corretto.

### L'account viene creato ma l'email non parte

SmartShift mantiene l'account in stato di primo accesso e mostra una sola volta la password temporanea all'amministratore che ha creato o reinviato l'account. Comunicarla al collega tramite un canale sicuro. Correggere configurazione Resend o `EMAIL_FROM`, quindi usare **Reinvia invito** se serve una nuova password: il reinvio invalida quella precedente e revoca le sessioni temporanee.

### Il login funziona su pages.dev ma non sul dominio nuovo

- Verificare che `APP_URL` sia stato aggiornato e distribuito.
- Usare esattamente `https://app.smartshiftapp.eu.org`, senza porta o slash aggiuntivi nella configurazione.
- Controllare la GitHub Action e la versione del Worker pubblicata.
- Cancellare cookie vecchi soltanto dopo aver verificato la configurazione, oppure provare in una finestra privata.

## Checklist finale

### EU.org e Cloudflare DNS

- [ ] Nome del dominio scelto e conforme alle policy EU.org.
- [ ] Zona aggiunta al proprio account Cloudflare.
- [ ] Due nameserver Cloudflare copiati nella domanda EU.org.
- [ ] Richiesta EU.org approvata.
- [ ] Nameserver pubblici corrispondenti a Cloudflare.
- [ ] Zona Cloudflare in stato Active.
- [ ] DNSSEC lasciato disabilitato durante la prima configurazione.

### Applicazione

- [ ] `app.<dominio>` aggiunto da Pages → Custom domains.
- [ ] Certificato HTTPS Active.
- [ ] Pagina di login raggiungibile dal nuovo URL.
- [ ] `APP_URL` aggiornato in `wrangler.jsonc`.
- [ ] Commit, GitHub Action e deploy completati.
- [ ] Dashboard ed export ancora protetti senza sessione.

### Resend

- [ ] Dominio aggiunto in Resend nella regione corretta.
- [ ] Tutti i record copiati in Cloudflare con valori reali Resend.
- [ ] Eventuali CNAME impostati su DNS only.
- [ ] SPF e DKIM Verified.
- [ ] DMARC iniziale pubblicato.
- [ ] Nuova API key limitata all'invio e al dominio.
- [ ] `RESEND_API_KEY` aggiornato nei secret Cloudflare.
- [ ] `EMAIL_FROM` impostato sul dominio verificato.
- [ ] Vecchia chiave revocata dopo la prova.

### Prova utenti

- [ ] Invito ricevuto da una casella di test nuova.
- [ ] Password temporanea valida prima della scadenza.
- [ ] Cambio password obbligatorio.
- [ ] Vecchia password invalidata dopo il cambio.
- [ ] Reinvio verificato.
- [ ] Nuovi utenti creati come `user`.
- [ ] Promozione ad admin possibile soltanto dal pannello amministrativo.

## Dati da comunicare per completare la configurazione

Quando EU.org e Resend hanno terminato la verifica, per completare il lavoro nel repository è sufficiente comunicare:

```text
Dominio approvato: smartshiftapp.eu.org
Dominio Pages attivo: app.smartshiftapp.eu.org
Dominio Resend: Verified
Mittente scelto: accesso@smartshiftapp.eu.org
```

Non comunicare API key, token Cloudflare, password o cookie. La nuova chiave Resend deve essere inserita direttamente tra i secret del Worker.

## Riferimenti ufficiali

- [Registrazione dominio EU.org](https://nic.eu.org/register.html)
- [Pannello richieste EU.org](https://nic.eu.org/arf/)
- [Configurare i nameserver Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Domini personalizzati Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Stati dei certificati Cloudflare](https://developers.cloudflare.com/ssl/reference/certificate-statuses/)
- [API e autenticazione Resend](https://resend.com/docs/api-reference/introduction)
- [Record di un dominio Resend](https://resend.com/docs/api-reference/domains/get-domain)
- [Errore Resend domain mismatch](https://resend.com/docs/knowledge-base/403-error-domain-mismatch)
- [DMARC con Resend](https://resend.com/docs/dashboard/domains/dmarc)
