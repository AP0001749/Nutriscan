import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callClaude } from '../src/lib/anthropic-client';

describe('anthropic client', () => {
  const OLD_API = process.env.ANTHROPIC_API_KEY;
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = OLD_API;
    vi.restoreAllMocks();
  });

  it('calls Anthropic and returns completion text', async () => {
    const fakeResponse = { completion: 'hello from claude' };
  const mockFetch = vi.fn(async () => ({ ok: true, json: async () => fakeResponse } as unknown as Response));
  vi.stubGlobal('fetch', mockFetch);
    const out = await callClaude('hi');
    expect(out).toBe('hello from claude');
  });

  it('throws when API returns error', async () => {
  const mockFetchErr = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' } as unknown as Response));
  vi.stubGlobal('fetch', mockFetchErr);
    await expect(callClaude('hi')).rejects.toThrow();
  });
});
