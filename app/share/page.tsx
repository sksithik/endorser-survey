'use client'

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Twitter, Facebook, Linkedin, Copy, Loader2, PenLine, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';

interface ShareContent {
    emailSubject: string;
    emailBody: string;
    socialText: string;
}

function SharePageContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [shareContent, setShareContent] = useState<ShareContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [reviewLink, setReviewLink] = useState<string | null>(null);
    const [generatedReview, setGeneratedReview] = useState('');
    const [isGeneratingReview, setIsGeneratingReview] = useState(false);
    const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('No session token provided.');
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch video URL from Supabase
                const { data: sessionData, error: sessionError } = await supabase
                    .from('endorser_invite_sessions')
                    .select('final_video_url, video_url, survey, review_link')
                    .eq('id', token)
                    .single();

                if (sessionError || !sessionData) {
                    throw new Error(sessionError?.message || 'Failed to fetch session data.');
                }

                const urlToUse = sessionData.final_video_url || sessionData.video_url;

                if (!urlToUse) {
                    throw new Error('Video not found for this session.');
                }

                setVideoUrl(urlToUse);
                if (sessionData.review_link) {
                    setReviewLink(sessionData.review_link);
                }

                // Generate shareable content
                const contentResponse = await fetch('/api/share/generate-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const contentData = await contentResponse.json();

                if (!contentData.success) {
                    throw new Error('Failed to generate share content.');
                }

                setShareContent(contentData);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [token]);

    useEffect(() => {
        if (token && reviewLink && !generatedReview && !isGeneratingReview && !hasAttemptedGeneration) {
            const generate = async () => {
                setIsGeneratingReview(true);
                setHasAttemptedGeneration(true);
                try {
                    const response = await fetch('/api/share/generate-review', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });
                    const data = await response.json();
                    if (data.success) {
                        setGeneratedReview(data.reviewText);
                    } else {
                        console.error('Failed to generate review:', data.message);
                        setGeneratedReview('I had a great experience! (Draft generation failed, please write your own review).');
                    }
                } catch (error) {
                    console.error('Error generating review:', error);
                    setGeneratedReview('I had a great experience! (Draft generation failed, please write your own review).');
                } finally {
                    setIsGeneratingReview(false);
                }
            };
            generate();
        }
    }, [token, reviewLink, generatedReview, isGeneratingReview, hasAttemptedGeneration]);

    const handleCopyLink = () => {
        if (videoUrl) {
            navigator.clipboard.writeText(videoUrl);
            alert('Link copied to clipboard!');
        }
    };

    const handleCopyAndGo = () => {
        navigator.clipboard.writeText(generatedReview);
        if (reviewLink) {
            window.open(reviewLink, '_blank');
        } else {
            alert('Review link not found.');
        }
    };

    const handleGoogleSignIn = async () => {
        const supabaseAuth = createClientComponentClient<Database>();
        const nextUrl = `/share?token=${token}`;
        await supabaseAuth.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?role=endorser&next=${encodeURIComponent(nextUrl)}`,
            },
        });
    };

    if (isLoading) {
        return (
            <div className="w-full min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
                <p className="mt-4 text-lg">Preparing your share page...</p>
            </div>
        );
    }

    if (error) {
        return <div className="w-full min-h-screen flex items-center justify-center"><p className="text-red-400">{error}</p></div>;
    }

    if (!videoUrl || !shareContent) {
        return <div className="w-full min-h-screen flex items-center justify-center"><p>Could not load video or share content.</p></div>;
    }

    return (
        <div className="w-full min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center relative">
            <div className="w-full max-w-2xl">
                <div className="card">
                    <h2 className="text-2xl font-bold text-center mb-4">Share Your Video</h2>
                    <video src={videoUrl} controls className="w-full rounded-lg mb-6" />

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <input type="text" readOnly value={videoUrl} className="input flex-grow !text-white" />
                            <button onClick={handleCopyLink} className="btn-secondary btn p-3">
                                <Copy className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <a href={`mailto:?subject=${encodeURIComponent(shareContent.emailSubject)}&body=${encodeURIComponent(shareContent.emailBody + ' ' + videoUrl)}`} className="btn-secondary btn flex items-center justify-center gap-2">
                                <Mail className="h-5 w-5" />
                                <span>Email</span>
                            </a>
                            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(shareContent.socialText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn flex items-center justify-center gap-2">
                                <Twitter className="h-5 w-5" />
                                <span>Twitter</span>
                            </a>
                            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn flex items-center justify-center gap-2">
                                <Facebook className="h-5 w-5" />
                                <span>Facebook</span>
                            </a>
                            <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(videoUrl)}&title=${encodeURIComponent(shareContent.emailSubject)}&summary=${encodeURIComponent(shareContent.socialText)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn flex items-center justify-center gap-2">
                                <Linkedin className="h-5 w-5" />
                                <span>LinkedIn</span>
                            </a>
                        </div>

                        {reviewLink && (
                            <div className="pt-6 border-t border-white/10">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-3 text-emerald-400">
                                        <PenLine className="w-4 h-4" />
                                        <span className="text-sm font-semibold uppercase tracking-wider">AI Drafted Review</span>
                                    </div>

                                    {isGeneratingReview ? (
                                        <div className="h-32 flex items-center justify-center text-white/50 gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Drafting your review...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <textarea
                                                value={generatedReview}
                                                onChange={(e) => setGeneratedReview(e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm min-h-[100px] focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none mb-4"
                                                placeholder="Write your review here..."
                                            />
                                            <button
                                                onClick={handleCopyAndGo}
                                                className="w-full group relative flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:shadow-emerald-900/40 hover:-translate-y-0.5 active:translate-y-0"
                                            >
                                                <span>Copy & Go to Review Site</span>
                                                <Copy className="w-4 h-4 opacity-80" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-8 text-center space-y-4">
                        <Link href={`/complete?token=${token}`} className="btn w-full block">
                            I'm Done Sharing
                        </Link>

                        <button
                            onClick={() => setShowSignup(true)}
                            className="text-sm text-gray-400 hover:text-white underline transition-colors"
                        >
                            Create an account to save your rewards
                        </button>
                    </div>
                </div>
            </div>

            {showSignup && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowSignup(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold mb-2 text-center text-white">Create Account</h3>
                        <p className="text-gray-400 text-center mb-6 text-sm">
                            Sign up to track your rewards and manage your endorsements.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleGoogleSignIn}
                                className="w-full bg-white text-black font-medium py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>

                            <Link
                                href="/register"
                                className="w-full bg-gray-800 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors border border-white/10"
                            >
                                <Mail className="w-5 h-5" />
                                Sign up with Email
                            </Link>
                        </div>

                        <div className="mt-6 text-center text-xs text-gray-500">
                            Already have an account? <Link href="/login" className="text-emerald-400 hover:underline">Log in</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SharePage() {
    return (
        <Suspense fallback={<div className="w-full min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
            <SharePageContent />
        </Suspense>
    );
}
