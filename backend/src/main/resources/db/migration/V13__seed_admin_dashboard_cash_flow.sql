INSERT INTO accounts (
    owner_user_id,
    account_number,
    iban,
    base_number,
    account_class_code,
    serial_number,
    account_type,
    currency_code,
    name,
    status,
    current_balance,
    available_balance,
    overdraft_limit,
    annual_interest_rate,
    opened_at
)
SELECT
    admin_user.id,
    '2121100912000101',
    'AL4721211009120001010001',
    '120001',
    '201',
    1,
    'CURRENT',
    'ALL',
    'Admin Operating Account',
    'ACTIVE',
    17665.00,
    17665.00,
    0.00,
    1.2500,
    date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '6' MONTH + INTERVAL '5' DAY
FROM users admin_user
WHERE admin_user.username = 'admin'
  AND NOT EXISTS (
      SELECT 1
      FROM accounts account
      WHERE account.account_number = '2121100912000101'
  );

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
        4500.00 AS amount,
        'Client settlement received' AS description,
        'Northwind Trading' AS counterparty_name,
        'AL1121211009000000010001' AS counterparty_account,
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5' MONTH + INTERVAL '3' DAY + INTERVAL '9' HOUR AS booking_timestamp,
        4500.00 AS balance_after
    UNION ALL
    SELECT
        'ADM-CHART-02',
        'ADM-SEED-02',
        'PAYMENT',
        'DEBIT',
        620.00,
        'Workspace software renewal',
        'Atlassian Cloud',
        'AL2221211009000000020002',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '5' MONTH + INTERVAL '14' DAY + INTERVAL '11' HOUR,
        3880.00
    UNION ALL
    SELECT
        'ADM-CHART-03',
        'ADM-SEED-03',
        'DEPOSIT',
        'CREDIT',
        5100.00,
        'Monthly revenue sweep',
        'Contoso Europe',
        'AL3321211009000000030003',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '4' MONTH + INTERVAL '5' DAY + INTERVAL '10' HOUR,
        8980.00
    UNION ALL
    SELECT
        'ADM-CHART-04',
        'ADM-SEED-04',
        'FEE',
        'DEBIT',
        35.00,
        'Banking platform service fee',
        'Banking Mini System',
        'AL4421211009000000040004',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '4' MONTH + INTERVAL '18' DAY + INTERVAL '15' HOUR,
        8945.00
    UNION ALL
    SELECT
        'ADM-CHART-05',
        'ADM-SEED-05',
        'INTEREST',
        'CREDIT',
        12000.00,
        'Interest accrual',
        'Banking Mini System',
        'AL5521211009000000050005',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '3' MONTH + INTERVAL '4' DAY + INTERVAL '8' HOUR,
        9065.00
    UNION ALL
    SELECT
        'ADM-CHART-06',
        'ADM-SEED-06',
        'PAYMENT',
        'DEBIT',
        78000.00,
        'Vendor payout for hosting',
        'Azure Services',
        'AL6621211009000000060006',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '3' MONTH + INTERVAL '14' DAY + INTERVAL '13' HOUR,
        828500.00
    UNION ALL
    SELECT
        'ADM-CHART-07',
        'ADM-SEED-07',
        'DEPOSIT',
        'CREDIT',
        430000.00,
        'Partner distribution',
        'Fabrikam Group',
        'AL7721211009000000070007',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '2' MONTH + INTERVAL '2' DAY + INTERVAL '9' HOUR,
        1258500.00
    UNION ALL
    SELECT
        'ADM-CHART-08',
        'ADM-SEED-08',
        'WITHDRAWAL',
        'DEBIT',
        90000.00,
        'Operational cash withdrawal',
        'Cash Desk',
        'AL8821211009000000080008',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '2' MONTH + INTERVAL '20' DAY + INTERVAL '12' HOUR,
        1168500.00
    UNION ALL
    SELECT
        'ADM-CHART-09',
        'ADM-SEED-09',
        'DEPOSIT',
        'CREDIT',
        520000.00,
        'Quarterly client collection',
        'Adventure Works',
        'AL9921211009000000090009',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1' MONTH + INTERVAL '7' DAY + INTERVAL '10' HOUR,
        1688500.00
    UNION ALL
    SELECT
        'ADM-CHART-10',
        'ADM-SEED-10',
        'PAYMENT',
        'DEBIT',
        125000.00,
        'Contractor disbursement',
        'Southridge Studio',
        'AL1021211009000000100010',
        date_trunc('month', CURRENT_TIMESTAMP) - INTERVAL '1' MONTH + INTERVAL '16' DAY + INTERVAL '16' HOUR,
        1563500.00
    UNION ALL
    SELECT
        'ADM-CHART-11',
        'ADM-SEED-11',
        'DEPOSIT',
        'CREDIT',
        260000.00,
        'May subscription settlement',
        'Wide World Importers',
        'AL1121211009000000110011',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '2' DAY + INTERVAL '9' HOUR,
        1823500.00
    UNION ALL
    SELECT
        'ADM-CHART-12',
        'ADM-SEED-12',
        'INTEREST',
        'CREDIT',
        8500.00,
        'Monthly interest adjustment',
        'Banking Mini System',
        'AL1221211009000000120012',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '9' DAY + INTERVAL '8' HOUR,
        1832000.00
    UNION ALL
    SELECT
        'ADM-CHART-13',
        'ADM-SEED-13',
        'PAYMENT',
        'DEBIT',
        64000.00,
        'Office network invoice',
        'Proseware Telecom',
        'AL1321211009000000130013',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '12' DAY + INTERVAL '14' HOUR,
        1768000.00
    UNION ALL
    SELECT
        'ADM-CHART-14',
        'ADM-SEED-14',
        'FEE',
        'DEBIT',
        1500.00,
        'Card processing fee',
        'Banking Mini System',
        'AL1421211009000000140014',
        date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '18' DAY + INTERVAL '10' HOUR,
        1766500.00
) seed ON 1 = 1
WHERE account.account_number = '2121100912000101'
  AND NOT EXISTS (
      SELECT 1
      FROM transactions transaction
      WHERE transaction.transaction_reference = seed.transaction_reference
  );
