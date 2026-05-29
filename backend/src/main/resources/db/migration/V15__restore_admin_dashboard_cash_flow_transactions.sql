INSERT INTO transactions (
    account_id,
    transaction_reference,
    external_reference,
    transaction_type,
    transaction_status,
    direction,
    currency_code,
    amount,
    description,
    counterparty_name,
    counterparty_account,
    booking_timestamp,
    value_date,
    balance_after,
    fx_rate,
    fx_reference_amount,
    fx_reference_currency
)
SELECT
    account.id,
    seed.transaction_reference,
    seed.external_reference,
    seed.transaction_type,
    'BOOKED',
    seed.direction,
    'ALL',
    seed.amount,
    seed.description,
    seed.counterparty_name,
    seed.counterparty_account,
    seed.booking_timestamp,
    CAST(seed.booking_timestamp AS DATE),
    seed.balance_after,
    NULL,
    NULL,
    NULL
FROM accounts account
JOIN (
    SELECT
        'ADM-CHART-01' AS transaction_reference,
        'ADM-SEED-01' AS external_reference,
        'DEPOSIT' AS transaction_type,
        'CREDIT' AS direction,
        4200.00 AS amount,
        'Client settlement received' AS description,
        'Northwind Trading' AS counterparty_name,
        'AL1121211009000000010001' AS counterparty_account,
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5' MONTH + INTERVAL '3' DAY + INTERVAL '9' HOUR AS booking_timestamp,
        4200.00 AS balance_after
    UNION ALL
    SELECT
        'ADM-CHART-02',
        'ADM-SEED-02',
        'PAYMENT',
        'DEBIT',
        1650.00,
        'Workspace software renewal',
        'Atlassian Cloud',
        'AL2221211009000000020002',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5' MONTH + INTERVAL '14' DAY + INTERVAL '11' HOUR,
        2550.00
    UNION ALL
    SELECT
        'ADM-CHART-03',
        'ADM-SEED-03',
        'DEPOSIT',
        'CREDIT',
        4700.00,
        'Monthly revenue sweep',
        'Contoso Europe',
        'AL3321211009000000030003',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '4' MONTH + INTERVAL '5' DAY + INTERVAL '10' HOUR,
        7250.00
    UNION ALL
    SELECT
        'ADM-CHART-04',
        'ADM-SEED-04',
        'FEE',
        'DEBIT',
        1200.00,
        'Annual processor service fee',
        'Banking Mini System',
        'AL4421211009000000040004',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '4' MONTH + INTERVAL '18' DAY + INTERVAL '15' HOUR,
        6050.00
    UNION ALL
    SELECT
        'ADM-CHART-05',
        'ADM-SEED-05',
        'ADJUSTMENT',
        'CREDIT',
        3900.00,
        'Reserve release adjustment',
        'Operations Treasury',
        'AL5521211009000000050005',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '3' MONTH + INTERVAL '4' DAY + INTERVAL '8' HOUR,
        9950.00
    UNION ALL
    SELECT
        'ADM-CHART-06',
        'ADM-SEED-06',
        'PAYMENT',
        'DEBIT',
        1400.00,
        'Vendor payout for hosting',
        'Azure Services',
        'AL6621211009000000060006',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '3' MONTH + INTERVAL '14' DAY + INTERVAL '13' HOUR,
        8550.00
    UNION ALL
    SELECT
        'ADM-CHART-07',
        'ADM-SEED-07',
        'DEPOSIT',
        'CREDIT',
        5200.00,
        'Partner distribution',
        'Fabrikam Group',
        'AL7721211009000000070007',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '2' MONTH + INTERVAL '2' DAY + INTERVAL '9' HOUR,
        13750.00
    UNION ALL
    SELECT
        'ADM-CHART-08',
        'ADM-SEED-08',
        'WITHDRAWAL',
        'DEBIT',
        2100.00,
        'Operational cash withdrawal',
        'Cash Desk',
        'AL8821211009000000080008',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '2' MONTH + INTERVAL '20' DAY + INTERVAL '12' HOUR,
        11650.00
    UNION ALL
    SELECT
        'ADM-CHART-09',
        'ADM-SEED-09',
        'DEPOSIT',
        'CREDIT',
        4800.00,
        'Quarterly client collection',
        'Adventure Works',
        'AL9921211009000000090009',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1' MONTH + INTERVAL '7' DAY + INTERVAL '10' HOUR,
        16450.00
    UNION ALL
    SELECT
        'ADM-CHART-10',
        'ADM-SEED-10',
        'PAYMENT',
        'DEBIT',
        1750.00,
        'Contractor disbursement',
        'Southridge Studio',
        'AL1021211009000000100010',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1' MONTH + INTERVAL '16' DAY + INTERVAL '16' HOUR,
        14700.00
    UNION ALL
    SELECT
        'ADM-CHART-11',
        'ADM-SEED-11',
        'DEPOSIT',
        'CREDIT',
        4100.00,
        'May subscription settlement',
        'Wide World Importers',
        'AL1121211009000000110011',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '2' DAY + INTERVAL '9' HOUR,
        18800.00
    UNION ALL
    SELECT
        'ADM-CHART-12',
        'ADM-SEED-12',
        'INTEREST',
        'CREDIT',
        180.00,
        'Monthly interest adjustment',
        'Banking Mini System',
        'AL1221211009000000120012',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '9' DAY + INTERVAL '8' HOUR,
        18980.00
    UNION ALL
    SELECT
        'ADM-CHART-13',
        'ADM-SEED-13',
        'PAYMENT',
        'DEBIT',
        1350.00,
        'Office network invoice',
        'Proseware Telecom',
        'AL1321211009000000130013',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '12' DAY + INTERVAL '14' HOUR,
        17630.00
    UNION ALL
    SELECT
        'ADM-CHART-14',
        'ADM-SEED-14',
        'FEE',
        'DEBIT',
        90.00,
        'Card processing fee',
        'Banking Mini System',
        'AL1421211009000000140014',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '18' DAY + INTERVAL '10' HOUR,
        17540.00
) seed ON 1 = 1
WHERE account.account_number = '2121100912000101'
  AND NOT EXISTS (
      SELECT 1
      FROM transactions transaction
      WHERE transaction.transaction_reference = seed.transaction_reference
  );

UPDATE transactions transaction
SET transaction_type = seed.transaction_type,
    amount = seed.amount,
    description = seed.description,
    counterparty_name = seed.counterparty_name,
    counterparty_account = seed.counterparty_account,
    balance_after = seed.balance_after
FROM (
    VALUES
        ('ADM-CHART-01', 'DEPOSIT', 4200.00, 'Client settlement received', 'Northwind Trading', 'AL1121211009000000010001', 4200.00),
        ('ADM-CHART-02', 'PAYMENT', 1650.00, 'Workspace software renewal', 'Atlassian Cloud', 'AL2221211009000000020002', 2550.00),
        ('ADM-CHART-03', 'DEPOSIT', 4700.00, 'Monthly revenue sweep', 'Contoso Europe', 'AL3321211009000000030003', 7250.00),
        ('ADM-CHART-04', 'FEE', 1200.00, 'Annual processor service fee', 'Banking Mini System', 'AL4421211009000000040004', 6050.00),
        ('ADM-CHART-05', 'ADJUSTMENT', 3900.00, 'Reserve release adjustment', 'Operations Treasury', 'AL5521211009000000050005', 9950.00),
        ('ADM-CHART-06', 'PAYMENT', 1400.00, 'Vendor payout for hosting', 'Azure Services', 'AL6621211009000000060006', 8550.00),
        ('ADM-CHART-07', 'DEPOSIT', 5200.00, 'Partner distribution', 'Fabrikam Group', 'AL7721211009000000070007', 13750.00),
        ('ADM-CHART-08', 'WITHDRAWAL', 2100.00, 'Operational cash withdrawal', 'Cash Desk', 'AL8821211009000000080008', 11650.00),
        ('ADM-CHART-09', 'DEPOSIT', 4800.00, 'Quarterly client collection', 'Adventure Works', 'AL9921211009000000090009', 16450.00),
        ('ADM-CHART-10', 'PAYMENT', 1750.00, 'Contractor disbursement', 'Southridge Studio', 'AL1021211009000000100010', 14700.00),
        ('ADM-CHART-11', 'DEPOSIT', 4100.00, 'May subscription settlement', 'Wide World Importers', 'AL1121211009000000110011', 18800.00),
        ('ADM-CHART-12', 'INTEREST', 180.00, 'Monthly interest adjustment', 'Banking Mini System', 'AL1221211009000000120012', 18980.00),
        ('ADM-CHART-13', 'PAYMENT', 1350.00, 'Office network invoice', 'Proseware Telecom', 'AL1321211009000000130013', 17630.00),
        ('ADM-CHART-14', 'FEE', 90.00, 'Card processing fee', 'Banking Mini System', 'AL1421211009000000140014', 17540.00)
) AS seed(
    transaction_reference,
    transaction_type,
    amount,
    description,
    counterparty_name,
    counterparty_account,
    balance_after
)
WHERE transaction.transaction_reference = seed.transaction_reference;

UPDATE accounts account
SET current_balance = 17540.00,
    available_balance = 17540.00
WHERE account.account_number = '2121100912000101';
