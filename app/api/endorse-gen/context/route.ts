import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { WizardContext } from '@/lib/endorse-gen-types';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ message: 'Token is required.' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('endorser_invite_sessions')
            .select('survey, id') // We might need to join with other tables for industry/ROI
            .eq('id', token)
            .single();

        if (error || !data) {
            console.error('Supabase context load error:', error);
            return NextResponse.json({ message: 'Invalid session token.' }, { status: 401 });
        }

        // Mocking industry/ROI for now as they are not in the session table yet.
        // In a real scenario, we would fetch these from the business profile linked to the session.
        const context: WizardContext = {
            industry: 'Renovation', // Default or fetched
            trustTier: 'RENO_TRADES', // Default or fetched
            ROI: 'High', // Default or fetched
            surveyFreeText: JSON.stringify(data.survey), // Flatten answers for now
            toneProfile: 'Professional', // Default
            ...data.survey, // Spread answers if they match keys
        };

        return NextResponse.json(context);

    } catch (e) {
        console.error('Unexpected error loading context:', e);
        return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
    }
}
