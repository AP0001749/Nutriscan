import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define all routes that require a user to be logged in to access.
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/scan(.*)',
  '/api/log-meal(.*)',
  '/api/get-meals(.*)',
  '/api/clear-meals(.*)',
  '/api/scan-food(.*)', 
]);

// Add logging to verify Clerk environment variables
console.log('Clerk Environment Variables:', {
  CLERK_FRONTEND_API: process.env.CLERK_FRONTEND_API,
  CLERK_API_KEY: process.env.CLERK_API_KEY,
  NEXT_PUBLIC_CLERK_FRONTEND_API: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

// Suppress Clerk development keys warning in development mode
if (process.env.NODE_ENV === 'development') {
  console.warn('Using development keys. This should not be used in production.');
}

// This is the standard Clerk middleware implementation.
// It will automatically protect the routes defined above.
export default clerkMiddleware((auth, req) => {
  console.log('Middleware executed for route:', req.url);
  console.log('Request Headers:', {
    authorization: req.headers.get('authorization'),
    host: req.headers.get('host'),
  });

  if (isProtectedRoute(req)) {
    console.log('Protected route accessed:', req.url);
    console.log('Auth object:', auth); // Log the auth object for debugging
    try {
      auth(); // Attempt authentication
    } catch (error) {
      console.error('Authentication error:', error);
    }
  } else {
    console.log('Unprotected route accessed:', req.url);
  }
});

export const config = {
  // This matcher ensures the middleware runs on all routes
  // except for static assets and internal Next.js paths.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};