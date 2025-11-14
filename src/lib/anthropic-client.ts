/**
 * Praetorian-Grade Anthropic (Claude) Client — v1.0 "Sovereign Execution"
 * Architecturally pure, ruthlessly simple, built for maximum accuracy and reliability.
 * 
 * Migration rationale: Gemini API demonstrated catastrophic deployment unreliability.
 * Claude offers superior reasoning, simpler authentication, and proven stability.
 */

import { checkClaudeQuota, incrementClaudeQuota } from './quota-tracker';

// --- TYPE DEFINITIONS ---
export type ClaudeOptions = {
  maxTokens?: number;
  temperature?: number;
  retries?: number;
  model?: string; // claude-3-haiku-20240307 (fast), claude-3-5-sonnet-20241022 (balanced), claude-3-opus-20240229 (powerful)
};

// --- UTILITY FUNCTIONS ---
async function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Warden Alert: ANTHROPIC_API_KEY is not configured. Add it to .env.local");
  }
  return apiKey;
}

/* -------------------------------------------------------------------------- */
/*                      UNIFIED CLAUDE CLIENT (TEXT & VISION)                 */
/* -------------------------------------------------------------------------- */

/**
 * Unified caller for all Anthropic Claude API requests.
 * Handles both text-only and vision (image analysis) requests.
 * 
 * @param prompt - The text prompt/instruction for Claude
 * @param opts - Optional configuration (model, temperature, tokens, retries)
 * @param image - Optional image data for vision requests
 * @returns Claude's text response
 */
export async function callClaude(
  prompt: string,
  opts: ClaudeOptions = {},
  image?: { base64: string; mimeType: string }
): Promise<string> {
  // Check quota before making API call
  const quotaCheck = checkClaudeQuota();
  if (!quotaCheck.allowed) {
    const resetDate = new Date(quotaCheck.resetDate).toLocaleDateString();
    throw new Error(`🚫 Claude API quota exhausted (${quotaCheck.remaining} remaining). Resets on ${resetDate}. Please wait or add more credits to your Anthropic account.`);
  }

  const apiKey = getApiKey();
  const retries = opts.retries ?? 3;
  
  // Model selection priority (Claude Haiku - Most Cost-Effective + Accurate):
  // 1. Operator-specified model (opts.model)
  // 2. Default: claude-3-5-haiku-20241022 (Claude 3.5 Haiku - fast, cheap, accurate for all tasks)
  // This model handles both vision AND text with extreme accuracy at lowest cost
  const model = opts.model || "claude-3-5-haiku-20241022";

  console.log(`⚜️ Anthropic Claude Haiku: Engaging model='${model}'${image ? ' (vision mode)' : ''} [Cost-Optimized, ${quotaCheck.remaining} calls remaining]`);

  // Build message content array (image + text)
  const contentParts: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
  
  if (image) {
    contentParts.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType,
        data: image.base64,
      },
    });
  }
  
  contentParts.push({ 
    type: "text", 
    text: prompt 
  });

  const body = {
    model: model,
    max_tokens: opts.maxTokens || (image ? 1024 : 4096), // Higher defaults for comprehensive analysis
    temperature: opts.temperature ?? 0.0, // Absolute zero for maximum determinism
    messages: [
      {
        role: "user",
        content: contentParts,
      }
    ],
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      
      if (!res.ok) {
        const status = res.status;
        
        // Handle specific error cases
        if (status === 401) {
          throw new Error(`Warden Alert: Invalid ANTHROPIC_API_KEY. Verify your API key in .env.local`);
        }
        if (status === 402) {
          throw new Error(`💳 Claude credits exhausted! Please add credits to your Anthropic account at https://console.anthropic.com/settings/billing`);
        }
        if (status === 429) {
          throw new Error(`Anthropic rate limit reached. Retry in progress...`);
        }
        if (status === 400) {
          throw new Error(`Anthropic API request error (400): ${text}`);
        }
        
        throw new Error(`Anthropic API Error ${status}: ${text}`);
      }
      
      const json = JSON.parse(text);
      const responseText = json.content?.[0]?.text;
      
      if (!responseText) {
        throw new Error("Anthropic API returned empty or invalid content block.");
      }

      console.log(`✅ Claude response received (${responseText.length} chars)`);
      
      // Increment quota on successful call
      incrementClaudeQuota();
      
      return responseText.trim();

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`❌ Claude API attempt ${attempt + 1}/${retries} failed:`, lastError.message);
      
      // Don't retry on fatal errors (auth, credits, quota)
      if (lastError.message.includes("Invalid ANTHROPIC_API_KEY") || 
          lastError.message.includes("credits exhausted") ||
          lastError.message.includes("quota exhausted")) {
        throw lastError;
      }
      
      if (attempt < retries - 1) {
        await sleep(1000 * (attempt + 1)); // Exponential backoff
      }
    }
  }
  
  throw lastError || new Error("Warden Alert: Claude API call failed after all retries.");
}

// --- CONVENIENCE EXPORTS (for compatibility) ---
export const callClaudeWithRetry = callClaude;
export const callClaudeVision = callClaude;

// Default export for backward compatibility
export default callClaude;
