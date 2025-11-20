import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeRequestWithImage(base64: string) {
  const buffer = Buffer.from(base64, 'base64');
  const fileLike = {
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  } as unknown as File;

  const form = {
    get: (k: string) => (k === 'image' ? fileLike : null),
  } as unknown as FormData;

  return { formData: async () => form } as unknown as Request;
}

describe('scan-food fusion engine integration (mocked externals)', () => {
  beforeEach(() => {
    process.env.CLARIFAI_API_KEY = 'clarifai-test';
    process.env.USDA_API_KEY = 'usda-test';
    process.env.GEMINI_API_KEY = 'gemini-test';
    process.env.GEMINI_MODEL = 'gemini-flash';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('synthesizes multi-concept into dish and fetches dish-level nutrition', async () => {
    const clarifai = { outputs: [{ data: { concepts: [
      { name: 'pasta', value: 0.95 },
      { name: 'meat', value: 0.88 },
      { name: 'sauce', value: 0.86 },
      { name: 'cheese', value: 0.80 },
    ] } }] };

    const usdaSearch = { foods: [{ fdcId: 999, description: 'Spaghetti Bolognese' }] };
    const usdaDetails = { description: 'Spaghetti Bolognese', servingSize: 200, servingSizeUnit: 'g', foodNutrients: [
      { nutrient: { id: 1008 }, amount: 520 }, // calories
      { nutrient: { id: 1003 }, amount: 22 },  // protein
      { nutrient: { id: 1004 }, amount: 18 },  // fat
      { nutrient: { id: 1005 }, amount: 62 },  // carbs
      { nutrient: { id: 1079 }, amount: 5 },   // fiber
      { nutrient: { id: 2000 }, amount: 10 },  // sugars
      { nutrient: { id: 1093 }, amount: 800 }, // sodium
    ] };

  const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('clarifai.com')) {
        return { ok: true, json: async () => clarifai } as unknown as Response;
      }
      if (typeof url === 'string' && url.includes('/foods/search')) {
        const q = new URL(url).searchParams.get('query') || '';
        expect(q.toLowerCase()).toContain('spaghetti');
        return { ok: true, json: async () => usdaSearch } as unknown as Response;
      }
      if (typeof url === 'string' && url.includes('/food/999')) {
        return { ok: true, json: async () => usdaDetails } as unknown as Response;
      }
      // Gemini calls
      if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
        return { ok: true, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Spaghetti Bolognese' }] } }] }) } as unknown as Response;
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

    await vi.doMock('@/lib/food-data', async () => ({ foodDatabase: [] }));

    // Mock gemini-client to avoid path alias resolution and network
    let gemCalls = 0;
    await vi.doMock('@/lib/gemini-client', async () => ({
      default: async () => {
        gemCalls += 1;
        if (gemCalls === 1) return 'Spaghetti Bolognese'; // Fusion synthesis
        return '{"description":"ok","healthScore":65,"suggestions":["balance portion","add greens"]}'; // Analysis JSON
      }
    }));

  // Mock dish-synonyms to avoid alias resolution issues in Vitest
  await vi.doMock('@/lib/dish-synonyms', async () => ({ normalizeDishName: (s: string) => s }));

  const route = await import('../src/app/api/scan-food/route');
  const req = makeRequestWithImage(Buffer.from([0x01]).toString('base64')) as unknown;
  const res = await (route as unknown as { POST: (r: unknown) => Promise<Response> }).POST(req);
    const json = await res.json();

    expect(json.foodItems[0].name).toContain('Spaghetti');
    expect(json.nutritionData && json.nutritionData.length).toBeGreaterThan(0);
    expect(json.aiAnalysis).toBeDefined();
  });
});
