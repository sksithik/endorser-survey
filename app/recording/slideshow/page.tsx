// app/recording/slideshow/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

// Re-using the consent modal from the Avatar page concept
const ConsentModal = ({ onAccept, onDecline }: { onAccept: () => void, onDecline: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">Voice Cloning Consent</h2>
            <p className="text-gray-600 mb-6">
                To create a Slideshow video, we need to generate a voice-over for your script. This requires your consent to use our voice generation technology.
            </p>
            <p className="text-sm text-gray-500 mb-6">
                By clicking "I Accept", you consent to the use of your voice for the purpose of creating this video testimonial.
            </p>
            <div className="flex justify-end gap-4">
                <button onClick={onDecline} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100">Decline</button>
                <button onClick={onAccept} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">I Accept</button>
            </div>
        </div>
    </div>
);

export default function SlideshowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [selfie, setSelfie] = useState<File | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelfie(event.target.files[0]);
    }
  };

  const handleGenerateClick = () => {
    if (!selfie) {
      alert("Please upload a selfie first.");
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

      if (!consentResponse.ok) {
        throw new Error('Failed to record consent.');
      }

      console.log("Consent recorded. Starting slideshow generation...");

      // Simulate API call for slideshow generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log("Slideshow generation complete.");
      router.push(`/preview?token=${token}&type=slideshow`);

    } catch (error) {
      console.error(error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
  };

  if (isGenerating) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center text-center p-4">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700">Generating your Slideshow video...</h2>
        <p className="text-gray-500">This may take a moment.</p>
      </div>
    );
  }

  return (
    <>
      {showConsent && <ConsentModal onAccept={handleConsentAccept} onDecline={handleConsentDecline} />}
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full">
          <header className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Create a Slideshow Video</h1>
            <p className="text-lg text-gray-600 mt-2">A simple, clean video with your photo and a voice-over.</p>
          </header>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Left: Upload */}
                <div>
                    <h3 className="text-xl font-semibold mb-4">1. Upload Your Selfie</h3>
                    <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                        {selfie ? (
                        <img src={URL.createObjectURL(selfie)} alt="Selfie preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                        <p className="text-gray-500">Image Preview</p>
                        )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                </div>
                {/* Right: Preview */}
                <div>
                    <h3 className="text-xl font-semibold mb-4">2. Style Preview</h3>
                    <div className="w-full aspect-square border border-gray-200 rounded-lg flex items-center justify-center bg-gray-100 p-4">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-500">Your Selfie</span>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-md">
                                <p className="text-sm text-gray-700">"The script will be spoken here with animated captions..."</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={handleGenerateClick}
              disabled={!selfie}
              className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Generate Slideshow
            </button>
          </div>
           <div className="text-center mt-6">
                <Link href={`/recording?token=${token}`} className="text-gray-600 hover:text-indigo-600 font-semibold">
                    &larr; Go back to recording options
                </Link>
            </div>
        </div>
      </div>
    </>
  );
}
