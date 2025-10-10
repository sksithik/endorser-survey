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
function dataURLtoFile(dataurl: string, filename:string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Invalid data URL');
  }
  const mime = mimeMatch[1];
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
  
  // --- NEW: Text-to-Speech State ---
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const totalSteps = qas.length + 2;
  const answersObj = Object.fromEntries(qas.map(q => [q.id, q.answer]));

  // --- DATA PERSISTENCE ---

  // 1. Debounced save function
  const saveProgress = useCallback(
    debounce(async (dataToSave: any) => {
      if (!sessionId) return;
      const { error } = await supabase
        .from('endorser_survey_sessions')
        .update(dataToSave)
        .eq('session_id', sessionId);
      if (error) console.error('Error saving progress:', error);
      else console.log('Progress saved!', dataToSave);
    }, 1000),
    [sessionId]
  );

  // 2. Fetch initial state from DB
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!sessionId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('endorser_survey_sessions')
        .select('survey, current_step, selfie, selfie_public_url, notes')
        .eq('session_id', sessionId)
        .single();
      if (data) {
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

  // 3. Trigger save whenever state changes
  useEffect(() => {
    if (isLoading) return;
    saveProgress({
      survey: qas,
      current_step: step,
      selfie: selfie,
      selfie_public_url: selfiePublicUrl,
      notes: notes,
    });
  }, [qas, step, selfie, selfiePublicUrl, notes, isLoading, saveProgress]);

  // --- LOGIC ---
  
  // --- NEW: Load Speech Synthesis Voices ---
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        const defaultVoice = availableVoices.find(voice => voice.lang.includes('en')) || availableVoices[0];
        setSelectedVoice(defaultVoice);
      }
    };
    // Voices load asynchronously. The 'voiceschanged' event fires when they are ready.
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // Initial call

    // Cleanup: stop speaking and remove listener when component unmounts
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Handle selfie capture and upload
  const handleSelfieCapture = async (dataUrl: string) => {
    setSelfie(dataUrl);
    if (!sessionId) return;
    const file = dataURLtoFile(dataUrl, `${sessionId}-selfie.png`);
    const filePath = `${sessionId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('selfies')
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

  // Generate notes via API
  useEffect(() => {
    const onFinal = step === qas.length + 1;
    if (!onFinal || notes) return;

    let canceled = false;
    setNotesLoading(true);
    setNotesError(null);
    generateNotesFromAnswers(answersObj)
      .then(text => { if (!canceled) setNotes(text) })
      .catch(err => { if (!canceled) setNotesError(err?.message || 'Failed to generate notes') })
      .finally(() => { if (!canceled) setNotesLoading(false) });
    return () => { canceled = true };
  }, [step, qas.length, answersObj, notes]);

  // --- NEW: Text-to-Speech Controls ---
  const toggleAudio = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !notes) return;
    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
    } else {
      const utterance = new SpeechSynthesisUtterance(notes);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis Error", e);
        setIsSpeaking(false);
      };
      synth.speak(utterance);
    }
  }, [isSpeaking, notes, selectedVoice]);

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

  return (
    <main className="min-h-screen pb-20">
      <header>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg sparkle" />
            <span className="font-semibold">AI Talking Wizard</span>
          </div>
          <ProgressDots total={totalSteps} current={step} />
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 mt-10 md:mt-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
            Survey ➜ Selfie ➜ Auto‑Notes ➜ Talking Video
          </h1>
        </motion.div>
        <p className="text-white/70 mb-8">Beautiful, animated, mobile‑first experience. Your data stays in your browser unless you opt into a vendor.</p>
        <div className="grid gap-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {step < qas.length && qas[step] && (
              <motion.div key={step} initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                <QuestionCard index={step} total={qas.length} question={qas[step]} value={qas[step].answer} onChange={(v) => { setQas(qs => { const copy = [...qs]; copy[step] = { ...copy[step], answer: v }; return copy; }); }} />
              </motion.div>
            )}

            {step === qas.length && (
              <motion.div key="selfie" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                <SelfieCapture onCapture={handleSelfieCapture} existingSelfie={selfie} />
              </motion.div>
            )}

            {step === qas.length + 1 && (
              <motion.div key="final" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                <div className="grid gap-6">
                  <div className="card">
                    <h3 className="text-2xl md:text-3xl font-semibold mb-3">Your Auto‑Generated Notes (Script)</h3>
                    {notesLoading && <div className="text-sm text-white/70">Generating notes with AI…</div>}
                    {notesError && <div className="text-sm text-red-400">{notesError}</div>}
                    {!notesLoading && !notesError && (
                      <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={10} className="w-full text-sm bg-white/5 p-4 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20" placeholder="Your script will appear here. You can edit it before generating the video." />
                    )}
                  </div>
                  
                  {/* --- NEW: Audio Player --- */}
                  {!notesLoading && notes && (
                    <div className="card">
                      <h3 className="text-xl font-semibold mb-3">Preview Audio 🔊</h3>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <select
                          value={selectedVoice?.name || ''}
                          onChange={(e) => {
                            const voice = voices.find(v => v.name === e.target.value);
                            setSelectedVoice(voice || null);
                          }}
                           className="custom-select w-full sm:w-auto flex-grow bg-white/5 p-3 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
                          disabled={voices.length === 0 || isSpeaking}
                        >
                          {voices.length > 0 ? (
                            voices.map(voice => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))
                          ) : (
                            <option>Loading voices...</option>
                          )}
                        </select>
                        <button
                          onClick={toggleAudio}
                          className="btn w-full sm:w-auto"
                          disabled={!notes || notesLoading || voices.length === 0}
                        >
                          {isSpeaking ? 'Stop Preview' : 'Play Preview'}
                        </button>
                      </div>
                    </div>
                  )}

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