// app/api/script/generate/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const friendlyScripts = [
  { id: 'v1', length: '30s', content: "Honestly, working with Innovate Inc. was just awesome! The whole team was super friendly and they totally got what I needed. I'd tell anyone to check them out!" },
  { id: 'v2', length: '60s', content: "I had such a great experience with Innovate Inc. from beginning to end. Everyone was so easy to talk to, and you can tell they really care about making you happy. Our workflow is so much smoother now, it's been a huge help. Definitely a great choice!" },
  { id: 'v3', length: '90s', content: "I can't recommend Innovate Inc. enough! The whole vibe was just so positive and collaborative. They really listened to what we were looking for and came up with a solution that has been a game-changer for our business. If you want to work with a team that's both talented and genuinely great to be around, these are your people." }
];

const professionalScripts = [
  { id: 'v1', length: '30s', content: "I was thoroughly impressed with the quality of service from Innovate Inc. The team was highly professional, and the results exceeded my expectations. I would not hesitate to recommend them." },
  { id: 'v2', length: '60s', content: "From start to finish, our engagement with Innovate Inc. was exemplary. Their attention to detail and commitment to client satisfaction are second to none. For any organization seeking a partner that delivers results, look no further. The improvement in our operational efficiency has been significant." },
  { id: 'v3', length: '90s', content: "I can't speak highly enough of Innovate Inc. The entire process, from the initial consultation to the final delivery, was seamless. They provided expert guidance and delivered a solution that has transformed our business operations. The level of professionalism and the quality of their work is simply outstanding. I wholeheartedly recommend them." }
];

const enthusiasticScripts = [
  { id: 'v1', length: '30s', content: "Wow! Innovate Inc. completely blew me away! The energy of the team was incredible and the final result was even better than I imagined. You have to give them a try!" },
  { id: 'v2', length: '60s', content: "My experience with Innovate Inc. was absolutely fantastic! Their passion is contagious, and they are 100% committed to getting amazing results. Our workflow has never been better, and it's all thanks to their incredible work. I'm so glad we chose them!" },
  { id: 'v3', length: '90s', content: "I am absolutely thrilled with the work Innovate Inc. delivered! From the first meeting, their enthusiasm was infectious. They didn't just meet our needs; they delivered a solution that has revolutionized how we operate. The quality, the energy, the results—everything was top-notch. I can't wait to work with them again!" }
];

const getScriptsByTone = (tone?: string) => {
  switch (tone) {
    case 'Friendly':
      return friendlyScripts;
    case 'Professional':
      return professionalScripts;
    case 'Enthusiastic':
      return enthusiasticScripts;
    default:
      return professionalScripts; // Default to Professional
  }
};

export async function POST(request: Request) {
  const { token, tone } = await request.json();

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token is required.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('endorser_invite_sessions')
      .select('survey')
      .eq('id', token)
      .single();

    if (error || !data) {
      console.error('Supabase script generation error:', error);
      return NextResponse.json({ success: false, message: 'Invalid session token.' }, { status: 401 });
    }

    const surveyAnswers = data.survey;
    console.log(`Generating script based on survey answers with tone: ${tone || 'default'}`, surveyAnswers);

    const scripts = getScriptsByTone(tone);

    return NextResponse.json({ success: true, scripts });

  } catch (e) {
    console.error('Unexpected error generating script:', e);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
