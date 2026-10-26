import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BankingService } from '../../services/banking.service';
import { Account } from '../../models/account.model';
import { TransferResponse } from '../../models/transaction.model';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container py-4 py-lg-5">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <!-- Page Header -->
          <div class="mb-4 pb-2 border-bottom">
            <h1 class="h3 fw-bold text-dark mb-1">Money Transfer</h1>
            <p class="text-muted small mb-0">Instantly transfer funds between your own accounts or send to external accounts</p>
          </div>

          <!-- Success Alert -->
          <div *ngIf="transferResult && transferResult.success" class="bank-card p-4 bg-white border-success mb-4 shadow-sm animate-fade-in">
            <div class="d-flex align-items-start gap-3">
              <div class="p-2 bg-success text-white rounded-circle">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="flex-grow-1">
                <h4 class="h5 fw-bold text-success mb-1">Transfer Completed Successfully</h4>
                <p class="text-muted small mb-2">{{ transferResult.message }}</p>
                <div class="bg-light p-3 rounded font-mono small d-flex flex-column gap-1">
                  <div><strong>Reference ID:</strong> {{ transferResult.referenceId }}</div>
                  <div><strong>Updated Source Balance:</strong> {{ transferResult.newSourceBalance | currency:'USD':'symbol':'1.2-2' }}</div>
                </div>
                <div class="mt-3 d-flex gap-2">
                  <button class="btn btn-outline-secondary btn-sm" (click)="resetForm()">
                    Make Another Transfer
                  </button>
                  <a routerLink="/transactions" class="btn btn-primary btn-sm">
                    View in Transactions
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Error Alert -->
          <div *ngIf="errorMessage" class="alert alert-danger py-3 px-4 mb-4 small d-flex align-items-center gap-2" role="alert">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Transfer Form Card -->
          <div *ngIf="!transferResult" class="bank-card p-4 p-md-5 bg-white shadow-sm">
            <form [formGroup]="transferForm" (ngSubmit)="onTransferSubmit()">
              
              <!-- 1. Source Account -->
              <div class="mb-4">
                <label for="sourceAccount" class="form-label small fw-semibold text-secondary">
                  Source Account (From)
                </label>
                <select
                  id="sourceAccount"
                  formControlName="sourceAccountId"
                  (change)="onSourceAccountChange()"
                  class="form-select font-mono"
                  [class.is-invalid]="f['sourceAccountId'].touched && f['sourceAccountId'].invalid">
                  <option value="" disabled>-- Select Source Account --</option>
                  <option *ngFor="let acc of accounts" [value]="acc.id">
                    {{ acc.accountType }} ({{ acc.maskedNumber || ('•••• ' + acc.accountNumber.slice(-4)) }}) — Available: {{ acc.balance | currency:acc.currency:'symbol':'1.2-2' }}
                  </option>
                </select>
                <div class="invalid-feedback small">Please select a source account.</div>

                <!-- Display selected account balance preview -->
                <div *ngIf="selectedSourceAccount" class="mt-2 text-muted small d-flex justify-content-between">
                  <span>Current Available: <strong class="text-dark font-mono">{{ selectedSourceAccount.balance | currency:selectedSourceAccount.currency:'symbol':'1.2-2' }}</strong></span>
                  <span *ngIf="transferForm.value.amount > selectedSourceAccount.balance" class="text-danger fw-semibold">
                    &times; Amount exceeds available funds
                  </span>
                </div>
              </div>

              <!-- 2. Transfer Mode / Destination Type -->
              <div class="mb-3">
                <label class="form-label small fw-semibold text-secondary d-block">Destination Type</label>
                <div class="btn-group w-100" role="group">
                  <button
                    type="button"
                    class="btn py-2"
                    [class.btn-primary]="destinationMode === 'internal'"
                    [class.btn-outline-secondary]="destinationMode !== 'internal'"
                    (click)="setDestinationMode('internal')">
                    Between My Accounts
                  </button>
                  <button
                    type="button"
                    class="btn py-2"
                    [class.btn-primary]="destinationMode === 'external'"
                    [class.btn-outline-secondary]="destinationMode !== 'external'"
                    (click)="setDestinationMode('external')">
                    To Another Account Number
                  </button>
                </div>
              </div>

              <!-- 3. Destination Account Selection -->
              <div class="mb-4" *ngIf="destinationMode === 'internal'">
                <label for="destAccount" class="form-label small fw-semibold text-secondary">
                  Destination Account (To)
                </label>
                <select
                  id="destAccount"
                  formControlName="destinationAccountId"
                  class="form-select font-mono"
                  [class.is-invalid]="f['destinationAccountId'].touched && f['destinationAccountId'].invalid">
                  <option value="" disabled>-- Select Destination Account --</option>
                  <option
                    *ngFor="let acc of destinationAccounts"
                    [value]="acc.id">
                    {{ acc.accountType }} ({{ acc.maskedNumber || ('•••• ' + acc.accountNumber.slice(-4)) }}) — Balance: {{ acc.balance | currency:acc.currency:'symbol':'1.2-2' }}
                  </option>
                </select>
                <div class="invalid-feedback small">Please select a valid destination account.</div>
              </div>

              <!-- 3B. External Account Input -->
              <div class="mb-4" *ngIf="destinationMode === 'external'">
                <label for="extAccount" class="form-label small fw-semibold text-secondary">
                  Recipient Account Number
                </label>
                <input
                  type="text"
                  id="extAccount"
                  formControlName="destinationAccountNumber"
                  class="form-control font-mono"
                  placeholder="e.g. 2009384711 (David Chen) or any 10-digit account">
                <span class="text-muted small mt-1 d-block">
                  Tip: Use demo account <code>2009384711</code> to test transfers to peer user David Chen!
                </span>
              </div>

              <!-- 4. Amount -->
              <div class="mb-4">
                <label for="amount" class="form-label small fw-semibold text-secondary">Transfer Amount (USD)</label>
                <div class="input-group">
                  <span class="input-group-text font-mono">$</span>
                  <input
                    type="number"
                    id="amount"
                    formControlName="amount"
                    class="form-control font-mono fs-5"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    [class.is-invalid]="f['amount'].touched && f['amount'].invalid">
                </div>
                <div class="invalid-feedback small" *ngIf="f['amount'].touched && f['amount'].errors?.['required']">
                  Amount is required.
                </div>
                <div class="invalid-feedback small" *ngIf="f['amount'].touched && f['amount'].errors?.['min']">
                  Amount must be greater than $0.
                </div>
              </div>

              <!-- 5. Description / Memo -->
              <div class="mb-4">
                <label for="description" class="form-label small fw-semibold text-secondary">
                  Description / Reference Memo
                </label>
                <input
                  type="text"
                  id="description"
                  formControlName="description"
                  class="form-control"
                  placeholder="e.g. Rent, savings deposit, dinner split">
              </div>

              <!-- Submit -->
              <button
                type="submit"
                [disabled]="transferForm.invalid || isSubmitting || isAmountExceedingBalance"
                class="btn btn-bank-primary w-100 py-2.5">
                <span *ngIf="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                {{ isSubmitting ? 'Verifying & Executing Transfer...' : 'Confirm & Send Funds' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TransferComponent implements OnInit {
  private bankingService = inject(BankingService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  accounts: Account[] = [];
  selectedSourceAccount: Account | null = null;
  destinationMode: 'internal' | 'external' = 'internal';

  isSubmitting = false;
  errorMessage = '';
  transferResult: TransferResponse | null = null;

  transferForm: FormGroup = this.fb.group({
    sourceAccountId: ['', Validators.required],
    destinationAccountId: [''],
    destinationAccountNumber: [''],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.bankingService.getAccounts().subscribe({
      next: (data) => {
        this.accounts = data;
        const initialFrom = this.route.snapshot.queryParams['from'];
        if (initialFrom && this.accounts.some(a => a.id === initialFrom)) {
          this.transferForm.patchValue({ sourceAccountId: initialFrom });
          this.onSourceAccountChange();
        } else if (this.accounts.length > 0) {
          this.transferForm.patchValue({ sourceAccountId: this.accounts[0].id });
          this.onSourceAccountChange();
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load user accounts for transfer.';
      }
    });
  }

  get f() {
    return this.transferForm.controls;
  }

  get destinationAccounts(): Account[] {
    const currentSourceId = this.transferForm.value.sourceAccountId;
    return this.accounts.filter(a => a.id !== currentSourceId);
  }

  get isAmountExceedingBalance(): boolean {
    if (!this.selectedSourceAccount) return false;
    const amount = Number(this.transferForm.value.amount);
    return amount > this.selectedSourceAccount.balance;
  }

  onSourceAccountChange(): void {
    const srcId = this.transferForm.value.sourceAccountId;
    this.selectedSourceAccount = this.accounts.find(a => a.id === srcId) || null;

    // Reset destination if identical
    if (this.transferForm.value.destinationAccountId === srcId) {
      this.transferForm.patchValue({ destinationAccountId: '' });
    }
  }

  setDestinationMode(mode: 'internal' | 'external'): void {
    this.destinationMode = mode;
    if (mode === 'internal') {
      this.transferForm.patchValue({ destinationAccountNumber: '' });
    } else {
      this.transferForm.patchValue({ destinationAccountId: '' });
    }
  }

  resetForm(): void {
    this.transferResult = null;
    this.errorMessage = '';
    this.transferForm.reset({
      sourceAccountId: this.accounts[0]?.id || '',
      amount: '',
      description: ''
    });
    this.loadAccounts();
  }

  onTransferSubmit(): void {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }

    if (this.isAmountExceedingBalance) {
      this.errorMessage = `Insufficient funds. Transfer amount exceeds available balance ($${this.selectedSourceAccount?.balance.toFixed(2)}).`;
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const val = this.transferForm.value;
    const payload = {
      sourceAccountId: val.sourceAccountId,
      destinationAccountId: this.destinationMode === 'internal' ? val.destinationAccountId : undefined,
      destinationAccountNumber: this.destinationMode === 'external' ? val.destinationAccountNumber : undefined,
      amount: Number(val.amount),
      description: val.description || 'Funds Transfer'
    };

    this.bankingService.transferMoney(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.transferResult = res;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Transfer failed. Please check inputs and try again.';
      }
    });
  }
}
