'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GiftIcon, StarIcon, Loader2 } from 'lucide-react';

interface GiftCard {
  id: string;
  name: string;
  points: number | null;
  value: string | null;
}

export default function RewardsPage() {
  const supabase = createClientComponentClient<Database>();
  const [userId, setUserId] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [loadingGiftCards, setLoadingGiftCards] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingCardId, setRedeemingCardId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
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
        console.error('Error fetching user data:', err.message);
        setError('Failed to load user data.');
      } finally {
        setLoadingPoints(false);
      }
    };

    const fetchGiftCards = async () => {
      try {
        const resp = await fetch('/api/giftbit/gifts', { headers: { Accept: 'application/json' } });
        const ct = resp.headers.get('content-type') || '';
        if (!resp.ok) {
          const body = ct.includes('application/json') ? await resp.json() : { error: await resp.text() };
          throw new Error(body.error || 'Failed to fetch gift cards.');
        }
        if (!ct.includes('application/json')) {
          const text = await resp.text();
          throw new Error(`Expected JSON but received ${ct}.`);
        }
        const fetchedCards: GiftCard[] = await resp.json();
        setGiftCards(fetchedCards);
      } catch (e: any) {
        console.error('Error fetching gift cards:', e.message);
        setError('Failed to load gift cards.');
      } finally {
        setLoadingGiftCards(false);
      }
    };
    fetchUserData();
    fetchGiftCards();
  }, [supabase]);

  const handleRedeem = async (card: GiftCard) => {
    if (totalPoints === null || card.points === null || (totalPoints as number) < card.points) {
      alert("You don't have enough points to redeem this card.");
      return;
    }
    if (!userId) {
      alert("User not logged in. Please log in to redeem rewards.");
      return;
    }

  setRedeemingCardId(card.id);
  setRedeemingCardId(card.id);
    try {
      const response = await fetch('/api/giftbit/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, pointsCost: card.points!, userId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Redemption failed');
      }

      const result = await response.json();
      setTotalPoints(result.newTotalPoints);
      alert(`Successfully redeemed ${card.name} for ${card.points} points! Check your email for details.`);

    } catch (err: any) {
      console.error('Redemption error:', err.message);
      setError(`Failed to redeem card: ${err.message}`);
      alert(`Failed to redeem card: ${err.message}`);
    } finally {
      setRedeemingCardId(null);
    }
  };

  const isLoading = loadingPoints || loadingGiftCards;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 text-white p-4 sm:p-8 flex items-center justify-center">
        <p className="text-xl">Loading rewards and gift cards...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-950 text-white p-4 sm:p-8">
      <Header />
      <main className="container mx-auto mt-12 space-y-10">
        <section className="text-center animate-fade-in">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl drop-shadow-lg text-purple-400">
            Your Rewards Hub
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-indigo-200 font-light">
            Celebrate your achievements and redeem exciting rewards!
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-8">
          <Card className="bg-gray-800/70 backdrop-blur-sm border-none shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-white">Your Current Points</CardTitle>
              <StarIcon className="h-8 w-8 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-6xl font-extrabold text-yellow-400 drop-shadow-md">
                {totalPoints !== null ? totalPoints : '--'}
              </div>
              <p className="text-sm text-indigo-300 mt-2">Points earned so far</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/70 backdrop-blur-sm border-none shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold text-white">Giftbit Integration</CardTitle>
              <GiftIcon className="h-8 w-8 text-pink-400" />
            </CardHeader>
            <CardContent>
              <p className="text-lg text-indigo-300">
                Seamlessly send and receive gift cards powered by Giftbit.
              </p>
              <Button
                className="mt-4 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-300"
                onClick={() => window.open('https://www.giftbit.com/', '_blank')}
              >
                Learn More
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-4xl font-bold text-center text-white drop-shadow-lg text-purple-400">
            Redeem Your Rewards
          </h2>
          {giftCards.length === 0 && !loadingGiftCards ? (
            <p className="text-center text-xl text-indigo-200">No gift cards available at the moment. Please check back later!</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {giftCards.map((card) => (
                <Card key={card.id} className="bg-gray-800/70 backdrop-blur-sm border-none shadow-xl hover:shadow-purple-500/50 transition-all duration-300 ease-in-out">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-white">{card.name}</CardTitle>
                    <CardDescription className="text-indigo-300">{card.value} Value</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <span className="text-3xl font-bold text-yellow-400 flex items-center">
                      {card.points} <StarIcon className="h-6 w-6 ml-2" />
                    </span>
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-5 rounded-full shadow-md"
                      disabled={
                        totalPoints === null || card.points == null || totalPoints < card.points || redeemingCardId === card.id
                      }
                      onClick={() => handleRedeem(card)} // card.points is checked in handleRedeem
                    >
                      {redeemingCardId === card.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : totalPoints !== null && card.points != null && totalPoints >= card.points ? (
                        'Redeem'
                      ) : (
                        'Earn More'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}