'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Star, CheckCircle, ArrowRight, ArrowLeft, Send } from 'lucide-react';
import { Database } from '@/lib/database.types';

// Define types based on what we passed from the server
type Props = {
    session: any;
    config: any;
    company: any;
};

export default function LandingWizard({ session, config, company }: Props) {
    const [step, setStep] = useState(1);

    const videoUrl = session.final_video_url || session.video_url;
    const review = session.ai_generated_review;
    // Fallback: If no company video is configured, use the session video or skip? 
    // The requirement implies there IS a company video. If not, maybe use a placeholder or check config.
    const companyVideoUrl = config?.hero?.videoSource || 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
    const primaryColor = company.color || '#3b82f6';

    const nextStep = () => setStep(s => Math.min(s + 1, 3));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const fadeIn = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
        transition: { duration: 0.3 }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gray-50 text-gray-900">
            {/* Background Decor */}
            <div className="absolute top-0 inset-x-0 h-full overflow-hidden -z-10 pointer-events-none opacity-30">
                <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full blur-3xl opacity-20" style={{ backgroundColor: primaryColor }} />
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-20" style={{ backgroundColor: primaryColor }} />
            </div>

            {/* Header / Brand */}
            {company && (
                <div className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        {company.logo && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={company.logo} alt={company.name} className="h-10 w-auto object-contain" />
                        )}
                        <div className="font-bold text-2xl tracking-tight" style={{ color: primaryColor }}>
                            {company.name || 'Company Name'}
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-4xl mt-20 md:mt-0">
                {/* Progress Indicator */}
                <div className="flex justify-center mb-8 gap-2">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-8' : 'w-2'}`}
                            style={{ backgroundColor: s === step ? primaryColor : '#d1d5db' }}
                        />
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 min-h-[600px] flex flex-col relative">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: Endorsement Video */}
                        {step === 1 && (
                            // @ts-ignore
                            <motion.div key="step1" {...fadeIn} className="flex-grow flex flex-col md:flex-row h-full">
                                <div className="md:w-1/2 bg-black flex items-center justify-center relative">
                                    {videoUrl ? (
                                        <video
                                            src={videoUrl}
                                            controls
                                            className="w-full h-full object-contain max-h-[600px]"
                                            poster={session.selfie_public_url}
                                        />
                                    ) : (
                                        <div className="text-white/50">Video not available</div>
                                    )}
                                </div>
                                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                                {session.survey?.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg leading-tight">{session.survey?.name || 'Happy Customer'}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Verified Customer
                                                </div>
                                            </div>
                                        </div>
                                        <blockquote className="text-xl font-medium text-gray-800 italic leading-relaxed relative">
                                            <span className="text-4xl text-gray-200 absolute -top-4 -left-2">"</span>
                                            {review || "This has been an amazing experience. I highly recommend them!"}
                                            <span className="text-4xl text-gray-200 absolute -bottom-8 -right-2">"</span>
                                        </blockquote>
                                    </div>

                                    <div className="mt-auto pt-8">
                                        <p className="text-sm text-gray-500 mb-4">See what {company.name} has to say...</p>
                                        <button
                                            onClick={nextStep}
                                            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Next: Message from {company.name} <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Company Video */}
                        {step === 2 && (
                            // @ts-ignore
                            <motion.div key="step2" {...fadeIn} className="flex-grow flex flex-col h-full">
                                <div className="relative h-[400px] md:h-full bg-black flex items-center justify-center">
                                    {/* Back Button */}
                                    <button
                                        onClick={prevStep}
                                        className="absolute top-4 left-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>

                                    {companyVideoUrl ? (
                                        <video
                                            src={companyVideoUrl}
                                            controls
                                            autoPlay
                                            className="w-full h-full object-contain max-h-[600px]"
                                        />
                                    ) : (
                                        <div className="text-center p-8">
                                            <h3 className="text-2xl font-bold text-white mb-2">Welcome to {company.name}</h3>
                                            <p className="text-gray-400">We are thrilled to have you here.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 bg-white border-t border-gray-100 text-center">
                                    <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
                                    <p className="text-gray-600 mb-6">Let's discuss how we can help you achieve similar results.</p>
                                    <button
                                        onClick={nextStep}
                                        className="px-8 py-3 rounded-xl font-bold text-white text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 inline-flex items-center gap-2"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        Contact Us <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Enquiry Form */}
                        {step === 3 && (
                            // @ts-ignore
                            <motion.div key="step3" {...fadeIn} className="flex-grow flex flex-col md:flex-row h-full">
                                <div className="md:w-1/3 bg-gray-50 p-8 flex flex-col justify-center border-r border-gray-100">
                                    <button onClick={prevStep} className="self-start mb-8 text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                                    <p className="text-gray-600 mb-8">Fill out the form and our team will get back to you within 24 hours.</p>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            <span>Free Consultation</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            <span>Customized Plan</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            <span>No Obligations</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-center">
                                    <form className="space-y-6 max-w-md mx-auto w-full">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all bg-gray-50 focus:bg-white"
                                                style={{ borderColor: 'transparent', boxShadow: `0 0 0 1px transparent` }}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                            <input
                                                type="email"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all bg-gray-50 focus:bg-white"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                                            <textarea
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all bg-gray-50 focus:bg-white h-32 resize-none"
                                                placeholder="Tell us about your needs..."
                                            />
                                        </div>
                                        <button
                                            type="button" // Change to submit when connected
                                            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Send Enquiry <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                <div className="mt-8 text-center text-sm text-gray-400">
                    &copy; {company.name}. All rights reserved.
                </div>
            </div>
        </div>
    );
}
