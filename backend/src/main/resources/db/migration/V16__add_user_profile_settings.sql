ALTER TABLE users
ADD COLUMN phone VARCHAR(32);

ALTER TABLE users
ADD COLUMN address VARCHAR(255);

ALTER TABLE users
ADD COLUMN theme_preference VARCHAR(20) NOT NULL DEFAULT 'LIGHT';

ALTER TABLE users
ADD CONSTRAINT chk_users_phone_nonblank CHECK (phone IS NULL OR length(trim(phone)) > 0);

ALTER TABLE users
ADD CONSTRAINT chk_users_address_nonblank CHECK (address IS NULL OR length(trim(address)) > 0);

ALTER TABLE users
ADD CONSTRAINT chk_users_theme_preference CHECK (theme_preference IN ('LIGHT', 'DARK'));
