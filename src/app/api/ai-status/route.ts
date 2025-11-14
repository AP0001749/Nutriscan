import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic-client';

// Runtime: server-only diagnostics for AI provider (Claude)
export async function GET() {
  const present = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  };

  const diagnostics: Record<string, unknown> = { present };

  // Only attempt a live generation from the server-side key
  if (present.ANTHROPIC_API_KEY) {
    try {
      const raw = await callClaude('Say OK in one word.', { maxTokens: 16, temperature: 0, retries: 1 });
      diagnostics.generation = { ok: true };
      diagnostics.generationSnippet = String(raw).slice(0, 512);
    } catch (err) {
      diagnostics.generationError = String(err);
    }
  }

  const safe = {
    claude: {
      apiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
    },
    diagnostics
  };

  return NextResponse.json(safe);
}
