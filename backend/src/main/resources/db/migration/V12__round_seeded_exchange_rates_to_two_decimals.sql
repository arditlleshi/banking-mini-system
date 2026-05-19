UPDATE exchange_rates
SET
    buy_rate = ROUND(buy_rate, 2),
    sell_rate = ROUND(sell_rate, 2)
WHERE source = 'ABI_PUBLIC_WEB_2026_05_19'
  AND valid_from = TIMESTAMP '2026-05-19 00:00:00';
