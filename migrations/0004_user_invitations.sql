ALTER TABLE profili ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1));
ALTER TABLE profili ADD COLUMN temporary_password_expires_at TEXT;
ALTER TABLE profili ADD COLUMN invitation_status TEXT NOT NULL DEFAULT 'completed' CHECK (invitation_status IN ('pending', 'sent', 'failed', 'completed'));
ALTER TABLE profili ADD COLUMN invited_at TEXT;
ALTER TABLE profili ADD COLUMN invitation_sent_at TEXT;
ALTER TABLE profili ADD COLUMN invited_by TEXT REFERENCES profili(id);

CREATE INDEX profili_invitation_status ON profili(invitation_status);
