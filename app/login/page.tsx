
'use client';

import { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Database } from '@/lib/database.types';

export default function Login() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'unauthorized') {
      setLoginError('You do not have permission to access this application.');
    }
  }, [searchParams]);

  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: any) => {
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.app_role === 'endorser') {
          router.push('/dashboard');
        } else {
          await supabase.auth.signOut();
          setLoginError('You do not have permission to access this application.');
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.app_role === 'endorser') {
          router.push('/dashboard');
        } else {
          await supabase.auth.signOut();
          setLoginError('You do not have permission to access this application.');
        }
      }
    };
    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth, router, searchParams]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {loginError && (
          <div className="p-4 mb-4 text-center bg-red-100 text-red-800 rounded-md">
            {loginError}
          </div>
        )}
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          redirectTo={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`}
          theme="dark"
        />
      </div>
    </div>
  );
}
