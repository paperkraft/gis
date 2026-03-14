'use server';

import { getOrCreateUser } from "@/db/services/user.service";
import { setSession, clearSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(prevState: any, formData: FormData) {
    const email = formData.get('email') as string;
    const name = formData.get('name') as string || email.split('@')[0];

    if (!email) {
        return { error: 'Email is required' };
    }

    try {
        const user = await getOrCreateUser(name, email);
        await setSession({
            id: user.id,
            email: user.email,
            name: user.name,
        });
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Failed to login' };
    }

    redirect('/');
}

export async function logoutAction() {
    await clearSession();
    redirect('/login');
}
