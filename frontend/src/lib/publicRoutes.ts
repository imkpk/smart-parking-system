/** Browser paths that do not require an authenticated session bootstrap. */
export const PUBLIC_APP_PATHS = [
  '/parking-finder',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

export function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}