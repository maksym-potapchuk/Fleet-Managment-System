import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const handleI18n = createIntlMiddleware(routing);

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Public routes (no auth required) — canonical form (no locale prefix)
const PUBLIC_PATHS = new Set(['/login']);

// With localePrefix: 'as-needed', only non-default locales (uk) carry a prefix.
// Default locale (pl) has no prefix: /dashboard, /login, etc.
function getPathLocale(pathname: string): string {
  return pathname.startsWith('/uk') ? 'uk' : routing.defaultLocale;
}

function getCanonicalPath(pathname: string): string {
  return pathname.replace(/^\/uk(?=\/|$)/, '') || '/';
}

function buildLocalizedPath(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const canonical = getCanonicalPath(pathname);
  const locale = getPathLocale(pathname);
  const hasSession =
    request.cookies.has(ACCESS_TOKEN_COOKIE) || request.cookies.has(REFRESH_TOKEN_COOKIE);
  const isPublic = PUBLIC_PATHS.has(canonical);

  // No token on a protected route → redirect to /login
  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath(locale, '/login');
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Already authenticated, trying to reach /login → redirect to /vehicles
  if (isPublic && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath(locale, '/vehicles');
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Redirect /dashboard → /vehicles (dashboard temporarily disabled)
  if (canonical === '/dashboard') {
    const url = request.nextUrl.clone();
    url.pathname = buildLocalizedPath(locale, '/vehicles');
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Delegate locale handling to next-intl
  return handleI18n(request);
}

export const config = {
  matcher: ['/', '/(pl|uk)/:path*', '/((?!_next|_vercel|.*\\..*).*)'],
};
