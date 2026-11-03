import { PAGE_REGISTRY, isPrivatePath } from './page-registry';

describe('page-registry', () => {
  it('keeps Life Map and other personal pages private', () => {
    const privatePaths = PAGE_REGISTRY.filter((page) => page.requiresAuth).map((page) => page.path);

    expect(privatePaths).toEqual(
      expect.arrayContaining(['/timeline', '/emails', '/music', '/highlights', '/conversation-history']),
    );
  });

  it('never marks a page both public and auth-required', () => {
    PAGE_REGISTRY.forEach((page) => {
      expect(page.isPublic && page.requiresAuth).toBe(false);
    });
  });

  describe('isPrivatePath', () => {
    it.each(['/timeline', '/timeline/2020', '/timeline?x=1', '/emails#top', '/conversation-history'])(
      'treats %s as private',
      (url) => expect(isPrivatePath(url)).toBe(true),
    );

    it.each(['/', '/about', '/interactive-playground', '/timelines', '/contact?from=timeline'])(
      'treats %s as public',
      (url) => expect(isPrivatePath(url)).toBe(false),
    );
  });
});
