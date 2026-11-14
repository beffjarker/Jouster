import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

describe('unauthorizedInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const endSession = jest.fn();

  beforeEach(() => {
    endSession.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: RuntimeConfigService, useValue: { apiBaseUrl: 'https://api.example.test' } },
        { provide: AuthService, useValue: { endSession } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const request = (url: string, status: number): jest.Mock => {
    const onError = jest.fn();
    http.get(url).subscribe({ error: onError });
    httpMock.expectOne(url).flush({}, { status, statusText: 'x' });
    return onError;
  };

  it('ends the session and re-throws on a 401 from a private same-origin API', () => {
    const onError = request('/api/life-map/entries', 401);

    expect(endSession).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('ends the session on a 401 from the configured API base URL', () => {
    request('https://api.example.test/api/emails', 401);

    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it('ignores 401s from /api/auth/* (handled by AuthService)', () => {
    request('/api/auth/login', 401);

    expect(endSession).not.toHaveBeenCalled();
  });

  it('ignores non-401 errors and non-API URLs', () => {
    request('/api/emails', 500);
    request('/api/emails', 403);
    request('https://third-party.example.test/api/thing', 401);

    expect(endSession).not.toHaveBeenCalled();
  });
});
