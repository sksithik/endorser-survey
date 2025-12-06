import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { Question } from '@/lib/questions';
import OpenAI from 'openai';

// Initialize the OpenAI client.
// IMPORTANT: This requires the OPENAI_API_KEY environment variable to be set.
// You can get a key from https://platform.openai.com/api-keys
// Add it to a .env.local file in your project root:
// OPENAI_API_KEY="your-secret-key-here"
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Performs sentiment analysis using the OpenAI GPT-4 model.
 * @param prompt - A string containing the questions and answers.
 * @returns A sentiment score between 0 and 1.
 */
const getSentimentFromAI = async (prompt: string): Promise<number> => {
  console.log("--- Calling OpenAI API for sentiment analysis ---");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125", // Or another suitable model
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a sentiment analysis expert. Analyze the following user feedback from a survey. Provide a sentiment score from 0.0 (extremely negative) to 1.0 (extremely positive). Your response must be a JSON object with a single key "sentimentScore". For example: {"sentimentScore": 0.75}`
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      temperature: 0.1,
      max_tokens: 50,
    });

    const result = response.choices[0].message?.content;
    if (!result) {
      throw new Error("OpenAI response was empty.");
    }

    console.log("--- OpenAI Raw Response ---");
    console.log(result);
    console.log("--------------------------");

    const parsedResult = JSON.parse(result);
    const score = parsedResult.sentimentScore;

    if (typeof score !== 'number' || score < 0 || score > 1) {
      throw new Error("Invalid sentiment score format from OpenAI.");
    }

    console.log(`OpenAI returned sentiment score: ${score}`);
    return score;

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    // Fallback to a neutral score in case of AI failure
    return 0.5;
  }
};

const getSentimentScore = async (questions: Question[], answers: Record<string, string>): Promise<number> => {
  // Build a prompt for the AI
  let prompt = "Analyze the sentiment of the following user feedback:\n\n";

  questions.forEach(question => {
    const answer = answers[question.id] || "No answer provided.";
    prompt += `Question: ${question.text}\nAnswer: ${answer}\n\n`;
  });

  // Get the sentiment score from the real AI
  const sentimentScore = await getSentimentFromAI(prompt);
  return sentimentScore;
};

export async function POST(request: Request) {
  const { token, answers } = await request.json();

  if (!token || !answers) {
    return NextResponse.json({ success: false, message: 'Token and answers are required.' }, { status: 400 });
  }

  // 1. Fetch the session from Supabase to get the dynamic questions and user_id
  const { data: sessionData, error: sessionError } = await supabase
    .from('endorser_invite_sessions')
    .select('questions, user_id') // Also fetch user_id for rewards
    .eq('id', token)
    .single();

  if (sessionError || !sessionData) {
    console.error('Supabase survey session fetch error:', sessionError);
    return NextResponse.json({ success: false, message: 'Invalid session token.' }, { status: 401 });
  }

  const questions = Array.isArray(sessionData.questions) ? sessionData.questions : [];
  const userId = sessionData.user_id;

  if (questions.length === 0) {
    return NextResponse.json({ success: false, message: 'No questions found for this survey session.' }, { status: 400 });
  }

  console.log(`Survey completed with token: ${token}`);
  console.log('Answers:', answers);

  // 2. Get sentiment score using the AI-based method with dynamic questions
  const sentimentScore = await getSentimentScore(questions, answers);

  let journey: 'positive' | 'neutral' | 'negative';
  let redirectPath: string;

  if (sentimentScore >= 0.7) {
    journey = 'positive';
    redirectPath = `/positive-feedback?token=${token}`; // Redirect to the new thank you page

    // Award points for positive feedback
    if (userId) {
      const { error: rewardError } = await supabase.from('reward_events').insert({
        user_id: userId,
        action: 'survey_positive',
        points: 50,
        source: 'auto',
        metadata: { sentimentScore },
      });

      if (rewardError) {
        console.error("Error creating reward event:", rewardError);
        // Don't block the user flow, just log the error
      } else {
        console.log(`Awarded 50 points to user ${userId} for positive survey.`);
        // In a real app, you would also wrap this in a transaction
        // to update the user's total_points in the 'endorser_users' table.
      }
    } else {
      console.warn("No user_id found for this session, cannot award points.");
    }

  } else if (sentimentScore >= 0.4) {
    journey = 'neutral';
    redirectPath = `/neutral-feedback?token=${token}`; // Quiet Satisfied
  } else {
    journey = 'negative';
    redirectPath = `/negative-feedback?token=${token}`; // Recovery Mode
  }

  console.log(`Final Sentiment Score: ${sentimentScore.toFixed(2)}, Journey: ${journey}`);

  // 3. Optionally, save the sentiment score and journey to the database
  // await supabase.from('endorser_responses').update({ derived: { sentimentScore, journey } }).eq('survey_id', token);

  return NextResponse.json({
    success: true,
    message: 'Survey completed.',
    journey,
    redirectPath,
  });
}
