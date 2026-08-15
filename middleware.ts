import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// This middleware provides a first line of defense (redirect unauthenticated/
// wrong-role users away from protected sections). It is NOT the sole
// authorization mechanism — every /api/seller/* and /api/admin/* route also
// re-checks role/ownership server-side (see lib/auth/rbac.ts), since
// middleware alone can be bypassed by calling the API directly.
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (path.startsWith('/seller') && token?.role !== 'seller' && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/seller/:path*', '/account/:path*'],
};
