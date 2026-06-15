import { inject, provideExperimentalWebMcpTools } from '@angular/core';
import { Router } from '@angular/router';

import {
  PaymentsWebMcpDraftService,
  type BankPaymentDraft,
  type OwnTransferDraft,
} from './payments-web-mcp-draft.service';

const BANKING_PAGES = ['home', 'accounts', 'customers', 'payments', 'settings', 'login'] as const;
type BankingPage = (typeof BANKING_PAGES)[number];

const DESCRIPTION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'()\/-]*$/;
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9]+$/;

export function provideBankingWebMcpTools() {
  return provideExperimentalWebMcpTools([
    {
      name: 'banking_open_page',
      description:
        'Opens a banking page in the Angular app. Use this before interacting with a specific banking workflow.',
      inputSchema: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: [...BANKING_PAGES],
            description: 'The banking page to open.',
          },
        },
        required: ['page'],
        additionalProperties: false,
      } as const,
      execute: async ({ page }) => {
        const normalizedPage = validatePage(page);
        const router = inject(Router);

        const commands = normalizedPage === 'login' ? ['/login'] : ['/', normalizedPage];
        await router.navigate(commands);

        return { ok: true, page: normalizedPage };
      },
    },
    {
      name: 'banking_draft_own_transfer',
      description:
        'Opens the payments area in own-account transfer mode and prefills a transfer draft for review.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceAccountId: {
            type: 'number',
            description: 'The numeric id of the account to debit.',
          },
          targetAccountId: {
            type: 'number',
            description: 'The numeric id of the account to credit.',
          },
          amount: {
            type: 'number',
            description: 'The transfer amount. Must be greater than 0.',
          },
          description: {
            type: 'string',
            description: 'A payment description between 5 and 280 characters.',
          },
        },
        required: ['sourceAccountId', 'targetAccountId', 'amount', 'description'],
        additionalProperties: false,
      } as const,
      execute: async (input) => {
        const draft = validateOwnTransferDraft(input);
        const drafts = inject(PaymentsWebMcpDraftService);
        const router = inject(Router);

        drafts.queueOwnTransferDraft(draft);
        await router.navigate(['/payments'], {
          queryParams: { mode: 'own-accounts' },
          queryParamsHandling: 'merge',
        });

        return { ok: true, mode: 'own-accounts' };
      },
    },
    {
      name: 'banking_draft_bank_payment',
      description:
        'Opens the payments area in bank-payment mode and prefills a beneficiary payment draft for review.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceAccountId: {
            type: 'number',
            description: 'The numeric id of the account to debit.',
          },
          beneficiaryAccountNumber: {
            type: 'string',
            description: 'The beneficiary account number using letters and digits only.',
          },
          amount: {
            type: 'number',
            description: 'The payment amount. Must be greater than 0.',
          },
          description: {
            type: 'string',
            description: 'A payment description between 5 and 280 characters.',
          },
        },
        required: ['sourceAccountId', 'beneficiaryAccountNumber', 'amount', 'description'],
        additionalProperties: false,
      } as const,
      execute: async (input) => {
        const draft = validateBankPaymentDraft(input);
        const drafts = inject(PaymentsWebMcpDraftService);
        const router = inject(Router);

        drafts.queueBankPaymentDraft(draft);
        await router.navigate(['/payments'], {
          queryParams: { mode: 'bank-account' },
          queryParamsHandling: 'merge',
        });

        return { ok: true, mode: 'bank-account' };
      },
    },
  ]);
}

function validatePage(page: unknown): BankingPage {
  if (typeof page !== 'string' || !BANKING_PAGES.includes(page as BankingPage)) {
    throw new Error(`Unsupported banking page: ${String(page)}`);
  }
  return page as BankingPage;
}

function validateOwnTransferDraft(input: Record<string, unknown>): OwnTransferDraft {
  const sourceAccountId = validatePositiveInteger(input['sourceAccountId'], 'sourceAccountId');
  const targetAccountId = validatePositiveInteger(input['targetAccountId'], 'targetAccountId');
  const amount = validateAmount(input['amount'], 'amount');
  const description = validateDescription(input['description']);

  if (sourceAccountId === targetAccountId) {
    throw new Error('sourceAccountId and targetAccountId must be different.');
  }

  return {
    sourceAccountId,
    targetAccountId,
    amount,
    description,
  };
}

function validateBankPaymentDraft(input: Record<string, unknown>): BankPaymentDraft {
  const sourceAccountId = validatePositiveInteger(input['sourceAccountId'], 'sourceAccountId');
  const beneficiaryAccountNumber = validateAccountNumber(input['beneficiaryAccountNumber']);
  const amount = validateAmount(input['amount'], 'amount');
  const description = validateDescription(input['description']);

  return {
    sourceAccountId,
    beneficiaryAccountNumber,
    amount,
    description,
  };
}

function validatePositiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return value;
}

function validateAmount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1_000_000) {
    throw new Error(`${field} must be a number greater than 0 and no more than 1000000.`);
  }
  return value;
}

function validateDescription(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('description must be a string.');
  }

  const normalized = value.trim();
  if (normalized.length < 5 || normalized.length > 280) {
    throw new Error('description must be between 5 and 280 characters.');
  }
  if (!DESCRIPTION_PATTERN.test(normalized)) {
    throw new Error(
      'description must start with a letter or number and use valid payment characters only.',
    );
  }

  return normalized;
}

function validateAccountNumber(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('beneficiaryAccountNumber must be a string.');
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > 34 || !ACCOUNT_NUMBER_PATTERN.test(normalized)) {
    throw new Error(
      'beneficiaryAccountNumber must be 1 to 34 characters using letters and digits only.',
    );
  }

  return normalized;
}
