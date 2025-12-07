import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import { Play, Star, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabaseClient';

interface Props {
    params: { sessionId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

// Helper to fetch data
async function getLandingPageData(sessionId: string) {
    // 1. Fetch Session Data
    const { data: sessionData, error: sessionError } = await supabase
        .from('endorser_invite_sessions')
        .select('user_id, final_video_url, video_url, ai_generated_review, survey')
        .eq('id', sessionId)
        .single();

    if (sessionError || !sessionData) {
        console.error('Session fetch error:', sessionError);
        return null;
    }

    // 2. Fetch Super Admin Profile
    const { data: adminData, error: adminError } = await supabase
        .from('endorser_super_admins')
        .select('company_profile')
        .eq('id', sessionData.user_id)
        .single();

    if (adminError || !adminData) {
        console.error('Admin fetch error:', adminError);
        // If admin data missing, we might still want to show something, but requirements say load from it.
        // For now, return null or partial? Let's return null to fail gracefully.
        return null;
    }

    // Cast company_profile to any or a specific type if we had one
    const companyProfile = adminData.company_profile as any;

    return {
        session: sessionData,
        config: companyProfile?.landingPageConfig,
        company: {
            name: companyProfile?.companyName,
            color: companyProfile?.colorScheme,
            logo: companyProfile?.logoUrl, // Assuming logoUrl might exist based on branding usually having one
            services: companyProfile?.services,
        },
    };
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const data = await getLandingPageData(params.sessionId);
    if (!data || !data.config) return { title: 'Landing Page' };

    return {
        title: data.config.meta?.title || data.company.name || 'Special Offer',
        description: data.config.meta?.description || 'Check out this review!',
        keywords: data.config.meta?.keywords,
    };
}

export default async function LandingPage({ params }: Props) {
    const data = await getLandingPageData(params.sessionId);

    if (!data) {
        return notFound();
    }

    const { session, config, company } = data;
    const videoUrl = session.final_video_url || session.video_url;
    const review = session.ai_generated_review;

    // Defaults if config is missing specific fields
    const heroHeadline = config?.hero?.headline || `See what people are saying about ${company.name || 'us'}`;
    const heroSubheadline = config?.hero?.subheadline || 'Real stories from real customers.';
    const ctaLabel = config?.cta?.label || 'Get Started';
    const ctaTarget = config?.cta?.target || '#lead-form';
    const primaryColor = company.color || '#3b82f6'; // Default blue

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            {/* Navbar / Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl tracking-tight" style={{ color: primaryColor }}>
                        {company.name || 'Company Name'}
                    </div>
                    <a
                        href={ctaTarget}
                        className="px-5 py-2 rounded-full font-medium text-white transition-transform hover:scale-105 active:scale-95 shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {ctaLabel}
                    </a>
                </div>
            </header>

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative pt-20 pb-32 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, #1f2937)` }}>
                            {heroHeadline}
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                            {heroSubheadline}
                        </p>
                        <div className="flex justify-center gap-4">
                            <a
                                href={ctaTarget}
                                className="px-8 py-4 rounded-full font-bold text-white text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {ctaLabel} <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Background Decor */}
                    <div className="absolute top-0 inset-x-0 h-full overflow-hidden -z-10 pointer-events-none opacity-30">
                        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full blur-3xl opacity-20" style={{ backgroundColor: primaryColor }} />
                        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-20" style={{ backgroundColor: primaryColor }} />
                    </div>
                </section>

                {/* Content Grid: Video + Review */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 mb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                        {/* Video Card */}
                        {videoUrl ? (
                            <div className="bg-black rounded-2xl shadow-2xl overflow-hidden aspect-[9/16] max-h-[600px] lg:max-h-none mx-auto w-full max-w-sm lg:max-w-full relative group">
                                <video
                                    src={videoUrl}
                                    controls
                                    className="w-full h-full object-cover"
                                    poster={session.selfie_public_url} // Optional: if selfie exists, could be poster
                                />
                            </div>
                        ) : (
                            <div className="bg-gray-200 rounded-2xl aspect-[9/16] flex items-center justify-center text-gray-400">
                                <p>Video not available</p>
                            </div>
                        )}

                        {/* Review & Details Card */}
                        <div className="space-y-8 lg:sticky lg:top-24">
                            {/* Review Bubble */}
                            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 relative">
                                <div className="absolute -top-4 -left-4 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold shadow-sm flex items-center gap-1">
                                    <Star className="w-4 h-4 fill-current" /> Verified Review
                                </div>
                                <blockquote className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed italic">
                                    "{review || "This has been an amazing experience. I highly recommend them!"}"
                                </blockquote>
                                <div className="mt-6 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500">
                                        {session.survey?.name?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{session.survey?.name || 'Happy Customer'}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3 text-emerald-500" /> Verified Customer
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Trust / Stats (Example driven) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-50 text-center">
                                    <div className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>100%</div>
                                    <div className="text-sm text-gray-500">Satisfaction</div>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-50 text-center">
                                    <div className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>5.0</div>
                                    <div className="text-sm text-gray-500">Average Rating</div>
                                </div>
                            </div>

                            {/* Lead Form Placeholder - if configured */}
                            <div id="lead-form" className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                                <h3 className="text-xl font-bold mb-4">Interested in {company.services || 'our services'}?</h3>
                                <form className="space-y-4">
                                    {config?.form?.fields?.includes('name') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all" style={{ focusRingColor: primaryColor }} placeholder="Your Name" />
                                        </div>
                                    )}
                                    {config?.form?.fields?.includes('email') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all" style={{ focusRingColor: primaryColor }} placeholder="you@example.com" />
                                        </div>
                                    )}
                                    <button className="w-full py-3 rounded-lg text-white font-bold transition-transform hover:scale-105 shadow-md" style={{ backgroundColor: primaryColor }}>
                                        {ctaLabel || 'Submit'}
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
                        <p>&copy; {new Date().getFullYear()} {company.name || 'Company'}. All rights reserved.</p>
                    </div>
                </footer>
            </main>
        </div>
    );
}
