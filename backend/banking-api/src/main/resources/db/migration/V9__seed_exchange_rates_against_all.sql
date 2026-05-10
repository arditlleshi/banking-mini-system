ALTER TABLE exchange_rates
    RENAME COLUMN rate TO buy_rate;

ALTER TABLE exchange_rates
    ADD COLUMN sell_rate NUMERIC(19, 8);

UPDATE exchange_rates
SET sell_rate = buy_rate
WHERE sell_rate IS NULL;

ALTER TABLE exchange_rates
    ALTER COLUMN sell_rate SET NOT NULL;

ALTER TABLE exchange_rates
    ADD CONSTRAINT chk_exchange_rates_buy_rate_positive CHECK (buy_rate > 0),
    ADD CONSTRAINT chk_exchange_rates_sell_rate_positive CHECK (sell_rate > 0),
    ADD CONSTRAINT chk_exchange_rates_spread CHECK (sell_rate >= buy_rate);

INSERT INTO exchange_rates (base_currency, quote_currency, buy_rate, sell_rate, source, valid_from)
SELECT 'USD', 'ALL', 80.40000000, 81.50000000, 'MANUAL_IMAGE_2026_05_10', TIMESTAMP '2026-05-10 00:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM exchange_rates
    WHERE base_currency = 'USD'
      AND quote_currency = 'ALL'
      AND valid_from = TIMESTAMP '2026-05-10 00:00:00'
);

INSERT INTO exchange_rates (base_currency, quote_currency, buy_rate, sell_rate, source, valid_from)
SELECT 'EUR', 'ALL', 95.00000000, 95.80000000, 'MANUAL_IMAGE_2026_05_10', TIMESTAMP '2026-05-10 00:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM exchange_rates
    WHERE base_currency = 'EUR'
      AND quote_currency = 'ALL'
      AND valid_from = TIMESTAMP '2026-05-10 00:00:00'
);

INSERT INTO exchange_rates (base_currency, quote_currency, buy_rate, sell_rate, source, valid_from)
SELECT 'GBP', 'ALL', 109.50000000, 110.50000000, 'MANUAL_IMAGE_2026_05_10', TIMESTAMP '2026-05-10 00:00:00'
WHERE NOT EXISTS (
    SELECT 1
    FROM exchange_rates
    WHERE base_currency = 'GBP'
      AND quote_currency = 'ALL'
      AND valid_from = TIMESTAMP '2026-05-10 00:00:00'
);
