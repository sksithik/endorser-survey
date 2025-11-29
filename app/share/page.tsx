'use client'

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Twitter, Facebook, Linkedin, Copy, Loader2, PenLine } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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
                    <div className="mt-8 text-center">
                        <Link href={`/complete?token=${token}`} className="btn">
                            I'm Done Sharing
                        </Link>
                    </div>
                </div>
            </div>
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
