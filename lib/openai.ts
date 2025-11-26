import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
    // Warn but don't crash build if key is missing during build time, 
    // but runtime usage will fail if not set.
    console.warn('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
});
