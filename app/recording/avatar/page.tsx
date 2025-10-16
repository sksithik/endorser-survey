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


// --- Main Page Component ---

export default function AvatarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [selfie, setSelfie] = useState<File | string | null>(null);
  const [selfieMode, setSelfieMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [showConsent, setShowConsent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchSelfie = async () => {
      if (!token) return;
      try {
        const response = await fetch(`/api/session/${token}`);
        const result = await response.json();
        if (result.success && result.data?.selfie_public_url) {
          setSelfie(result.data.selfie_public_url);
        }
      } catch (error) {
        console.error("Failed to fetch existing selfie:", error);
      }
    };
    fetchSelfie();
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

  const handleGenerateClick = () => {
    if (!selfie) {
      alert("Please upload or take a selfie first.");
      return;
    }
    setShowConsent(true);
  };

  const handleConsentAccept = async () => {
    setShowConsent(false);
    setIsGenerating(true);
    try {
      const consentResponse = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!consentResponse.ok) throw new Error('Failed to record consent.');
      
      console.log("Consent recorded. Starting video generation...");
      await new Promise(resolve => setTimeout(resolve, 4000));
      console.log("Video generation complete.");
      router.push(`/preview?token=${token}&type=avatar`);
    } catch (error) {
      console.error(error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Generating your AI Avatar video...</h2>
        <p className="text-gray-500">This can take a few minutes. Please don't close this page.</p>
      </div>
    );
  }

  const selfieSrc = typeof selfie === 'string' ? selfie : selfie ? URL.createObjectURL(selfie) : null;

  return (
    <>
      {showConsent && <ConsentModal onAccept={handleConsentAccept} onDecline={() => setShowConsent(false)} />}
      {selfieMode && <SelfieCamera onSelfieTaken={handleSelfieTaken} onCancel={handleCancelSelfie} />}
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Create an AI Avatar Video</h1>
            <p className="text-lg text-gray-600 mt-2">Provide a selfie and choose a style. We'll do the rest.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">1. Provide Your Selfie</h3>
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
            <button onClick={handleGenerateClick} disabled={!selfie || isUploading} className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
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