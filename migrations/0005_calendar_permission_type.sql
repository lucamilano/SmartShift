CREATE TABLE eventi_calendario_new (
  id TEXT PRIMARY KEY NOT NULL,
  utente_id TEXT NOT NULL REFERENCES profili(id) ON DELETE CASCADE,
  data TEXT NOT NULL CHECK (length(data) = 10 AND data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  tipo TEXT NOT NULL CHECK (tipo IN ('ferie', 'permesso', 'smartworking', 'malattia', 'ufficio')),
  mezza_giornata INTEGER NOT NULL DEFAULT 0 CHECK (mezza_giornata IN (0, 1)),
  stato TEXT NOT NULL DEFAULT 'approvato' CHECK (stato = 'approvato'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (utente_id, data)
);

INSERT INTO eventi_calendario_new (id, utente_id, data, tipo, mezza_giornata, stato, created_at)
SELECT id, utente_id, data, tipo, mezza_giornata, stato, created_at FROM eventi_calendario;

DROP TABLE eventi_calendario;
ALTER TABLE eventi_calendario_new RENAME TO eventi_calendario;
CREATE INDEX eventi_calendario_data ON eventi_calendario(data);
