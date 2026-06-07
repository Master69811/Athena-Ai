import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/workout', '/nutrition', '/progress', '/coach', '/achievements', '/settings'];
const AUTH_ONLY = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has('athena_session');

  if (PROTECTED.some((r) => pathname.startsWith(r)) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_ONLY.some((r) => pathname.startsWith(r)) && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
};
