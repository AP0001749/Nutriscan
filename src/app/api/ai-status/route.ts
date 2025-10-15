import { NextResponse } from 'next/server';
import callGeminiWithRetry from '@/lib/gemini-client';

// Runtime: server-only diagnostics for AI provider (Gemini)
export async function GET() {
  const present = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'not-set',
    GEMINI_API_URL: !!process.env.GEMINI_API_URL,
  };

  const diagnostics: Record<string, unknown> = { present };

  if (present.GEMINI_API_KEY) {
    try {
      const raw = await callGeminiWithRetry('Say OK in one word.', { maxTokens: 16, temperature: 0, retries: 1 });
      diagnostics.generation = { ok: true };
      diagnostics.generationSnippet = String(raw).slice(0, 512);
    } catch (err) {
      diagnostics.generationError = String(err);
    }
  }

  const safe = {
    gemini: {
      keyPresent: !!process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? 'not-set'
    },
    diagnostics
  };

  return NextResponse.json(safe);
}
