'use client'

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Twitter, Facebook, Linkedin, Copy, Loader2 } from 'lucide-react';
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
                    .from('endorser_survey_sessions')
                    .select('final_video_url, survey')
                    .eq('session_id', token)
                    .single();

                if (sessionError || !sessionData) {
                    throw new Error(sessionError?.message || 'Failed to fetch session data.');
                }

                if (!sessionData.final_video_url) {
                    throw new Error('Video not found for this session.');
                }

                setVideoUrl(sessionData.final_video_url);

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
        <div className="w-full min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center justify-center">
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
