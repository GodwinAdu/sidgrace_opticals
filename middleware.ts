import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';

const SECRET_KEY = process.env.TOKEN_SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error("Missing environment variable: TOKEN_SECRET_KEY");
}

const encoder = new TextEncoder().encode(SECRET_KEY);

// Public routes that don't require authentication
const publicRoutes = [
    "/sign-in",
    "/",
    // /^\/documentation\/.*/, // All API routes are public
    // /^\/blog\/[^/]+$/, // Matches dynamic reset_password routes like /reset_password/abc123
    // /^\/reset_password\/[^/]+$/, // Matches dynamic reset_password routes like /reset_password/abc123
    /^\/api\/.*/, // All API routes are public
];

// Function to verify JWT and extract payload
async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, encoder);
        return payload;
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const pathSegments = pathname.split('/');
    const rolePath = pathSegments[2]; // Extract the role segment from the path

    const token = request.cookies.get('token')?.value;

    // Check if the requested path is public
    const isPublic = publicRoutes.some((route) =>
        route instanceof RegExp ? route.test(pathname) : route === pathname
    );

    if (isPublic) {
        return NextResponse.next(); // Allow access without authentication
    }


    if (!token) {
        console.warn('No token found, redirecting to home');
        return NextResponse.redirect(new URL('/', request.url));
    }

    const payload = await verifyToken(token);

    if (!payload || (payload.exp && payload.exp < Math.floor(Date.now() / 1000))) {
        console.warn('Invalid or expired token, redirecting to home');
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
        '/:id/(admin|student|parent|forum)/:path*',
    ],
};
