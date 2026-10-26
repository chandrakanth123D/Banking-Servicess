import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="bank-card p-4 p-md-5 bg-white shadow-sm">
            <div class="text-center mb-4">
              <div class="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded p-3 mb-3">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
              </div>
              <h2 class="fw-bold text-dark h4 mb-1">Create Your Bank Account</h2>
              <p class="text-muted small">Open your online checking account with a $2,500 demo welcome deposit</p>
            </div>

            <!-- Error Banner -->
            <div *ngIf="errorMessage" class="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
              <span>{{ errorMessage }}</span>
            </div>

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
              <!-- Full Name -->
              <div class="mb-3">
                <label for="name" class="form-label small fw-semibold text-secondary">Full Legal Name</label>
                <input
                  type="text"
                  id="name"
                  formControlName="name"
                  class="form-control"
                  placeholder="e.g. Alex Morgan"
                  [class.is-invalid]="f['name'].touched && f['name'].invalid">
                <div class="invalid-feedback small" *ngIf="f['name'].touched && f['name'].errors?.['required']">
                  Full name is required.
                </div>
                <div class="invalid-feedback small" *ngIf="f['name'].touched && f['name'].errors?.['minlength']">
                  Full name must be at least 2 characters.
                </div>
              </div>

              <!-- Email -->
              <div class="mb-3">
                <label for="email" class="form-label small fw-semibold text-secondary">Email Address</label>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  class="form-control"
                  placeholder="alex.morgan@example.com"
                  [class.is-invalid]="f['email'].touched && f['email'].invalid">
                <div class="invalid-feedback small" *ngIf="f['email'].touched && f['email'].errors?.['required']">
                  Email is required.
                </div>
                <div class="invalid-feedback small" *ngIf="f['email'].touched && f['email'].errors?.['email']">
                  Please provide a valid email address.
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
                  placeholder="At least 6 characters"
                  [class.is-invalid]="f['password'].touched && f['password'].invalid">
                <div class="invalid-feedback small" *ngIf="f['password'].touched && f['password'].errors?.['required']">
                  Password is required.
                </div>
                <div class="invalid-feedback small" *ngIf="f['password'].touched && f['password'].errors?.['minlength']">
                  Password must be at least 6 characters.
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="registerForm.invalid || isLoading"
                class="btn btn-bank-primary w-100 py-2 mb-3">
                <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ isLoading ? 'Creating Account...' : 'Open Account Now' }}
              </button>
            </form>

            <div class="text-center mt-3">
              <span class="text-muted small">Already have an account? </span>
              <a routerLink="/login" class="small fw-semibold text-primary text-decoration-none">Sign in</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = false;
  errorMessage = '';

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Registration failed. Please check your information.';
      }
    });
  }
}
