'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import Header from '@/components/Header';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        form.reset({ name: user.user_metadata.full_name || '' });
      }
    };
    fetchUser();
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
        // Refresh user data
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      }
    } catch (error: any) {
      setError(error.message);
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
      <div className="max-w-md w-full space-y-6 mt-24">
        <div className="text-center">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">View and update your profile information.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" type="text" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">Profile updated successfully!</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Update Profile
          </Button>
        </form>
      </div>
    </div>
  );
}
