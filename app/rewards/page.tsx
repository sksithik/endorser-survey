import Header from '@/components/Header';

export default function RewardsPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center p-4">
      <Header />
      <div className="mt-24 text-center">
        <h1 className="text-4xl font-bold">Rewards</h1>
        <p className="text-lg text-muted-foreground mt-2">Here are your rewards!</p>
      </div>
    </div>
  );
}
