"use server";
/**
 * Minimal Anthropic client for Claude Haiku 3 compatibility.
 * Exports a single helper `callClaude` which sends a prompt and returns model text.
 * Reads ANTHROPIC_API_KEY from process.env.ANTHROPIC_API_KEY
 */

type AnthropicRequest = {
  model: string;
  instructions: string;
  max_tokens_to_sample?: number;
  temperature?: number;
};

export async function callClaude(prompt: string, options?: { maxTokens?: number; temperature?: number; }): Promise<string> {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

  // Allow overriding the model via ANTHROPIC_MODEL env var; default to the free-tier-friendly Haiku 3
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-3';

  const body: AnthropicRequest = {
    model,
    instructions: prompt,
    max_tokens_to_sample: options?.maxTokens ?? 512,
    temperature: options?.temperature ?? 0.2,
  };

  const res = await fetch('https://api.anthropic.com/v1/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${text}`);
  }

  const data: { completion?: string; text?: string } = await res.json();
  // Anthropic returns completions in `completion` or `completion` field depending on endpoint version.
  // For the /v1/complete endpoint the text is in `completion`.
  return data.completion ?? data.text ?? '';
}

export async function callClaudeWithRetry(prompt: string, options?: { maxTokens?: number; temperature?: number; retries?: number; }): Promise<string> {
  const retries: number = options?.retries ?? 2;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callClaude(prompt, options);
    } catch (err) {
      lastErr = err;
      const backoff = 200 * Math.pow(2, attempt);
      console.warn(`Anthropic call failed (attempt ${attempt + 1}/${retries + 1}):`, err);
      if (attempt < retries) await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}
