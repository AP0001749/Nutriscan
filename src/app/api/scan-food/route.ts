import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/anthropic-client';
import { checkClarifaiQuota, incrementClarifaiQuota } from '@/lib/quota-tracker';
import { normalizeDishName } from '@/lib/dish-synonyms';
import { parseModelJson, validateAIAnalysis, coerceAIAnalysis } from '@/lib/ai-output';
import { NutritionInfo } from '@/lib/types';
import { getHealthData, calculateGlycemicLoad } from '@/lib/health-data';
import { foodDatabase } from '@/lib/food-data';
// OCR-based helpers disabled under Protocol Phoenix

// --- External API response types (USDA & Clarifai) ---
interface UsdaSearchFood {
    fdcId: number;
    description: string;
}

interface UsdaSearchResponse {
    foods?: UsdaSearchFood[];
}

interface UsdaNutrient { nutrient: { id: number; name?: string }; amount?: number }
interface UsdaDetailsResponse {
    description: string;
    brandOwner?: string;
    servingSize?: number | null;
    servingSizeUnit?: string | null;
    foodNutrients: UsdaNutrient[];
}

interface ClarifaiConcept { name: string; value: number }
interface ClarifaiOutput { outputs?: Array<{ data?: { concepts?: ClarifaiConcept[] } }> }

// Nutritionix API types for fallback nutrition lookup
interface NutritionixFood {
    food_name: string;
    brand_name?: string | null;
    serving_qty: number;
    serving_unit: string;
    serving_weight_grams: number;
    nf_calories: number | null;
    nf_total_fat: number | null;
    nf_saturated_fat: number | null;
    nf_cholesterol: number | null;
    nf_sodium: number | null;
    nf_total_carbohydrate: number | null;
    nf_dietary_fiber: number | null;
    nf_sugars: number | null;
    nf_protein: number | null;
    nf_potassium: number | null;
    nf_p: number | null;
}

interface NutritionixResponse {
    foods?: NutritionixFood[];
}

export const runtime = "nodejs";

// --- Utility helpers ---
function clamp(num: number, min: number, max: number) { return Math.max(min, Math.min(num, max)); }

// Bounded fetch with AbortController to prevent long hangs on external APIs
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
    const { timeoutMs = 15000, ...rest } = init;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...rest, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

// Heuristic correction layer to fix common misnamings (e.g., burrito vs sandwich)
function applyHeuristicDishCorrections(name: string, conceptNames: string[]): string {
    const lowerName = name.toLowerCase();
    const lc = conceptNames.map(c => c.toLowerCase());
    const has = (...keys: string[]) => keys.some(k => lc.includes(k));
    const tortilla = has('tortilla');
    const rice = has('rice', 'white rice', 'brown rice');
    const beans = has('beans', 'black beans', 'pinto beans', 'refried beans', 'kidney beans');
    const salsa = has('salsa', 'pico de gallo');
    const guac = has('guacamole', 'avocado');
    const cheese = has('cheese', 'cheddar', 'mozzarella', 'monterey jack', 'queso');
    const lettuce = has('lettuce');
    const chicken = has('chicken');
    const beef = has('beef', 'ground beef', 'steak');
    const pork = has('pork', 'bacon', 'ham');
    const fish = has('fish', 'white fish', 'tilapia', 'salmon');

    // Strong burrito signal: tortilla + (rice or beans) + (salsa or guac or cheese)
    if (tortilla && (rice || beans) && (salsa || guac || cheese)) {
        let protein = '';
        if (chicken) protein = 'Chicken ';
        else if (beef) protein = 'Beef ';
        else if (pork) protein = 'Pork ';
        else if (fish) protein = 'Fish ';
        return `${protein}Burrito`.trim();
    }

    // Taco signal: tortilla + protein + salsa/lettuce without rice/beans dominance
    if (tortilla && (chicken || beef || pork || fish) && (salsa || lettuce) && !(rice && beans)) {
        const protein = chicken ? 'Chicken ' : beef ? 'Beef ' : pork ? 'Pork ' : fish ? 'Fish ' : '';
        return `${protein}Tacos`.trim();
    }

    // Quesadilla signal: tortilla + cheese without rice/beans
    if (tortilla && cheese && !(rice || beans)) {
        const protein = chicken ? 'Chicken ' : beef ? 'Beef ' : '';
        return `${protein}Quesadilla`.trim();
    }

    // If the model called it a sandwich but tortilla/mexican signals are present, prefer burrito/tacos
    if (lowerName.includes('sandwich') && (tortilla || salsa || guac)) {
        if (rice || beans) return 'Burrito';
        const protein = chicken ? 'Chicken ' : beef ? 'Beef ' : pork ? 'Pork ' : fish ? 'Fish ' : '';
        return `${protein}Tacos`.trim();
    }

    return name;
}

// --- SELF-CONTAINED HELPER FUNCTIONS ---
async function getNutritionData(foodName: string): Promise<NutritionInfo | null> {
    const USDA_API_KEY = process.env.USDA_API_KEY;
    if (!USDA_API_KEY) {
        console.warn('USDA API key is missing.');
        return null;
    }
    try {
    const searchResponse = await fetchWithTimeout(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&api_key=${USDA_API_KEY}`, { timeoutMs: 12000 });
        if (!searchResponse.ok) return null;
        const searchData = await searchResponse.json() as UsdaSearchResponse;
        if (!searchData.foods || searchData.foods.length === 0) return null;

        const food = searchData.foods[0];
    const detailsResponse = await fetchWithTimeout(`https://api.nal.usda.gov/fdc/v1/food/${food.fdcId}?api_key=${USDA_API_KEY}`, { timeoutMs: 12000 });
        if (!detailsResponse.ok) return null;
        const detailsData = await detailsResponse.json() as UsdaDetailsResponse;
        
        // CRITICAL FIX (Task #2): Return 0 for missing nutrients instead of null
        // This prevents "N/A" display for zero-macronutrient foods (e.g., Coca-Cola)
        const getNutrient = (id: number) => {
            const amount = detailsData.foodNutrients.find((n: { nutrient: { id: number; }; }) => n.nutrient.id === id)?.amount;
            return (amount !== undefined && amount !== null) ? amount : 0;
        };
        const carbs = getNutrient(1005);
        const localHealthData = getHealthData(detailsData.description);
        const glycemicLoad = localHealthData.glycemicIndex ? calculateGlycemicLoad(localHealthData.glycemicIndex, carbs) : undefined;
        const healthImpact: HealthImpact = {
            glycemicIndex: localHealthData.glycemicIndex,
            glycemicLoad: glycemicLoad,
            inflammatoryScore: localHealthData.inflammatoryScore,
        };

        return {
          food_name: detailsData.description,
          brand_name: detailsData.brandOwner || null,
          serving_qty: 1, serving_unit: detailsData.servingSizeUnit || 'g',
          serving_weight_grams: detailsData.servingSize || 100,
          nf_calories: getNutrient(1008), nf_total_fat: getNutrient(1004),
          nf_saturated_fat: getNutrient(1258), nf_cholesterol: getNutrient(1253),
          nf_sodium: getNutrient(1093), nf_total_carbohydrate: carbs,
          nf_dietary_fiber: getNutrient(1079), nf_sugars: getNutrient(2000),
          nf_protein: getNutrient(1003), nf_potassium: getNutrient(1092),
          nf_p: getNutrient(1091), healthData: healthImpact,
        };
    } catch (error) {
        console.error(`Direct nutrition fetch error for "${foodName}":`, error);
        return null;
    }
}

// METRIC 2 ENHANCEMENT: Nutritionix fallback for when USDA fails
async function getNutritionDataFromNutritionix(foodName: string): Promise<NutritionInfo | null> {
    const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
    const NUTRITIONIX_API_KEY = process.env.NUTRITIONIX_API_KEY;
    
    if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_API_KEY) {
        console.warn('Nutritionix API credentials missing - skipping fallback.');
        return null;
    }
    
    try {
        console.log(`Nutritionix fallback: Looking up "${foodName}"...`);
        const response = await fetchWithTimeout('https://trackapi.nutritionix.com/v2/natural/nutrients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': NUTRITIONIX_APP_ID,
                'x-app-key': NUTRITIONIX_API_KEY,
            },
            body: JSON.stringify({ query: foodName }),
            timeoutMs: 12000
        });
        
        if (!response.ok) {
            console.warn(`Nutritionix API returned ${response.status}`);
            return null;
        }
        
        const data = await response.json() as NutritionixResponse;
        if (!data.foods || data.foods.length === 0) {
            console.warn('Nutritionix returned no results');
            return null;
        }
        
        const food = data.foods[0];
        const localHealthData = getHealthData(food.food_name);
        const carbs = food.nf_total_carbohydrate || 0;
        const glycemicLoad = localHealthData.glycemicIndex ? calculateGlycemicLoad(localHealthData.glycemicIndex, carbs) : undefined;
        const healthImpact: HealthImpact = {
            glycemicIndex: localHealthData.glycemicIndex,
            glycemicLoad: glycemicLoad,
            inflammatoryScore: localHealthData.inflammatoryScore,
        };
        
        console.log(`✅ Nutritionix fallback successful for "${foodName}"`);
        
        // CRITICAL FIX (Task #2): Coerce null values to 0 for consistent zero-value handling
        const toNumber = (val: number | null | undefined): number => (val !== null && val !== undefined) ? val : 0;
        
        return {
            food_name: food.food_name,
            brand_name: food.brand_name || null,
            serving_qty: food.serving_qty,
            serving_unit: food.serving_unit,
            serving_weight_grams: food.serving_weight_grams,
            nf_calories: toNumber(food.nf_calories),
            nf_total_fat: toNumber(food.nf_total_fat),
            nf_saturated_fat: toNumber(food.nf_saturated_fat),
            nf_cholesterol: toNumber(food.nf_cholesterol),
            nf_sodium: toNumber(food.nf_sodium),
            nf_total_carbohydrate: toNumber(food.nf_total_carbohydrate),
            nf_dietary_fiber: toNumber(food.nf_dietary_fiber),
            nf_sugars: toNumber(food.nf_sugars),
            nf_protein: toNumber(food.nf_protein),
            nf_potassium: toNumber(food.nf_potassium),
            nf_p: toNumber(food.nf_p),
            healthData: healthImpact,
        };
    } catch (error) {
        console.error(`Nutritionix fallback error for "${foodName}":`, error);
        return null;
    }
}

// MAX ACCURACY MODE: Ask Claude to estimate a typical ingredient breakdown for a dish
async function estimateRecipeComposition(dishName: string, conceptNames: string[]): Promise<Array<{ name: string; percent: number }>> {
    // Claude uses simple token billing, no quota tracking needed
    
    const prompt = [
        `You are a culinary expert. Estimate a typical ingredient breakdown for the dish: "${dishName}".`,
        `Vision concepts observed: ${conceptNames.join(', ')}`,
        `Return STRICT JSON only with this schema: {"ingredients":[{"name":"string","percent":number}, ...]}.`,
        `Rules:`,
        `- Provide 3 to 6 ingredients`,
        `- Percents must be integers and sum to 100`,
        `- Use common names recognized by nutrition databases (e.g., "spaghetti", "ground beef", "tomato sauce", "olive oil", "cheddar cheese")`,
        `- Avoid brand names or regional variants unless essential`,
        `Examples:`,
        `Dish: Spaghetti Bolognese → {"ingredients":[{"name":"spaghetti","percent":45},{"name":"ground beef","percent":25},{"name":"tomato sauce","percent":20},{"name":"olive oil","percent":5},{"name":"parmesan cheese","percent":5}]}`,
        `Dish: Blackberry Yogurt Smoothie → {"ingredients":[{"name":"blackberries","percent":35},{"name":"plain yogurt","percent":45},{"name":"milk","percent":15},{"name":"honey","percent":5}]}`,
        `OUTPUT: JSON only.`
    ].join('\n');

    try {
    const raw = await callClaude(prompt, { maxTokens: 300, temperature: 0.2, retries: 2 });
        const parsed = parseModelJson(raw) as { ingredients?: Array<{ name?: string; percent?: number }> } | null;
        const list = Array.isArray(parsed?.ingredients) ? parsed!.ingredients! : [];
        const cleaned = list
            .map(e => ({ name: String((e.name || '').toString().trim()).toLowerCase(), percent: Number(e.percent ?? 0) }))
            .filter(e => e.name && e.percent > 0);
        const total = cleaned.reduce((s, e) => s + (isFinite(e.percent) ? e.percent : 0), 0);
        if (cleaned.length >= 2 && total > 0) {
            // Normalize to sum=100 and clamp
            return cleaned.map(e => ({ name: e.name, percent: clamp(Math.round((e.percent / total) * 100), 1, 96) }))
                          .slice(0, 6);
        }
    } catch (err) {
        console.warn('Recipe composition estimation failed:', err);
    }
    return [];
}

/* -------------------------------------------------------------------------- */
/*                      ACCURACY CONTEXT GENERATOR                            */
/* -------------------------------------------------------------------------- */

/**
 * Generates user-friendly accuracy context explaining:
 * - Why the calorie estimate is approximate
 * - Typical variability ranges for the food type
 * - What factors affect accuracy
 * - How to improve accuracy
 */
function generateAccuracyContext(
    dishName: string, 
    nutrition: NutritionInfo[] | null, 
    pathway: { pathway: string; confidence: number }
): {
    verdict: string;
    isRealistic: boolean;
    estimateType: string;
    variabilityFactors: string[];
    typicalRange: string;
    improvementTips: string[];
    disclaimer: string;
} {
    // Get calories from first nutrition item (primary food)
    const caloriesPer100g = nutrition && nutrition.length > 0 
        ? (nutrition[0].nf_calories || 0) 
        : 0;
    const dishLower = dishName.toLowerCase();
    
    // Categorize food type for variability assessment
    let foodCategory = 'mixed dish';
    let variabilityLevel = 'moderate';
    let typicalMin = caloriesPer100g * 0.8;
    let typicalMax = caloriesPer100g * 1.3;
    
    // Complex/composite dishes have higher variability
    if (dishLower.includes('burrito') || dishLower.includes('wrap')) {
        foodCategory = 'burrito/wrap';
        variabilityLevel = 'high';
        typicalMin = caloriesPer100g * 0.7;
        typicalMax = caloriesPer100g * 1.5;
    } else if (dishLower.includes('salad')) {
        foodCategory = 'salad';
        variabilityLevel = 'very high';
        typicalMin = caloriesPer100g * 0.5;
        typicalMax = caloriesPer100g * 2.0;
    } else if (dishLower.includes('pizza') || dishLower.includes('burger')) {
        foodCategory = 'fast food';
        variabilityLevel = 'high';
        typicalMin = caloriesPer100g * 0.75;
        typicalMax = caloriesPer100g * 1.4;
    } else if (dishLower.includes('soup') || dishLower.includes('stew')) {
        foodCategory = 'soup/stew';
        variabilityLevel = 'very high';
        typicalMin = caloriesPer100g * 0.6;
        typicalMax = caloriesPer100g * 2.5;
    } else if (dishLower.includes('packaged') || dishLower.includes('frozen')) {
        foodCategory = 'packaged food';
        variabilityLevel = 'low';
        typicalMin = caloriesPer100g * 0.9;
        typicalMax = caloriesPer100g * 1.1;
    }
    
    // Common variability factors by category
    const variabilityFactors: string[] = [];
    if (foodCategory === 'burrito/wrap') {
        variabilityFactors.push('Tortilla size and thickness');
        variabilityFactors.push('Rice/beans quantity');
        variabilityFactors.push('Meat fat percentage');
        variabilityFactors.push('Cheese and sour cream amounts');
        variabilityFactors.push('Guacamole/sauce portions');
        variabilityFactors.push('Cooking oil used');
    } else if (foodCategory === 'salad') {
        variabilityFactors.push('Dressing type and amount');
        variabilityFactors.push('Protein additions (chicken, cheese, nuts)');
        variabilityFactors.push('Croutons or toppings');
        variabilityFactors.push('Base greens vs. heavier vegetables');
    } else if (foodCategory === 'fast food') {
        variabilityFactors.push('Portion size variations');
        variabilityFactors.push('Cheese and sauce amounts');
        variabilityFactors.push('Cooking method and oil');
        variabilityFactors.push('Brand-specific recipes');
    } else if (foodCategory === 'soup/stew') {
        variabilityFactors.push('Liquid vs. solid ratio');
        variabilityFactors.push('Fat content (cream, butter, oil)');
        variabilityFactors.push('Meat/protein density');
        variabilityFactors.push('Vegetable vs. carb content');
    } else if (foodCategory === 'packaged food') {
        variabilityFactors.push('Brand-specific formulations');
        variabilityFactors.push('Stated vs. actual serving size');
    } else {
        // Generic mixed dish factors
        variabilityFactors.push('Ingredient proportions');
        variabilityFactors.push('Cooking method and oil');
        variabilityFactors.push('Recipe variations');
        variabilityFactors.push('Portion size estimation');
    }
    
    // Improvement tips
    const improvementTips = [
        'Weigh ingredients individually if homemade',
        'Check brand/restaurant nutrition info if available',
        'Use a food scale for portion accuracy',
        'Log major ingredients separately for better tracking'
    ];
    
    if (foodCategory === 'packaged food') {
        improvementTips.unshift('Scan the nutrition label for exact data');
    }
    
    // Verdict and estimate type
    const isRealistic = caloriesPer100g > 50 && caloriesPer100g < 500;
    const estimateType = pathway.pathway.includes('AI') 
        ? 'AI-generated estimate using generic food database averages'
        : 'Database estimate from standardized food data';
    
    const verdict = isRealistic
        ? `✔ The calorie estimate (${caloriesPer100g} kcal/100g) is realistic and matches typical ${foodCategory} nutrition data.`
        : `⚠ The calorie estimate may be inaccurate. Please verify ingredients.`;
    
    const disclaimer = variabilityLevel === 'low'
        ? 'This is a close approximation if the brand/package is identified correctly.'
        : variabilityLevel === 'moderate'
        ? 'This is a reasonable estimate, but actual values may vary by 15-30% depending on recipe.'
        : variabilityLevel === 'high'
        ? 'This is a general estimate. Actual calories may vary by 25-40% based on ingredients and preparation.'
        : 'This is a rough estimate. Actual calories can vary by 50-150% depending on preparation and ingredients.';
    
    return {
        verdict,
        isRealistic,
        estimateType,
        variabilityFactors,
        typicalRange: `${Math.round(typicalMin)}–${Math.round(typicalMax)} kcal/100g`,
        improvementTips,
        disclaimer
    };
}

async function getAIConcepts(imageBuffer: Buffer): Promise<{name: string, confidence: number}[]> {
    const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
    if (!CLARIFAI_API_KEY) { 
        console.warn('⚠️ Clarifai API key not configured, skipping concept extraction');
        return []; 
    }
    
    // Check quota before making API call
    const quotaCheck = checkClarifaiQuota();
    if (!quotaCheck.allowed) {
        console.warn(`⚠️ Clarifai quota exceeded (${quotaCheck.remaining} remaining). Reset: ${new Date(quotaCheck.resetDate).toLocaleDateString()}`);
        return [];
    }
    
    try {
        const response = await fetchWithTimeout('https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs', {
            method: 'POST',
            headers: { 'Authorization': `Key ${CLARIFAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: [{ data: { image: { base64: imageBuffer.toString('base64') } } }] }),
            timeoutMs: 15000
        });
        if (!response.ok) {
            console.error(`Clarifai API error: ${response.status}`);
            return [];
        }
        
        // Increment quota on successful call
        incrementClarifaiQuota();
        
        const data = await response.json() as ClarifaiOutput;
        return data.outputs?.[0]?.data?.concepts?.map((c: ClarifaiConcept) => ({ name: c.name, confidence: c.value })) || [];
    } catch (error) {
        console.error('Error in getAIConcepts:', error);
        return [];
    }
}

// --- MAIN API ENDPOINT ---
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    let finalFoodItems: string[] = [];
    let identifiedDishName: string = '';
    let source: string = '';
    const warnings: string[] = [];
    
    // TASK #8: Track pathway metadata
    let pathwayConfidence: number = 0;

        // PROTOCOL PHOENIX: OCR & packaged detection removed. Proceed directly to concept extraction.
        console.log('🛠 Protocol Phoenix: Skipping packaged-food OCR pathway; initiating unified Clarifai → Claude pipeline.');

    // --- PRAETORIAN FUSION ENGINE: Multi-Concept Primary Intelligence ---
    console.log('🔱 Fusion Engine: Step 1 - Multi-Concept Extraction from Vision API...');
    const aiConcepts = await getAIConcepts(imageBuffer);
    
    // If Clarifai is unavailable/quota exceeded, provide clear user message
    if (!aiConcepts || aiConcepts.length === 0) {
        console.error('❌ Clarifai unavailable or returned no concepts. Aborting under Protocol Phoenix.');
        
        // Check if it was a quota issue
        const quotaCheck = checkClarifaiQuota();
        if (!quotaCheck.allowed) {
            const resetDate = new Date(quotaCheck.resetDate).toLocaleDateString();
            return NextResponse.json({ 
                error: '🚫 Vision API quota exhausted', 
                details: `Clarifai free tier limit reached (1000 ops/month). Service will resume on ${resetDate}. To continue using NutriScan now, please upgrade your Clarifai plan at https://clarifai.com/pricing`,
                resetDate: resetDate
            }, { status: 429 });
        }
        
        return NextResponse.json({ 
            error: '⚠️ Vision API temporarily unavailable', 
            details: 'Unable to analyze image. Please try again in a moment or check if your Clarifai API key is valid.' 
        }, { status: 503 });
    }
    
    // Secondary HF vision disabled under Protocol Phoenix
    
    // Extract top 7 high-confidence concepts for maximum accuracy (≥50% threshold)
    const topConcepts = aiConcepts
        .filter(c => c.confidence >= 0.50) // Lowered threshold for more data
        .slice(0, 7); // Increased to 7 for better context
    
    if (topConcepts.length === 0) {
        // Absolute fallback: use top 7 even if confidence is low
        topConcepts.push(...aiConcepts.slice(0, 7)); // More concepts = better accuracy
        // Low confidence handled silently - Claude vision will refine results
    }
    
    // TASK #8: Track concept fusion confidence
    if (topConcepts.length > 0 && !pathwayConfidence) {
        pathwayConfidence = topConcepts[0].confidence;
    }
    
    const conceptNames = topConcepts.map(c => c.name);
    const conceptsDisplay = topConcepts.map(c => `${c.name} (${(c.confidence * 100).toFixed(0)}%)`).join(', ');
    console.log(`Vision API returned ${aiConcepts.length} concepts → Using top ${topConcepts.length}: ${conceptsDisplay}`);
    
    // --- PRAETORIAN FUSION ENGINE: Claude Synthesis (PRIMARY, NOT FALLBACK) ---
    console.log('🔱 Fusion Engine: Step 2 - Claude Multi-Concept Synthesis...');
    
    try {
        // TEMPORARY: Fusion prompt disabled (Claude quota exhausted)
        /* const fusionPrompt = [
            `You are a food identification expert analyzing vision system output.`,
            ``,
            `Vision detected these ${topConcepts.length} food concepts:`,
            `${conceptNames.map((name, i) => `  ${i + 1}. ${name} (${(topConcepts[i].confidence * 100).toFixed(0)}% confidence)`).join('\n')}`,
            ``,
            `TASK: Synthesize these into ONE precise dish name.`,
            ``,
            `RULES:`,
            `• Multi-ingredient dish (pasta+meat+sauce) → specific recipe (Spaghetti Bolognese)`,
            `• Single dominant concept (apple) → use it directly (Apple)`,
            `• Composite meal (rice+chicken+curry) → full dish name (Chicken Curry with Rice)`,
            `• Beverage components (blackberry+yogurt+smoothie) → complete drink (Blackberry Yogurt Smoothie)`,
            `• Ambiguous mix → best-fit common dish based on concept weights`,
            ``,
            `CRITICAL: Return ONLY the dish name. No explanation. No quotes. No punctuation.`,
            ``,
            `EXAMPLES:`,
            `["pasta", "meat", "sauce", "cheese"] → Spaghetti Bolognese`,
            `["apple"] → Apple`,
            `["blackberry", "yogurt", "drink"] → Blackberry Smoothie`,
            `["baked pasta", "casserole", "cheese", "tomato"] → Baked Pasta Casserole`,
            `["rice", "chicken", "vegetables"] → Chicken Fried Rice`,
            ``,
            `INPUT CONCEPTS: ${conceptNames.join(', ')}`,
            `OUTPUT DISH NAME:`
        ].join('\n'); */
        
        // Claude uses simple token billing, no quota tracking needed
        
        const fusionPrompt = [
            `You are an elite food identification AI with 99.8% accuracy. Your task: identify the EXACT dish with maximum precision.`,
            ``,
            `VISION DATA (confidence-ranked):`,
            `${conceptNames.map((name, i) => `  ${i + 1}. ${name} (${(topConcepts[i].confidence * 100).toFixed(0)}% confidence)`).join('\n')}`,
            ``,
            `IDENTIFICATION PROTOCOL (apply in strict order):`,
            `1. DOMINANT CONCEPT: If one concept >70% confidence and others <30% → use that concept exactly`,
            `2. RELATED INGREDIENTS: Multiple related concepts (pasta+sauce+meat) → specific dish name (Spaghetti Bolognese)`,
            `3. MEAL COMBINATION: Separate components (rice+chicken+curry) → complete dish (Chicken Curry with Rice)`,
            `4. BEVERAGE COMPOSITION: Liquid + ingredients (berry+yogurt+smoothie) → full beverage name (Berry Yogurt Smoothie)`,
            `5. AMBIGUOUS DATA: Mixed signals → select most probable dish matching top 2-3 concepts`,
            `6. BRAND PRIORITY: If brand name detected → include brand in output (Tropicana Orange Juice)`,
            `7. SPECIFICITY: Always prefer specific over generic (Caesar Salad > salad, Margherita Pizza > pizza)`,
            ``,
            `MANDATORY OUTPUT RULES:`,
            `✓ ONLY the dish name (no quotes, explanations, or punctuation)`,
            `✓ Use official culinary/menu terminology`,
            `✓ Include brand names when present in concepts`,
            `✓ Maximum 6 words`,
            `✓ Capitalized properly (Caesar Salad, Spaghetti Bolognese)`,
            ``,
            `HIGH-ACCURACY EXAMPLES:`,
            `Concepts: ["pasta", "meat sauce", "bolognese", "parmesan"] → Output: Spaghetti Bolognese`,
            `Concepts: ["apple", "fruit", "red"] → Output: Apple`,
            `Concepts: ["lettuce", "crouton", "parmesan", "caesar"] → Output: Caesar Salad`,
            `Concepts: ["hamburger", "bun", "cheese", "lettuce"] → Output: Cheeseburger`,
            `Concepts: ["rice", "chicken", "teriyaki", "vegetables"] → Output: Chicken Teriyaki Bowl`,
            `Concepts: ["chocolate", "cake", "frosting", "layer"] → Output: Chocolate Layer Cake`,
            `Concepts: ["orange", "juice", "tropicana", "bottle"] → Output: Tropicana Orange Juice`,
            `Concepts: ["coca cola", "can", "soda", "classic"] → Output: Coca Cola Classic`,
            ``,
            `SELF-VERIFICATION CHECKLIST (apply before final output):`,
            `□ Is this a real, commonly-known dish/product name?`,
            `□ Does it accurately reflect the top 2-3 concepts?`,
            `□ Is it specific enough to be searchable in nutrition databases?`,
            `□ Would a human recognize this name on a menu or in a store?`,
            ``,
            `INPUT CONCEPTS: ${conceptNames.join(', ')}`,
            `VERIFIED OUTPUT:`
        ].join('\n');
        
        const synthesizedDish = await callClaude(fusionPrompt, {
            maxTokens: 50, // Short, focused dish name
            temperature: 0.0, // Absolute zero for maximum determinism and accuracy
            retries: 3
            // Use default model selection (haiku for text)
        });
        
    // Clean response (with null safety) and normalize to canonical dish
    identifiedDishName = (synthesizedDish || topConcepts[0].name).trim().replace(/^["']|["']$/g, '').replace(/\.$/, '');
    identifiedDishName = normalizeDishName(identifiedDishName);
    // Heuristic corrections for common misnamings (e.g., burrito vs sandwich)
    identifiedDishName = applyHeuristicDishCorrections(identifiedDishName, conceptNames);
        
        // Validate output is reasonable (not empty, not too long, not just repeating input)
        if (!identifiedDishName || identifiedDishName.length < 3 || identifiedDishName.length > 100) {
            throw new Error(`Invalid fusion output: "${identifiedDishName}"`);
        }
        
    finalFoodItems = conceptNames; // All concepts contribute to nutrition lookup
    source = "Claude Synthesis";
        
        console.log(`✅ Using database matching: "${identifiedDishName}" from [${conceptNames.join(', ')}]`);
        
        // Only add warning if we had to use low-confidence concepts
        if (topConcepts[0].confidence < 0.75) {
            warnings.push(`Multi-concept fusion used (primary vision confidence: ${(topConcepts[0].confidence * 100).toFixed(0)}%)`);
        }
        
    } catch (fusionError) {
    // Fallback path: attempt Nutritionix direct dish lookup before database heuristics
    console.error('❌ Fusion Engine failed, initiating fallback dish resolution path:', fusionError);
        
        const highConfidenceConcepts = topConcepts.map(c => c.name.toLowerCase());
        let bestMatch = { score: 0, item: null as typeof foodDatabase[0] | null, matchedConcepts: [] as string[] };
        
        foodDatabase.forEach(item => {
            let score = 0;
            const matchedConcepts: string[] = [];
            const keywords = item.keywords.map(k => k.toLowerCase());
            
            highConfidenceConcepts.forEach((concept, idx) => {
                const conceptConfidence = topConcepts[idx]?.confidence || 0.60;
                
                if (keywords.includes(concept)) {
                    score += 10 * conceptConfidence;
                    matchedConcepts.push(concept);
                } else {
                    keywords.forEach(keyword => {
                        if (keyword.includes(concept) && concept.length >= 4) {
                            if (!matchedConcepts.includes(concept)) {
                                score += 5 * conceptConfidence;
                                matchedConcepts.push(concept);
                            }
                        }
                    });
                }
            });
            
            if (matchedConcepts.length > 1) score += matchedConcepts.length * 3;
            
            if (score > bestMatch.score) {
                bestMatch = { score, item, matchedConcepts };
            }
        });
        
    if (bestMatch.score >= 5 && bestMatch.item) {
            finalFoodItems = bestMatch.item.ingredients;
            // Prefer snapping to known canonical dish when fusion failed
            identifiedDishName = normalizeDishName(bestMatch.item.name);
            identifiedDishName = applyHeuristicDishCorrections(identifiedDishName, conceptNames);
            source = "Heuristic Database Fallback";
            console.log(`✅ Database fallback: "${identifiedDishName}" (score: ${bestMatch.score.toFixed(1)})`);
        } else {
            // Last resort: use top concept
            identifiedDishName = normalizeDishName(topConcepts[0].name);
            identifiedDishName = applyHeuristicDishCorrections(identifiedDishName, conceptNames);
            finalFoodItems = conceptNames;
            source = "Vision Primary Concept (Fusion Failed)";
            warnings.push(`AI fusion unavailable - using vision primary: "${identifiedDishName}"`);
            console.log(`⚠️ Last resort: Using top vision concept "${identifiedDishName}"`);
        }
    }
    
    // METRIC 2 ENHANCEMENT: Intelligent Hybrid Nutrition Lookup
    // Strategy: Try synthesized dish name FIRST (most accurate), then fall back to components
    console.log(`🔱 Nutrition Lookup: Primary strategy using dish name "${identifiedDishName}"...`);
    
    const nutritionData: NutritionInfo[] = [];
    const nutritionSources: string[] = [];
    
    // STEP 1: Try nutrition lookup for the SYNTHESIZED DISH NAME (highest accuracy)
    let dishNutrition = await getNutritionData(identifiedDishName);
    if (!dishNutrition) {
        console.log(`⚠️ USDA failed for "${identifiedDishName}", trying Nutritionix...`);
        dishNutrition = await getNutritionDataFromNutritionix(identifiedDishName);
    }
    
    if (dishNutrition) {
        // SUCCESS: We have nutrition for the complete dish
        nutritionData.push(dishNutrition);
        nutritionSources.push(dishNutrition.brand_name ? 'Nutritionix' : 'USDA');
        console.log(`✅ Found complete dish nutrition for "${identifiedDishName}" from ${nutritionSources[0]}`);
    } else {
        // STEP 2: Try AI-estimated recipe composition for aggregated nutrition
        console.log(`⚠️ No nutrition data for complete dish "${identifiedDishName}"`);
        console.log('🧪 Attempting AI-estimated recipe composition for aggregated nutrition...');
        const breakdown = await estimateRecipeComposition(identifiedDishName, conceptNames);
        if (breakdown.length >= 2) {
            // Fetch nutrition for each estimated ingredient, then aggregate per 100g dish
            const parts = await Promise.all(breakdown.map(async part => {
                let ni = await getNutritionData(part.name);
                if (!ni) ni = await getNutritionDataFromNutritionix(part.name);
                return { part, ni } as { part: { name: string; percent: number }, ni: NutritionInfo | null };
            }));

            const usable = parts.filter(p => p.ni !== null) as Array<{ part: { name: string; percent: number }, ni: NutritionInfo }>;
            if (usable.length >= 2) {
                const sumMacros = {
                    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, sodium: 0,
                    satFat: 0, cholesterol: 0, potassium: 0, phosphorus: 0
                };
                usable.forEach(({ part, ni }) => {
                    const grams = ni.serving_weight_grams || 100;
                    const w = part.percent; // grams contribution per 100g dish
                    const toNum = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) ? v : 0);
                    sumMacros.calories += (toNum(ni.nf_calories) / grams) * w;
                    sumMacros.protein  += (toNum(ni.nf_protein) / grams) * w;
                    sumMacros.carbs    += (toNum(ni.nf_total_carbohydrate) / grams) * w;
                    sumMacros.fat      += (toNum(ni.nf_total_fat) / grams) * w;
                    sumMacros.fiber    += (toNum(ni.nf_dietary_fiber) / grams) * w;
                    sumMacros.sugars   += (toNum(ni.nf_sugars) / grams) * w;
                    sumMacros.sodium   += (toNum(ni.nf_sodium) / grams) * w;
                    sumMacros.satFat   += (toNum(ni.nf_saturated_fat) / grams) * w;
                    sumMacros.cholesterol += (toNum(ni.nf_cholesterol) / grams) * w;
                    sumMacros.potassium += (toNum(ni.nf_potassium) / grams) * w;
                    sumMacros.phosphorus += (toNum(ni.nf_p) / grams) * w;
                });

                const localHealthData = getHealthData(identifiedDishName);
                const glycemicLoad = localHealthData.glycemicIndex ? calculateGlycemicLoad(localHealthData.glycemicIndex, sumMacros.carbs) : undefined;
                const healthImpact: HealthImpact = {
                    glycemicIndex: localHealthData.glycemicIndex,
                    glycemicLoad: glycemicLoad,
                    inflammatoryScore: localHealthData.inflammatoryScore,
                };

                const composite: NutritionInfo = {
                    food_name: `${identifiedDishName} (Estimated Composite)`,
                    brand_name: null,
                    serving_qty: 1,
                    serving_unit: 'g',
                    serving_weight_grams: 100,
                    nf_calories: Math.round(sumMacros.calories),
                    nf_total_fat: Number(sumMacros.fat.toFixed(1)),
                    nf_saturated_fat: Number(sumMacros.satFat.toFixed(1)),
                    nf_cholesterol: Math.round(sumMacros.cholesterol),
                    nf_sodium: Math.round(sumMacros.sodium),
                    nf_total_carbohydrate: Number(sumMacros.carbs.toFixed(1)),
                    nf_dietary_fiber: Number(sumMacros.fiber.toFixed(1)),
                    nf_sugars: Number(sumMacros.sugars.toFixed(1)),
                    nf_protein: Number(sumMacros.protein.toFixed(1)),
                    nf_potassium: Math.round(sumMacros.potassium),
                    nf_p: Math.round(sumMacros.phosphorus),
                    healthData: healthImpact,
                };

                nutritionData.push(composite);
                nutritionSources.push('Composite-Estimated');
                warnings.push(`Nutrition estimated from AI recipe composition (${usable.length}/${breakdown.length} ingredients resolved)`);
                console.log('✅ Composite nutrition estimated from ingredient breakdown');
            } else {
                console.log('⚠️ Composition estimation failed to resolve enough ingredients. Falling back to components...');
            }
        } else {
            console.log('⚠️ Claude did not return a valid composition. Falling back to components...');
        }

        // STEP 3: Fallback to component-by-component lookup (legacy behavior) if still empty
        if (nutritionData.length === 0) {
            console.log(`🔄 Fallback: Looking up ${finalFoodItems.length} individual component(s)...`);
            
            const nutritionPromises = finalFoodItems.map(async (name) => {
                let result = await getNutritionData(name);
                if (result) {
                    console.log(`✅ USDA: Found nutrition data for "${name}"`);
                    return { result, source: 'USDA' };
                }
                
                console.log(`⚠️ USDA failed for "${name}", trying Nutritionix fallback...`);
                result = await getNutritionDataFromNutritionix(name);
                if (result) {
                    console.log(`✅ Nutritionix: Found nutrition data for "${name}"`);
                    return { result, source: 'Nutritionix' };
                }
                
                console.error(`❌ Both USDA and Nutritionix failed for "${name}"`);
                return { result: null, source: 'none' };
            });
            
            const nutritionResults = await Promise.all(nutritionPromises);
            
            nutritionResults.forEach((item, idx) => {
                if (item.result) {
                    nutritionData.push(item.result);
                    nutritionSources.push(item.source);
                } else {
                    warnings.push(`Nutrition lookup failed for component: ${finalFoodItems[idx]}`);
                }
            });
            
            if (nutritionData.length > 0) {
                warnings.push(`Using component nutrition (${nutritionData.length}/${finalFoodItems.length} found) - may underestimate total`);
            }
        }
        
        // Removed duplicate component nutrition lookup block (previously executed twice causing slowdown)
    }
    
    // Log nutrition source breakdown
    if (nutritionSources.length > 0) {
        const usdaCount = nutritionSources.filter(s => s === 'USDA').length;
        const nutritionixCount = nutritionSources.filter(s => s === 'Nutritionix').length;
        console.log(`📊 Nutrition sources: ${usdaCount} from USDA, ${nutritionixCount} from Nutritionix`);
    }

    if (nutritionData.length === 0) {
        // If no nutrition data for any identified ingredient, return an error.
        return NextResponse.json({ error: 'Could not retrieve nutrition data for identified ingredients.' }, { status: 502 });
    }

    // Provide a concrete, non-never type for AI analysis throughout validation block
    interface AIAnalysisShape { description: string; healthScore: number; suggestions: string[] }
    let aiAnalysis: AIAnalysisShape | null = null;
    try {
                // CRITICAL: Ask Claude Vision to identify what it ACTUALLY sees in the image
                // This bypasses potentially incorrect vision concepts from Clarifai
                // DISABLED: Claude quota exhausted
                /* const identificationPrompt = [
                  `You are an expert food/beverage identifier. Analyze this image and identify EXACTLY what you see.`,
                  ``,
                  `Be SPECIFIC:`,
                  `- Include brand names if visible (Coca-Cola, Pepsi, Red Bull, etc.)`,
                  `- Include packaging type (can, bottle, box, etc.)`,
                  `- Include approximate size/volume if visible on packaging`,
                  `- If it's a dish, name the specific dish (e.g., "Spaghetti Bolognese" not just "pasta")`,
                  ``,
                  `EXAMPLES:`,
                  `- Coca-Cola 12 oz can`,
                  `- Red Bull Energy Drink 8.4 oz`,
                  `- Bottled Water 16.9 oz`,
                  `- Apple (fresh fruit)`,
                  `- Cheeseburger with fries`,
                  ``,
                  `Context from vision APIs:`,
                  `- Clarifai concepts: ${conceptNames.slice(0, 5).join(', ')}`,
                  hfCaption ? `- Hugging Face description: "${hfCaption}"` : '',
                  `- Current synthesis: "${identifiedDishName}"`,
                  ``,
                  `Return ONLY the item name with brand/size. No explanation.`
                ].filter(Boolean).join('\n'); */

                let refinedDishName = identifiedDishName;
                
                // MAXIMUM ACCURACY: Enhanced Claude 4.5 Vision Analysis
                
                const identificationPrompt = [
                    `You are a world-class food identification AI (99.9% accuracy, Claude 4.5 Sonnet). Analyze images with surgical precision, even when obscured, frozen, or complex.`,
                    ``,
                    `EXTREME ACCURACY PROTOCOL - MANDATORY STEPS:`,
                    ``,
                    `STEP 1: VISUAL CONDITION ASSESSMENT`,
                    `□ Image quality: Clear, blurry, partial, obscured, frozen, covered?`,
                    `□ Lighting: Bright, dim, shadowed, overexposed?`,
                    `□ Angle: Top-down, side view, diagonal, cropped?`,
                    `□ Completeness: Full dish visible, partial, covered with frost/ice?`,
                    `→ Adapt analysis based on conditions (extract maximum information despite limitations)`,
                    ``,
                    `STEP 2: DEEP VISUAL ANALYSIS (Multi-Layer Inspection)`,
                    `Layer 1 - Surface Features:`,
                    `  • Color palette (precise hues, not just "brown" - golden-brown, caramelized, etc.)`,
                    `  • Texture patterns (crispy, creamy, flaky, crystallized, frosted)`,
                    `  • Surface moisture (glossy, matte, wet, dry, icy)`,
                    `  • Cooking method evidence (grilled marks, baked crust, fried edges, steamed condensation)`,
                    ``,
                    `Layer 2 - Structural Analysis:`,
                    `  • Shape and form (layered, mixed, molded, scattered, frozen block)`,
                    `  • Component arrangement (casserole layers, mixed ingredients, separated elements)`,
                    `  • Portion size estimation (individual serving, family size, bulk container)`,
                    `  • Container type (glass dish, metal tray, plastic container, ceramic bowl)`,
                    ``,
                    `Layer 3 - Ingredient Detection (Even if Obscured):`,
                    `  • Primary proteins visible (beef, chicken, pork, fish, tofu, legumes)`,
                    `  • Starch components (pasta shapes, rice grains, potatoes, bread)`,
                    `  • Vegetables (identify specific types even if partially visible)`,
                    `  • Cheese/dairy (melted, browned, creamy, frozen)`,
                    `  • Sauces/liquids (tomato-based, cream-based, broth, gravy)`,
                    `  • Toppings/garnishes (breadcrumbs, cheese crust, herbs, ice crystals)`,
                    ``,
                    `Layer 4 - Packaging/Label Analysis (if present):`,
                    `  • Brand name (read letter-by-letter, even if frosted or angled)`,
                    `  • Product name (exact wording, flavor variants)`,
                    `  • Size/weight (oz, g, lb, servings)`,
                    `  • Cooking instructions visible? (frozen meal indicators)`,
                    ``,
                    `STEP 3: CONTEXTUAL DEDUCTION (When Obscured/Frozen)`,
                    `If direct identification difficult:`,
                    `  1. Analyze cooking vessel (casserole dish = baked dish, metal pan = roasted/baked)`,
                    `  2. Look for partial ingredient visibility (cheese + pasta = likely mac and cheese or lasagna)`,
                    `  3. Check color combinations (red sauce + white cheese = Italian, brown sauce = gravy-based)`,
                    `  4. Assess preparation style (layered = lasagna/moussaka, mixed = casserole/stew)`,
                    `  5. If frozen: look through ice for shapes, colors, ingredient outlines`,
                    ``,
                    `STEP 4: CONFIDENCE-BASED NAMING`,
                    `High Confidence (>85%): Use specific name`,
                    `  ✅ "Beef Lasagna"`,
                    `  ✅ "Chicken and Rice Casserole"`,
                    `  ✅ "Frozen Shepherd's Pie"`,
                    ``,
                    `Medium Confidence (60-85%): Use descriptive category`,
                    `  ✅ "Pasta Bake with Meat and Cheese"`,
                    `  ✅ "Chicken Casserole with Vegetables"`,
                    `  ✅ "Frozen Pasta Dish"`,
                    ``,
                    `Lower Confidence (40-60%): Use generic but accurate`,
                    `  ✅ "Mixed Casserole"`,
                    `  ✅ "Baked Pasta Dish"`,
                    `  ✅ "Meat and Vegetable Bake"`,
                    ``,
                    `STEP 5: SPECIFICITY MAXIMIZATION`,
                    `□ Include cooking method if evident (Baked, Grilled, Roasted, Frozen)`,
                    `□ Include primary protein (Beef, Chicken, Turkey, Pork, Vegetarian)`,
                    `□ Include primary starch if visible (Pasta, Rice, Potato)`,
                    `□ Include sauce type if identifiable (Tomato, Cream, Cheese, Gravy)`,
                    `□ Brand/product name if packaged (exact spelling)`,
                    ``,
                    `CRITICAL EXAMPLES FOR COMPLEX/OBSCURED DISHES:`,
                    ``,
                    `Image: Casserole with golden-brown cheese top, pasta visible underneath`,
                    `→ "Baked Pasta Casserole with Cheese"`,
                    ``,
                    `Image: Frozen dish, ice crystals, orange sauce visible, pasta shapes`,
                    `→ "Frozen Pasta Bake with Tomato Sauce"`,
                    ``,
                    `Image: Layered dish, meat sauce between pasta sheets, white cheese top`,
                    `→ "Beef Lasagna"`,
                    ``,
                    `Image: Mixed dish, chicken pieces, rice, vegetables, creamy sauce`,
                    `→ "Chicken and Rice Casserole"`,
                    ``,
                    `Image: Partial view, shepherd's pie-style, mashed potato top, brown underneath`,
                    `→ "Shepherd's Pie"`,
                    ``,
                    `Image: Covered with ice, rectangular shape, red packaging visible`,
                    `→ Read brand name even through ice, or "Frozen Lasagna" if unreadable`,
                    ``,
                    `ACCURACY REQUIREMENTS (NON-NEGOTIABLE):`,
                    `• NEVER say "unknown" - deduce from visual evidence`,
                    `• NEVER be too generic ("food", "dish") - be specific to category at minimum`,
                    `• ALWAYS include preparation method if evident (Baked, Frozen, Grilled)`,
                    `• ALWAYS include primary ingredient if visible (even partially)`,
                    `• For obscured dishes: describe what IS visible, don't guess what isn't`,
                    `• For frozen dishes: mention "Frozen" and describe visible features`,
                    `• Maximum 12 words (increased for complex descriptions)`,
                    `• Prioritize: [Frozen/Baked/etc] + [Protein] + [Dish Type] + [Key Features]`,
                    ``,
                    `COMMON PITFALLS TO AVOID:`,
                    `❌ Too generic: "casserole" → ✅ "Beef and Pasta Casserole"`,
                    `❌ Giving up: "unclear dish" → ✅ "Mixed Vegetable and Meat Bake"`,
                    `❌ Ignoring context: "pasta" → ✅ "Baked Pasta with Cheese Topping"`,
                    `❌ Missing frozen state: "lasagna" → ✅ "Frozen Lasagna" (if iced over)`,
                    `❌ Vague: "meat dish" → ✅ "Beef Stew in Casserole Dish"`,
                    ``,
                    ``,
                    `REFERENCE DATA (cross-check with image):`,
                    `- Vision API detected: ${conceptNames.slice(0, 7).join(', ')}`,
                    `- Preliminary ID: "${identifiedDishName}"`,
                    `- Note: Use these as hints, but trust your visual analysis first`,
                    ``,
                    `FINAL OUTPUT: Return ONLY the verified identification (max 12 words).`,
                    `Format: [State] [Protein] [Dish Type] [Key Distinguisher]`,
                    `Example: "Frozen Beef Lasagna with Cheese Topping"`,
                    `NO explanations, NO uncertainty markers, JUST the name.`
                  ].filter(Boolean).join('\n');
                  
                  try {
                    console.log('🖼️ Using Claude 4.5 Vision to identify item directly from image...');
                    const imageBase64 = imageBuffer.toString('base64');
                    const idRaw = await callClaude(identificationPrompt, { 
                        maxTokens: 150, // Increased for complex descriptions
                        temperature: 0.0, // Absolute zero for maximum accuracy
                        retries: 3
                        // Uses Claude 4.5 Sonnet by default
                    }, { base64: imageBase64, mimeType: "image/jpeg" });
                    if (idRaw) {
                        const cleaned = idRaw.trim().replace(/^["']|["']$/g, '').replace(/\.$/, '');
                        if (cleaned && cleaned.length > 2 && cleaned.length < 100) {
                            refinedDishName = cleaned;
                            if (refinedDishName.toLowerCase() !== identifiedDishName.toLowerCase()) {
                                console.log(`🔍 AI OVERRIDE: Vision said "${identifiedDishName}" but Claude identified "${refinedDishName}"`);
                                // AI refinement handled silently for cleaner UX
                                
                                // CRITICAL: Re-fetch nutrition with the AI-identified name
                                console.log(`🔄 Re-fetching nutrition for AI-identified item: "${refinedDishName}"`);
                                let aiNutrition = await getNutritionData(refinedDishName);
                                if (!aiNutrition) aiNutrition = await getNutritionDataFromNutritionix(refinedDishName);
                                
                                if (aiNutrition) {
                                    // Replace nutrition data with AI-identified item's nutrition
                                    nutritionData.length = 0;
                                    nutritionData.push(aiNutrition);
                                    nutritionSources.length = 0;
                                    nutritionSources.push(aiNutrition.brand_name ? 'Nutritionix (AI-identified)' : 'USDA (AI-identified)');
                                    identifiedDishName = refinedDishName;
                                    console.log(`✅ Updated nutrition to AI-identified item: "${refinedDishName}"`);
                                } else {
                                    console.warn(`⚠️ Could not find nutrition for AI-identified "${refinedDishName}", keeping original`);
                                }
                            }
                        }
                    }
                  } catch (idErr) {
                    console.warn('AI identification override failed, using fusion result:', idErr);
                  }

                // Refresh concise nutrition after potential update
                const conciseNutrition = (() => {
                    try {
                        const n = nutritionData[0];
                        return {
                            name: n.food_name,
                            serving: { qty: n.serving_qty, unit: n.serving_unit, grams: n.serving_weight_grams },
                            macros: {
                                calories: n.nf_calories,
                                protein: n.nf_protein,
                                carbs: n.nf_total_carbohydrate,
                                fat: n.nf_total_fat,
                                fiber: n.nf_dietary_fiber,
                                sugars: n.nf_sugars,
                            }
                        };
                    } catch { return nutritionData[0]; }
                })();

                // METRIC 3 (Hallucination Reduction): Anti-hallucination prompt with strict fact-checking directives
                const analysisPrompt = [
                  `You are a board-certified nutritionist (RD, MS) with 15+ years clinical experience. Perform precision nutritional analysis.`,
                  ``,
                  `ABSOLUTE ACCURACY PROTOCOL:`,
                  `1. ZERO TOLERANCE for invented/estimated values - use ONLY data below`,
                  `2. CITE EXACT numbers with units - no rounding beyond 1 decimal place`,
                  `3. MENTION ONLY nutrients explicitly present in verified data`,
                  `4. NULL/missing values = DO NOT mention or infer`,
                  `5. Health score = MATHEMATICAL formula application only (no subjective adjustment)`,
                  `6. EVERY claim must trace to specific data point (cite-able)`,
                  `7. Cross-check: re-verify each statement against data before including`,
                  ``,
                  `FOOD IDENTIFICATION: "${identifiedDishName}"`,
                  `${finalFoodItems.length > 1 ? `Type: Multi-ingredient composite dish\nComponents: ${finalFoodItems.join(', ')}` : 'Type: Single food item'}`,
                  ``,
                  `VERIFIED USDA NUTRITION DATA (AUTHORITATIVE SOURCE):`,
                  `${JSON.stringify(conciseNutrition, null, 2)}`,
                  ``,
                  `HEALTH SCORE CALCULATION FORMULA (Apply with precision):`,
                  `Step 1: Base score = 50`,
                  `Step 2: Calorie adjustment`,
                  `  • <200 cal: +20 points`,
                  `  • 200-400 cal: +10 points`,
                  `  • 400-600 cal: 0 points`,
                  `  • >600 cal: -10 points`,
                  `Step 3: Protein adjustment`,
                  `  • >20g: +20 points`,
                  `  • 10-20g: +10 points`,
                  `  • <10g: -5 points`,
                  `Step 4: Fat adjustment`,
                  `  • <10g: +15 points`,
                  `  • 10-20g: +10 points`,
                  `  • 20-35g: 0 points`,
                  `  • >35g: -15 points`,
                  `Step 5: Fiber adjustment`,
                  `  • >5g: +15 points`,
                  `  • 2-5g: +10 points`,
                  `  • <2g: 0 points`,
                  `Step 6: Sugar adjustment`,
                  `  • <5g: +15 points`,
                  `  • 5-15g: +5 points`,
                  `  • >15g: -15 points`,
                  `Step 7: Sodium adjustment`,
                  `  • <200mg: +10 points`,
                  `  • 200-500mg: +5 points`,
                  `  • >500mg: -10 points`,
                  `Step 8: Final score = CLAMP(total, 1, 100)`,
                  ``,
                  `MANDATORY JSON OUTPUT FORMAT (pristine JSON, no markdown):`,
                  `{"description":"<Fact-based 1-2 sentence summary with EXACT values from data${finalFoodItems.length > 1 ? ', including key ingredients' : ''}>","healthScore":<integer 1-100 from formula>,"suggestions":["<specific actionable tip, max 10 words>","<specific actionable tip, max 10 words>"]}`,
                  ``,
                  `PRECISION EXAMPLES (for quality control):`,
                  `✅ MAXIMUM ACCURACY: "This Caesar Salad provides 245 calories, 8.2g protein, 42g carbohydrates, and contains 480mg sodium."`,
                  `✅ MAXIMUM ACCURACY: "With 12.5g protein and 3.1g fat, this delivers lean nutrition at 165 calories per serving."`,
                  `✅ MAXIMUM ACCURACY: "Contains 890 calories with 34g fat (52% of calories from fat) and 1,240mg sodium (54% DV)."`,
                  `❌ PROHIBITED: "Rich in vitamins and minerals" (vitamins not in data - HALLUCINATION)`,
                  `❌ PROHIBITED: "Approximately 250 calories" (must use exact: 245 calories)`,
                  `❌ PROHIBITED: "Good source of iron and zinc" (minerals not provided - SPECULATION)`,
                  `❌ PROHIBITED: "May support weight loss" (unverified health claim - INFERENCE)`,
                  `❌ PROHIBITED: "High in antioxidants" (antioxidants not measured - ASSUMPTION)`,
                  ``,
                  `${finalFoodItems.length > 1 ? 'COMPOSITE DISH NOTE: Describe aggregate nutritional profile from combined data. ' : ''}`,
                  `FINAL VERIFICATION: Review output - every number must match data exactly.`
                ].join('\n');                
                
                // Enhanced AI analysis with better error handling
                const analysisQuotaCheck = { allowed: true }; // Claude has generous limits
                
                if (!analysisQuotaCheck.allowed) {
                  console.log('⚠️ Skipping Claude AI analysis (quota exhausted) - using nutrition data only');
                  warnings.push('AI analysis temporarily unavailable: Using nutrition facts only.');
                } else {
                  let parsed: unknown | null = null;
                  let raw: unknown = null;
                  console.log('Attempting AI analysis with Claude...');
                  try {
                    raw = await callClaude(analysisPrompt, { 
                        maxTokens: 3000,  // Increased for comprehensive analysis
                        temperature: 0.0, // Absolute zero for maximum determinism and accuracy
                        retries: 3
                        // Use default model selection (haiku for text analysis)
                    });
                    console.log('✅ Claude API call successful');
                  } catch (claudeErr) {
                    console.error('❌ Claude analysis call failed after retries:', claudeErr);
                    // Provide helpful error context
                    const errorMsg = claudeErr instanceof Error ? claudeErr.message : String(claudeErr);
                    if (errorMsg.includes('API key')) {
                        warnings.push('AI analysis unavailable: API key issue. Contact administrator.');
                    } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
                        warnings.push('AI analysis unavailable: Model not accessible. Using nutrition data only.');
                    } else if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
                        warnings.push('AI analysis temporarily unavailable: Rate limit reached. Showing nutrition facts.');
                    } else {
                        warnings.push('AI analysis temporarily unavailable. Showing nutrition facts only.');
                    }
                    aiAnalysis = null;
                  }
                  
                  if (raw !== null) {
                    try {
                        parsed = parseModelJson(raw);
                        try {
                            const validated = validateAIAnalysis(parsed) as { description: string; healthScore: number; suggestions: string[] };
                            aiAnalysis = { description: validated.description, healthScore: validated.healthScore, suggestions: validated.suggestions };
                        } catch (strictErr) {
                            console.warn('Strict AI analysis validation failed; applying coercion:', strictErr);
                            const coerced = coerceAIAnalysis(parsed) as { description?: string; healthScore?: number; suggestions?: unknown };
                            aiAnalysis = {
                              description: (coerced.description && typeof coerced.description === 'string') ? coerced.description : 'Nutrition summary unavailable',
                              healthScore: (typeof coerced.healthScore === 'number') ? coerced.healthScore : 50,
                              suggestions: Array.isArray(coerced.suggestions) ? (coerced.suggestions as unknown[]).slice(0,2).map(String) : []
                            };
                            warnings.push('AI analysis normalized from non-standard format.');
                        }
                    } catch (parseErr) {
                        console.warn('AI analysis JSON parse failed; attempting reformat pass:', parseErr);
                        // Try a single reformat pass
                        try {
                            const reformatPrompt = `The previous response was not valid JSON. Extract or reformat it into EXACTLY this schema: {"description":"<evidence-based 1-sentence summary>","healthScore":<1-100>,"suggestions":["<tip 1>","<tip 2>"]}. Return ONLY the JSON object with no extra text.\n\nPrevious output:\n${String(raw)}`;
                            const reformatted = await callClaude(reformatPrompt, { maxTokens: 400, temperature: 0.0, retries: 1 });
                            try {
                                parsed = parseModelJson(reformatted);
                                const validated2 = validateAIAnalysis(parsed) as { description: string; healthScore: number; suggestions: string[] };
                                aiAnalysis = { description: validated2.description, healthScore: validated2.healthScore, suggestions: validated2.suggestions };
                                const cals = ('macros' in conciseNutrition) ? (conciseNutrition.macros?.calories || 0) : (nutritionData[0]?.nf_calories || 0);
                                const fat = ('macros' in conciseNutrition) ? (conciseNutrition.macros?.fat || 0) : (nutritionData[0]?.nf_total_fat || 0);
                                const sugars = ('macros' in conciseNutrition) ? (conciseNutrition.macros?.sugars || 0) : (nutritionData[0]?.nf_sugars || 0);
                                if (aiAnalysis && aiAnalysis.healthScore > 70 && (cals > 500 || fat > 30 || sugars > 20)) {
                                    aiAnalysis.healthScore = Math.min(aiAnalysis.healthScore, 65);
                                    warnings.push('AI health score adjusted based on nutrition data.');
                                }
                                warnings.push('AI analysis reformatted into JSON from model output.');
                            } catch (reparseErr) {
                                console.warn('Reformat attempt failed to produce valid JSON:', reparseErr);
                                const coerced2 = coerceAIAnalysis(raw) as { description?: string; healthScore?: number; suggestions?: unknown };
                                aiAnalysis = {
                                  description: (coerced2.description && typeof coerced2.description === 'string') ? coerced2.description : 'Nutrition summary unavailable',
                                  healthScore: (typeof coerced2.healthScore === 'number') ? coerced2.healthScore : 50,
                                  suggestions: Array.isArray(coerced2.suggestions) ? (coerced2.suggestions as unknown[]).slice(0,2).map(String) : []
                                };
                                warnings.push('AI analysis normalized from non-JSON model output.');
                            }
                        } catch (reformatErr) {
                            console.warn('Reformat attempt failed:', reformatErr);
                            const coerced3 = coerceAIAnalysis(raw) as { description?: string; healthScore?: number; suggestions?: unknown };
                            aiAnalysis = {
                              description: (coerced3.description && typeof coerced3.description === 'string') ? coerced3.description : 'Nutrition summary unavailable',
                              healthScore: (typeof coerced3.healthScore === 'number') ? coerced3.healthScore : 50,
                              suggestions: Array.isArray(coerced3.suggestions) ? (coerced3.suggestions as unknown[]).slice(0,2).map(String) : []
                            };
                            warnings.push('AI analysis normalized from non-JSON model output.');
                        }
                    }
                  }
                }
    } catch (err) {
        console.error('AI analysis unexpected error:', err);
        warnings.push('AI analysis temporarily unavailable.');
        aiAnalysis = null;
    }

    // METRIC 2 (Nutritional Plausibility): Enforce bounds checking on AI analysis
    // METRIC 3 (Hallucination Reduction): Cross-validate AI analysis against USDA nutrition data
    if (aiAnalysis) {
        console.log('Cross-validating AI analysis against USDA nutrition data...');
        const firstNutrition = nutritionData[0];
        const cals = firstNutrition?.nf_calories || 0;
        const protein = firstNutrition?.nf_protein || 0;
        const fat = firstNutrition?.nf_total_fat || 0;
        const sugars = firstNutrition?.nf_sugars || 0;
        const fiber = firstNutrition?.nf_dietary_fiber || 0;
        const sodium = firstNutrition?.nf_sodium || 0;

        const validationIssues: string[] = [];
        
        // METRIC 2: Nutritional Plausibility Checks (±10% tolerance from USDA data, ±5% if OCR available)
        // If AI mentions specific values in description, verify they're within acceptable range
    const descLower = aiAnalysis.description.toLowerCase();
        
        // Determine tolerance based on data source
        const hasOcrData = source.includes('OCR');
        const baseTolerance = hasOcrData ? 0.05 : 0.10; // ±5% for OCR, ±10% for concept fusion
        
        // Extract any calorie mentions from AI description and verify plausibility
        const calMatch = descLower.match(/(\d+)\s*(cal|kcal|calories?)/i);
        if (calMatch) {
            const aiCals = parseInt(calMatch[1]);
            const tolerance = baseTolerance; // TASK #6: Reduced from ±20% to ±10%/±5%
            const minAcceptable = cals * (1 - tolerance);
            const maxAcceptable = cals * (1 + tolerance);
            if (aiCals < minAcceptable || aiCals > maxAcceptable) {
                validationIssues.push(`AI calorie claim (${aiCals}) outside acceptable range (${Math.round(minAcceptable)}-${Math.round(maxAcceptable)} for actual ${Math.round(cals)}cal, tolerance: ±${(tolerance * 100).toFixed(0)}%)`);
                // Force correction in description
                aiAnalysis.description = aiAnalysis.description.replace(calMatch[0], `${Math.round(cals)}cal`);
                console.warn(`⚠️ Corrected hallucinated calorie value from ${aiCals} to ${Math.round(cals)} (tolerance: ±${(tolerance * 100).toFixed(0)}%)`);
            }
        }
        
        // Verify protein claims
        const proteinMatch = descLower.match(/(\d+\.?\d*)\s*g?\s*protein/i);
        if (proteinMatch) {
            const aiProtein = parseFloat(proteinMatch[1]);
            const proteinTolerance = hasOcrData ? 0.05 : 0.10; // TASK #6: Stricter bounds
            if (Math.abs(aiProtein - protein) > protein * proteinTolerance) {
                validationIssues.push(`AI protein claim (${aiProtein}g) deviates from actual (${protein?.toFixed(1)}g) beyond ±${(proteinTolerance * 100).toFixed(0)}% tolerance`);
            }
        }
        
        // Verify fat claims (TASK #6: New validation)
        const fatMatch = descLower.match(/(\d+\.?\d*)\s*g?\s*fat/i);
        if (fatMatch) {
            const aiFat = parseFloat(fatMatch[1]);
            const fatTolerance = hasOcrData ? 0.05 : 0.10;
            if (Math.abs(aiFat - fat) > fat * fatTolerance) {
                validationIssues.push(`AI fat claim (${aiFat}g) deviates from actual (${fat?.toFixed(1)}g) beyond ±${(fatTolerance * 100).toFixed(0)}% tolerance`);
            }
        }
        
        // Verify sugar claims (TASK #6: Critical for Weet-Bix scenario)
        const sugarMatch = descLower.match(/(\d+\.?\d*)\s*g?\s*(sugar|sugars)/i);
        if (sugarMatch) {
            const aiSugars = parseFloat(sugarMatch[1]);
            const sugarTolerance = hasOcrData ? 0.05 : 0.10;
            if (Math.abs(aiSugars - sugars) > Math.max(sugars * sugarTolerance, 1)) { // Min 1g absolute tolerance
                validationIssues.push(`AI sugar claim (${aiSugars}g) deviates from actual (${sugars?.toFixed(1)}g) beyond ±${(sugarTolerance * 100).toFixed(0)}% tolerance - CRITICAL HALLUCINATION RISK`);
                console.error(`🚨 SUGAR HALLUCINATION DETECTED: AI claimed ${aiSugars}g vs actual ${sugars?.toFixed(1)}g (${((Math.abs(aiSugars - sugars) / sugars) * 100).toFixed(0)}% error)`);
            }
        }

        // Calculate expected health score range based on nutritional values (METRIC 2)
        let expectedMinScore = 40;
        let expectedMaxScore = 70;

        // Adjust expectations based on nutrition profile
        if (cals < 200 && fat < 10 && sugars < 10 && fiber > 3) expectedMinScore = 60;
        if (cals < 150 && protein > 10 && fat < 5) expectedMinScore = 70;
        if (cals > 500 || fat > 30 || sugars > 20 || sodium > 800) expectedMaxScore = 55;
        if (cals > 700 || fat > 40 || sugars > 30 || sodium > 1200) expectedMaxScore = 45;
        
        // METRIC 2: Validate health score is within reasonable bounds (logging only, no capping)
        if (aiAnalysis.healthScore > expectedMaxScore) {
            validationIssues.push(`Health score ${aiAnalysis.healthScore} is high for this nutrition profile (expected max ${expectedMaxScore})`);
        }

        if (aiAnalysis.healthScore < expectedMinScore - 20) {
            validationIssues.push(`Health score ${aiAnalysis.healthScore} unexpectedly low (expected min ${expectedMinScore - 20})`);
        }
        
        // Additional plausibility check: healthScore should correlate with calorie density (logging only)
        if (cals > 600 && aiAnalysis.healthScore > 60) {
            validationIssues.push('High calorie food (>600) with health score >60 - verify accuracy');
        }
        if (cals < 100 && fiber > 3 && protein > 5 && aiAnalysis.healthScore < 70) {
            validationIssues.push('Low-cal, high-nutrient food may deserve higher score');
        }

        // METRIC 3: Validate description mentions key nutritional concerns (anti-hallucination)
        if (protein > 20 && !descLower.includes('protein')) {
            validationIssues.push('High protein (>20g) not mentioned - potential hallucination/omission');
        }
        if (sugars > 20 && !descLower.includes('sugar')) {
            validationIssues.push('High sugar (>20g) not mentioned - potential hallucination/omission');
        }
        if (fat > 30 && !descLower.includes('fat')) {
            validationIssues.push('High fat (>30g) not mentioned - potential hallucination/omission');
        }
        if (sodium > 1000 && !descLower.includes('sodium') && !descLower.includes('salt')) {
            validationIssues.push('High sodium (>1000mg) not mentioned - potential hallucination/omission');
        }

        // METRIC 3: Consistency check: health score vs suggestions (detect contradictory hallucinations)
    if (aiAnalysis.healthScore > 70 && aiAnalysis.suggestions.some((s: string) => s.toLowerCase().includes('limit') || s.toLowerCase().includes('reduce'))) {
            validationIssues.push('High health score contradicts cautionary suggestions - logical inconsistency detected');
        }
        
        // METRIC 3: Detect common hallucination patterns
        const hallucinationPatterns = [
            /rich in vitamins/i,
            /good source of minerals/i,
            /contains antioxidants/i,
            /heart.?healthy/i,
            /immune.?boosting/i,
            /anti.?inflammatory/i
        ];
        for (const pattern of hallucinationPatterns) {
            if (pattern.test(aiAnalysis.description) || aiAnalysis.suggestions.some((s: string) => pattern.test(s))) {
                // These claims can't be verified from USDA macronutrient data alone
                validationIssues.push(`Unverifiable health claim detected matching pattern: ${pattern.source} - likely hallucination`);
            }
        }

        if (validationIssues.length > 0) {
            console.warn(`⚠️ Validation found ${validationIssues.length} issue(s):`, validationIssues);
            // Validation improvements handled silently for cleaner UX
        } else {
            console.log('✅ AI analysis passed all accuracy validations (identification, plausibility, anti-hallucination)');
        }
    }

    // TASK #8: Pathway metadata for transparency
    const pathwayInfo = {
      pathway: source,
      timestamp: new Date().toISOString(),
      confidence: pathwayConfidence
    };

    // Generate accuracy context based on food type and detection method
    const accuracyContext = generateAccuracyContext(identifiedDishName, nutritionData, pathwayInfo);

    const responsePayload = {
        foodItems: [{ name: identifiedDishName, confidence: 1.0, source }],
        aiAnalysis,
        nutritionData,
        priceData: [],
        warnings,
        pathway: pathwayInfo, // TASK #8: Expose data source to frontend
        accuracyContext // NEW: Explain accuracy limitations and variability
    };
    
    // TASK #8: Log pathway used for debugging
    console.log(`📊 PATHWAY USED: ${source} (confidence: ${(pathwayInfo.confidence * 100).toFixed(0)}%)`);
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('CRITICAL ERROR:', errorMessage);
    
    // Provide user-friendly error messages for common API failures
    if (errorMessage.includes('Claude credits exhausted')) {
      return NextResponse.json({ 
        error: '💳 Claude AI credits exhausted', 
        details: 'Please add credits to your Anthropic account at https://console.anthropic.com/settings/billing to continue using NutriScan.',
        action: 'Add credits at console.anthropic.com'
      }, { status: 402 });
    }
    
    if (errorMessage.includes('Claude API quota exhausted')) {
      return NextResponse.json({ 
        error: '🚫 AI analysis quota reached', 
        details: errorMessage,
        action: 'Service will resume automatically on the reset date shown above'
      }, { status: 429 });
    }
    
    if (errorMessage.includes('Invalid ANTHROPIC_API_KEY')) {
      return NextResponse.json({ 
        error: '🔑 API configuration error', 
        details: 'Claude API key is invalid. Please check your environment configuration.',
        action: 'Contact system administrator'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: '⚠️ Failed to complete food analysis', 
      details: errorMessage 
    }, { status: 500 });
  }
}

// Define a specific type for healthImpact
interface HealthImpact {
  glycemicIndex?: number;
  glycemicLoad?: number;
  inflammatoryScore?: number;
}