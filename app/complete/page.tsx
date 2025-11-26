'use client'

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle, Mail, LogIn } from 'lucide-react';

function CompletionPageContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [email, setEmail] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            alert('Please enter your email address.');
            return;
        }
        setIsSending(true);
        try {
            const response = await fetch('/api/complete/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token }),
            });
            const result = await response.json();
            if (result.success) {
                setIsEmailSent(true);
            } else {
                alert('Failed to send email. Please try again.');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            alert('An error occurred while sending the email.');
        } finally {
            setIsSending(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setAuthError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin, // Redirect back to the app after login
            },
        });
        if (error) {
            setAuthError(error.message);
        }
    };

    const [completionMessage, setCompletionMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        const fetchCompletion = async () => {
            try {
                const ctxRes = await fetch(`/api/endorse-gen/context?token=${token}`);
                const ctxData = await ctxRes.json();

                const res = await fetch('/api/endorse-gen/completion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ctxData),
                });
                const data = await res.json();
                setCompletionMessage(data.completionMessage);
            } catch (e) {
                console.error(e);
            }
        };
        fetchCompletion();
    }, [token]);

    return (
        <div className="w-full min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl">
                <div className="card text-center">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
                    <p className="text-white/70 mb-8">{completionMessage || "Your participation in the survey is greatly appreciated."}</p>

                    {/* Email Section */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8">
                        <h2 className="text-xl font-semibold mb-3">Get a Copy of Your Responses</h2>
                        {isEmailSent ? (
                            <div className="text-green-400 flex items-center justify-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                <span>Email sent successfully!</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSendEmail} className="flex flex-col sm:flex-row items-center gap-3">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="input flex-grow !text-white"
                                    required
                                />
                                <button type="submit" className="btn sm:w-auto" disabled={isSending}>
                                    {isSending ? 'Sending...' : 'Send Email'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Account Creation Section */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-3">Create an Account</h2>
                        <p className="text-white/70 mb-4">Save your progress and manage your videos by creating an account.</p>
                        <button onClick={handleGoogleSignIn} className="btn-secondary btn w-full flex items-center justify-center gap-3">
                            <LogIn className="h-5 w-5" />
                            Sign Up with Google
                        </button>
                        {authError && <p className="text-red-400 mt-4 text-sm">Error: {authError}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CompletionPage() {
    return (
        <Suspense fallback={<div className="w-full min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
            <CompletionPageContent />
        </Suspense>
    );
}
