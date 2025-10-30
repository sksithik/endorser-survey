'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GiftIcon, StarIcon } from 'lucide-react';

export default function RewardsPage() {
  const supabase = createClientComponentClient<Database>();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const giftCards = [
    { id: 1, name: 'Amazon Gift Card', points: 500, value: '$50' },
    { id: 2, name: 'Starbucks Gift Card', points: 250, value: '$25' },
    { id: 3, name: 'Visa Gift Card', points: 1000, value: '$100' },
  ];

  useEffect(() => {
    const fetchUserPoints = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('endorser_users')
            .select('total_points')
            .eq('id', user.id)
            .single();

          if (error) {
            throw error;
          }

          if (data) {
            setTotalPoints(data.total_points);
          }
        } else {
          setError('User not logged in.');
        }
      } catch (err: any) {
        console.error('Error fetching user points:', err.message);
        setError('Failed to load points.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPoints();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4 sm:p-8 flex items-center justify-center">
        <p className="text-xl">Loading rewards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4 sm:p-8 flex items-center justify-center">
        <p className="text-xl text-red-300">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4 sm:p-8">
      <Header />
      <main className="container mx-auto mt-12 space-y-10">
        <section className="text-center animate-fade-in">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl drop-shadow-lg">
            Your Rewards Hub
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-purple-100 font-light">
            Celebrate your achievements and redeem exciting rewards!
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white/10 backdrop-blur-sm border-none shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-white">Your Current Points</CardTitle>
              <StarIcon className="h-8 w-8 text-yellow-300" />
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-extrabold text-yellow-300 drop-shadow-md">
                {totalPoints !== null ? totalPoints : '--'}
              </div>
              <p className="text-sm text-purple-200 mt-2">Points earned so far</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-none shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-white">Giftbit Integration</CardTitle>
              <GiftIcon className="h-8 w-8 text-red-300" />
            </CardHeader>
            <CardContent>
              <p className="text-lg text-purple-100">
                Seamlessly send and receive gift cards powered by Giftbit.
              </p>
              <Button className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-300">
                Learn More
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-4xl font-bold text-center text-white drop-shadow-lg">
            Redeem Your Rewards
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {giftCards.map((card) => (
              <Card key={card.id} className="bg-white/10 backdrop-blur-sm border-none shadow-xl hover:shadow-purple-500/50 transition-all duration-300 ease-in-out">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-white">{card.name}</CardTitle>
                  <CardDescription className="text-purple-200">{card.value} Value</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-yellow-300 flex items-center">
                    {card.points} <StarIcon className="h-6 w-6 ml-2" />
                  </span>
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-5 rounded-full shadow-md"
                    disabled={totalPoints === null || totalPoints < card.points}
                  >
                    {totalPoints !== null && totalPoints >= card.points ? 'Redeem' : 'Earn More'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

