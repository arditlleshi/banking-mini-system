import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AccountApiService, type AccountResponse } from '../../core/services/account-api.service';
import { AccountsPageComponent } from './accounts-page.component';

describe('AccountsPageComponent', () => {
  const getAccounts = vi.fn();
  const createAccount = vi.fn();
  const downloadPaymentDetails = vi.fn();
  let createObjectURLSpy: { mockRestore: () => void };
  let revokeObjectURLSpy: { mockRestore: () => void };

  beforeEach(async () => {
    getAccounts.mockReset();
    createAccount.mockReset();
    downloadPaymentDetails.mockReset();

    getAccounts.mockReturnValue(of([createAccountResponse()]));
    createAccount.mockReturnValue(of(createAccountResponse()));
    downloadPaymentDetails.mockReturnValue(of(new Blob(['payment-details'])));

    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [AccountsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AccountApiService,
          useValue: {
            getAccounts,
            createAccount,
            downloadPaymentDetails
          }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('downloads payment details without showing inline success feedback', async () => {
    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const anchorElement = document.createElement('a');
    const anchorClick = vi.spyOn(anchorElement, 'click').mockImplementation(() => undefined);
    const anchorRemove = vi.spyOn(anchorElement, 'remove').mockImplementation(() => undefined);
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorElement);

    const component = fixture.componentInstance as unknown as {
      shareAccountDetails: (account: AccountResponse) => void;
      shouldShowShareFeedback: (accountId: number) => boolean;
    };

    component.shareAccountDetails(createAccountResponse());

    expect(downloadPaymentDetails).toHaveBeenCalledWith(7);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(anchorRemove).toHaveBeenCalled();
    expect(component.shouldShowShareFeedback(7)).toBe(false);

    createElementSpy.mockRestore();
    anchorClick.mockRestore();
    anchorRemove.mockRestore();
  });

  it('shows a backend conflict message when payment details are unavailable', async () => {
    downloadPaymentDetails.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Payment details are available only for active accounts' }
      }))
    );

    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      shareAccountDetails: (account: AccountResponse) => void;
      shareErrorMessage: () => string | null;
    };

    component.shareAccountDetails(createAccountResponse());

    expect(component.shareErrorMessage()).toBe('Payment details are available only for active accounts');
  });
});

function createAccountResponse(): AccountResponse {
  return {
    id: 7,
    accountNumber: '123456CUR01',
    iban: 'AL4721211009000000123456',
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
  };
}
