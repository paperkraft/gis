import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'user_session';

export async function getSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    
    if (!sessionCookie) return null;
    
    try {
        return JSON.parse(sessionCookie.value);
    } catch {
        return null;
    }
}

export async function setSession(user: { id: string, email: string, name: string }) {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
}
