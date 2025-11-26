'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { WizardContext, TemplateSelectorResponse, ScriptGeneratorResponse } from '@/lib/endorse-gen-types';

export default function ScriptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<WizardContext | null>(null);
  const [scriptData, setScriptData] = useState<ScriptGeneratorResponse | null>(null);
  const [editedScript, setEditedScript] = useState('');

  useEffect(() => {
    if (!token) {
      setError("No token provided.");
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        // 1. Fetch Context (now includes chosenActionType from previous step)
        const ctxRes = await fetch(`/api/endorse-gen/context?token=${token}`);
        const ctxData = await ctxRes.json();
        if (!ctxRes.ok) throw new Error(ctxData.message || 'Failed to load context');
        setContext(ctxData);

        // 2. Select Template
        const tmplRes = await fetch('/api/endorse-gen/template-selector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ctxData),
        });
        const tmplData: TemplateSelectorResponse = await tmplRes.json();

        // 3. Generate Script
        // We pass the context which now has the template ID if we updated it, 
        // but the API takes context. We might want to pass the chosen template explicitly or merge it.
        // The script generator uses context.chosenExampleTemplateId if available.
        const genRes = await fetch('/api/endorse-gen/script-generator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ctxData, chosenExampleTemplateId: tmplData.chosenExampleTemplateId }),
        });
        const genData: ScriptGeneratorResponse = await genRes.json();
        setScriptData(genData);
        setEditedScript(genData.script);

      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [token]);

  const handleRegenerate = async () => {
    if (!context) return;
    setIsGenerating(true);
    try {
      const genRes = await fetch('/api/endorse-gen/script-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });
      const genData: ScriptGeneratorResponse = await genRes.json();
      setScriptData(genData);
      setEditedScript(genData.script);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProceed = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/script/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, script: editedScript }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save script.');
      }
      router.push(`/recording?token=${token}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading script...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Your Personalized Script</h2>
          <p className="mt-2 text-sm text-gray-600">We've drafted this based on your feedback. Feel free to tweak it!</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md relative">
          {isGenerating && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></div>
            </div>
          )}

          <textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-lg"
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleRegenerate}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Regenerate Script
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleProceed}
            disabled={isSaving}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Continue to Recording'}
          </button>
        </div>
      </div>
    </div>
  );
}