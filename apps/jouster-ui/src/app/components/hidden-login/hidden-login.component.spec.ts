import { fakeAsync, tick } from '@angular/core/testing';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { HiddenLoginComponent, isLoginChord } from './hidden-login.component';

const chord = (overrides: Partial<KeyboardEventInit> = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', {
    key: ':',
    code: 'Semicolon',
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
    ...overrides,
  });

describe('HiddenLoginComponent', () => {
  let spectator: Spectator<HiddenLoginComponent>;
  let auth: SpyObject<AuthService>;

  const createComponent = createComponentFactory({
    component: HiddenLoginComponent,
    providers: [
      mockProvider(AuthService, {
        isAuthenticated: jest.fn(() => false),
        login: jest.fn(() => of(true)),
        logout: jest.fn(() => of(true)),
      }),
    ],
  });

  /** Simulate a genuine key press; jsdom marks dispatched events as untrusted. */
  const pressTrusted = (event: KeyboardEvent = chord()): void => {
    jest.spyOn(spectator.component, 'isTrustedKeyboardEvent').mockReturnValue(true);
    document.dispatchEvent(event);
    spectator.detectChanges();
  };

  beforeEach(() => {
    spectator = createComponent();
    auth = spectator.inject(AuthService);
    auth.isAuthenticated.mockReset().mockReturnValue(false);
    auth.login.mockReset().mockReturnValue(of(true));
    auth.logout.mockReset().mockReturnValue(of(true));
  });

  describe('isLoginChord', () => {
    it('matches Ctrl+Shift+; by key or physical code', () => {
      expect(isLoginChord(chord())).toBe(true);
      expect(isLoginChord(chord({ key: ';' }))).toBe(true);
      expect(isLoginChord(chord({ key: 'ö', code: 'Semicolon' }))).toBe(true);
    });

    it('rejects partial or extra modifiers and other keys', () => {
      expect(isLoginChord(chord({ ctrlKey: false }))).toBe(false);
      expect(isLoginChord(chord({ shiftKey: false }))).toBe(false);
      expect(isLoginChord(chord({ altKey: true }))).toBe(false);
      expect(isLoginChord(chord({ metaKey: true }))).toBe(false);
      expect(isLoginChord(chord({ key: 'l', code: 'KeyL' }))).toBe(false);
    });
  });

  describe('isTrustedKeyboardEvent', () => {
    it('accepts only trusted, non-repeated events', () => {
      const component = spectator.component;
      expect(component.isTrustedKeyboardEvent({ isTrusted: true, repeat: false } as KeyboardEvent)).toBe(true);
      expect(component.isTrustedKeyboardEvent({ isTrusted: false, repeat: false } as KeyboardEvent)).toBe(false);
      expect(component.isTrustedKeyboardEvent({ isTrusted: true, repeat: true } as KeyboardEvent)).toBe(false);
    });
  });

  it('renders nothing until the chord is pressed', () => {
    expect(spectator.query('[role="dialog"]')).not.toExist();
  });

  it('ignores a script-dispatched (untrusted) chord', () => {
    document.dispatchEvent(chord());
    spectator.detectChanges();

    expect(spectator.query('[role="dialog"]')).not.toExist();
  });

  describe('when logged out', () => {
    it('opens an accessible modal password dialog with focus in the input', () => {
      pressTrusted();

      const dialog = spectator.query('[role="dialog"]');
      expect(dialog).toExist();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Sign in');
      expect(document.activeElement).toBe(spectator.query('input[type="password"]'));
    });

    it('closes on Escape and restores focus to the previously focused element', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      pressTrusted();
      spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');
      spectator.detectChanges();

      expect(spectator.query('[role="dialog"]')).not.toExist();
      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });

    it('closes when the chord is pressed again', () => {
      pressTrusted();
      pressTrusted();

      expect(spectator.query('[role="dialog"]')).not.toExist();
    });

    it('closes on a backdrop click but not on a click inside the dialog', () => {
      pressTrusted();

      spectator.click('[role="dialog"]');
      expect(spectator.query('[role="dialog"]')).toExist();

      spectator.click('.login-overlay');
      expect(spectator.query('[role="dialog"]')).not.toExist();
    });

    it('keeps Tab focus inside the dialog', () => {
      pressTrusted();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

      spectator.query('input[type="password"]')?.dispatchEvent(tab);

      expect(tab.defaultPrevented).toBe(true);
    });

    it('logs in, clears the password field and closes after success', fakeAsync(() => {
      pressTrusted();
      spectator.component.password = 'secret';

      spectator.component.submit();
      spectator.detectChanges();

      expect(auth.login).toHaveBeenCalledWith('secret');
      expect(spectator.component.password).toBe('');
      expect(spectator.query('[role="status"]')).toHaveText('authenticated');

      tick(800);
      spectator.detectChanges();
      expect(spectator.query('[role="dialog"]')).not.toExist();
    }));

    it('shows a generic error on wrong password and stays open', () => {
      auth.login.mockReturnValue(of(false));
      pressTrusted();
      spectator.component.password = 'wrong';

      spectator.component.submit();
      spectator.detectChanges();

      expect(spectator.query('[role="alert"]')).toHaveText('denied');
      expect(spectator.query('[role="dialog"]')).toExist();
    });

    it('does not submit an empty password', () => {
      pressTrusted();
      spectator.component.password = '   ';

      spectator.component.submit();

      expect(auth.login).not.toHaveBeenCalled();
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      auth.isAuthenticated.mockReturnValue(true);
    });

    it('asks for confirmation instead of logging out immediately', () => {
      pressTrusted();

      expect(auth.logout).not.toHaveBeenCalled();
      expect(spectator.query('[role="dialog"]')).toHaveAttribute('aria-label', 'End session');
      expect(document.activeElement).toBe(spectator.query('button.confirm-button'));
    });

    it('cancels on Escape without logging out', () => {
      pressTrusted();
      spectator.dispatchKeyboardEvent(document, 'keydown', 'Escape');
      spectator.detectChanges();

      expect(auth.logout).not.toHaveBeenCalled();
      expect(spectator.query('[role="dialog"]')).not.toExist();
    });

    it('logs out when confirmed', fakeAsync(() => {
      pressTrusted();

      spectator.click('button.confirm-button');

      expect(auth.logout).toHaveBeenCalledTimes(1);
      expect(spectator.query('[role="status"]')).toHaveText('Session ended.');
      tick(800);
      spectator.detectChanges();
      expect(spectator.query('[role="dialog"]')).not.toExist();
    }));
  });
});
