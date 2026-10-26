import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User, AuthResponse } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // In production or development, point to the Express backend
  private apiUrl = '/api/auth';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('apex_token'));
  public token$ = this.tokenSubject.asObservable();

  constructor() {}

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get tokenValue(): string | null {
    return this.tokenSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserValue && !!this.tokenValue;
  }

  register(data: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(response => {
        if (response.success && response.token) {
          this.setSession(response.user, response.token);
        }
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.token) {
          this.setSession(response.user, response.token);
        }
      })
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
      const stored = localStorage.getItem('apex_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
