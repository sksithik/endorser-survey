
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { app_role } = await request.json();

  if (!app_role) {
    return new NextResponse(JSON.stringify({ error: 'Missing app_role' }), { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { user_metadata: { app_role } }
  );

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new NextResponse(JSON.stringify(data), { status: 200 });
}
