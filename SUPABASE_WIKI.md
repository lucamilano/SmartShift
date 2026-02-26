# 🧠 Documentazione Supabase (SQL & Policy)

Questa wiki contiene un riferimento di tutte le query di creazione tabelle, Trigger di automazione e regole di Sicurezza (Row Level Security - RLS) utilizzate per far funzionare correttamente **SmartShift** in accoppiata con Supabase.

In caso di nuovo progetto vuoto su Supabase, copiare e incollare nell'SQL Editor i seguenti blocchi in ordine sequenziale per avere l'infrastruttura completa e funzionante in pochi secondi.

---

## 1. Creazione Tabelle Principali

Vengono create le due tabelle necessarie: `profili` (l'anagrafica che estende l'autorizzazione di sistema di Supabase Auth) e `eventi_calendario` (i turni e giorni segnati).

```sql
-- Creazione tabella profili
CREATE TABLE profili (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    nome TEXT,
    cognome TEXT,
    ruolo TEXT DEFAULT 'user'::text,
    is_active BOOLEAN DEFAULT true,          -- Campo fondamentale per il "Soft Delete" anziché la vera cancellazione
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Creazione tabella eventi a calendario
CREATE TABLE eventi_calendario (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    utente_id UUID REFERENCES public.profili(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ferie', 'smartworking', 'malattia', 'ufficio')),
    mezza_giornata BOOLEAN DEFAULT false,
    stato TEXT DEFAULT 'approvato'::text,     -- Espandibile in futuro per approvazioni in sospeso
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Regola di unicità: Un singolo utente può avere UN SOLO evento nello stesso giorno!
    UNIQUE(utente_id, data)
);
```

---

## 2. Automazione Creazione Profili (Trigger)

Il sistema di Magic Link non usa una pagina form di "Registrazione". Appena un lavoratore fa il "primo accesso" confermando la sua mail tramite il link inviato da Supabase Auth (`auth.users`), si innesca questo utilissimo Trigger.
**Cosa fa?** Inserisce automaticamente una riga vuota nella nostra tabella `profili` e assorbe l'id del lavoratore, rendendolo subito in grado di comparire nella tavola dell'amministratore (e di usare l'App).

```sql
-- A. Creiamo la funzione che agisce come operatore silenzioso dietro le quinte
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profili (id, nome, cognome, ruolo)
    VALUES (
        new.id,
        '',
        '',
        'user' -- Tutti nascono 'user' tranne l'owner
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Inneschiamo la funzione ogni volta che un record atterra in "auth.users"
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

---

## 3. Gestione Sicurezza Avanzata - RLS (Row Level Security)

Da sole le tabelle Supabase sono aperte al mondo: tutti leggono e tutti scrivono tutto.
Abilitando le tabelle al regime speciale RLS "blindiamo" le porte. Successivamente creiamo le "Policies", ossia le sole eccezioni alla chiusura totale, separando chi è operatore base da chi è Amministratore Supremo.

```sql
-- Abilita RLS su entrambe le tabelle (Sbarra le porte a tutti gli estranei, incluse api di Next.js)
ALTER TABLE profili ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventi_calendario ENABLE ROW LEVEL SECURITY;
```

### 3a. Policy Profilo Lavoratore

Un utente base può solo leggere tutte le anagrafiche dei colleghi, ma quando si tratta di Modificare (`UPDATE`) i dati del database, ha la licenza di variare SOLO le righe dove giace col suo ID di sessione loggata.

```sql
-- Tutti (purché loggati) possono scorrere l'anagrafica dipendenti
CREATE POLICY "Public profiles are viewable by everyone" ON profili
FOR SELECT USING (auth.role() = 'authenticated');

-- Un dipendente può modificare / salvare soltanto e unicamente se stesso
CREATE POLICY "Users can insert their own profile" ON profili
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profili
FOR UPDATE USING (auth.uid() = id);
```

### 3b. Policy Lavoratore nel Calendario

Un utente può solo gestire i propri giorni, la propria spazzatura (cestino `DELETE`) e può spiare (leggere `SELECT`) i turni altrui come ferie o presenze in ufficio per organizzarsi il lavoro di team in SmartShift.

```sql
-- Chiunque vede gli eventi inseriti dagli altri
CREATE POLICY "Events are viewable by everyone" ON eventi_calendario
FOR SELECT USING (auth.role() = 'authenticated');

-- I lavoratori aggiungono turni solo per conto loro
CREATE POLICY "Users can insert their own events" ON eventi_calendario
FOR INSERT WITH CHECK (auth.uid() = utente_id);

-- I lavoratori cancellano solo i loro eventi (es. annullano una ferie)
CREATE POLICY "Users can delete their own events" ON eventi_calendario
FOR DELETE USING (auth.uid() = utente_id);
```

---

## 4. 👑 Permessi "God Mode" per l'Admin (L'eccezione alla Regola)

Come notato testando "Il mio Team" dalla nostra Web App, le RLS standard create sopra impedirebbero anche al creatore principale dell'azienda (l'Admin) di aggiornare il Nome/Cognome di un nuovo assunto appena loggato, o di "cancellare per finta" un ex dipendente (aggiornandone il campo a disattivo `is_active = false`).

Ecco la soluzione speciale che addestra finalmente il cervello del Database e gli intima in gergo SQL:
_"Rilassati, se a fare un Update o una Delete è un tizio che nel proprio profilo ha assegnata la stringa di ruolo 'admin', lascialo passare."_

```sql
-- AGGIORNAMENTO PROFILI ALTRUI (es. Il capo inserisce i Nomi di un dipendente che ha fatto il Io accesso o sceglie di "Cestinarlo")
CREATE POLICY "Admins can update all profiles" ON public.profili
FOR UPDATE
USING ( (SELECT ruolo FROM public.profili WHERE id = auth.uid()) = 'admin' );

-- CREAZIONE EVENTI A NOME ALTRUI (es. Segreteria segna tre giorni di malattia per un povero lavoratore febbricitante da casa)
CREATE POLICY "Admins can insert any events" ON public.eventi_calendario
FOR INSERT
WITH CHECK ( (SELECT ruolo FROM public.profili WHERE id = auth.uid()) = 'admin' );

-- CANCELLAZIONE EVENTI ALTRUI (es. L'Admin fa tabula rasa dal Calendario per correzione o su richiesta)
CREATE POLICY "Admins can delete any events" ON public.eventi_calendario
FOR DELETE
USING ( (SELECT ruolo FROM public.profili WHERE id = auth.uid()) = 'admin' );
```
