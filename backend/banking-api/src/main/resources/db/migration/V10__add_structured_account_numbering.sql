ALTER TABLE users
    ADD COLUMN IF NOT EXISTS base_number VARCHAR(6);

ALTER TABLE users
    ADD CONSTRAINT uq_users_base_number UNIQUE (base_number);

ALTER TABLE users
    ADD CONSTRAINT chk_users_base_number_format
        CHECK (base_number IS NULL OR base_number ~ '^[0-9]{6}$');

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS base_number VARCHAR(6),
    ADD COLUMN IF NOT EXISTS account_class_code VARCHAR(3),
    ADD COLUMN IF NOT EXISTS serial_number INTEGER;

ALTER TABLE accounts
    ADD CONSTRAINT chk_accounts_base_number_format
        CHECK (base_number IS NULL OR base_number ~ '^[0-9]{6}$'),
    ADD CONSTRAINT chk_accounts_class_code_format
        CHECK (account_class_code IS NULL OR account_class_code ~ '^[0-9]{3}$'),
    ADD CONSTRAINT chk_accounts_serial_number_range
        CHECK (serial_number IS NULL OR (serial_number >= 1 AND serial_number <= 99));

CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_structured_numbering
    ON accounts (base_number, account_class_code, serial_number)
    WHERE base_number IS NOT NULL
      AND account_class_code IS NOT NULL
      AND serial_number IS NOT NULL;
