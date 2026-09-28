import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Simple login page — password-only, no username.
 * This page is NOT linked from navigation. Access via direct URL or hidden key command.
 */
@Component({
  selector: 'jstr-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <form (ngSubmit)="onSubmit()" class="login-form">
        <input
          type="password"
          [(ngModel)]="password"
          name="password"
          placeholder="Password"
          autocomplete="current-password"
          [class.error]="errorMessage">
        <button type="submit" [disabled]="isLoading || !password">
          {{ isLoading ? '...' : 'Go' }}
        </button>
        <p class="error-msg" *ngIf="errorMessage">{{ errorMessage }}</p>
      </form>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }
    .login-form {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .login-form input {
      padding: 10px 14px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #1a1a2e;
      color: #e0e0e0;
      font-size: 14px;
      font-family: monospace;
      outline: none;
    }
    .login-form input:focus { border-color: #667eea; }
    .login-form input.error { border-color: #e74c3c; }
    .login-form button {
      padding: 10px 18px;
      border: none;
      border-radius: 4px;
      background: #667eea;
      color: white;
      cursor: pointer;
      font-size: 14px;
    }
    .login-form button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error-msg { color: #e74c3c; font-size: 12px; margin-top: 8px; }
  `]
})
export class LoginComponent implements OnInit {
  password = '';
  isLoading = false;
  errorMessage = '';
  private returnUrl = '/';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (!this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.password).subscribe({
      next: success => {
        this.isLoading = false;
        if (success) {
          this.router.navigate([this.returnUrl]);
        } else {
          this.errorMessage = 'Invalid credentials';
          this.password = '';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Login failed';
      }
    });
  }
}

