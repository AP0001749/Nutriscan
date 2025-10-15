import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callHuggingFace } from '../src/lib/huggingface-client';

describe('huggingface client', () => {
  const OLD = process.env.HUGGINGFACE_API_KEY;
  beforeEach(() => { process.env.HUGGINGFACE_API_KEY = 'test'; });
  afterEach(() => { process.env.HUGGINGFACE_API_KEY = OLD; vi.restoreAllMocks(); });

  it('parses array generated_text response', async () => {
    const fake = [{ generated_text: 'hf output' }];
    const mock = vi.fn(async () => ({ ok: true, json: async () => fake } as unknown as Response));
    vi.stubGlobal('fetch', mock);
    const out = await callHuggingFace('hello');
    expect(out).toBe('hf output');
  });

  it('throws on non-ok', async () => {
    const mock = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'err' } as unknown as Response));
    vi.stubGlobal('fetch', mock);
    await expect(callHuggingFace('hello')).rejects.toBeDefined();
  });
});
