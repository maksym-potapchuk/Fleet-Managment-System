import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const handleI18n = createIntlMiddleware(routing);

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Public routes (no auth required) — canonical form (no locale prefix)
const PUBLIC_PATHS = new Set(['/login']);

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const { exp } = JSON.parse(atob(payload));
    if (!exp) return true;
    // 30s buffer to account for clock skew
    return Date.now() >= (exp - 30) * 1000;
  } catch {
    return true;
  }
}

function getPathLocale(pathname: string, request: NextRequest): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }
  return routing.defaultLocale;
}

function getCanonicalPath(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function buildLocalizedPath(locale: string, path: string): string {
  return `/${locale}${path}`;
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
  const locale = getPathLocale(pathname, request);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  // Session is valid if at least one token exists and is not expired
  const hasSession =
    (!!accessToken && !isJwtExpired(accessToken)) ||
    (!!refreshToken && !isJwtExpired(refreshToken));
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
  matcher: ['/', '/(pl|uk|en)/:path*', '/((?!_next|_vercel|.*\\..*).*)'],
};
