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
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [generatedReview, setGeneratedReview] = useState('');
    const [isGeneratingReview, setIsGeneratingReview] = useState(false);

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

    const handleCopyLink = () => {
        if (videoUrl) {
            navigator.clipboard.writeText(videoUrl);
            alert('Link copied to clipboard!');
        }
    };

    const handleOpenReviewModal = async () => {
        setShowReviewModal(true);
        if (!generatedReview) {
            setIsGeneratingReview(true);
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
                    setGeneratedReview('Failed to generate review. Please write your own.');
                }
            } catch (error) {
                console.error('Error generating review:', error);
                setGeneratedReview('Error generating review. Please write your own.');
            } finally {
                setIsGeneratingReview(false);
            }
        }
    };

    const handleCopyAndGo = () => {
        navigator.clipboard.writeText(generatedReview);
        if (reviewLink) {
            window.open(reviewLink, '_blank');
        } else {
            alert('Review link not found.');
        }
        setShowReviewModal(false);
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
                                <button
                                    onClick={handleOpenReviewModal}
                                    className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:shadow-emerald-900/40 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <PenLine className="w-5 h-5" />
                                    <span>Write a Review</span>
                                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 group-hover:ring-white/30" />
                                </button>
                                <p className="text-center text-white/40 text-sm mt-3">
                                    We'll help you write it with AI ✨
                                </p>
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

            {/* Review Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full border border-white/10 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Write a Review</h3>
                        <p className="text-gray-300 mb-4 text-sm">
                            We've drafted a review for you based on your survey answers. Feel free to edit it before posting.
                        </p>

                        {isGeneratingReview ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                <span className="ml-3">Generating draft...</span>
                            </div>
                        ) : (
                            <textarea
                                className="w-full h-32 bg-gray-900 border border-white/20 rounded-lg p-3 text-white mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={generatedReview}
                                onChange={(e) => setGeneratedReview(e.target.value)}
                            />
                        )}

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCopyAndGo}
                                disabled={isGeneratingReview}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Copy & Go to Review Site
                            </button>
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
