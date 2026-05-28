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
            downloadPaymentDetails,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('opens the payment-details dialog and prepares a PDF preview', async () => {
    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      shareAccountDetails: (account: AccountResponse) => void;
      paymentDetailsDialogOpen: () => boolean;
      paymentDetailsDialogLoading: () => boolean;
      paymentDetailsPreviewAccount: () => AccountResponse | null;
      paymentDetailsPreviewUrl: () => unknown;
    };

    component.shareAccountDetails(createAccountResponse());

    expect(downloadPaymentDetails).toHaveBeenCalledWith(7);
    expect(component.paymentDetailsDialogOpen()).toBe(true);
    expect(component.paymentDetailsDialogLoading()).toBe(false);
    expect(component.paymentDetailsPreviewAccount()?.id).toBe(7);
    expect(component.paymentDetailsPreviewUrl()).toBeTruthy();
  });

  it('downloads payment details from the prepared preview', async () => {
    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const anchorElement = document.createElement('a');
    const anchorClick = vi.spyOn(anchorElement, 'click').mockImplementation(() => undefined);
    const anchorRemove = vi.spyOn(anchorElement, 'remove').mockImplementation(() => undefined);
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchorElement);

    const component = fixture.componentInstance as unknown as {
      shareAccountDetails: (account: AccountResponse) => void;
      downloadPreparedPaymentDetails: () => void;
    };

    component.shareAccountDetails(createAccountResponse());
    component.downloadPreparedPaymentDetails();

    expect(downloadPaymentDetails).toHaveBeenCalledWith(7);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(anchorRemove).toHaveBeenCalled();

    createElementSpy.mockRestore();
    anchorClick.mockRestore();
    anchorRemove.mockRestore();
  });

  it('shows a backend conflict message inside the dialog when payment details are unavailable', async () => {
    downloadPaymentDetails.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Payment details are available only for active accounts' },
      })),
    );

    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      shareAccountDetails: (account: AccountResponse) => void;
      paymentDetailsDialogOpen: () => boolean;
      paymentDetailsDialogErrorMessage: () => string | null;
    };

    component.shareAccountDetails(createAccountResponse());

    expect(component.paymentDetailsDialogOpen()).toBe(true);
    expect(component.paymentDetailsDialogErrorMessage()).toBe(
      'Payment details are available only for active accounts',
    );
  });

  it('keeps the newly opened accordion item active when the previously open item closes afterward', async () => {
    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      handleAccountOpenChange: (accountId: number, isOpened: boolean) => void;
      isAccountOpened: (accountId: number, index: number) => boolean;
    };

    component.handleAccountOpenChange(4, true);
    component.handleAccountOpenChange(3, true);
    component.handleAccountOpenChange(4, false);

    expect(component.isAccountOpened(3, 0)).toBe(true);
    expect(component.isAccountOpened(4, 0)).toBe(false);
    expect(component.isAccountOpened(7, 0)).toBe(false);
  });

  it('allows the currently open accordion item to close without forcing the first item open', async () => {
    const fixture = TestBed.createComponent(AccountsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      handleAccountOpenChange: (accountId: number, isOpened: boolean) => void;
      isAccountOpened: (accountId: number, index: number) => boolean;
    };

    component.handleAccountOpenChange(7, false);

    expect(component.isAccountOpened(7, 0)).toBe(false);
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
    closedAt: null,
  };
}
