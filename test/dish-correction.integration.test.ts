import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeRequestWithImage(base64: string) {
  const buffer = Buffer.from(base64, 'base64');
  const fileLike = { arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) } as unknown as File;
  const form = { get: (k: string) => (k === 'image' ? fileLike : null) } as unknown as FormData;
  return { formData: async () => form } as unknown as Request;
}

describe('dish heuristic corrections', () => {
  beforeEach(() => {
    process.env.CLARIFAI_API_KEY = 'clarifai-test';
    process.env.USDA_API_KEY = 'usda-test';
    process.env.GEMINI_API_KEY = 'gemini-test';
    process.env.GEMINI_MODEL = 'gemini-flash';
  });
  afterEach(() => vi.restoreAllMocks());

  it('corrects sandwich to Burrito when tortilla+rice+beans+cheese concepts present', async () => {
    const clarifai = { outputs: [{ data: { concepts: [
      { name: 'tortilla', value: 0.96 },
      { name: 'rice', value: 0.90 },
      { name: 'beans', value: 0.88 },
      { name: 'cheese', value: 0.86 },
      { name: 'salsa', value: 0.82 },
    ] } }] };

    const usdaSearch = { foods: [{ fdcId: 321, description: 'Burrito' }] };
    const usdaDetails = { description: 'Burrito', servingSize: 180, servingSizeUnit: 'g', foodNutrients: [
      { nutrient: { id: 1008 }, amount: 480 },
      { nutrient: { id: 1003 }, amount: 20 },
      { nutrient: { id: 1004 }, amount: 16 },
      { nutrient: { id: 1005 }, amount: 55 },
      { nutrient: { id: 1093 }, amount: 900 },
    ] };

  const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('clarifai.com')) return { ok: true, json: async () => clarifai } as unknown as Response;
      if (typeof url === 'string' && url.includes('/foods/search')) return { ok: true, json: async () => usdaSearch } as unknown as Response;
      if (typeof url === 'string' && url.includes('/food/321')) return { ok: true, json: async () => usdaDetails } as unknown as Response;
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        // Force a wrong fusion name to simulate the bug
        return { ok: true, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Sandwich' }] } }] }) } as unknown as Response;
      }
      return { ok: true, text: async () => 'ok' } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    await vi.doMock('@/lib/ai-output', async () => ({
      parseModelJson: (s: string) => { try { return JSON.parse(s); } catch { return null; } },
      validateAIAnalysis: (obj: unknown) => obj,
      coerceAIAnalysis: () => ({ description: 'ok', healthScore: 60, suggestions: ['tip1','tip2'] })
    }));

    await vi.doMock('@/lib/health-data', async () => ({
      getHealthData: () => ({ glycemicIndex: 55, inflammatoryScore: 0 }),
      calculateGlycemicLoad: (gi: number, carbs: number) => Math.round((gi * carbs) / 100),
    }));

    // Mock Gemini client to avoid alias resolution
    await vi.doMock('@/lib/gemini-client', async () => ({
      default: async () => 'Sandwich'
    }));

    await vi.doMock('@/lib/dish-synonyms', async () => ({ normalizeDishName: (s: string) => s }));
  await vi.doMock('@/lib/food-data', async () => ({ foodDatabase: [] }));

    const route = await import('../src/app/api/scan-food/route');
    const req = makeRequestWithImage(Buffer.from([0x01]).toString('base64')) as unknown;
    const res = await (route as unknown as { POST: (r: unknown) => Promise<Response> }).POST(req);
    const json = await res.json();

    expect(json.foodItems[0].name).toContain('Burrito');
  });
});
