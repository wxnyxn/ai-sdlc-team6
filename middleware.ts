// middleware.ts
// Feature 11 — Route protection middleware for WebAuthn authentication.
// Protects / and /calendar routes; redirects unauthenticated users to /login.
// Redirects already-authenticated users away from /login to /.

import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-this-secret-in-production'
);

async function isValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('session')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const valid = await isValidSession(request);

  const isProtected = pathname === '/' || pathname.startsWith('/calendar');
  const isLoginPage = pathname === '/login';

  if (isProtected && !valid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isLoginPage && valid) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/calendar', '/calendar/:path*', '/login'],
};
