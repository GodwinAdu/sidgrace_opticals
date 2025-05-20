import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const ACCESS_TOKEN_SECRET = process.env.TOKEN_SECRET_KEY;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET) {
    throw new Error("Missing environment variable: TOKEN_SECRET_KEY");
}

if (!REFRESH_TOKEN_SECRET) {
    throw new Error("Missing environment variable: REFRESH_TOKEN_SECRET");
}

const accessTokenEncoder = new TextEncoder().encode(ACCESS_TOKEN_SECRET);
const refreshTokenEncoder = new TextEncoder().encode(REFRESH_TOKEN_SECRET);

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
async function verifyToken(token: string, secretEncoder: Uint8Array): Promise<Record<string, unknown> | null> {
    try {
        const { payload } = await jwtVerify(token, secretEncoder);
        return payload as Record<string, unknown>;
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return null;
    }
}

// Function to create a new access token
async function createNewAccessToken(payload: Record<string, unknown>): Promise<string> {
    // Remove exp from the payload to avoid conflicts
    const payloadWithoutExp = { ...payload };
    delete (payloadWithoutExp as Record<string, unknown>)['exp'];

    // Create a new access token with a 1-hour expiration
    return new SignJWT(payloadWithoutExp)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(accessTokenEncoder);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the requested path is public
    const isPublic = publicRoutes.some((route) =>
        route instanceof RegExp ? route.test(pathname) : route === pathname
    );

    if (isPublic) {
        return NextResponse.next(); // Allow access without authentication
    }

    // Get the access token from cookies
    const accessToken = request.cookies.get('token')?.value;

    // If no access token, check for refresh token
    if (!accessToken) {
        const refreshToken = request.cookies.get('refreshToken')?.value;

        if (!refreshToken) {
            console.warn('No tokens found, redirecting to /sign-in');
            return NextResponse.redirect(new URL('/sign-in', request.url));
        }

        // Verify refresh token
        const refreshPayload = await verifyToken(refreshToken, refreshTokenEncoder);

        if (
            !refreshPayload ||
            (typeof refreshPayload.exp === 'number' && refreshPayload.exp < Math.floor(Date.now() / 1000))
        ) {
            console.warn('Invalid or expired refresh token, redirecting to /sign-in');
            return NextResponse.redirect(new URL('/sign-in', request.url));
        }

        // Create new access token
        const newAccessToken = await createNewAccessToken(refreshPayload);

        // Create response with the new access token
        const response = NextResponse.next();

        // Set the new access token in cookies
        response.cookies.set({
            name: 'token',
            value: newAccessToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60, // 1 hour
            path: '/',
            sameSite: 'strict'
        });

        return response;
    }

    // Verify access token
    const payload = await verifyToken(accessToken, accessTokenEncoder);

    // If access token is invalid or expired, try refresh token
    if (
        !payload ||
        (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000))
    ) {
        const refreshToken = request.cookies.get('refreshToken')?.value;

        if (!refreshToken) {
            console.warn('Access token expired and no refresh token found, redirecting to /sign-in');
            return NextResponse.redirect(new URL('/sign-in', request.url));
        }

        // Verify refresh token
        const refreshPayload = await verifyToken(refreshToken, refreshTokenEncoder);

        if (
            !refreshPayload ||
            (typeof refreshPayload.exp === 'number' && refreshPayload.exp < Math.floor(Date.now() / 1000))
        ) {
            console.warn('Invalid or expired refresh token, redirecting to /sign-in');
            return NextResponse.redirect(new URL('/sign-in', request.url));
        }

        // Create new access token
        const newAccessToken = await createNewAccessToken(refreshPayload);

        // Create response with the new access token
        const response = NextResponse.next();

        // Set the new access token in cookies
        response.cookies.set({
            name: 'token',
            value: newAccessToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60, // 1 hour
            path: '/',
            sameSite: 'strict'
        });

        // Use the refresh payload for authorization checks
        // const userRole = refreshPayload.role;

        // // Restrict access based on role
        // if (
        //     (rolePath === 'admin' && userRole === 'student' || userRole === "parent") ||
        //     (rolePath === 'student' && userRole !== 'student') ||
        //     (rolePath === 'parent' && userRole !== 'parent')
        // ) {
        //     console.warn(`Unauthorized access to ${rolePath}, redirecting to /not-authorized`);
        //     return NextResponse.redirect(new URL('/not-authorized', request.url));
        // }

        return response;
    }
    // If access token is valid, proceed with role check
    // const userRole = payload.role;

    // // Restrict access based on role
    // if (
    //     (rolePath === 'admin' && userRole === 'student' || userRole === "parent") ||
    //     (rolePath === 'student' && userRole !== 'student') ||
    //     (rolePath === 'parent' && userRole !== 'parent')
    // ) {
    //     console.warn(`Unauthorized access to ${rolePath}, redirecting to /not-authorized`);
    //     return NextResponse.redirect(new URL('/not-authorized', request.url));
    // }



    // Check if token is about to expire (within 5 minutes)
    const tokenExpiresIn = typeof payload.exp === 'number' ? payload.exp * 1000 - Date.now() : 0;
    const isAboutToExpire = tokenExpiresIn > 0 && tokenExpiresIn < 5 * 60 * 1000; // 5 minutes

    if (isAboutToExpire) {
        // Proactively refresh the token if it's about to expire
        const refreshToken = request.cookies.get('refreshToken')?.value;

        if (refreshToken) {
            const refreshPayload = await verifyToken(refreshToken, refreshTokenEncoder);

            if (
                refreshPayload &&
                (
                    typeof refreshPayload.exp !== 'number' ||
                    refreshPayload.exp >= Math.floor(Date.now() / 1000)
                )
            ) {
                // Create new access token
                const newAccessToken = await createNewAccessToken(refreshPayload);

                // Create response with the new access token
                const response = NextResponse.next();

                // Set the new access token in cookies
                response.cookies.set({
                    name: 'token',
                    value: newAccessToken,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 60 * 60, // 1 hour
                    path: '/',
                    sameSite: 'strict'
                });

                return response;
            }
        }
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
