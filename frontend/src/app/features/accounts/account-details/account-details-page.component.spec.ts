import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import {
  AccountApiService,
  type AccountDetailsResponse,
  type AccountHistoryTransactionResponse
} from '../../../core/services/account-api.service';
import { AccountDetailsPageComponent } from './account-details-page.component';

describe('AccountDetailsPageComponent', () => {
  const getAccountDetails = vi.fn();
  const downloadAccountStatement = vi.fn();

  beforeEach(async () => {
    getAccountDetails.mockReset();
    downloadAccountStatement.mockReset();

    getAccountDetails.mockReturnValue(of(createAccountDetailsResponse()));
    downloadAccountStatement.mockReturnValue(of(new Blob(['statement'])));

    await TestBed.configureTestingModule({
      imports: [AccountDetailsPageComponent],
      providers: [
        {
          provide: AccountApiService,
          useValue: {
            getAccountDetails,
            downloadAccountStatement
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ accountNumber: 'AL123456789' })),
            queryParamMap: of(
              convertToParamMap({
                page: '1',
                fromDate: '2026-05-01',
                toDate: '2026-05-31'
              })
            ),
            snapshot: {
              queryParamMap: convertToParamMap({
                fromDate: '2026-05-01',
                toDate: '2026-05-31'
              })
            } as ActivatedRoute['snapshot']
          } satisfies Partial<ActivatedRoute>
        }
      ]
    }).compileComponents();
  });

  it('loads account details and statement transactions on init', async () => {
    const fixture = TestBed.createComponent(AccountDetailsPageComponent);
    await fixture.whenStable();

    expect(getAccountDetails).toHaveBeenCalledWith('AL123456789', 1);
    const component = fixture.componentInstance as unknown as {
      details: () => AccountDetailsResponse | null;
      statementTransactions: () => AccountHistoryTransactionResponse[];
    };

    expect(component.details()?.account.accountNumber).toBe('AL123456789');
    expect(component.statementTransactions()).toHaveLength(2);
    expect(component.statementTransactions()[0].transactionReference).toBe('full-ref-1');
  });

  it('clears the statement filters when they are reset', async () => {
    const fixture = TestBed.createComponent(AccountDetailsPageComponent);
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      statementFiltersForm: {
        setValue: (value: { fromDate: Date | null; toDate: Date | null }) => void;
        getRawValue: () => { fromDate: Date | null; toDate: Date | null };
      };
      resetStatementFilters: () => void;
    };

    component.statementFiltersForm.setValue({
      fromDate: new Date('2026-05-15T00:00:00Z'),
      toDate: new Date('2026-05-20T00:00:00Z')
    });
    component.resetStatementFilters();

    expect(component.statementFiltersForm.getRawValue()).toEqual({
      fromDate: null,
      toDate: null
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
    transactionPage: 1,
    transactionPageSize: 10,
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
  direction: AccountHistoryTransactionResponse['direction'],
  amount: number
): AccountHistoryTransactionResponse {
  return {
    id: direction === 'CREDIT' ? 1 : 2,
    transactionReference,
    type: direction === 'CREDIT' ? 'DEPOSIT' : 'PAYMENT',
    direction,
    currency: 'EUR',
    amount,
    description: 'Statement test transaction',
    counterpartyName: 'Counterparty',
    counterpartyAccount: 'AL000000000000000000001',
    bookingTimestamp: '2026-05-10T09:30:00Z'
  };
}
