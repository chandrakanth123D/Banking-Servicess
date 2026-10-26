import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark py-3 border-bottom border-secondary">
      <div class="container-fluid px-lg-4">
        <!-- Brand Wordmark -->
        <a class="navbar-brand d-flex items-center gap-2 font-bold text-white fs-4" routerLink="/">
          <span class="d-inline-flex align-items-center justify-content-center bg-primary rounded px-2 py-1 fs-6">
            APEX
          </span>
          <span class="fw-semibold">Apex Bank</span>
        </a>

        <!-- Mobile toggler -->
        <button
          class="navbar-toggler"
          type="button"
          (click)="isMenuOpen = !isMenuOpen"
          aria-controls="navbarNav"
          [attr.aria-expanded]="isMenuOpen"
          aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Nav Links -->
        <div class="collapse navbar-collapse" [class.show]="isMenuOpen" id="navbarNav">
          <!-- Authenticated Links -->
          <ul class="navbar-nav me-auto mb-2 mb-lg-0" *ngIf="authService.currentUser$ | async as user">
            <li class="nav-item">
              <a class="nav-link px-3" routerLink="/dashboard" routerLinkActive="active text-white fw-bold">Dashboard</a>
            </li>
            <li class="nav-item">
              <a class="nav-link px-3" routerLink="/accounts" routerLinkActive="active text-white fw-bold">Accounts</a>
            </li>
            <li class="nav-item">
              <a class="nav-link px-3" routerLink="/transfer" routerLinkActive="active text-white fw-bold">Transfer Money</a>
            </li>
            <li class="nav-item">
              <a class="nav-link px-3" routerLink="/transactions" routerLinkActive="active text-white fw-bold">Transaction History</a>
            </li>
          </ul>

          <!-- Right side Auth Controls -->
          <div class="d-flex align-items-center gap-3 ms-auto">
            <ng-container *ngIf="authService.currentUser$ | async as user; else guestNav">
              <span class="text-secondary small d-none d-md-inline">
                Signed in as <strong class="text-white">{{ user.name }}</strong>
              </span>
              <button class="btn btn-outline-light btn-sm px-3" (click)="onLogout()">
                Sign Out
              </button>
            </ng-container>

            <ng-template #guestNav>
              <a class="btn btn-outline-light btn-sm px-3" routerLink="/login">Sign In</a>
              <a class="btn btn-primary btn-sm px-3" routerLink="/register">Open Account</a>
            </ng-template>
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar-dark .navbar-nav .nav-link {
      color: #94a3b8;
      transition: color 0.15s ease-in-out;
    }
    .navbar-dark .navbar-nav .nav-link:hover,
    .navbar-dark .navbar-nav .nav-link.active {
      color: #ffffff;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
  router = inject(Router);
  isMenuOpen = false;

  onLogout(): void {
    this.authService.logout();
    this.isMenuOpen = false;
  }
}
