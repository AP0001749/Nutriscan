import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import callGeminiWithRetry from '../src/lib/gemini-client';

describe('gemini-client', () => {
  const OLD_KEY = process.env.GEMINI_API_KEY;
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-flash';
  });
  afterEach(() => {
    process.env.GEMINI_API_KEY = OLD_KEY;
    vi.restoreAllMocks();
  });

  it('returns candidate content when response JSON contains candidates', async () => {
    const fake = { candidates: [{ content: 'OK' }] };
    const mock = vi.fn(async () => ({ ok: true, text: async () => JSON.stringify(fake) } as unknown as Response));
    vi.stubGlobal('fetch', mock);

    const out = await callGeminiWithRetry('hello', { retries: 0 });
    expect(out).toBe('OK');
    expect(mock).toHaveBeenCalled();
  });

  it('returns raw text when response is non-JSON', async () => {
    const mock = vi.fn(async () => ({ ok: true, text: async () => 'plain text response' } as unknown as Response));
    vi.stubGlobal('fetch', mock);

    const out = await callGeminiWithRetry('hello', { retries: 0 });
    expect(out).toBe('plain text response');
  });

  it('retries on failure and eventually throws', async () => {
    const mock = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' } as unknown as Response));
    vi.stubGlobal('fetch', mock);

    await expect(callGeminiWithRetry('hello', { retries: 1 })).rejects.toBeDefined();
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
