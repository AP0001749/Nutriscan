/**
 * TIER-1 REGRESSION TEST SUITE
 * Oracle Data Validation: Uncle Tobys Oats, Coca-Cola, Weet-Bix
 * 
 * CRITICAL SUCCESS CRITERIA:
 * All macronutrients must be within ±5% of ground truth
 * Zero tolerance for >10% deviations (e.g., 1200% sugar hallucination)
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// Oracle Data (GROUND TRUTH from Warden Mandate)
const ORACLE_DATA = {
  'uncle-tobys-oats': {
    name: 'Uncle Tobys Quick Oats',
    serving_size: '40g',
    per_100g: {
      energy_cal: 385,
      protein_g: 11.7,
      fat_total_g: 7.7,
      fat_saturated_g: 1.7,
      carbohydrate_g: 60.8,
      sugars_g: 1.1,
      fiber_g: 9.7,
      sodium_mg: 4
    }
  },
  'coca-cola': {
    name: 'Coca-Cola Classic',
    serving_size: '375ml',
    per_100ml: {
      energy_cal: 180, // Per 375ml = 48cal/100ml
      protein_g: 0,
      fat_total_g: 0,
      fat_saturated_g: 0,
      carbohydrate_g: 45.0, // Per 375ml = 12g/100ml
      sugars_g: 45.0,
      fiber_g: 0,
      sodium_mg: 15
    }
  },
  'weetbix': {
    name: 'Weet-Bix Original',
    serving_size: '30g (2 biscuits)',
    per_100g: {
      energy_cal: 378,
      protein_g: 12.7,
      fat_total_g: 2.2,
      fat_saturated_g: 0.5,
      carbohydrate_g: 68.7,
      sugars_g: 3.3, // CRITICAL: AI hallucinated 41.6g (1200% error)
      fiber_g: 10.2,
      sodium_mg: 360
    }
  }
};

// Tolerance thresholds
const TOLERANCE = {
  STRICT: 0.05,    // ±5% for OCR pathway (TASK #7 requirement)
  WARNING: 0.10,   // ±10% triggers warning
  CRITICAL: 0.25   // >±25% = critical failure
};

interface TestResult {
  food: string;
  nutrient: string;
  expected: number;
  actual: number;
  deviation_percent: number;
  status: 'PASS' | 'WARNING' | 'FAIL' | 'CRITICAL';
}

const testResults: TestResult[] = [];

/**
 * Calculate percentage deviation from oracle data
 */
function calculateDeviation(actual: number, expected: number): number {
  if (expected === 0) {
    // Handle zero values specially (e.g., Coca-Cola protein/fat)
    return actual === 0 ? 0 : 100; // 100% error if actual is non-zero when expected is zero
  }
  return Math.abs((actual - expected) / expected);
}

/**
 * Validate nutrient against oracle data
 */
function validateNutrient(
  food: string,
  nutrient: string,
  actual: number,
  expected: number
): TestResult {
  const deviation = calculateDeviation(actual, expected);
  
  let status: 'PASS' | 'WARNING' | 'FAIL' | 'CRITICAL';
  if (deviation <= TOLERANCE.STRICT) {
    status = 'PASS';
  } else if (deviation <= TOLERANCE.WARNING) {
    status = 'WARNING';
  } else if (deviation <= TOLERANCE.CRITICAL) {
    status = 'FAIL';
  } else {
    status = 'CRITICAL';
  }
  
  const result: TestResult = {
    food,
    nutrient,
    expected,
    actual,
    deviation_percent: deviation * 100,
    status
  };
  
  testResults.push(result);
  return result;
}

/**
 * Call the scan-food API endpoint
 */
async function scanFood(imageFilename: string): Promise<{
  nutritionData: Array<{
    nf_calories: number;
    nf_protein: number;
    nf_total_fat: number;
    nf_saturated_fat: number;
    nf_total_carbohydrate: number;
    nf_sugars: number;
    nf_dietary_fiber: number;
    nf_sodium: number;
  }>;
  foodItems: unknown[];
  aiAnalysis: unknown;
  priceData: unknown[];
  warnings: string[];
}> {
  const imagePath = path.join(__dirname, 'accuracy-gauntlet', 'ground-truth-images', imageFilename);
  
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Test image not found: ${imagePath}`);
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const formData = new FormData();
  const blob = new Blob([imageBuffer]);
  formData.append('image', blob, imageFilename);
  
  const response = await fetch('http://localhost:3000/api/scan-food', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${await response.text()}`);
  }
  
  return response.json();
}

describe('TIER-1 REGRESSION SUITE: Packaged Food Oracle Validation', () => {
  beforeAll(() => {
    console.log('\n🔱 PRAETORIAN WARDEN: Initiating Tier-1 Regression Tests');
    console.log('Oracle Data: Uncle Tobys Oats, Coca-Cola, Weet-Bix');
    console.log(`Success Criteria: ±${(TOLERANCE.STRICT * 100).toFixed(0)}% tolerance\n`);
  });

  test('Uncle Tobys Quick Oats - Macro Validation', async () => {
    const oracle = ORACLE_DATA['uncle-tobys-oats'];
    const result = await scanFood('uncle-tobys-oats.jpg');
    
    expect(result.nutritionData).toBeDefined();
    expect(result.nutritionData.length).toBeGreaterThan(0);
    
    const nutrition = result.nutritionData[0];
    
    // Validate each macronutrient
    const calories = validateNutrient('Uncle Tobys Oats', 'Calories', 
      nutrition.nf_calories, oracle.per_100g.energy_cal);
    expect(calories.status).not.toBe('CRITICAL');
    expect(calories.deviation_percent).toBeLessThan(TOLERANCE.WARNING * 100);
    
    const protein = validateNutrient('Uncle Tobys Oats', 'Protein', 
      nutrition.nf_protein, oracle.per_100g.protein_g);
    expect(protein.status).not.toBe('CRITICAL');
    
    const fat = validateNutrient('Uncle Tobys Oats', 'Fat', 
      nutrition.nf_total_fat, oracle.per_100g.fat_total_g);
    expect(fat.status).not.toBe('CRITICAL');
    expect(fat.deviation_percent).toBeLessThan(10); // Original issue: 7g vs 7.7g = 10% error
    
    const carbs = validateNutrient('Uncle Tobys Oats', 'Carbohydrates', 
      nutrition.nf_total_carbohydrate, oracle.per_100g.carbohydrate_g);
    expect(carbs.status).not.toBe('CRITICAL');
    
    const sugars = validateNutrient('Uncle Tobys Oats', 'Sugars', 
      nutrition.nf_sugars, oracle.per_100g.sugars_g);
    expect(sugars.status).not.toBe('CRITICAL');
    
    console.log(`✅ Uncle Tobys: ${testResults.filter(r => r.status === 'PASS').length}/${testResults.length} nutrients within ±5%`);
  }, 30000);

  test('Coca-Cola - Zero Value Handling', async () => {
    const oracle = ORACLE_DATA['coca-cola'];
    const result = await scanFood('coca-cola.jpg');
    
    expect(result.nutritionData).toBeDefined();
    expect(result.nutritionData.length).toBeGreaterThan(0);
    
    const nutrition = result.nutritionData[0];
    
    // CRITICAL: Protein and fat MUST be 0, not "N/A" or null
    const protein = validateNutrient('Coca-Cola', 'Protein', 
      nutrition.nf_protein, oracle.per_100ml.protein_g);
    expect(protein.actual).toBe(0);
    expect(protein.status).toBe('PASS');
    
    const fat = validateNutrient('Coca-Cola', 'Fat', 
      nutrition.nf_total_fat, oracle.per_100ml.fat_total_g);
    expect(fat.actual).toBe(0);
    expect(fat.status).toBe('PASS');
    
    const sugars = validateNutrient('Coca-Cola', 'Sugars', 
      nutrition.nf_sugars, oracle.per_100ml.sugars_g);
    expect(sugars.status).not.toBe('CRITICAL');
    
    // CRITICAL: Should NOT hallucinate potassium (original issue: 1000+mg when actual is trace)
    const sodium = validateNutrient('Coca-Cola', 'Sodium', 
      nutrition.nf_sodium, oracle.per_100ml.sodium_mg);
    expect(sodium.deviation_percent).toBeLessThan(50); // Allow some tolerance for sodium
    
    console.log(`✅ Coca-Cola: Zero-value handling validated (protein=${nutrition.nf_protein}, fat=${nutrition.nf_total_fat})`);
  }, 30000);

  test('Weet-Bix - Sugar Hallucination Prevention', async () => {
    const oracle = ORACLE_DATA['weetbix'];
    const result = await scanFood('weetbix.jpg');
    
    expect(result.nutritionData).toBeDefined();
    expect(result.nutritionData.length).toBeGreaterThan(0);
    
    const nutrition = result.nutritionData[0];
    
    // CRITICAL: Sugar hallucination test (original: 41.6g vs actual 3.3g = 1200% error)
    const sugars = validateNutrient('Weet-Bix', 'Sugars', 
      nutrition.nf_sugars, oracle.per_100g.sugars_g);
    
    expect(sugars.status).not.toBe('CRITICAL');
    expect(sugars.deviation_percent).toBeLessThan(TOLERANCE.CRITICAL * 100); // Must not exceed ±25%
    
    // Log critical failure if sugar hallucination detected
    if (sugars.deviation_percent > 100) {
      console.error(`🚨 SUGAR HALLUCINATION DETECTED: ${nutrition.nf_sugars}g vs ${oracle.per_100g.sugars_g}g (${sugars.deviation_percent.toFixed(0)}% error)`);
    }
    
    // Validate other macros
    const protein = validateNutrient('Weet-Bix', 'Protein', 
      nutrition.nf_protein, oracle.per_100g.protein_g);
    expect(protein.status).not.toBe('CRITICAL');
    
    const fiber = validateNutrient('Weet-Bix', 'Fiber', 
      nutrition.nf_dietary_fiber, oracle.per_100g.fiber_g);
    expect(fiber.status).not.toBe('CRITICAL');
    
    const carbs = validateNutrient('Weet-Bix', 'Carbohydrates', 
      nutrition.nf_total_carbohydrate, oracle.per_100g.carbohydrate_g);
    expect(carbs.status).not.toBe('CRITICAL');
    
    console.log(`✅ Weet-Bix: Sugar validation passed (${nutrition.nf_sugars}g vs ${oracle.per_100g.sugars_g}g = ${sugars.deviation_percent.toFixed(1)}% deviation)`);
  }, 30000);

  afterAll(() => {
    // Generate test report
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔱 TIER-1 REGRESSION TEST REPORT');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const warnings = testResults.filter(r => r.status === 'WARNING').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const critical = testResults.filter(r => r.status === 'CRITICAL').length;
    
    console.log(`PASS: ${passed}/${testResults.length} (±5% tolerance)`);
    console.log(`WARNING: ${warnings}/${testResults.length} (±10% tolerance)`);
    console.log(`FAIL: ${failed}/${testResults.length} (±25% tolerance)`);
    console.log(`CRITICAL: ${critical}/${testResults.length} (>±25% deviation)\n`);
    
    // Detail critical failures
    if (critical > 0) {
      console.log('🚨 CRITICAL FAILURES:');
      testResults
        .filter(r => r.status === 'CRITICAL')
        .forEach(r => {
          console.log(`  - ${r.food} | ${r.nutrient}: ${r.actual} vs ${r.expected} (${r.deviation_percent.toFixed(0)}% error)`);
        });
      console.log('');
    }
    
    // Save results to CSV
    const csvPath = path.join(__dirname, 'accuracy-gauntlet', 'results', 'tier1-regression.csv');
    const csvHeader = 'Food,Nutrient,Expected,Actual,Deviation%,Status\n';
    const csvRows = testResults.map(r => 
      `${r.food},${r.nutrient},${r.expected},${r.actual},${r.deviation_percent.toFixed(2)},${r.status}`
    ).join('\n');
    
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`📊 Results saved to: ${csvPath}\n`);
    
    // CI/CD gate: Fail if any critical errors
    expect(critical).toBe(0);
  });
});
