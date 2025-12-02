
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const role = requestUrl.searchParams.get('role');
  const next = requestUrl.searchParams.get('next');

  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (user && !error) {
      // If a role is specified in the callback URL, update the user's metadata
      if (role === 'endorser' && user.user_metadata?.app_role !== 'endorser') {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { app_role: 'endorser' }
        });

        if (!updateError) {
          // Refresh user object to get updated metadata
          user.user_metadata.app_role = 'endorser';
        }
      }

      // Ensure user exists in endorser_users table if they are an endorser
      if (user.user_metadata?.app_role === 'endorser') {
        const { data: existingUser } = await supabase
          .from('endorser_users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingUser) {
          await supabase
            .from('endorser_users')
            .insert({
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'User',
              total_points: 0,
            });
        }
      }
    }

    if (error || !user || user.user_metadata?.app_role !== 'endorser') {
      // Redirect to login with an error message
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
    }
  }

  // URL to redirect to after sign in process completes
  if (next) {
    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
