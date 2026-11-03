import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, SESSION_ENDED_REDIRECT } from './auth.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const router = { url: '/', navigateByUrl: jest.fn(() => Promise.resolve(true)) };

  beforeEach(() => {
    router.url = '/';
    router.navigateByUrl.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: RuntimeConfigService, useValue: { apiUrl: (path: string) => path } },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const respondToStartupCheck = (authenticated: boolean): void => {
    httpMock.expectOne('/api/auth/verify').flush({ success: true, authenticated });
  };

  it('starts authenticated only if the startup session check says so', () => {
    respondToStartupCheck(true);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('treats a failed startup check as logged out', () => {
    httpMock.expectOne('/api/auth/verify').flush({}, { status: 500, statusText: 'err' });

    expect(service.isAuthenticated()).toBe(false);
  });

  describe('endSession', () => {
    beforeEach(() => respondToStartupCheck(true));

    it('marks logged out and leaves a private page', () => {
      router.url = '/timeline?year=2020';

      service.endSession();

      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledWith(SESSION_ENDED_REDIRECT);
    });

    it('stays on a public page', () => {
      router.url = '/about';

      service.endSession();

      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('logout ends the session even if the request fails', () => {
    respondToStartupCheck(true);
    router.url = '/emails';

    service.logout().subscribe();
    httpMock.expectOne('/api/auth/logout').flush({}, { status: 500, statusText: 'err' });

    expect(service.isAuthenticated()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith(SESSION_ENDED_REDIRECT);
  });
});
