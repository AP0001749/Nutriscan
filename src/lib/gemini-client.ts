// Minimal Gemini (Google Generative) client wrapper.
// Reads GEMINI_API_KEY and GEMINI_MODEL from environment.
import { checkGeminiQuota, incrementGeminiQuota } from './quota-tracker';

export type GeminiOptions = { maxTokens?: number; temperature?: number; retries?: number; responseMimeType?: string };

async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function sanitizeUrl(u: string) {
  try { return new URL(u).toString().replace(/([?&])key=[^&]+/, '$1key=REDACTED'); } catch { return '(invalid url)'; }
}

function buildEndpoint(version: 'v1beta' | 'v1', model: string) {
  return `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;
}

export async function callGeminiWithRetry(prompt: string, opts: GeminiOptions = {}) {
  // Prefer an explicit server-side key. Fall back to legacy env or a public key
  // if present. For security, set `GEMINI_API_KEY_SERVER` on your server and
  // keep any public key in `NEXT_PUBLIC_GEMINI_API_KEY` (only usable from the
  // browser).
  const apiKey = process.env.GEMINI_API_KEY_SERVER || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI API key. Set GEMINI_API_KEY_SERVER for server-side usage.');

  // Normalize model name: accept either raw id like "gemini-2.5-flash" or full path.
  // Recommend a stable model by default. Override with GEMINI_MODEL if needed.
  const rawModel = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').replace(/^models\//, '');
  const aliasMap: Record<string, string> = {
    // Map very old shorthand to a modern default
    'gemini-flash': 'gemini-2.0-flash-exp',
    // Keep explicit 2.x names as-is
    'gemini-2.0-flash': 'gemini-2.0-flash-exp',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
    'gemini-2.5-flash': 'gemini-2.0-flash-exp',
    'gemini-2.0-pro': 'gemini-2.0-flash-exp',
    'gemini-2.5-pro': 'gemini-2.0-flash-exp',
    // Add stable 1.5 models as fallbacks
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
  };
  // Allow comma-separated list in GEMINI_MODEL (e.g., "gemini-1.5-flash,gemini-1.5-pro")
  const configuredModels = rawModel.split(',').map(s => s.trim()).filter(Boolean).map(m => aliasMap[m] || m);
  const model = configuredModels[0] || aliasMap[rawModel] || rawModel;
  // Enhanced fallback chain with stable models
  const defaultFallbackModels = [
    'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'
  ];

  const retries = opts.retries ?? 2;
  const temperature = opts.temperature ?? 0.2;
  const maxTokens = opts.maxTokens ?? (opts.maxTokens === 0 ? 0 : 400);

  // If GEMINI_API_URL is provided, allow full override (either full :generateContent URL or base URL).
  const rawOverride = process.env.GEMINI_API_URL;
  let baseUrl: string | null = null;
  if (rawOverride) {
    try {
      const maybe = new URL(rawOverride);
      baseUrl = maybe.toString().replace(/\/+$/, '');
    } catch {
      console.warn('GEMINI_API_URL is present but not a valid absolute URL — ignoring. Value:', rawOverride);
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Check quota before making API call
    const quotaCheck = checkGeminiQuota();
    if (!quotaCheck.allowed && attempt === 0) {
      console.warn(`⚠️ Gemini quota exceeded (${quotaCheck.remaining}/min remaining). Waiting...`);
      await sleep(2000); // Brief delay before retry
    }
    
    try {
      const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens }
      };
      if (opts.responseMimeType) {
        (body.generationConfig as Record<string, unknown>).responseMimeType = opts.responseMimeType;
      }

      // Determine auth style
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const looksLikeOAuth = typeof apiKey === 'string' && apiKey.startsWith('ya29.');

      // Build list of endpoint attempts (v1beta then v1; if 404 later, try alias model on v1beta then v1)
  const versions: Array<'v1beta' | 'v1'> = ['v1beta', 'v1'];
  const modelsToTry: string[] = [...(configuredModels.length ? configuredModels : [model, ...defaultFallbackModels])];

      let lastError: Error | null = null;
      for (const m of modelsToTry) {
        for (const ver of versions) {
          // Build URL considering optional GEMINI_API_URL override
          let url: string;
          if (!baseUrl) {
            url = buildEndpoint(ver, m);
          } else if (baseUrl.includes(':generateContent')) {
            url = baseUrl; // full path override
          } else {
            const base = baseUrl.replace(/\/+$/, '');
            const hasVersion = /\/v1(beta)?(\b|\/)/.test(base);
            if (hasVersion) {
              // Base already encodes version; append models path
              url = `${base}/models/${m}:generateContent`;
            } else {
              // Insert version segment explicitly
              url = `${base}/${ver}/models/${m}:generateContent`;
            }
          }
          let fetchUrl = url;
          if (looksLikeOAuth) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          } else {
            const sep = fetchUrl.includes('?') ? '&' : '?';
            fetchUrl = `${fetchUrl}${sep}key=${encodeURIComponent(apiKey)}`;
          }

          console.log('Calling Gemini endpoint:', sanitizeUrl(fetchUrl));
          const res = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(body) });
          const text = await res.text();
          if (!res.ok) {
            try { console.error('Gemini response error', { status: res.status, bodySnippet: text?.slice(0, 200) }); } catch {}
            // Only continue to next attempt on 404; for other statuses, break and throw
            if (res.status === 404) {
              lastError = new Error(`Gemini API error ${res.status}: ${text}`);
              continue;
            }
            throw new Error(`Gemini API error ${res.status}: ${text}`);
          }

          // Increment quota on successful call
          incrementGeminiQuota();

          // Parse JSON and extract text from multiple possible shapes
          try {
            type GenPart = { text?: string } | Record<string, unknown>;
            type GenCandidate = { content?: { parts?: GenPart[] } | string; output?: string; text?: string } & Record<string, unknown>;
            type GenResponse = { candidates?: GenCandidate[]; predictions?: GenCandidate[]; output?: Array<{ content?: string }>; } & Record<string, unknown>;
            const json = JSON.parse(text) as GenResponse;
            // Newest shape: candidates[0].content.parts[*].text
            const c0 = json?.candidates?.[0];
            const parts = (typeof c0?.content === 'object' && c0?.content) ? (c0.content as { parts?: GenPart[] }).parts : undefined;
            if (Array.isArray(parts)) {
              const firstText = parts.find((p) => typeof (p as { text?: string })?.text === 'string')?.text as string | undefined;
              if (firstText) return firstText;
            }
            // Older fallbacks
            const candidate = (json?.candidates && json.candidates[0]) || (json?.predictions && json.predictions[0]);
            if (candidate && (candidate.content || candidate.output || candidate.text)) {
              let val: unknown = undefined;
              if (typeof candidate.content === 'string') val = candidate.content;
              else if (candidate.output) val = candidate.output;
              else if (candidate.text) val = candidate.text;
              if (val !== undefined) return typeof val === 'string' ? val : JSON.stringify(val);
            }
            if (json?.output && Array.isArray(json.output) && json.output[0]?.content) {
              const c = json.output[0].content as unknown;
              return typeof c === 'string' ? c : JSON.stringify(c);
            }
            return JSON.stringify(json);
          } catch {
            return text;
          }
        }
      }
      // If we exhausted attempts with only 404s
      if (lastError) throw lastError;
      throw new Error('Gemini request failed with unknown error');

    } catch (err) {
      console.warn(`Gemini call attempt ${attempt + 1}/${retries + 1} failed:`, err);
      if (attempt < retries) await sleep(500 * (attempt + 1));
      else throw err as Error;
    }
  }
}

// Vision-enabled Gemini call with image + text prompt
export async function callGeminiVision(prompt: string, imageBase64: string, opts: GeminiOptions = {}) {
  const apiKey = process.env.GEMINI_API_KEY_SERVER || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI API key. Set GEMINI_API_KEY_SERVER for server-side usage.');

  const rawModel = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').replace(/^models\//, '');
  const aliasMap: Record<string, string> = {
    'gemini-flash': 'gemini-2.0-flash-exp',
    'gemini-2.0-flash': 'gemini-2.0-flash-exp',
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
    'gemini-2.5-flash': 'gemini-2.0-flash-exp',
    'gemini-1.5-flash': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
  };
  const model = aliasMap[rawModel] || rawModel;
  const retries = opts.retries ?? 2;
  const temperature = opts.temperature ?? 0.2;
  const maxTokens = opts.maxTokens ?? 50;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Check quota before making API call
    const quotaCheck = checkGeminiQuota();
    if (!quotaCheck.allowed && attempt === 0) {
      console.warn(`⚠️ Gemini quota exceeded (${quotaCheck.remaining}/min remaining). Waiting...`);
      await sleep(2000);
    }
    
    try {
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const body = {
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
          ]
        }],
        generationConfig: { temperature, maxOutputTokens: maxTokens }
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const looksLikeOAuth = typeof apiKey === 'string' && apiKey.startsWith('ya29.');
      
      const url = buildEndpoint('v1beta', model);
      let fetchUrl = url;
      if (looksLikeOAuth) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        fetchUrl = `${url}?key=${encodeURIComponent(apiKey)}`;
      }

      console.log('🖼️ Calling Gemini Vision endpoint:', sanitizeUrl(fetchUrl));
      const res = await fetch(fetchUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      const text = await res.text();
      
      if (!res.ok) {
        console.error('Gemini Vision error', { status: res.status, bodySnippet: text?.slice(0, 200) });
        throw new Error(`Gemini Vision API error ${res.status}: ${text}`);
      }

      // Increment quota on successful call
      incrementGeminiQuota();

      const json = JSON.parse(text);
      const c0 = json?.candidates?.[0];
      const parts = c0?.content?.parts;
      if (Array.isArray(parts)) {
        const firstText = parts.find(p => p?.text)?.text;
        if (firstText) return firstText;
      }
      return text;

    } catch (err) {
      console.warn(`Gemini Vision call attempt ${attempt + 1}/${retries + 1} failed:`, err);
      if (attempt < retries) await sleep(500 * (attempt + 1));
      else throw err as Error;
    }
  }
}

export default callGeminiWithRetry;
