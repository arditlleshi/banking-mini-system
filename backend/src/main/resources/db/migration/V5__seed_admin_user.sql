-- Bootstrap admin (password: 123456) — BCrypt strength 10, compatible with BCryptPasswordEncoder.
-- Runs once per database when this migration is applied; skipped if admin username already exists.
INSERT INTO users (username, email, full_name, password_hash, is_active, user_role)
SELECT 'admin',
       'admin@localhost',
       'Administrator',
       '$2b$10$H4O14QpMW.GgfiEbPKX7i.4uAFTBMMVbOobK0RXPSTwH4IcIym8fm',
       TRUE,
       'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
