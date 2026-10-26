import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BankingService } from '../../services/banking.service';
import { DashboardData } from '../../models/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-4 py-lg-5">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading dashboard...</span>
        </div>
        <p class="text-muted mt-2 small">Loading your financial portfolio...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="errorMessage" class="alert alert-danger py-3 px-4 mb-4">
        <h5 class="alert-heading fw-bold">Unable to load dashboard</h5>
        <p class="mb-0">{{ errorMessage }}</p>
      </div>

      <!-- Main Dashboard Content -->
      <div *ngIf="!isLoading && dashboard" class="animate-fade-in">
        <!-- Welcome Hero Banner -->
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
          <div>
            <h1 class="h3 fw-bold text-dark mb-1">
              Welcome back, {{ dashboard.user.name }}
            </h1>
            <p class="text-muted small mb-0">
              Overview of your linked accounts, net balance, and recent activities
            </p>
          </div>
          <div class="mt-3 mt-md-0 d-flex gap-2">
            <a routerLink="/transfer" class="btn btn-primary px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
              Send Money
            </a>
            <a routerLink="/accounts" class="btn btn-outline-secondary px-3 py-2 fw-semibold">
              Manage Accounts
            </a>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="row g-3 mb-4">
          <!-- Total Balance -->
          <div class="col-md-4">
            <div class="bank-card p-4 h-100 bg-white">
              <span class="text-muted small fw-semibold text-uppercase tracking-wider">Total Net Balance</span>
              <div class="d-flex align-items-baseline gap-2 mt-2">
                <h2 class="h2 fw-bold text-dark font-mono mb-0">
                  {{ dashboard.totalBalance | currency:'USD':'symbol':'1.2-2' }}
                </h2>
              </div>
              <span class="text-secondary small mt-2 d-block">
                Combined across {{ dashboard.accountsCount }} active account{{ dashboard.accountsCount === 1 ? '' : 's' }}
              </span>
            </div>
          </div>

          <!-- Total Inflow / Credits -->
          <div class="col-md-4">
            <div class="bank-card p-4 h-100 bg-white">
              <span class="text-muted small fw-semibold text-uppercase tracking-wider">Total Inflow / Deposits</span>
              <div class="d-flex align-items-baseline gap-2 mt-2">
                <h2 class="h2 fw-bold text-success font-mono mb-0">
                  +{{ dashboard.stats.totalIncome | currency:'USD':'symbol':'1.2-2' }}
                </h2>
              </div>
              <span class="text-secondary small mt-2 d-block">All recorded incoming transfers & credits</span>
            </div>
          </div>

          <!-- Total Outflow / Debits -->
          <div class="col-md-4">
            <div class="bank-card p-4 h-100 bg-white">
              <span class="text-muted small fw-semibold text-uppercase tracking-wider">Total Outflow / Payments</span>
              <div class="d-flex align-items-baseline gap-2 mt-2">
                <h2 class="h2 fw-bold text-danger font-mono mb-0">
                  -{{ dashboard.stats.totalExpenses | currency:'USD':'symbol':'1.2-2' }}
                </h2>
              </div>
              <span class="text-secondary small mt-2 d-block">All recorded outgoing transfers & bills</span>
            </div>
          </div>
        </div>

        <!-- Accounts Grid & Recent Transactions -->
        <div class="row g-4">
          <!-- Left Column: Accounts Summary -->
          <div class="col-lg-6">
            <div class="bank-card p-4 bg-white h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h5 fw-bold text-dark mb-0">Your Accounts</h3>
                <a routerLink="/accounts" class="small fw-semibold text-primary text-decoration-none">
                  View All ({{ dashboard.accounts.length }}) &rarr;
                </a>
              </div>

              <div class="d-flex flex-column gap-3">
                <div *ngFor="let acc of dashboard.accounts" class="p-3 border rounded-3 d-flex justify-content-between align-items-center bg-light">
                  <div>
                    <div class="d-flex align-items-center gap-2">
                      <span class="fw-bold text-dark">{{ acc.accountType }} Account</span>
                      <span class="badge bg-secondary-subtle text-secondary border small">{{ acc.status }}</span>
                    </div>
                    <span class="text-muted small font-mono d-block mt-1">
                      Account {{ acc.maskedNumber || ('•••• ' + acc.accountNumber.slice(-4)) }}
                    </span>
                  </div>
                  <div class="text-end">
                    <span class="fw-bold text-dark font-mono fs-5 d-block">
                      {{ acc.balance | currency:acc.currency:'symbol':'1.2-2' }}
                    </span>
                    <a routerLink="/transfer" class="small text-primary text-decoration-none">Transfer</a>
                  </div>
                </div>
              </div>

              <div class="mt-4 pt-3 border-top text-center">
                <a routerLink="/accounts" class="btn btn-outline-primary btn-sm px-4">
                  + Open Another Demo Account
                </a>
              </div>
            </div>
          </div>

          <!-- Right Column: Recent Transactions -->
          <div class="col-lg-6">
            <div class="bank-card p-4 bg-white h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h5 fw-bold text-dark mb-0">Recent Transactions</h3>
                <a routerLink="/transactions" class="small fw-semibold text-primary text-decoration-none">
                  Full History &rarr;
                </a>
              </div>

              <div *ngIf="dashboard.recentTransactions.length === 0" class="text-center py-4 text-muted small">
                No transactions recorded yet.
              </div>

              <div class="list-group list-group-flush">
                <div *ngFor="let tx of dashboard.recentTransactions" class="list-group-item px-0 py-3 d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center gap-3">
                    <div [class]="tx.type === 'credit' ? 'text-success bg-success-subtle p-2 rounded-circle' : 'text-danger bg-danger-subtle p-2 rounded-circle'">
                      <svg *ngIf="tx.type === 'credit'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
                      </svg>
                      <svg *ngIf="tx.type === 'debit'" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
                      </svg>
                    </div>
                    <div>
                      <span class="fw-semibold text-dark d-block text-truncate" style="max-width: 240px;">
                        {{ tx.description }}
                      </span>
                      <span class="text-muted small">
                        {{ tx.date | date:'mediumDate' }} · <span class="font-mono">{{ tx.referenceId }}</span>
                      </span>
                    </div>
                  </div>

                  <div class="text-end">
                    <span [class]="tx.type === 'credit' ? 'fw-bold text-success font-mono d-block' : 'fw-bold text-dark font-mono d-block'">
                      {{ tx.type === 'credit' ? '+' : '-' }}{{ tx.amount | currency:'USD':'symbol':'1.2-2' }}
                    </span>
                    <span class="badge" [class.bg-success]="tx.status === 'Completed'" [class.bg-warning]="tx.status === 'Pending'" [class.bg-danger]="tx.status === 'Failed'">
                      {{ tx.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Services Grid -->
        <div class="mt-4 pt-2">
          <h4 class="h6 fw-bold text-secondary text-uppercase tracking-wider mb-3">Quick Banking Services</h4>
          <div class="row g-3">
            <div class="col-sm-6 col-md-3">
              <a routerLink="/transfer" class="bank-card p-3 d-block text-decoration-none text-dark bg-white">
                <span class="fw-bold d-block text-primary">Instant Transfer</span>
                <span class="text-muted small">Move money between accounts</span>
              </a>
            </div>
            <div class="col-sm-6 col-md-3">
              <a routerLink="/accounts" class="bank-card p-3 d-block text-decoration-none text-dark bg-white">
                <span class="fw-bold d-block text-primary">Open Account</span>
                <span class="text-muted small">Checking, Savings, Investment</span>
              </a>
            </div>
            <div class="col-sm-6 col-md-3">
              <a routerLink="/transactions" class="bank-card p-3 d-block text-decoration-none text-dark bg-white">
                <span class="fw-bold d-block text-primary">View Statements</span>
                <span class="text-muted small">Filtered transaction records</span>
              </a>
            </div>
            <div class="col-sm-6 col-md-3">
              <div class="bank-card p-3 bg-white">
                <span class="fw-bold d-block text-success">Active Protection</span>
                <span class="text-muted small">Simulated FDIC Insurance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private bankingService = inject(BankingService);

  dashboard: DashboardData | null = null;
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bankingService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Failed to connect to backend service. Please check API.';
      }
    });
  }
}
