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

import LandingWizard from './LandingWizard';

export default async function LandingPage({ params }: Props) {
    const data = await getLandingPageData(params.sessionId);

    if (!data) {
        return notFound();
    }

    const { session, config, company } = data;

    return (
        <LandingWizard
            session={session}
            config={config}
            company={company}
        />
    );
}
