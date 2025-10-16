// app/script/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

const TONES = ['Friendly', 'Professional', 'Enthusiastic'];

export default function ScriptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isGenerating, setIsGenerating] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<any[] | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('v2');
  const [editedContent, setEditedContent] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<string>(TONES[0]);

  const generateScript = useCallback(async (tone: string) => {
    if (!token) {
      setError("No token provided. Please return to the questionnaire.");
      setIsGenerating(false);
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, tone }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate script.');
      }
      setScripts(data.scripts);
      // When re-generating, find the script with the currently selected length/id, or default to v2
      const currentScript = data.scripts.find((s: any) => s.id === selectedScriptId) || data.scripts.find((s: any) => s.id === 'v2');
      setEditedContent(currentScript?.content || '');
      // If the selected ID wasn't found, update the state to the default
      if (!data.scripts.find((s: any) => s.id === selectedScriptId)) {
        setSelectedScriptId('v2');
      }

    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  }, [token, selectedScriptId]);

  // Initial script generation
  useEffect(() => {
    generateScript(selectedTone);
  }, [generateScript, selectedTone]);

  const handleSelectScript = (id: string) => {
    setSelectedScriptId(id);
    const newScript = scripts?.find(s => s.id === id);
    setEditedContent(newScript?.content || '');
  }

  const handleToneClick = (tone: string) => {
    setSelectedTone(tone);
    // The useEffect will trigger the re-generation
  };

  const handleProceed = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/script/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, script: editedContent }),
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

  if (isGenerating && !scripts) { // Only show full-page loader on initial load
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Generating your personalized script...</h2>
        <p className="text-gray-500">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return <div className="w-full min-h-screen flex items-center justify-center text-center p-4"><p className="text-red-500">{error}</p></div>;
  }
  
  if (!scripts) { // Should not happen if no error, but as a fallback
      return <div className="w-full min-h-screen flex items-center justify-center text-center p-4"><p>No scripts available.</p></div>;
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-3xl w-full">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Review Your Script</h1>
          <p className="text-gray-600">We've generated a few versions of a script based on your feedback. Choose one and edit it to make it perfect.</p>
        </header>

        <div className="bg-white p-8 rounded-lg shadow-md relative">
          {(isGenerating || isSaving) && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></div>
            </div>
          )}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">1. Choose a version</h3>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 p-1">
              {scripts.map(script => (
                <button
                  key={script.id}
                  onClick={() => handleSelectScript(script.id)}
                  className={`w-full px-4 py-2 text-sm font-bold rounded-md transition-colors ${selectedScriptId === script.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                  {script.length}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">2. Edit your script</h3>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-64 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">3. Adjust the tone (Optional)</h3>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 p-1">
              {TONES.map(tone => (
                <button 
                  key={tone} 
                  onClick={() => handleToneClick(tone)}
                  className={`w-full px-4 py-2 text-sm font-bold rounded-md transition-colors ${selectedTone === tone ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={handleProceed}
            disabled={isSaving}
            className="px-10 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Next: Choose Recording Mode'}
          </button>
        </div>
      </div>
    </div>
  );
}