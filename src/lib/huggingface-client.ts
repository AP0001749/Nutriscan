// Minimal Hugging Face Inference API client (fetch-based)
// Returns generated text for a given prompt.
export async function callHuggingFace(prompt: string, options?: { model?: string; max_new_tokens?: number; temperature?: number; }): Promise<string> {
  const API_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!API_KEY) throw new Error('Missing HUGGINGFACE_API_KEY');

  const model = options?.model || (process.env.HUGGINGFACE_MODEL || 'gpt2');
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;

  interface HfRequestBody {
    inputs: string;
    parameters?: { max_new_tokens?: number; temperature?: number };
  }
  const body: HfRequestBody = { inputs: prompt, parameters: { max_new_tokens: options?.max_new_tokens ?? 256, temperature: options?.temperature ?? 0.7 } };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HuggingFace API error: ${res.status} ${t}`);
  }

  const data = await res.json();
  // Response shapes vary; try a few common patterns
  if (typeof data === 'string') return data;
  if (Array.isArray(data) && data[0] && typeof data[0].generated_text === 'string') return data[0].generated_text;
  if (Array.isArray(data) && data[0] && typeof data[0].generated_text === 'undefined' && typeof data[0].text === 'string') return data[0].text;
  if (data.generated_text && typeof data.generated_text === 'string') return data.generated_text;
  // Fallback: try to stringify the body
  return JSON.stringify(data);
}

export async function callHuggingFaceWithRetry(prompt: string, options?: { model?: string; max_new_tokens?: number; temperature?: number; retries?: number; }): Promise<string> {
  const retries = options?.retries ?? 1;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callHuggingFace(prompt, options);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}
