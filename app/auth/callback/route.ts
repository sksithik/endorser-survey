
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !user || user.user_metadata?.app_role !== 'endorser') {
      // Redirect to login with an error message
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unauthorized`);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
