const STORAGE_KEY = 'smart-parking:tenant-slug';

export const tenantSlugStorage = {
  get(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(STORAGE_KEY);
  },

  set(slug: string | null) {
    if (typeof window === 'undefined') {
      return;
    }

    if (!slug) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, slug);
  },

  clear() {
    this.set(null);
  },
};