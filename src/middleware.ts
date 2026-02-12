import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login'];
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for session token in cookies
    const sessionToken = request.cookies.get('sb-access-token');

    if (!sessionToken) {
        // Redirect to login if no session
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (manifest, icons, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox).*)',
    ],
};
