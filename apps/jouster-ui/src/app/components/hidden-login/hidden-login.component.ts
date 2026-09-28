import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

/**
 * Hidden login dialog that appears only when Ctrl+Shift+; is pressed.
 * No visible UI until activated. Disappears after successful login or Escape.
 */
@Component({
  selector: 'jstr-hidden-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-overlay" *ngIf="visible" (click)="close()">
      <div class="login-dialog" (click)="$event.stopPropagation()">
        <form (ngSubmit)="submit()" class="login-form">
          <input
            type="password"
            [(ngModel)]="password"
            name="password"
            placeholder="..."
            autocomplete="current-password"
            [class.error]="errorMessage"
            (keydown.escape)="close()"
            #passwordInput>
          <span class="error-msg" *ngIf="errorMessage">{{ errorMessage }}</span>
          <span class="success-msg" *ngIf="successMessage">{{ successMessage }}</span>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      backdrop-filter: blur(2px);
    }

    .login-dialog {
      background: #1a1a2e;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      min-width: 280px;
    }

    .login-form input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #0f0f23;
      color: #e0e0e0;
      font-size: 14px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .login-form input:focus {
      border-color: #667eea;
    }

    .login-form input.error {
      border-color: #e74c3c;
    }

    .error-msg {
      display: block;
      color: #e74c3c;
      font-size: 12px;
      margin-top: 8px;
      font-family: monospace;
    }

    .success-msg {
      display: block;
      color: #2ecc71;
      font-size: 12px;
      margin-top: 8px;
      font-family: monospace;
    }
  `]
})
export class HiddenLoginComponent implements OnDestroy {
  visible = false;
  password = '';
  errorMessage = '';
  successMessage = '';
  private loginSub: Subscription | null = null;

  constructor(private authService: AuthService) {}

  /**
   * Listen for Ctrl+Shift+; to toggle the login dialog.
   * Note: Shift+; produces ':' as the key value on US keyboards.
   * We also check event.code for cross-layout compatibility.
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+Shift+; — key is ':' because Shift changes ; to :
    // Also match by code 'Semicolon' for keyboard layout independence
    if (event.ctrlKey && event.shiftKey && (event.key === ':' || event.key === ';' || event.code === 'Semicolon')) {
      event.preventDefault();
      event.stopPropagation();

      if (this.authService.isAuthenticated()) {
        // Already authenticated — use as logout trigger
        this.authService.logout().subscribe(() => {
          this.visible = true;
          this.successMessage = '';
          this.errorMessage = 'Session ended.';
          setTimeout(() => this.close(), 1500);
        });
      } else {
        this.toggle();
      }
    }

    // Escape to close
    if (event.key === 'Escape' && this.visible) {
      this.close();
    }
  }

  toggle(): void {
    this.visible = !this.visible;
    this.password = '';
    this.errorMessage = '';
    this.successMessage = '';

    if (this.visible) {
      // Focus the input after render
      setTimeout(() => {
        const input = document.querySelector('.login-form input') as HTMLInputElement;
        input?.focus();
      }, 50);
    }
  }

  close(): void {
    this.visible = false;
    this.password = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  submit(): void {
    if (!this.password.trim()) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.loginSub = this.authService.login(this.password).subscribe(success => {
      if (success) {
        this.successMessage = 'authenticated';
        this.password = '';
        setTimeout(() => this.close(), 800);
      } else {
        this.errorMessage = 'denied';
        this.password = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.loginSub?.unsubscribe();
  }
}

