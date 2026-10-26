import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5">
          <div class="bank-card p-4 p-md-5 bg-white shadow-sm">
            <!-- Header -->
            <div class="text-center mb-4">
              <div class="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded p-3 mb-3">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h2 class="fw-bold text-dark h4 mb-1">Sign In to Apex Bank</h2>
              <p class="text-muted small">Access your accounts and secure financial services</p>
            </div>

            <!-- Error Banner -->
            <div *ngIf="errorMessage" class="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <!-- Email -->
              <div class="mb-3">
                <label for="email" class="form-label small fw-semibold text-secondary">Email Address</label>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  class="form-control"
                  placeholder="name@example.com"
                  [class.is-invalid]="f['email'].touched && f['email'].invalid">
                <div class="invalid-feedback small" *ngIf="f['email'].touched && f['email'].errors?.['required']">
                  Email is required.
                </div>
                <div class="invalid-feedback small" *ngIf="f['email'].touched && f['email'].errors?.['email']">
                  Please enter a valid email format.
                </div>
              </div>

              <!-- Password -->
              <div class="mb-4">
                <label for="password" class="form-label small fw-semibold text-secondary">Password</label>
                <input
                  type="password"
                  id="password"
                  formControlName="password"
                  class="form-control"
                  placeholder="••••••••"
                  [class.is-invalid]="f['password'].touched && f['password'].invalid">
                <div class="invalid-feedback small" *ngIf="f['password'].touched && f['password'].errors?.['required']">
                  Password is required.
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="loginForm.invalid || isLoading"
                class="btn btn-bank-primary w-100 py-2 mb-3">
                <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ isLoading ? 'Authenticating...' : 'Sign In' }}
              </button>
            </form>

            <!-- Quick Demo Credentials -->
            <div class="border-top pt-3 mt-2">
              <span class="text-muted d-block small text-center mb-2">Instant Demo Quick-Fill</span>
              <div class="d-grid gap-2">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm text-start"
                  (click)="quickFill('sarah.jenkins@example.com', 'Password123!')">
                  👤 Sarah Jenkins (Primary: $8,450.75)
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm text-start"
                  (click)="quickFill('david.chen@example.com', 'Password123!')">
                  👤 David Chen (Primary: $4,120.00)
                </button>
              </div>
            </div>

            <div class="text-center mt-4">
              <span class="text-muted small">Don't have an account? </span>
              <a routerLink="/register" class="small fw-semibold text-primary text-decoration-none">Register here</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  errorMessage = '';

  get f() {
    return this.loginForm.controls;
  }

  quickFill(email: string, pass: string): void {
    this.loginForm.patchValue({ email, password: pass });
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Authentication failed. Please verify your email and password.';
      }
    });
  }
}
