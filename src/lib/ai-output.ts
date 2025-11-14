// Lightweight helper to extract and validate JSON returned by models
export type AIAnalysis = {
  description: string;
  healthScore: number;
  suggestions: string[];
};

function stripFences(text: string) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// Find the first balanced JSON object in the text and return it as string
export function extractFirstJson(text: unknown): string | null {
  const s = stripFences(typeof text === 'string' ? text : JSON.stringify(text ?? ''));
  const firstBrace = s.indexOf('{');
  if (firstBrace === -1) return null;
  let depth = 0;
  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      return s.slice(firstBrace, i + 1);
    }
  }
  return null;
}

export function parseModelJson<T = unknown>(raw: unknown): T {
  const jsonStr = extractFirstJson(raw);
  if (!jsonStr) throw new Error('No JSON object found in model output');
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error('Failed to parse extracted JSON: ' + String(err));
  }
}

export function validateAIAnalysis(obj: unknown): AIAnalysis {
  if (!obj || typeof obj !== 'object') throw new Error('AI analysis is not an object');
  const rec = obj as { [k: string]: unknown };
  if (typeof rec.description !== 'string') throw new Error('Missing or invalid description');
  if (typeof rec.healthScore !== 'number' || Number.isNaN(rec.healthScore)) throw new Error('Missing or invalid healthScore');
  if (!Array.isArray(rec.suggestions) || rec.suggestions.some((s) => typeof s !== 'string')) throw new Error('Missing or invalid suggestions');
  // clamp healthScore to 1-100
  const healthScore = Math.max(1, Math.min(100, Math.round(rec.healthScore as number)));
  return { description: rec.description as string, healthScore, suggestions: rec.suggestions as string[] };
}

// Best-effort normalization of non-standard model outputs
export function coerceAIAnalysis(obj: unknown): AIAnalysis {
  // If model returned plain string, treat it as description.
  if (typeof obj === 'string') {
    return { description: obj, healthScore: 60, suggestions: [] };
  }
  if (!obj || typeof obj !== 'object') {
    return { description: JSON.stringify(obj ?? ''), healthScore: 60, suggestions: [] };
  }
  const rec = obj as Record<string, unknown>;

  // 1) Handle legacy AI response shapes: candidates[0].content.parts[*].text
  try {
    const recObj = rec as Record<string, unknown>;
    const cands = Array.isArray(recObj.candidates) ? (recObj.candidates as Array<Record<string, unknown>>) : null;
    const firstCand = cands?.[0] as Record<string, unknown> | undefined;
    const content = (firstCand?.content ?? {}) as { parts?: Array<unknown> };
    const parts = content?.parts as Array<unknown> | undefined;
    if (Array.isArray(parts)) {
      let textFromParts: string | undefined;
      for (const p of parts) {
        if (p && typeof p === 'object' && 'text' in (p as Record<string, unknown>)) {
          const t = (p as Record<string, unknown>).text;
          if (typeof t === 'string') { textFromParts = t; break; }
        }
      }
      if (textFromParts) {
        const desc = textFromParts.length > 600 ? textFromParts.slice(0, 600) + '…' : textFromParts;
        return { description: desc, healthScore: 60, suggestions: [] };
      }
    }
    // If candidates exist but no parts text, create a friendly fallback based on finishReason
    if (cands && cands.length > 0) {
      const finishReason = (firstCand?.['finishReason'] as string | undefined) ?? (recObj['finishReason'] as string | undefined);
      const truncatedMsg = finishReason === 'MAX_TOKENS'
        ? 'AI response was truncated by the model (max tokens reached). Showing nutrition facts below; consider rescanning or trying again.'
        : 'AI returned a non-standard response. Showing nutrition facts below.';
      return { description: truncatedMsg, healthScore: 60, suggestions: [] };
    }
  } catch {}

  // 2) Deep text extraction: search nested objects/arrays for a plausible natural-language string
  try {
    const maxDepth = 4;
    const seen = new Set<unknown>();
    function isPlausibleText(s: string) {
      const trimmed = s.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false; // looks like JSON
      const alpha = /[a-zA-Z]/.test(trimmed);
      const space = /\s/.test(trimmed);
      return alpha && space && trimmed.length >= 20;
    }
    function findText(node: unknown, depth: number): string | null {
      if (depth > maxDepth || node == null) return null;
      if (typeof node === 'string') return isPlausibleText(node) ? node : null;
      if (typeof node !== 'object') return null;
      if (seen.has(node)) return null;
      seen.add(node);
      if (Array.isArray(node)) {
        for (const item of node) {
          const t = findText(item, depth + 1);
          if (t) return t;
        }
      } else {
        for (const key of Object.keys(node as Record<string, unknown>)) {
          const t = findText((node as Record<string, unknown>)[key], depth + 1);
          if (t) return t;
        }
      }
      return null;
    }
    const deep = findText(rec, 0);
    if (deep) {
      const desc = deep.length > 600 ? deep.slice(0, 600) + '…' : deep;
      return { description: desc, healthScore: 60, suggestions: [] };
    }
  } catch {}

  // Common alias fields
  const descKey = ['description', 'summary', 'analysis', 'message', 'text', 'content'].find(k => typeof rec[k] === 'string');
  const descriptionRaw = typeof descKey === 'string' ? String(rec[descKey]) : JSON.stringify(obj);
  const description = descriptionRaw.length > 600 ? descriptionRaw.slice(0, 600) + '…' : descriptionRaw;

  const scoreVal: unknown = rec['healthScore'] ?? rec['score'] ?? rec['health_score'] ?? rec['rating'];
  let healthScore = 60;
  if (typeof scoreVal === 'number' && !Number.isNaN(scoreVal)) {
    // If between 0-1, scale to 0-100
    healthScore = scoreVal <= 1 ? Math.round(scoreVal * 100) : Math.round(scoreVal);
  }
  healthScore = Math.max(1, Math.min(100, healthScore));

  const suggestionsRaw: unknown = rec['suggestions'] ?? rec['tips'] ?? rec['advice'] ?? rec['recommendations'];
  let suggestions: string[] = [];
  if (Array.isArray(suggestionsRaw)) {
    suggestions = suggestionsRaw
      .map((s) => {
        if (typeof s === 'string') return s;
        if (s && typeof s === 'object' && 'text' in (s as Record<string, unknown>)) {
          const t = (s as Record<string, unknown>).text;
          return typeof t === 'string' ? t : null;
        }
        return null;
      })
      .filter((s): s is string => Boolean(s));
  } else if (typeof suggestionsRaw === 'string') {
    suggestions = suggestionsRaw.split(/\n+|\r+|\.\s+/).map(s => s.trim()).filter(Boolean).slice(0, 5);
  }

  return { description, healthScore, suggestions };
}
