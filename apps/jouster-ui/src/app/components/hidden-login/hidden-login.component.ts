import { Component, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';

export type HiddenLoginMode = 'closed' | 'login' | 'confirm-logout';

/** Physical key (KeyboardEvent.code) pressed with Ctrl+Shift to open the hidden login. */
export const LOGIN_CHORD_CODE = 'Semicolon';

const SUCCESS_CLOSE_DELAY_MS = 800;

/**
 * True for Ctrl+Shift+; (US layouts report `key` ':' because Shift is held). `code` is
 * checked so the chord works on any layout; Alt/Meta must not be held.
 */
export function isLoginChord(event: KeyboardEvent): boolean {
  return (
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    (event.code === LOGIN_CHORD_CODE || event.key === ';' || event.key === ':')
  );
}

/**
 * Keyboard-only hidden login.
 *
 * - Logged out: Ctrl+Shift+; opens a password dialog (Enter submits, Esc closes).
 * - Logged in: Ctrl+Shift+; opens an "End session?" confirmation (Enter confirms, Esc cancels).
 * - There is no link, button or route that opens it; only trusted, non-repeated key presses count.
 *
 * Hiding the dialog is UX only — the backend enforces authentication on every private API.
 */
@Component({
  selector: 'jstr-hidden-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (visible) {
      <div
        class="login-overlay"
        tabindex="-1"
        (click)="onBackdropClick($event)"
        (keydown.escape)="close()">
        <div
          class="login-dialog"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="dialogLabel"
          (keydown.tab)="trapFocus($event)"
          (keydown.shift.tab)="trapFocus($event)">
          @if (mode === 'login') {
            <form (ngSubmit)="submit()" class="login-form">
              <input
                #primaryControl
                type="password"
                [(ngModel)]="password"
                name="password"
                aria-label="Password"
                placeholder="..."
                autocomplete="current-password"
                [readonly]="submitting"
                [class.error]="errorMessage">
            </form>
          } @else {
            <p class="confirm-text">End session?</p>
            <button
              #primaryControl
              type="button"
              class="confirm-button"
              [disabled]="submitting"
              (click)="confirmLogout()">
              End session
            </button>
            <p class="hint">Enter to confirm · Esc to cancel</p>
          }
          @if (errorMessage) {
            <span class="error-msg" role="alert">{{ errorMessage }}</span>
          }
          @if (successMessage) {
            <span class="success-msg" role="status">{{ successMessage }}</span>
          }
        </div>
      </div>
    }
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
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      color: #e0e0e0;
    }

    .login-form input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #0f0f23;
      color: #e0e0e0;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }

    .login-form input:focus,
    .confirm-button:focus-visible {
      border-color: #667eea;
      outline: 2px solid #667eea;
      outline-offset: 2px;
    }

    .login-form input.error {
      border-color: #e74c3c;
    }

    .confirm-text {
      margin: 0 0 12px;
      font-size: 14px;
    }

    .confirm-button {
      width: 100%;
      padding: 10px 16px;
      border: 1px solid #444;
      border-radius: 4px;
      background: #0f0f23;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
    }

    .hint {
      margin: 8px 0 0;
      font-size: 11px;
      color: #888;
    }

    .error-msg {
      display: block;
      color: #e74c3c;
      font-size: 12px;
      margin-top: 8px;
    }

    .success-msg {
      display: block;
      color: #2ecc71;
      font-size: 12px;
      margin-top: 8px;
    }
  `],
})
export class HiddenLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  public mode: HiddenLoginMode = 'closed';
  public password = '';
  public errorMessage = '';
  public successMessage = '';
  public submitting = false;

  private previouslyFocused: HTMLElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCloseTimer());
  }

  /** Focus the dialog's only control (password input or confirm button) as soon as it renders. */
  @ViewChild('primaryControl')
  public set primaryControl(ref: ElementRef<HTMLElement> | undefined) {
    ref?.nativeElement.focus();
  }

  public get visible(): boolean {
    return this.mode !== 'closed';
  }

  public get dialogLabel(): string {
    return this.mode === 'confirm-logout' ? 'End session' : 'Sign in';
  }

  @HostListener('document:keydown', ['$event'])
  public onKeyDown(event: KeyboardEvent): void {
    if (this.visible && event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (!isLoginChord(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!this.isTrustedKeyboardEvent(event)) {
      return;
    }

    if (this.visible) {
      this.close();
      return;
    }

    this.open(this.authService.isAuthenticated() ? 'confirm-logout' : 'login');
  }

  /**
   * Only genuine, non-auto-repeated key presses may open the dialog — not events
   * dispatched by scripts (`isTrusted === false`) or a held-down key.
   */
  public isTrustedKeyboardEvent(event: KeyboardEvent): boolean {
    return event.isTrusted && !event.repeat;
  }

  /** The dialog has exactly one focusable control, so Tab must not move focus out of it. */
  public trapFocus(event: Event): void {
    event.preventDefault();
  }

  /** Close when the dimmed backdrop itself (not the dialog) is clicked. */
  public onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  public open(mode: Exclude<HiddenLoginMode, 'closed'>): void {
    this.clearCloseTimer();
    const active = document.activeElement;
    this.previouslyFocused = active instanceof HTMLElement ? active : null;
    this.resetFields();
    this.mode = mode;
  }

  public close(): void {
    this.clearCloseTimer();
    this.mode = 'closed';
    this.resetFields();
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }

  public submit(): void {
    if (this.submitting || !this.password.trim()) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    const password = this.password;
    this.password = '';

    this.authService
      .login(password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        this.submitting = false;
        if (success) {
          this.successMessage = 'authenticated';
          this.scheduleClose();
        } else {
          this.errorMessage = 'denied';
        }
      });
  }

  public confirmLogout(): void {
    if (this.submitting) {
      return;
    }

    this.submitting = true;
    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.submitting = false;
        this.successMessage = 'Session ended.';
        this.scheduleClose();
      });
  }

  private resetFields(): void {
    this.password = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.submitting = false;
  }

  private scheduleClose(): void {
    this.clearCloseTimer();
    this.closeTimer = setTimeout(() => this.close(), SUCCESS_CLOSE_DELAY_MS);
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
