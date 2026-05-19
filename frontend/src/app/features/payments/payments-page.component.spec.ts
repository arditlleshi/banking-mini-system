import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountApiService } from '../../core/services/account-api.service';
import { ExchangeRateApiService } from '../../core/services/exchange-rate-api.service';
import { PaymentApiService } from '../../core/services/payment-api.service';
import { TransferApiService } from '../../core/services/transfer-api.service';
import { PaymentsPageComponent } from './payments-page.component';

describe('PaymentsPageComponent', () => {
  const getAccounts = vi.fn();
  const getExchangeRates = vi.fn();
  const createTransfer = vi.fn();
  const lookupBeneficiary = vi.fn();
  const createPayment = vi.fn();
  const navigate = vi.fn();

  beforeEach(async () => {
    getAccounts.mockReset();
    getExchangeRates.mockReset();
    createTransfer.mockReset();
    lookupBeneficiary.mockReset();
    createPayment.mockReset();
    navigate.mockReset();

    getAccounts.mockReturnValue(of([createAccount(1, 'Source Account', '111111CUR01'), createAccount(2, 'Savings', '222222CUR01')]));
    getExchangeRates.mockReturnValue(of([]));
    createTransfer.mockReturnValue(of({}));
    lookupBeneficiary.mockReturnValue(
      of({
        accountId: 3,
        accountNumber: '333333CUR01',
        iban: 'AL4733333300000000000001',
        beneficiaryName: 'Beneficiary User',
        accountName: 'Beneficiary Main',
        currency: 'EUR'
      })
    );
    createPayment.mockReturnValue(
      of({
        paymentReference: 'payment-ref-1',
        sourceAccountId: 1,
        currency: 'EUR',
        amount: 75,
        description: 'Rent contribution',
        counterpartyName: 'Beneficiary User',
        counterpartyAccount: '333333CUR01',
        balanceAfter: 925,
        bookedAt: '2026-05-19T09:00:00Z'
      })
    );

    await TestBed.configureTestingModule({
      imports: [PaymentsPageComponent],
      providers: [
        {
          provide: AccountApiService,
          useValue: { getAccounts }
        },
        {
          provide: ExchangeRateApiService,
          useValue: { getExchangeRates }
        },
        {
          provide: TransferApiService,
          useValue: { createTransfer }
        },
        {
          provide: PaymentApiService,
          useValue: { lookupBeneficiary, createPayment }
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ mode: 'bank-account' }) } }
        },
        {
          provide: Router,
          useValue: { navigate }
        }
      ]
    }).compileComponents();
  });

  it('opens the bank-account flow from the query parameter', () => {
    const fixture = TestBed.createComponent(PaymentsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      activePaymentAction: () => string;
    };

    expect(component.activePaymentAction()).toBe('bank-account');
  });

  it('verifies a beneficiary and submits the payment', () => {
    const fixture = TestBed.createComponent(PaymentsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      paymentForm: {
        patchValue: (value: {
          sourceAccountId: number;
          beneficiaryAccountNumber: string;
          amount: number;
          description: string;
        }) => void;
      };
      lookupBeneficiary: () => void;
      submitPayment: () => void;
      beneficiary: () => { beneficiaryName: string } | null;
      successPayment: () => { paymentReference: string } | null;
    };

    component.paymentForm.patchValue({
      sourceAccountId: 1,
      beneficiaryAccountNumber: '333333CUR01',
      amount: 75,
      description: 'Rent contribution'
    });

    component.lookupBeneficiary();
    component.submitPayment();

    expect(lookupBeneficiary).toHaveBeenCalledWith('333333CUR01');
    expect(component.beneficiary()?.beneficiaryName).toBe('Beneficiary User');
    expect(createPayment).toHaveBeenCalledWith({
      sourceAccountId: 1,
      amount: 75,
      description: 'Rent contribution',
      counterpartyName: 'Beneficiary User',
      counterpartyAccount: '333333CUR01'
    });
    expect(component.successPayment()?.paymentReference).toBe('payment-ref-1');
  });
});

function createAccount(id: number, name: string, accountNumber: string) {
  return {
    id,
    accountNumber,
    iban: `AL47${accountNumber}`,
    type: 'CURRENT',
    currency: 'EUR',
    name,
    status: 'ACTIVE',
    currentBalance: 1000,
    availableBalance: 1000,
    overdraftLimit: 0,
    annualInterestRate: 0,
    openedAt: '2026-05-01T09:00:00Z',
    closedAt: null
  };
}
