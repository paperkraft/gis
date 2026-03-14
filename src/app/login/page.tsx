'use client';

import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { LucideWaves, LucideMail, LucideUser } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? 'Signing in...' : 'Sign In'}
        </Button>
    );
}

export default function LoginPage() {
    const [state, formAction] = useActionState<{ error?: string } | null, FormData>(loginAction, null);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                            <LucideWaves className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    
                    <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Water Lab GIS</h1>
                    <p className="text-center text-gray-500 mb-8 text-sm">Sign in to manage your water network projects</p>

                    <form action={formAction} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <LucideMail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="email" 
                                    name="email" 
                                    type="email" 
                                    placeholder="name@example.com" 
                                    className="pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name (Optional)</Label>
                            <div className="relative">
                                <LucideUser className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    id="name" 
                                    name="name" 
                                    placeholder="John Doe" 
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {state?.error && (
                            <p className="text-sm font-medium text-red-600 text-center">{state.error}</p>
                        )}

                        <SubmitButton />
                    </form>
                </div>
                
                <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                    <p className="text-xs text-center text-gray-400">
                        Demo application - Use any email to sign in or create an account
                    </p>
                </div>
            </div>
        </div>
    );
}
