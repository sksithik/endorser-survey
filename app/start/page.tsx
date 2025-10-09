'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { debounce } from 'lodash'

// Your Components
import ProgressDots from '@/components/ProgressDots'
import QuestionCard from '@/components/QuestionCard'
import SelfieCapture from '@/components/SelfieCapture'
import VideoGenerator from '@/components/VideoGenerator'
import VendorAIGenerator from '@/components/VendorAIGenerator'

// Your Libs
import { generateNotesFromAnswers } from '@/lib/generateNotes'
import { QUESTION_POOL, QA } from '@/lib/questions' // Make sure to export QA type
import { supabase } from '@/lib/supabaseClient' // Your client-side Supabase client

// Helper to convert data URL to a file object for uploading
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export default function HomePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  // State
  const [qas, setQas] = useState<QA[]>(() => QUESTION_POOL.map(q => ({ ...q, answer: '' })));
  const [step, setStep] = useState(0);
  const [selfie, setSelfie] = useState<string>('');
  const [selfiePublicUrl, setSelfiePublicUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true); // For initial data load

  // Note Generation State
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const totalSteps = qas.length + 2;
  const answersObj = Object.fromEntries(qas.map(q => [q.id, q.answer]));

  // --- DATA PERSISTENCE ---

  // 1. Debounced save function to avoid spamming the database
  const saveProgress = useCallback(
    debounce(async (dataToSave: any) => {
      if (!sessionId) return;

      const { error } = await supabase
        .from('endorser_survey_sessions')
        .update(dataToSave)
        .eq('session_id', sessionId);

      if (error) console.error('Error saving progress:', error);
      else console.log('Progress saved!', dataToSave);

    }, 1000), // Wait 1 second after the last change before saving
    [sessionId]
  );

  // 2. Fetch initial state from DB on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return; // No session to load
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('endorser_survey_sessions')
        .select('survey, current_step, selfie, selfie_public_url, notes')
        .eq('session_id', sessionId)
        .single();

      if (data) {
        // Restore state from database
        if (data.survey) setQas(data.survey as QA[]);
        if (data.current_step) setStep(data.current_step);
        if (data.selfie) setSelfie(data.selfie);
        if (data.selfie_public_url) setSelfiePublicUrl(data.selfie_public_url);
        if (data.notes) setNotes(data.notes);
      } else if (error) {
        console.error('Failed to load session:', error);
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, [sessionId]);

  // 3. Trigger save whenever a piece of state changes
  useEffect(() => {
    if (isLoading) return; // Don't save while initially loading
    saveProgress({
      survey: qas,
      current_step: step,
      selfie: selfie,
      selfie_public_url: selfiePublicUrl,
      notes: notes,
    });
  }, [qas, step, selfie, selfiePublicUrl, notes, isLoading, saveProgress]);

  // --- LOGIC ---

  // Handle selfie capture, upload, and state update
  const handleSelfieCapture = async (dataUrl: string) => {
    setSelfie(dataUrl);
    if (!sessionId) return;

    const file = dataURLtoFile(dataUrl, `${sessionId}-selfie.png`);
    const filePath = `${sessionId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('selfies') // Ensure you have a 'selfies' bucket in Supabase Storage
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading selfie:', uploadError);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('selfies')
      .getPublicUrl(filePath);

    setSelfiePublicUrl(publicUrlData.publicUrl);
  };

  // Generate notes via API when entering final step
  useEffect(() => {
    const onFinal = step === qas.length + 1;
    if (!onFinal || notes) return; // Don't regenerate if notes already exist

    let canceled = false;
    setNotesLoading(true);
    setNotesError(null);
    generateNotesFromAnswers(answersObj)
      .then(text => { if (!canceled) setNotes(text) })
      .catch(err => { if (!canceled) setNotesError(err?.message || 'Failed to generate notes') })
      .finally(() => { if (!canceled) setNotesLoading(false) });
    return () => { canceled = true };
  }, [step, qas.length, answersObj, notes]);


  // Navigation and validation
  const canNext = () => {
    if (step < qas.length) return qas[step]?.answer.trim().length > 0;
    if (step === qas.length) return !!selfie;
    return true;
  };

  const next = () => setStep(s => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  // --- RENDER ---

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading session...</div>;
  }

  // Render the original component structure
  return (
    <main className="min-h-screen pb-20">
      <header /* ... */ >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg sparkle" />
            <span className="font-semibold">AI Talking Wizard</span>
          </div>
          <ProgressDots total={totalSteps} current={step} />
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 mt-10 md:mt-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
            Survey ➜ Selfie ➜ Auto‑Notes ➜ Talking Video
          </h1>
        </motion.div>
        <p className="text-white/70 mb-8">Beautiful, animated, mobile‑first experience. Your data stays in your browser unless you opt into a vendor.</p>
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {step < qas.length && qas[step] && (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <QuestionCard
                  index={step}
                  total={qas.length}
                  question={qas[step]}
                  value={qas[step].answer}
                  onChange={(v) => {
                    setQas(qs => {
                      const copy = [...qs];
                      copy[step] = { ...copy[step], answer: v };
                      return copy;
                    });
                  }}
                />
              </motion.div>
            )}

            {step === qas.length && (
              <motion.div 
                key="selfie"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <SelfieCapture onCapture={handleSelfieCapture} existingSelfie={selfie} />
              </motion.div>
            )}

            {step === qas.length + 1 && (
              <motion.div
                key="final"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <div className="grid gap-6">
                  <div className="card">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-3">Your Auto‑Generated Notes (Script)</h3>
                    {notesLoading && (
                      <div className="text-sm text-white/70">Generating notes with AI…</div>
                    )}
                    {notesError && (
                      <div className="text-sm text-red-400">{notesError}</div>
                    )}
                    {!notesLoading && !notesError && (
                      <textarea
                        value={notes}
                        onChange={(e)=>setNotes(e.target.value)}
                        rows={10}
                        className="w-full text-sm bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
                        placeholder="Your script will appear here. You can edit it before generating the video."
                      />
                    )}
                  </div>
                  <VideoGenerator selfieDataUrl={selfie} scriptText={notes} />
                  <VendorAIGenerator selfieDataUrl={selfie} scriptText={notes} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-1">
            <button onClick={prev} className="btn-secondary btn" disabled={step === 0}>Back</button>
            <button onClick={next} className="btn" disabled={!canNext()}>
              {step < qas.length ? 'Next' : (step === qas.length ? 'Finish' : 'Done')}
            </button>
          </div>
        </div>

        <footer className="mt-10 text-center text-white/50 text-xs">
          Tip: In the final step, hit “Start Recording”, read the prompter, then “Download Video”.
        </footer>
      </section>
    </main>
  )
}
