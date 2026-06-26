/** API path fragments that must stay unauthenticated and token-free. */
export const PUBLIC_API_PATH_FRAGMENTS = [
  '/public/parking-finder',
  '/organizations/public-branding/',
] as const;

export function isPublicApiRequest(url?: string): boolean {
  if (!url) {
    return false;
  }

  return PUBLIC_API_PATH_FRAGMENTS.some((fragment) => url.includes(fragment));
}