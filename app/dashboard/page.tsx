'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import SurveysList from './SurveysList';
import MediaGallery from './MediaGallery';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        form.reset({ name: user.user_metadata?.full_name ?? '' });

        const { data: surveysData } = await supabase
          .from('endorser_responses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (surveysData) {
          setSurveys(surveysData);
        }
      }
    })();
  }, [supabase.auth, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: values.name },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-4">
        <Icons.spinner className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-4">
      <Header />

      {/* Outer layout classes on a plain div */}
      <div className="max-w-4xl w-full space-y-8 mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground">
              Welcome, {user.user_metadata?.full_name || user.email || 'there'}!
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Manage your profile and explore your dashboard.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg border border-border space-y-4">
              <h2 className="text-2xl font-semibold">Profile Information</h2>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user.email ?? ''} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" type="text" {...form.register('name')} />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
                  )}
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}
                {success && <p className="text-green-500 text-sm">Profile updated successfully!</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  Update Profile
                </Button>
              </form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg border border-border space-y-4">
              <h2 className="text-2xl font-semibold">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => router.push('/rewards')}>
                  View My Rewards
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/settings' as any)}>
                  Account Settings
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={async () => { await supabase.auth.signOut(); router.refresh(); }}
                >
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg border border-border space-y-4">
            <h2 className="text-2xl font-semibold">My Surveys</h2>
            <SurveysList surveys={surveys} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <MediaGallery userId={user.id} />
        </motion.div>
      </div>
    </div>
  );
}
