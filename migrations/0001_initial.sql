CREATE TABLE profili (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  cognome TEXT NOT NULL DEFAULT '',
  ruolo TEXT NOT NULL DEFAULT 'user' CHECK (ruolo IN ('user', 'admin')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE eventi_calendario (
  id TEXT PRIMARY KEY NOT NULL,
  utente_id TEXT NOT NULL REFERENCES profili(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK (length(data) = 10 AND data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  tipo TEXT NOT NULL CHECK (tipo IN ('ferie', 'smartworking', 'malattia', 'ufficio')),
  mezza_giornata INTEGER NOT NULL DEFAULT 0 CHECK (mezza_giornata IN (0, 1)),
  stato TEXT NOT NULL DEFAULT 'approvato' CHECK (stato = 'approvato'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (utente_id, data)
);

CREATE INDEX eventi_calendario_data ON eventi_calendario(data);
