import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BankingService } from '../../services/banking.service';
import { Transaction } from '../../models/transaction.model';
import { Account } from '../../models/account.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container py-4 py-lg-5">
      <!-- Header -->
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h1 class="h3 fw-bold text-dark mb-1">Transaction History</h1>
          <p class="text-muted small mb-0">Detailed electronic ledger of all your credits, debits, and transfers</p>
        </div>
        <div class="mt-3 mt-md-0 d-flex gap-2">
          <a routerLink="/transfer" class="btn btn-bank-primary btn-sm px-3 d-inline-flex align-items-center gap-2">
            New Transfer
          </a>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="bank-card p-3 mb-4 bg-white shadow-sm">
        <div class="row g-3 align-items-center">
          <!-- Search Input -->
          <div class="col-md-5">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-light text-muted border-end-0">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                type="text"
                class="form-control border-start-0"
                placeholder="Search by description or reference ID..."
                [(ngModel)]="searchQuery"
                (input)="onFilterChange()">
            </div>
          </div>

          <!-- Type Filter -->
          <div class="col-sm-6 col-md-3">
            <select class="form-select form-select-sm" [(ngModel)]="selectedType" (change)="onFilterChange()">
              <option value="">All Transactions</option>
              <option value="credit">Credits (Incoming / Deposits)</option>
              <option value="debit">Debits (Outgoing / Payments)</option>
            </select>
          </div>

          <!-- Account Filter -->
          <div class="col-sm-6 col-md-4">
            <select class="form-select form-select-sm" [(ngModel)]="selectedAccountId" (change)="onFilterChange()">
              <option value="">All Accounts</option>
              <option *ngFor="let acc of accounts" [value]="acc.id">
                {{ acc.accountType }} ({{ acc.maskedNumber || ('•••• ' + acc.accountNumber.slice(-4)) }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted small mt-2">Loading transactions...</p>
      </div>

      <!-- Transactions Table -->
      <div *ngIf="!isLoading" class="bank-card bg-white shadow-sm overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light text-secondary small text-uppercase fw-semibold">
              <tr>
                <th scope="col" class="ps-4 py-3">Date</th>
                <th scope="col" class="py-3">Type</th>
                <th scope="col" class="py-3">Description / Reference</th>
                <th scope="col" class="py-3">Accounts</th>
                <th scope="col" class="py-3 text-end">Amount</th>
                <th scope="col" class="pe-4 py-3 text-end">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of transactions">
                <!-- Date -->
                <td class="ps-4 font-mono small text-secondary">
                  {{ tx.date | date:'MMM d, y, h:mm a' }}
                </td>

                <!-- Type Badge -->
                <td>
                  <span
                    class="badge px-2.5 py-1 text-uppercase"
                    [class]="tx.type === 'credit' ? 'badge-credit' : 'badge-debit'">
                    {{ tx.type }}
                  </span>
                </td>

                <!-- Description & Reference -->
                <td>
                  <span class="fw-semibold text-dark d-block">
                    {{ tx.description }}
                  </span>
                  <span class="text-muted small font-mono">
                    Ref: {{ tx.referenceId }}
                  </span>
                </td>

                <!-- Accounts Info -->
                <td class="small text-muted font-mono">
                  <div *ngIf="tx.sourceAccount">From: {{ tx.sourceAccount }}</div>
                  <div *ngIf="tx.destinationAccount">To: {{ tx.destinationAccount }}</div>
                </td>

                <!-- Amount -->
                <td class="text-end font-mono fw-bold fs-6" [class.text-success]="tx.type === 'credit'" [class.text-dark]="tx.type === 'debit'">
                  {{ tx.type === 'credit' ? '+' : '-' }}{{ tx.amount | currency:'USD':'symbol':'1.2-2' }}
                </td>

                <!-- Status -->
                <td class="pe-4 text-end">
                  <span class="badge" [class.bg-success]="tx.status === 'Completed'" [class.bg-warning]="tx.status === 'Pending'" [class.bg-danger]="tx.status === 'Failed'">
                    {{ tx.status }}
                  </span>
                </td>
              </tr>

              <!-- Empty Results Row -->
              <tr *ngIf="transactions.length === 0">
                <td colspan="6" class="text-center py-5 text-muted">
                  <div class="py-3">
                    <p class="mb-1 fw-semibold">No transactions match your criteria.</p>
                    <span class="small">Try adjusting search filters or perform a transfer.</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class TransactionsComponent implements OnInit {
  private bankingService = inject(BankingService);

  transactions: Transaction[] = [];
  accounts: Account[] = [];
  isLoading = true;

  searchQuery = '';
  selectedType = '';
  selectedAccountId = '';

  ngOnInit(): void {
    this.loadAccounts();
    this.loadTransactions();
  }

  loadAccounts(): void {
    this.bankingService.getAccounts().subscribe({
      next: (data) => this.accounts = data,
      error: () => {}
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.bankingService.getTransactions({
      accountId: this.selectedAccountId || undefined,
      type: this.selectedType || undefined,
      search: this.searchQuery || undefined
    }).subscribe({
      next: (data) => {
        this.transactions = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.loadTransactions();
  }
}
