INSERT INTO exchange_rates (base_currency, quote_currency, buy_rate, sell_rate, source, valid_from)
SELECT seed.base_currency, seed.quote_currency, seed.buy_rate, seed.sell_rate, seed.source, seed.valid_from
FROM (
    VALUES
        ('EUR', 'ALL', 93.64000000, 97.46000000, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('USD', 'ALL', 79.94000000, 83.21000000, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('GBP', 'ALL', 107.28000000, 113.91000000, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('ALL', 'EUR', 0.01026062, 0.01067920, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('ALL', 'USD', 0.01201779, 0.01250938, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('ALL', 'GBP', 0.00877886, 0.00932140, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('EUR', 'USD', 1.12534551, 1.21916437, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('EUR', 'GBP', 0.82205250, 0.90846383, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('USD', 'EUR', 0.82023394, 0.88861598, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('USD', 'GBP', 0.70178211, 0.77563386, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('GBP', 'EUR', 1.10075929, 1.21646732, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00'),
        ('GBP', 'USD', 1.28926812, 1.42494371, 'ABI_PUBLIC_WEB_2026_05_19', TIMESTAMP '2026-05-19 00:00:00')
) AS seed(base_currency, quote_currency, buy_rate, sell_rate, source, valid_from)
WHERE NOT EXISTS (
    SELECT 1
    FROM exchange_rates existing
    WHERE existing.base_currency = seed.base_currency
      AND existing.quote_currency = seed.quote_currency
      AND existing.valid_from = seed.valid_from
);
