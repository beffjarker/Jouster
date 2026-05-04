import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ALICE_IN_WONDERLAND_USERS } from '../../services/mock-auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'auth-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // Environment info
  environmentName = environment.name;
  useMockAuth = environment.useMockAuth;
  mockUsers = environment.useMockAuth ? ALICE_IN_WONDERLAND_USERS : [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // If already authenticated, redirect to dashboard/home
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    // Log environment info
    console.log('≡ƒÄ» Login Component Initialized');
    console.log('Environment:', AuthService.getEnvironmentInfo());
  }

  /**
   * Handle login form submission
   */
  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.username, this.password).subscribe({
      next: (success) => {
        this.isLoading = false;

        if (success) {
          console.log('Γ£à Login successful, redirecting...');
          this.router.navigate(['/']);
        } else {
          this.errorMessage = 'Invalid username or password';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        console.error('Γ¥î Login error:', error);
      }
    });
  }

  /**
   * Quick login with a mock user (dev only)
   */
  quickLogin(user: typeof ALICE_IN_WONDERLAND_USERS[0]): void {
    this.username = user.username;
    this.password = user.password;
    this.onLogin();
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = '';
  }
}
