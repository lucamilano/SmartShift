ALTER TABLE profili ADD COLUMN auth_user_id TEXT REFERENCES "user"(id);
CREATE UNIQUE INDEX profili_auth_user_id ON profili(auth_user_id);
