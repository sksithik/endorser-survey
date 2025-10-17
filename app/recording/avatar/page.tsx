// app/recording/avatar/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

// --- Reusable Components ---

const ConsentModal = ({ onAccept, onDecline }: { onAccept: () => void, onDecline: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">Voice Cloning Consent</h2>
            <p className="text-gray-600 mb-6">To create an AI Avatar video, we need to clone your voice. This allows the avatar to speak your chosen script naturally. Your voice data will be used solely for generating this video.</p>
            <div className="flex justify-end gap-4">
                <button onClick={onDecline} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">Decline</button>
                <button onClick={onAccept} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">I Accept</button>
            </div>
        </div>
    </div>
);

const TemplateTile = ({ name, imageUrl, selected, onClick }: { name: string, imageUrl: string, selected: boolean, onClick: () => void }) => (
    <div onClick={onClick} className={`rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selected ? 'border-indigo-600' : 'border-gray-200'}`}>
        <img src={imageUrl} alt={name} className="w-full h-full object-cover aspect-video bg-gray-100" />
        <p className={`text-center text-sm font-semibold p-2 ${selected ? 'text-indigo-700 bg-indigo-50' : 'text-gray-600 bg-white'}`}>{name}</p>
    </div>
);

const SelfieCamera = ({ onSelfieTaken, onCancel }: { onSelfieTaken: (file: File) => void, onCancel: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const setupCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                alert("Camera access is required to take a selfie. Please allow camera access and try again.");
                onCancel();
            }
        };
        setupCamera();
        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [onCancel]);

    const handleSnap = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            if (blob) {
                onSelfieTaken(new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            }
        }, 'image/jpeg');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-xl max-w-md w-full">
                <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-square object-cover rounded-lg mb-4" />
                <div className="flex gap-4">
                    <button onClick={handleSnap} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Snap Photo</button>
                    <button onClick={onCancel} className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const Teleprompter = ({ script, onStart, onStop, onCancel }: { script: string, onStart: () => void, onStop: () => void, onCancel: () => void }) => {
    const [isScrolling, setIsScrolling] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(20); // pixels per second
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<number>(0);

    useEffect(() => {
        let animationFrameId: number;

        const scroll = () => {
            if (contentRef.current) {
                const scrollAmount = (scrollSpeed / 60);
                contentRef.current.scrollTop += scrollAmount;
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        if (isScrolling) {
            animationFrameId = requestAnimationFrame(scroll);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isScrolling, scrollSpeed]);

    const handleStart = () => {
        onStart();
        setIsScrolling(true);
    };

    const handleStop = () => {
        onStop();
        setIsScrolling(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                <div ref={contentRef} className="flex-grow p-8 md:p-12 overflow-y-scroll scroll-smooth">
                    <p className="text-3xl md:text-4xl leading-relaxed text-gray-800 whitespace-pre-wrap">
                        {script}
                    </p>
                </div>
                <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label htmlFor="speed" className="text-sm font-medium text-gray-600">Speed:</label>
                        <input 
                            type="range" 
                            id="speed" 
                            min="5" 
                            max="50" 
                            value={scrollSpeed} 
                            onChange={(e) => setScrollSpeed(Number(e.target.value))} 
                            className="w-32"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        {!isScrolling ? (
                            <button onClick={handleStart} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105">
                                Start Recording
                            </button>
                        ) : (
                            <button onClick={handleStop} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105">
                                Stop Recording
                            </button>
                        )}
                        <button onClick={onCancel} className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main Page Component ---

export default function AvatarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [selfie, setSelfie] = useState<File | string | null>(null);
  const [voice, setVoice] = useState<File | string | null>(null);
  const [script, setScript] = useState('');
  const [selfieMode, setSelfieMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [showConsent, setShowConsent] = useState(false);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [generationStep, setGenerationStep] = useState(''); // e.g., 'cloning', 'generating'
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [voiceOption, setVoiceOption] = useState('clone'); // 'clone' or 'full'

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!token) return;
      try {
        const response = await fetch(`/api/session/${token}`);
        const result = await response.json();
        if (result.success && result.data) {
          if (result.data.selfie_public_url) setSelfie(result.data.selfie_public_url);
          if (result.data.voice_public_url) setVoice(result.data.voice_public_url);
          if (result.data.selected_script) setScript(result.data.selected_script);
          console.log("Fetched existing assets for session.", result.data.selected_script);
        }
      } catch (error) {
        console.error("Failed to fetch existing assets:", error);
      }1
    };
    fetchAssets();
  }, [token]);

  const mockTemplates = [
    { id: 'template1', name: 'Modern Office', imageUrl: '/assets/modern_office.png' },
    { id: 'template2', name: 'Casual Cafe', imageUrl: '/assets/casual_cafe.png' },
    { id: 'template3', name: 'Abstract Gradient', imageUrl: '/assets/abstract_Gradient.png' },
    { id: 'template4', name: 'Bookshelf', imageUrl: '/assets/licensed-image.png' },
  ];

  const uploadSelfie = async (file: File) => {
    if (!token) {
      alert("Session token is missing.");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('file', file);

      const response = await fetch('/api/selfie/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSelfie(result.publicUrl);
      } else {
        alert(`Upload failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Failed to upload selfie:", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadVoice = async (file: File) => {
    if (!token) {
      alert("Session token is missing.");
      return;
    }
    setIsUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('file', file);

      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setVoice(result.publicUrl);
      } else {
        alert(`Voice upload failed: ${result.message}`);
        setVoice(null);
      }
    } catch (error) {
      console.error("Failed to upload voice:", error);
      alert("An error occurred during voice upload.");
      setVoice(null);
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      uploadSelfie(event.target.files[0]);
    }
  };

  const handleSelfieTaken = useCallback((file: File) => {
    setSelfieMode(false);
    uploadSelfie(file);
  }, [token]);

  const handleCancelSelfie = useCallback(() => {
    setSelfieMode(false);
  }, []);

  const initMediaRecorder = useCallback(async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setVoice(null);
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
            setVoice(audioFile);
            uploadVoice(audioFile);
            stream.getTracks().forEach(track => track.stop());
        };
        return true;
    } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Microphone access is required to record your voice.");
        return false;
    }
  }, [voiceOption, token]);

  const handleRecordClick = async () => {
    if (isRecording) {
        stopRecording();
    } else {
        const ready = await initMediaRecorder();
        if (!ready) return;

        if (voiceOption === 'full') {
            if (!script) {
                alert("Script not loaded yet. Please wait a moment.");
                return;
            }
            setShowTeleprompter(true);
        } else {
            startRecording();
        }
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
        mediaRecorderRef.current.start();
        setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleGenerateClick = () => {
    if (!selfie || !voice) {
      alert("Please provide both a selfie and a voice recording.");
      return;
    }
    if (voiceOption === 'clone') {
      setShowConsent(true);
    } else {
      handleConsentAccept();
    }
  };

  const handleConsentAccept = async () => {
    setShowConsent(false);
    try {
      if (voiceOption === 'clone') {
        const consentResponse = await fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!consentResponse.ok) throw new Error('Failed to record consent.');
      }
      
      const audioGenerationEndpoint = voiceOption === 'full' ? '/api/voice/clean-and-tts' : '/api/voice/clone-and-tts';

      setGenerationStep('cloning');
      const audioRes = await fetch(audioGenerationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const audioResult = await audioRes.json();
      if (!audioRes.ok || !audioResult.success) {
        throw new Error(audioResult.details || 'Failed to generate audio.');
      }

      setGenerationStep('generating');
      const heygenResponse = await fetch('/api/talking-video-heygen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const heygenResult = await heygenResponse.json();
      if (!heygenResponse.ok || !heygenResult.success) {
        throw new Error(heygenResult.message || 'Failed to generate video with HeyGen.');
      }

      router.push(`/preview?token=${token}&type=avatar&jobId=${heygenResult.id}`);

    } catch (error) {
      console.error(error);
      alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
      setGenerationStep('');
    }
  };

  const isProcessing = generationStep !== '';

  if (isProcessing) {
    let message = 'Generating your AI Avatar video...';
    if (generationStep === 'cloning') {
        message = 'Processing your voice and generating script audio...';
    }
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">{message}</h2>
        <p className="text-gray-500">This can take a few minutes. Please don't close this page.</p>
      </div>
    );
  }

  const selfieSrc = typeof selfie === 'string' ? selfie : selfie ? URL.createObjectURL(selfie) : null;
  const voiceSrc = typeof voice === 'string' ? voice : voice ? URL.createObjectURL(voice) : null;

  return (
    <>
      {showConsent && <ConsentModal onAccept={handleConsentAccept} onDecline={() => setShowConsent(false)} />}
      {selfieMode && <SelfieCamera onSelfieTaken={handleSelfieTaken} onCancel={handleCancelSelfie} />}
      {showTeleprompter && (
        <Teleprompter 
            script={script}
            onStart={startRecording}
            onStop={() => { stopRecording(); setShowTeleprompter(false); }}
            onCancel={() => setShowTeleprompter(false)}
        />
      )}
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Create an AI Avatar Video</h1>
            <p className="text-lg text-gray-600 mt-2">Provide your assets and choose a style. We'll do the rest.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">1. Your Assets</h3>
              
              {/* Selfie Section */}
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Your Selfie</h4>
              <div>
                <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4 bg-gray-50 relative">
                  {isUploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg z-10">
                      <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
                    </div>
                  )}
                  {selfieSrc ? (
                    <img src={selfieSrc} alt="Selfie preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <p className="text-gray-500">Image Preview</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-full cursor-pointer text-center px-6 py-3 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 font-semibold">
                    Upload File
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                  </label>
                  <button onClick={() => setSelfieMode(true)} className="w-full px-6 py-3 bg-gray-800 text-white rounded-md font-semibold" disabled={isUploading}>Take Selfie</button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">For best results, use a clear, front-facing photo.</p>
              </div>

              {/* Voice Recording Section */}
              <h4 className="text-lg font-semibold text-gray-800 mt-8 mb-4 border-t pt-6">Your Voice</h4>
              
              <div className="flex items-center justify-center mb-4 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setVoiceOption('clone')} className={`w-full text-center px-4 py-2 rounded-md font-semibold transition-colors ${voiceOption === 'clone' ? 'bg-white text-indigo-700 shadow' : 'bg-transparent text-gray-500'}`}>
                  Voice Clone
                </button>
                <button onClick={() => setVoiceOption('full')} className={`w-full text-center px-4 py-2 rounded-md font-semibold transition-colors ${voiceOption === 'full' ? 'bg-white text-indigo-700 shadow' : 'bg-transparent text-gray-500'}`}>
                  Full Audio Recording
                </button>
              </div>

              <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-4 bg-gray-50 min-h-[80px]">
                {isUploadingVoice ? (
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-10 w-10"></div>
                ) : voiceSrc ? (
                    <audio src={voiceSrc} controls className="w-full" />
                ) : (
                    <p className="text-gray-500 text-center">{isRecording ? 'Recording in progress...' : 'Click "Record" to start.'}</p>
                )}
              </div>
              <button 
                  onClick={handleRecordClick} 
                  className={`w-full px-6 py-3 text-white font-semibold rounded-md transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                  disabled={isUploading || isUploadingVoice}
              >
                  {isRecording ? 'Stop Recording' : 'Record Voice'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {voiceOption === 'clone' 
                  ? 'Record a few seconds of your voice for cloning.' 
                  : "Record the entire script. We'll clean up any mistakes."}
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">2. Choose a Style</h3>
              <div className="grid grid-cols-2 gap-4">
                {mockTemplates.map(template => (
                  <TemplateTile 
                    key={template.id} 
                    name={template.name} 
                    imageUrl={template.imageUrl}
                    selected={selectedTemplate === template.id} 
                    onClick={() => setSelectedTemplate(template.id)} />
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <button onClick={handleGenerateClick} disabled={!selfie || !voice || isUploading || isUploadingVoice} className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
              Generate Video
            </button>
          </div>
           <div className="text-center mt-6">
                <Link href={{ pathname: '/recording', query: { token } }} className="text-gray-600 hover:text-indigo-600 font-semibold">
                    &larr; Go back to recording options
                </Link>
            </div>
        </div>
      </div>
    </>
  );
}