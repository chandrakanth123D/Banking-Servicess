import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <div class="d-flex flex-column min-vh-100 bg-light">
      <!-- Responsive Banking Navbar -->
      <app-navbar></app-navbar>

      <!-- Main Application Views -->
      <main class="flex-grow-1">
        <router-outlet></router-outlet>
      </main>

      <!-- Clean Professional Footer -->
      <footer class="bg-white border-top py-4 text-center text-muted small mt-auto">
        <div class="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
          <span>&copy; 2026 Apex Bank NA. Member FDIC. Educational Banking Simulation.</span>
          <span class="font-mono text-secondary">REST API v1.0.0 · JSON Storage Powered</span>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {}
