import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BankingService } from '../../services/banking.service';
import { Account, AccountType } from '../../models/account.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container py-4 py-lg-5">
      <!-- Top Title and Action -->
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h1 class="h3 fw-bold text-dark mb-1">Account Management</h1>
          <p class="text-muted small mb-0">Manage your active accounts, review balances, or open a new account</p>
        </div>
        <button class="btn btn-bank-primary mt-3 mt-md-0 d-inline-flex align-items-center gap-2" (click)="showCreateModal = true">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Open New Demo Account
        </button>
      </div>

      <!-- Success Notification -->
      <div *ngIf="successMessage" class="alert alert-success alert-dismissible fade show small mb-4" role="alert">
        {{ successMessage }}
        <button type="button" class="btn-close" (click)="successMessage = ''" aria-label="Close"></button>
      </div>

      <!-- Error Notification -->
      <div *ngIf="errorMessage" class="alert alert-danger alert-dismissible fade show small mb-4" role="alert">
        {{ errorMessage }}
        <button type="button" class="btn-close" (click)="errorMessage = ''" aria-label="Close"></button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted small mt-2">Loading accounts...</p>
      </div>

      <!-- Accounts Grid -->
      <div *ngIf="!isLoading" class="row g-4">
        <div *ngFor="let acc of accounts" class="col-md-6 col-lg-4">
          <div class="bank-card p-4 h-100 position-relative" [ngClass]="getCardThemeClass(acc.accountType)">
            <!-- Top Bar inside Card -->
            <div class="d-flex justify-content-between align-items-center mb-4">
              <span class="badge bg-white text-dark fw-bold px-2.5 py-1">
                {{ acc.accountType }}
              </span>
              <span class="small opacity-75 font-mono">
                {{ acc.status }}
              </span>
            </div>

            <!-- Account Balance -->
            <div class="mb-4">
              <span class="small text-uppercase opacity-75 d-block">Available Balance</span>
              <div class="fs-2 fw-bold font-mono">
                {{ acc.balance | currency:acc.currency:'symbol':'1.2-2' }}
              </div>
            </div>

            <!-- Masked Account Number -->
            <div class="d-flex justify-content-between align-items-center pt-3 border-top border-white-50 mt-auto">
              <div>
                <span class="small opacity-75 d-block" style="font-size: 0.75rem;">Account Number</span>
                <span class="font-mono fw-semibold">
                  {{ acc.maskedNumber || ('•••• ' + acc.accountNumber.slice(-4)) }}
                </span>
              </div>
              <a routerLink="/transfer" [queryParams]="{from: acc.id}" class="btn btn-sm btn-light fw-semibold text-dark px-3">
                Transfer
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && accounts.length === 0" class="text-center py-5 bg-white bank-card">
        <h4 class="h5 fw-bold text-dark">No accounts found</h4>
        <p class="text-muted small">You don't have any accounts active yet. Click below to open your first demo account.</p>
        <button class="btn btn-primary btn-sm px-4" (click)="showCreateModal = true">
          Open Demo Account
        </button>
      </div>

      <!-- Create Account Modal / Slide-in Overlay -->
      <div *ngIf="showCreateModal" class="modal d-block" tabindex="-1" style="background-color: rgba(15, 23, 42, 0.6);">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title h6 fw-bold">Open New Bank Account</h5>
              <button type="button" class="btn-close btn-close-white" (click)="showCreateModal = false" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
              <form [formGroup]="accountForm" (ngSubmit)="onCreateAccount()">
                <!-- Account Type -->
                <div class="mb-3">
                  <label for="accType" class="form-label small fw-semibold text-secondary">Account Category</label>
                  <select id="accType" formControlName="accountType" class="form-select">
                    <option value="Checking">Checking (Everyday Expenses & Transfers)</option>
                    <option value="Savings">Savings (High-Yield 4.5% APY Target)</option>
                    <option value="Investment">Investment (Market Equities & Yield)</option>
                    <option value="Business">Business (Corporate Operations)</option>
                  </select>
                </div>

                <!-- Initial Deposit -->
                <div class="mb-3">
                  <label for="initialDeposit" class="form-label small fw-semibold text-secondary">Initial Opening Deposit (USD)</label>
                  <div class="input-group">
                    <span class="input-group-text font-mono">$</span>
                    <input
                      type="number"
                      id="initialDeposit"
                      formControlName="initialDeposit"
                      class="form-control font-mono"
                      placeholder="1000.00"
                      min="0"
                      step="50">
                  </div>
                  <span class="text-muted small mt-1 d-block">Demo balance credited upon account provisioning.</span>
                </div>

                <div class="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                  <button type="button" class="btn btn-outline-secondary" (click)="showCreateModal = false">
                    Cancel
                  </button>
                  <button type="submit" [disabled]="accountForm.invalid || isSubmitting" class="btn btn-bank-primary">
                    <span *ngIf="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                    {{ isSubmitting ? 'Opening...' : 'Confirm & Open Account' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-checking {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
    }
    .card-savings {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
    }
    .card-investment {
      background: linear-gradient(135deg, #064e3b 0%, #059669 100%);
      color: #ffffff;
    }
    .card-business {
      background: linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%);
      color: #ffffff;
    }
  `]
})
export class AccountsComponent implements OnInit {
  private bankingService = inject(BankingService);
  private fb = inject(FormBuilder);

  accounts: Account[] = [];
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showCreateModal = false;

  accountForm: FormGroup = this.fb.group({
    accountType: ['Savings', Validators.required],
    initialDeposit: [1000, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.isLoading = true;
    this.bankingService.getAccounts().subscribe({
      next: (data) => {
        this.accounts = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Failed to retrieve accounts.';
      }
    });
  }

  getCardThemeClass(type: AccountType): string {
    switch (type) {
      case 'Checking': return 'card-checking';
      case 'Savings': return 'card-savings';
      case 'Investment': return 'card-investment';
      case 'Business': return 'card-business';
      default: return 'card-checking';
    }
  }

  onCreateAccount(): void {
    if (this.accountForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.accountForm.value;

    this.bankingService.createAccount(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.showCreateModal = false;
        this.successMessage = res.message || 'Account successfully created!';
        this.loadAccounts();
        this.accountForm.reset({ accountType: 'Savings', initialDeposit: 1000 });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Failed to create new account.';
      }
    });
  }
}
