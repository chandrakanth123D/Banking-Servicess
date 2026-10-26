export interface ProjectFile {
  path: string;
  name: string;
  language: string;
  category: 'frontend' | 'backend' | 'docs';
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    path: 'banking-services-spa/README.md',
    name: 'README.md',
    language: 'markdown',
    category: 'docs',
    content: `# Banking Services SPA (Single Page Application)

A complete, responsive banking web application built with **Angular** standalone components, **Node.js with Express.js**, and lightweight persistent **JSON file storage** (\`db.json\`).

### Quick Start:
1. Start Backend:
   cd banking-services-spa/backend
   npm install
   npm start  # Runs on http://localhost:5000

2. Start Frontend:
   cd banking-services-spa/frontend
   npm install
   npm start  # Runs on http://localhost:4200`
  },
  {
    path: 'banking-services-spa/backend/server.js',
    name: 'server.js',
    language: 'javascript',
    category: 'backend',
    content: `const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());

function getDb() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// REST API Endpoints
app.get('/api/health', (req, res) => {
  const db = getDb();
  res.json({ status: 'ok', uptime: process.uptime(), collections: { users: db.users.length, accounts: db.accounts.length, transactions: db.transactions.length } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email }, token: 'demo-token-' + user.id });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
  const db = getDb();
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'Email already exists.' });
  
  const newUser = { id: 'usr_' + Date.now().toString().slice(-6), name, email: email.toLowerCase(), password, createdAt: new Date().toISOString() };
  const newAccount = { id: 'acc_' + Date.now().toString().slice(-6), userId: newUser.id, accountNumber: '100' + Math.floor(100000 + Math.random() * 900000), accountType: 'Checking', balance: 2500, currency: 'USD', status: 'Active', createdAt: new Date().toISOString() };
  
  db.users.push(newUser);
  db.accounts.push(newAccount);
  saveDb(db);
  res.status(201).json({ success: true, user: newUser, token: 'demo-token-' + newUser.id });
});

app.get('/api/dashboard', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token?.replace('demo-token-', '') || req.query.userId;
  const db = getDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const accounts = db.accounts.filter(a => a.userId === userId).map(a => ({ ...a, maskedNumber: '•••• ' + a.accountNumber.slice(-4) }));
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const userTx = db.transactions.filter(t => t.userId === userId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ user, totalBalance, accountsCount: accounts.length, accounts, recentTransactions: userTx.slice(0, 5), stats: { totalIncome: userTx.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0), totalExpenses: userTx.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0) } });
});

app.get('/api/accounts', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token?.replace('demo-token-', '') || req.query.userId;
  const db = getDb();
  const accounts = db.accounts.filter(a => a.userId === userId).map(a => ({ ...a, maskedNumber: '•••• ' + a.accountNumber.slice(-4) }));
  res.json(accounts);
});

app.post('/api/accounts', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token?.replace('demo-token-', '') || req.query.userId;
  const { accountType, initialDeposit } = req.body;
  const db = getDb();
  const newAccount = { id: 'acc_' + Date.now().toString().slice(-6), userId, accountNumber: '200' + Math.floor(100000 + Math.random() * 900000), accountType, balance: Number(initialDeposit) || 0, currency: 'USD', status: 'Active', createdAt: new Date().toISOString() };
  db.accounts.push(newAccount);
  saveDb(db);
  res.status(201).json({ success: true, message: accountType + ' account opened!', account: newAccount });
});

app.get('/api/transactions', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token?.replace('demo-token-', '') || req.query.userId;
  const { type, search } = req.query;
  const db = getDb();
  let results = db.transactions.filter(t => t.userId === userId);
  if (type) results = results.filter(t => t.type === type);
  if (search) results = results.filter(t => t.description.toLowerCase().includes(search.toLowerCase()) || t.referenceId.toLowerCase().includes(search.toLowerCase()));
  results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(results);
});

app.post('/api/transfers', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token?.replace('demo-token-', '') || req.query.userId;
  const { sourceAccountId, destinationAccountId, destinationAccountNumber, amount, description } = req.body;
  const transferAmount = Number(amount);
  const db = getDb();
  const source = db.accounts.find(a => a.id === sourceAccountId && a.userId === userId);
  if (!source) return res.status(404).json({ error: 'Source account not found' });
  if (source.balance < transferAmount) return res.status(400).json({ error: 'Insufficient funds. Available: $' + source.balance.toFixed(2) });

  let destination = destinationAccountId ? db.accounts.find(a => a.id === destinationAccountId) : db.accounts.find(a => a.accountNumber === destinationAccountNumber);
  source.balance -= transferAmount;
  const ref = 'TRF-' + Date.now().toString().slice(-6);
  db.transactions.unshift({ id: 'tx_' + Date.now() + '_d', userId, accountId: source.id, type: 'debit', description: 'Transfer: ' + description, amount: transferAmount, date: new Date().toISOString(), status: 'Completed', referenceId: ref, sourceAccount: source.accountNumber, destinationAccount: destination ? destination.accountNumber : destinationAccountNumber });
  
  if (destination) {
    destination.balance += transferAmount;
    db.transactions.unshift({ id: 'tx_' + Date.now() + '_c', userId: destination.userId, accountId: destination.id, type: 'credit', description: 'Transfer: ' + description, amount: transferAmount, date: new Date().toISOString(), status: 'Completed', referenceId: ref, sourceAccount: source.accountNumber, destinationAccount: destination.accountNumber });
  }
  saveDb(db);
  res.json({ success: true, message: 'Transfer completed!', referenceId: ref, newSourceBalance: source.balance });
});

app.listen(PORT, () => console.log('Backend listening on port ' + PORT));`
  },
  {
    path: 'banking-services-spa/frontend/src/app/app.routes.ts',
    name: 'app.routes.ts',
    language: 'typescript',
    category: 'frontend',
    content: `import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated ? true : router.createUrlTree(['/login']);
};

export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return !auth.isAuthenticated ? true : router.createUrlTree(['/dashboard']);
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'accounts', loadComponent: () => import('./pages/accounts/accounts.component').then(m => m.AccountsComponent), canActivate: [authGuard] },
  { path: 'transfer', loadComponent: () => import('./pages/transfer/transfer.component').then(m => m.TransferComponent), canActivate: [authGuard] },
  { path: 'transactions', loadComponent: () => import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' }
];`
  },
  {
    path: 'banking-services-spa/frontend/src/app/services/banking.service.ts',
    name: 'banking.service.ts',
    language: 'typescript',
    category: 'frontend',
    content: `import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account, CreateAccountRequest } from '../models/account.model';
import { Transaction, TransferRequest, TransferResponse, DashboardData } from '../models/transaction.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BankingService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = '/api';

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (this.auth.tokenValue || '')
    });
  }

  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.baseUrl + '/dashboard', { headers: this.getAuthHeaders() });
  }

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.baseUrl + '/accounts', { headers: this.getAuthHeaders() });
  }

  createAccount(payload: CreateAccountRequest): Observable<{ success: boolean; message: string; account: Account }> {
    return this.http.post<{ success: boolean; message: string; account: Account }>(
      this.baseUrl + '/accounts',
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  getTransactions(params?: { accountId?: string; type?: string; search?: string }): Observable<Transaction[]> {
    let httpParams = new HttpParams();
    if (params?.accountId) httpParams = httpParams.set('accountId', params.accountId);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<Transaction[]>(this.baseUrl + '/transactions', { headers: this.getAuthHeaders(), params: httpParams });
  }

  transferMoney(payload: TransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(this.baseUrl + '/transfers', payload, { headers: this.getAuthHeaders() });
  }

  getHealth(): Observable<any> {
    return this.http.get<any>(this.baseUrl + '/health');
  }
}`
  },
  {
    path: 'banking-services-spa/frontend/src/app/services/auth.service.ts',
    name: 'auth.service.ts',
    language: 'typescript',
    category: 'frontend',
    content: `import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = '/api/auth';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('apex_token'));
  public token$ = this.tokenSubject.asObservable();

  public get currentUserValue(): User | null { return this.currentUserSubject.value; }
  public get tokenValue(): string | null { return this.tokenSubject.value; }
  public get isAuthenticated(): boolean { return !!this.currentUserValue && !!this.tokenValue; }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + '/login', credentials).pipe(
      tap(res => { if (res.success && res.token) this.setSession(res.user, res.token); })
    );
  }

  register(data: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.apiUrl + '/register', data).pipe(
      tap(res => { if (res.success && res.token) this.setSession(res.user, res.token); })
    );
  }

  logout(): void {
    localStorage.removeItem('apex_user');
    localStorage.removeItem('apex_token');
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  private setSession(user: User, token: string): void {
    localStorage.setItem('apex_user', JSON.stringify(user));
    localStorage.setItem('apex_token', token);
    this.currentUserSubject.next(user);
    this.tokenSubject.next(token);
  }

  private getStoredUser(): User | null {
    try {
      const s = localStorage.getItem('apex_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }
}`
  },
  {
    path: 'banking-services-spa/frontend/src/app/pages/transfer/transfer.component.ts',
    name: 'transfer.component.ts',
    language: 'typescript',
    category: 'frontend',
    content: `import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingService } from '../../services/banking.service';
import { Account } from '../../models/account.model';
import { TransferResponse } from '../../models/transaction.model';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transfer.component.html'
})
export class TransferComponent implements OnInit {
  private bankingService = inject(BankingService);
  private fb = inject(FormBuilder);

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
    this.bankingService.getAccounts().subscribe(data => {
      this.accounts = data;
      if (data.length > 0) {
        this.transferForm.patchValue({ sourceAccountId: data[0].id });
        this.selectedSourceAccount = data[0];
      }
    });
  }

  onTransferSubmit(): void {
    if (this.transferForm.invalid) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.bankingService.transferMoney(this.transferForm.value).subscribe({
      next: (res) => { this.isSubmitting = false; this.transferResult = res; },
      error: (err) => { this.isSubmitting = false; this.errorMessage = err.error?.error || 'Transfer failed'; }
    });
  }
}`
  },
  {
    path: 'banking-services-spa/frontend/src/app/pages/dashboard/dashboard.component.ts',
    name: 'dashboard.component.ts',
    language: 'typescript',
    category: 'frontend',
    content: `import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BankingService } from '../../services/banking.service';
import { DashboardData } from '../../models/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private bankingService = inject(BankingService);
  dashboard: DashboardData | null = null;
  isLoading = true;

  ngOnInit(): void {
    this.bankingService.getDashboard().subscribe({
      next: (data) => { this.dashboard = data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }
}`
  },
  {
    path: 'banking-services-spa/frontend/src/app/models/account.model.ts',
    name: 'account.model.ts',
    language: 'typescript',
    category: 'frontend',
    content: `export type AccountType = 'Checking' | 'Savings' | 'Investment' | 'Business';

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  maskedNumber?: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  status: 'Active' | 'Frozen' | 'Closed';
  createdAt: string;
}

export interface CreateAccountRequest {
  accountType: AccountType;
  initialDeposit: number;
}`
  },
  {
    path: 'banking-services-spa/frontend/src/app/models/transaction.model.ts',
    name: 'transaction.model.ts',
    language: 'typescript',
    category: 'frontend',
    content: `export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  referenceId: string;
  sourceAccount?: string;
  destinationAccount?: string;
}

export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId?: string;
  destinationAccountNumber?: string;
  amount: number;
  description: string;
}

export interface TransferResponse {
  success: boolean;
  message: string;
  referenceId: string;
  newSourceBalance: number;
  sourceAccount: {
    id: string;
    accountNumber: string;
    maskedNumber: string;
    balance: number;
  };
}

export interface DashboardData {
  user: { id: string; name: string; email: string };
  totalBalance: number;
  accountsCount: number;
  accounts: Account[];
  recentTransactions: Transaction[];
  stats: { totalIncome: number; totalExpenses: number };
}`
  }
];
