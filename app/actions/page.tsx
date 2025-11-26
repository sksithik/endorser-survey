'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WizardContext, RankedActionResponse, PersonalizationResponse } from '@/lib/endorse-gen-types';

export default function ActionSelectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [context, setContext] = useState<WizardContext | null>(null);
    const [rankedActions, setRankedActions] = useState<RankedActionResponse | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [friendName, setFriendName] = useState('');
    const [isPersonalizing, setIsPersonalizing] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("No token provided.");
            setIsLoading(false);
            return;
        }

        const init = async () => {
            try {
                // 1. Fetch Context
                const ctxRes = await fetch(`/api/endorse-gen/context?token=${token}`);
                const ctxData = await ctxRes.json();
                if (!ctxRes.ok) throw new Error(ctxData.message || 'Failed to load context');
                setContext(ctxData);

                // 2. Rank Actions
                const rankRes = await fetch('/api/endorse-gen/action-ranking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ctxData),
                });
                const rankData = await rankRes.json();
                if (!rankRes.ok) throw new Error(rankData.error || 'Failed to rank actions');
                setRankedActions(rankData);

            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [token]);

    const handleProceed = async () => {
        if (!selectedAction || !context) return;

        if (selectedAction === 'PERSONAL_VIDEO_TO_FRIEND') {
            if (!friendName) {
                alert('Please enter a friend name.');
                return;
            }
            setIsPersonalizing(true);
            try {
                const res = await fetch('/api/endorse-gen/personalization', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ friendName }),
                });
                const data: PersonalizationResponse = await res.json();
                if (!data.useName) {
                    alert('Please enter a valid first name.');
                    setIsPersonalizing(false);
                    return;
                }
                // Update context with friend name and action
                // We need to save this selection somewhere, or pass it along.
                // For now, let's assume we pass it to the script page via query params or save it to session.
                // Saving to session is better.
                await saveSelection(selectedAction, data.friendName || friendName);
            } catch (e) {
                console.error(e);
                alert('Error validating name.');
                setIsPersonalizing(false);
            }
        } else {
            await saveSelection(selectedAction);
        }
    };

    const saveSelection = async (action: string, name?: string) => {
        try {
            // We need an API to update the session with chosen action and friend name.
            // Reuse submit or create new? Let's use a new endpoint or update context.
            // For simplicity, we'll assume the script page will re-fetch context or we pass it.
            // But wait, the script page generates scripts based on context.
            // So we MUST save the chosen action to the DB.

            // I'll use a new endpoint /api/endorse-gen/save-selection
            const res = await fetch('/api/endorse-gen/save-selection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, chosenActionType: action, friendName: name }),
            });
            if (!res.ok) throw new Error('Failed to save selection');

            router.push(`/script?token=${token}`);
        } catch (e: any) {
            setError(e.message);
            setIsPersonalizing(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading options...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">Choose Your Endorsement Style</h2>
                    <p className="mt-2 text-sm text-gray-600">Based on your feedback, we recommend these options.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {rankedActions?.rankedActions.map((action) => (
                        <div
                            key={action}
                            onClick={() => setSelectedAction(action)}
                            className={`relative rounded-lg border p-6 cursor-pointer hover:shadow-lg transition-all ${selectedAction === action ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}
                        >
                            <h3 className="text-lg font-medium text-gray-900">{action.replace(/_/g, ' ')}</h3>
                            <p className="mt-2 text-sm text-gray-500">{rankedActions.reasons[action]}</p>
                        </div>
                    ))}
                </div>

                {selectedAction === 'PERSONAL_VIDEO_TO_FRIEND' && (
                    <div className="bg-white p-6 rounded-lg shadow border border-indigo-100">
                        <label className="block text-sm font-medium text-gray-700">Friend's Name</label>
                        <input
                            type="text"
                            value={friendName}
                            onChange={(e) => setFriendName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            placeholder="e.g. John"
                        />
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        onClick={handleProceed}
                        disabled={!selectedAction || isPersonalizing}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {isPersonalizing ? 'Validating...' : 'Continue to Script'}
                    </button>
                </div>
            </div>
        </div>
    );
}
