import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account, CreateAccountRequest } from '../models/account.model';
import { Transaction, TransferRequest, TransferResponse, DashboardData } from '../models/transaction.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BankingService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private baseUrl = '/api';

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.tokenValue || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Dashboard endpoint
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.baseUrl}/dashboard`, {
      headers: this.getAuthHeaders()
    });
  }

  // Accounts endpoints
  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.baseUrl}/accounts`, {
      headers: this.getAuthHeaders()
    });
  }

  createAccount(payload: CreateAccountRequest): Observable<{ success: boolean; message: string; account: Account }> {
    return this.http.post<{ success: boolean; message: string; account: Account }>(
      `${this.baseUrl}/accounts`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Transactions endpoint with filters
  getTransactions(params?: { accountId?: string; type?: string; search?: string; limit?: number }): Observable<Transaction[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.accountId) httpParams = httpParams.set('accountId', params.accountId);
      if (params.type) httpParams = httpParams.set('type', params.type);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<Transaction[]>(`${this.baseUrl}/transactions`, {
      headers: this.getAuthHeaders(),
      params: httpParams
    });
  }

  // Money transfer endpoint
  transferMoney(payload: TransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(
      `${this.baseUrl}/transfers`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  // Backend Health check
  getHealth(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/health`);
  }
}
