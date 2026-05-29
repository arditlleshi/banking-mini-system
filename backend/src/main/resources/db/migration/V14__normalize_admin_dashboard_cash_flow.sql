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
