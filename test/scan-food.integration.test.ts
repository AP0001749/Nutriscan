import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Minimal mock of NextRequest used in our route file
function makeRequestWithImage(base64: string) {
  const buffer = Buffer.from(base64, 'base64');
  const fileLike = {
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  } as unknown as File;

  const form = {
    get: (k: string) => (k === 'image' ? fileLike : null),
  } as unknown as FormData;

  return {
    formData: async () => form,
  } as unknown as Request;
}

describe('scan-food integration (mocked externals)', () => {
  beforeEach(() => {
    // Provide fake keys so route doesn't bail early
    process.env.CLARIFAI_API_KEY = 'clarifai-test';
    process.env.USDA_API_KEY = 'usda-test';
    process.env.GEMINI_API_KEY = 'gemini-test';
    process.env.GEMINI_MODEL = 'gemini-flash';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns nutrition and aiAnalysis when vision and usda and gemini succeed', async () => {
    // Prepare USDA responses and Gemini generate
    const usdaSearch = { foods: [{ fdcId: 123, description: 'Apple' }] };
    const usdaDetails = { description: 'Apple', foodNutrients: [{ nutrient: { id: 1008 }, amount: 52 }] };

    // Mock fetch to handle Clarifai, USDA and Gemini
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('clarifai.com')) {
        // Return a clarifai-like structure with a high-confidence concept matching our foodDatabase
        const clarifai = { outputs: [{ data: { concepts: [{ name: 'Apple', value: 0.99 }] } }] };
        return { ok: true, json: async () => clarifai } as unknown as Response;
      }
      if (typeof url === 'string' && url.includes('/foods/search')) return { ok: true, json: async () => usdaSearch } as unknown as Response;
      if (typeof url === 'string' && url.includes('/food/123')) return { ok: true, json: async () => usdaDetails } as unknown as Response;
      // Fallback
      return { ok: true, text: async () => 'ok' } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

  // Mock modules using vitest's dynamic mock API before importing the route so alias imports are intercepted
  // Mock dish-synonyms to avoid alias resolution issues in Vitest
  await vi.doMock('@/lib/dish-synonyms', async () => ({ normalizeDishName: (s: string) => s }));
  // vision is mocked via the Clarifai fetch response above; no direct vision-client mock needed
    // Mock gemini-client to return a valid JSON string candidate
    await vi.doMock('@/lib/gemini-client', async () => ({ default: async () => '{"description":"ok","healthScore":85,"suggestions":["eat more vegetables"]}' }));

    // Mock ai-output helper so the route's imports resolve and parsing helpers are available
    await vi.doMock('@/lib/ai-output', async () => ({
      parseModelJson: (s: string) => {
        try { return JSON.parse(s); } catch { return null; }
      },
      validateAIAnalysis: (obj: unknown) => obj,
    }));

    // Mock health-data and food-data to supply minimal health calculations and food database
    await vi.doMock('@/lib/health-data', async () => ({
      getHealthData: () => ({ glycemicIndex: 50, inflammatoryScore: 0 }),
      calculateGlycemicLoad: (gi: number, carbs: number) => Math.round((gi * carbs) / 100),
    }));

    await vi.doMock('@/lib/food-data', async () => ({ foodDatabase: [{ name: 'Apple', ingredients: ['Apple'], keywords: ['apple'] }] }));

    // Import the route after mocks are in place
    const route = await import('../src/app/api/scan-food/route');
    // Use a small valid base64 payload (1 byte) to simulate an image file
    const req = makeRequestWithImage(Buffer.from([0x01]).toString('base64')) as unknown;
    const res = await (route as unknown as { POST: (r: unknown) => Promise<Response> }).POST(req);
    const json = await res.json();

    expect(json.nutritionData).toBeDefined();
    expect(json.aiAnalysis).toBeDefined();
    expect(json.warnings).toBeDefined();
  });
});
