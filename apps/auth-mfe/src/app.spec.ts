// Import statements and other code

describe('App', () => {
  it('should render successfully', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.title).toBe('auth-mfe'); // Updated expected value
  });
});