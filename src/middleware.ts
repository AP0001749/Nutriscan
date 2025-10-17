import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define all routes that require a user to be logged in to access.
const protectedRoutes = [
  '/dashboard',
  '/scan',
  '/api/log-meal',
  '/api/get-meals',
  '/api/clear-meals',
  '/api/scan-food',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if the route is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    // Get the session token
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // This matcher ensures the middleware runs on all routes
  // except for static assets and internal Next.js paths.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};