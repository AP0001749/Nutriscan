/**
 * OCR-FIRST NUTRITION EXTRACTION MODULE
 * Priority: Extract nutrition facts directly from packaging labels
 * Bypasses concept-based AI inference for packaged foods
 *
 * NOTE: HF-based OCR disabled under Protocol Phoenix. Functions now no-op.
 */
 

export interface NutritionFactsOCR {
  // Per 100g values (standardized)
  energy_kj?: number;
  energy_cal?: number;
  protein_g?: number;
  fat_total_g?: number;
  fat_saturated_g?: number;
  carbohydrate_g?: number;
  sugars_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  potassium_mg?: number;
  
  // Metadata
  confidence: number; // 0-1 score
  source: 'ocr-table' | 'ocr-text';
  per_serving?: {
    quantity: number;
    unit: string;
    weight_g?: number;
  };
}

export interface ProductNameOCR {
  name: string;
  brand?: string;
  confidence: number;
}

/**
 * TASK #1 & #4: Extract nutrition facts table from packaging using Vision OCR
 * DISABLED: OCR extraction bypassed under Protocol Phoenix architecture
 */
export async function extractNutritionFactsOCR(_imageBase64: string): Promise<NutritionFactsOCR | null> {
  void _imageBase64; // mark as used to satisfy noUnusedParameters
  console.warn('OCR nutrition extraction disabled under Protocol Phoenix. Returning null.');
  return null;
}

/**
 * Helper: Parse OCR response into structured nutrition facts
 */
// parseOCRResponse disabled under Protocol Phoenix (no OCR parsing used)

/**
 * TASK #3: Extract product brand and name from packaging
 * DISABLED: Product name extraction bypassed under Protocol Phoenix architecture
 */
export async function extractProductNameOCR(_imageBase64: string): Promise<ProductNameOCR | null> {
  void _imageBase64; // mark as used to satisfy noUnusedParameters
  console.warn('OCR product name extraction disabled under Protocol Phoenix. Returning null.');
  return null;
}

/**
 * Helper: Parse product name OCR response
 */
// parseProductNameResponse disabled under Protocol Phoenix

/**
 * TASK #4: Parse nutrition facts from raw OCR text using regex
 * Fallback for when structured JSON extraction fails
 */
export function parseNutritionText(ocrText: string): Partial<NutritionFactsOCR> | null {
  const result: Partial<NutritionFactsOCR> = {};
  const text = ocrText.toLowerCase();

  // Energy patterns
  const energyKjMatch = text.match(/energy[:\s]+(\d+)\s*kj/i);
  const energyCalMatch = text.match(/(\d+)\s*(cal|kcal)/i) || text.match(/\((\d+)\s*cal\)/i);
  
  // Macronutrient patterns (per 100g/100ml)
  const proteinMatch = text.match(/protein[:\s]+(\d+\.?\d*)\s*g/i);
  const fatMatch = text.match(/fat[,\s]+total[:\s]+(\d+\.?\d*)\s*g/i) || text.match(/total\s+fat[:\s]+(\d+\.?\d*)\s*g/i);
  const carbsMatch = text.match(/carbohydrate[:\s]+(\d+\.?\d*)\s*g/i);
  const sugarsMatch = text.match(/sugars[:\s]+(\d+\.?\d*)\s*g/i);
  const fiberMatch = text.match(/dietary\s+fi[bv]re[:\s]+(\d+\.?\d*)\s*g/i) || text.match(/fiber[:\s]+(\d+\.?\d*)\s*g/i);
  const sodiumMatch = text.match(/sodium[:\s]+(\d+\.?\d*)\s*(mg|g)/i);

  if (energyKjMatch) result.energy_kj = parseFloat(energyKjMatch[1]);
  if (energyCalMatch) result.energy_cal = parseFloat(energyCalMatch[1]);
  if (proteinMatch) result.protein_g = parseFloat(proteinMatch[1]);
  if (fatMatch) result.fat_total_g = parseFloat(fatMatch[1]);
  if (carbsMatch) result.carbohydrate_g = parseFloat(carbsMatch[1]);
  if (sugarsMatch) result.sugars_g = parseFloat(sugarsMatch[1]);
  if (fiberMatch) result.fiber_g = parseFloat(fiberMatch[1]);
  if (sodiumMatch) {
    const value = parseFloat(sodiumMatch[1]);
    result.sodium_mg = sodiumMatch[2] === 'g' ? value * 1000 : value;
  }

  // Return null if we didn't extract any meaningful data
  const extractedCount = Object.keys(result).length;
  if (extractedCount < 2) return null;

  return {
    ...result,
    confidence: Math.min(0.7, extractedCount / 8), // Lower confidence for regex parsing
    source: 'ocr-text'
  };
}

/**
 * TASK #5: Detect if image contains packaged food with visible labels
 * DISABLED: Packaged food detection bypassed under Protocol Phoenix architecture
 */
export async function detectPackagedFood(_imageBase64: string): Promise<{ isPackaged: boolean; confidence: number }> {
  void _imageBase64; // mark as used to satisfy noUnusedParameters
  console.warn('Packaged food detection disabled under Protocol Phoenix. Returning false.');
  return { isPackaged: false, confidence: 0.0 };
}

/**
 * Helper: Parse packaged food detection response
 */
// parsePackagedResponse disabled under Protocol Phoenix

// Helper functions
// parseNumber disabled under Protocol Phoenix

// calculateConfidence disabled under Protocol Phoenix
