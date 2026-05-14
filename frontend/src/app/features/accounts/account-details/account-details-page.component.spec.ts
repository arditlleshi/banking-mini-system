import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  AccountApiService,
  type AccountDetailsResponse,
  type AccountTransactionResponse
} from '../../../core/services/account-api.service';
import { AccountDetailsPageComponent } from './account-details-page.component';

describe('AccountDetailsPageComponent', () => {
  const getAccountDetails = vi.fn();
  const getAccountTransactions = vi.fn();
  const downloadAccountStatement = vi.fn();
  const navigate = vi.fn().mockResolvedValue(true);

  beforeEach(async () => {
    getAccountDetails.mockReset();
    getAccountTransactions.mockReset();
    downloadAccountStatement.mockReset();
    navigate.mockClear();

    getAccountDetails.mockReturnValue(of(createAccountDetailsResponse()));
    getAccountTransactions.mockReturnValue(of([createTransactionResponse('filtered-ref', 'DEBIT', 80)]));
    downloadAccountStatement.mockReturnValue(of(new Blob(['statement'])));

    await TestBed.configureTestingModule({
      imports: [AccountDetailsPageComponent],
      providers: [
        {
          provide: AccountApiService,
          useValue: {
            getAccountDetails,
            getAccountTransactions,
            downloadAccountStatement
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ accountNumber: 'AL123456789' })),
            snapshot: {
              queryParamMap: convertToParamMap({
                fromDate: '2026-05-01',
                toDate: '2026-05-31'
              })
            } as ActivatedRoute['snapshot']
          } satisfies Partial<ActivatedRoute>
        },
        {
          provide: Router,
          useValue: { navigate } satisfies Partial<Router>
        }
      ]
    }).compileComponents();
  });

  it('loads filtered transactions from query parameters on init', async () => {
    const fixture = TestBed.createComponent(AccountDetailsPageComponent);
    await fixture.whenStable();

    expect(getAccountDetails).toHaveBeenCalledWith('AL123456789');
    expect(getAccountTransactions).toHaveBeenCalledWith(7, {
      fromDate: '2026-05-01',
      toDate: '2026-05-31'
    });
  });

  it('clears the query parameters when the filters are reset', async () => {
    const fixture = TestBed.createComponent(AccountDetailsPageComponent);
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { resetStatementFilters: () => void }).resetStatementFilters();

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        fromDate: null,
        toDate: null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  });
});

function createAccountDetailsResponse(): AccountDetailsResponse {
  return {
    account: {
      id: 7,
      accountNumber: 'AL123456789',
      iban: 'AL4721211009000000000000',
      type: 'CURRENT',
      currency: 'EUR',
      name: 'Main Account',
      status: 'ACTIVE',
      currentBalance: 1200,
      availableBalance: 1200,
      overdraftLimit: 0,
      annualInterestRate: 0,
      openedAt: '2026-05-01T09:00:00Z',
      closedAt: null
    },
    transactionCount: 2,
    totalCredits: 200,
    totalDebits: 80,
    netMovement: 120,
    transactions: [
      createTransactionResponse('full-ref-1', 'CREDIT', 200),
      createTransactionResponse('full-ref-2', 'DEBIT', 80)
    ]
  };
}

function createTransactionResponse(
  transactionReference: string,
  direction: AccountTransactionResponse['direction'],
  amount: number
): AccountTransactionResponse {
  return {
    id: direction === 'CREDIT' ? 1 : 2,
    transactionReference,
    externalReference: null,
    type: direction === 'CREDIT' ? 'DEPOSIT' : 'PAYMENT',
    status: 'BOOKED',
    direction,
    currency: 'EUR',
    amount,
    description: 'Statement test transaction',
    counterpartyName: 'Counterparty',
    counterpartyAccount: 'AL000000000000000000001',
    bookingTimestamp: '2026-05-10T09:30:00Z',
    valueDate: '2026-05-10',
    balanceAfter: direction === 'CREDIT' ? 1200 : 1120,
    fxRate: null,
    fxReferenceAmount: null,
    fxReferenceCurrency: null
  };
}
