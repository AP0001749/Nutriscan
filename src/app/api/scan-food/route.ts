import { NextRequest, NextResponse } from 'next/server';
import callGeminiWithRetry from '@/lib/gemini-client';
import { normalizeDishName } from '@/lib/dish-synonyms';
import { parseModelJson, validateAIAnalysis, coerceAIAnalysis } from '@/lib/ai-output';
import { NutritionInfo } from '@/lib/types';
import { getHealthData, calculateGlycemicLoad } from '@/lib/health-data';
import { foodDatabase } from '@/lib/food-data';

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

// --- SELF-CONTAINED HELPER FUNCTIONS ---
async function getNutritionData(foodName: string): Promise<NutritionInfo | null> {
    const USDA_API_KEY = process.env.USDA_API_KEY;
    if (!USDA_API_KEY) {
        console.warn('USDA API key is missing.');
        return null;
    }
    try {
        const searchResponse = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&api_key=${USDA_API_KEY}`);
        if (!searchResponse.ok) return null;
        const searchData = await searchResponse.json() as UsdaSearchResponse;
        if (!searchData.foods || searchData.foods.length === 0) return null;

        const food = searchData.foods[0];
        const detailsResponse = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${food.fdcId}?api_key=${USDA_API_KEY}`);
        if (!detailsResponse.ok) return null;
        const detailsData = await detailsResponse.json() as UsdaDetailsResponse;
        
        const getNutrient = (id: number) => detailsData.foodNutrients.find((n: { nutrient: { id: number; }; }) => n.nutrient.id === id)?.amount || null;
        const carbs = getNutrient(1005) || 0;
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
        const response = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-id': NUTRITIONIX_APP_ID,
                'x-app-key': NUTRITIONIX_API_KEY,
            },
            body: JSON.stringify({ query: foodName })
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
        return {
            food_name: food.food_name,
            brand_name: food.brand_name || null,
            serving_qty: food.serving_qty,
            serving_unit: food.serving_unit,
            serving_weight_grams: food.serving_weight_grams,
            nf_calories: food.nf_calories,
            nf_total_fat: food.nf_total_fat,
            nf_saturated_fat: food.nf_saturated_fat,
            nf_cholesterol: food.nf_cholesterol,
            nf_sodium: food.nf_sodium,
            nf_total_carbohydrate: food.nf_total_carbohydrate,
            nf_dietary_fiber: food.nf_dietary_fiber,
            nf_sugars: food.nf_sugars,
            nf_protein: food.nf_protein,
            nf_potassium: food.nf_potassium,
            nf_p: food.nf_p,
            healthData: healthImpact,
        };
    } catch (error) {
        console.error(`Nutritionix fallback error for "${foodName}":`, error);
        return null;
    }
}

// MAX ACCURACY MODE: Ask Gemini to estimate a typical ingredient breakdown for a dish
async function estimateRecipeComposition(dishName: string, conceptNames: string[]): Promise<Array<{ name: string; percent: number }>> {
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
        const raw = await callGeminiWithRetry(prompt, { maxTokens: 300, temperature: 0.2, retries: 2, responseMimeType: 'application/json' });
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

async function getAIConcepts(imageBuffer: Buffer): Promise<{name: string, confidence: number}[]> {
    const CLARIFAI_API_KEY = process.env.CLARIFAI_API_KEY;
    if (!CLARIFAI_API_KEY) { return []; }
    try {
        const response = await fetch('https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs', {
            method: 'POST',
            headers: { 'Authorization': `Key ${CLARIFAI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: [{ data: { image: { base64: imageBuffer.toString('base64') } } }] })
        });
        if (!response.ok) return [];
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

    // --- PRAETORIAN FUSION ENGINE: Multi-Concept Primary Intelligence ---
    console.log('🔱 Fusion Engine: Step 1 - Multi-Concept Extraction from Vision API...');
    const aiConcepts = await getAIConcepts(imageBuffer);
    if (!aiConcepts || aiConcepts.length === 0) {
        return NextResponse.json({ error: 'No food items detected in image', details: 'Vision model returned no detectable concepts.' }, { status: 422 });
    }
    
    // Extract top 5 high-confidence concepts (≥60% threshold for better coverage)
    const topConcepts = aiConcepts
        .filter(c => c.confidence >= 0.60)
        .slice(0, 5);
    
    if (topConcepts.length === 0) {
        // Absolute fallback: use top 3 even if confidence is low
        topConcepts.push(...aiConcepts.slice(0, 3));
        warnings.push(`Low vision confidence (${(aiConcepts[0].confidence * 100).toFixed(0)}%) - results may vary`);
    }
    
    const conceptNames = topConcepts.map(c => c.name);
    const conceptsDisplay = topConcepts.map(c => `${c.name} (${(c.confidence * 100).toFixed(0)}%)`).join(', ');
    console.log(`Vision API returned ${aiConcepts.length} concepts → Using top ${topConcepts.length}: ${conceptsDisplay}`);
    
    // --- PRAETORIAN FUSION ENGINE: Gemini Synthesis (PRIMARY, NOT FALLBACK) ---
    console.log('🔱 Fusion Engine: Step 2 - Gemini Multi-Concept Synthesis...');
    
    try {
        const fusionPrompt = [
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
        ].join('\n');
        
        const synthesizedDish = await callGeminiWithRetry(fusionPrompt, {
            maxTokens: 30,
            temperature: 0.15, // Very low for deterministic naming
            retries: 3
        });
        
    // Clean response (with null safety) and normalize to canonical dish
    identifiedDishName = (synthesizedDish || topConcepts[0].name).trim().replace(/^["']|["']$/g, '').replace(/\.$/, '');
    identifiedDishName = normalizeDishName(identifiedDishName);
        
        // Validate output is reasonable (not empty, not too long, not just repeating input)
        if (!identifiedDishName || identifiedDishName.length < 3 || identifiedDishName.length > 100) {
            throw new Error(`Invalid fusion output: "${identifiedDishName}"`);
        }
        
        finalFoodItems = conceptNames; // All concepts contribute to nutrition lookup
        source = "Gemini Fusion Engine (Primary)";
        
        console.log(`✅ Fusion Engine: Synthesized "${identifiedDishName}" from [${conceptNames.join(', ')}]`);
        
        // Only add warning if we had to use low-confidence concepts
        if (topConcepts[0].confidence < 0.75) {
            warnings.push(`Multi-concept fusion used (primary vision confidence: ${(topConcepts[0].confidence * 100).toFixed(0)}%)`);
        }
        
    } catch (fusionError) {
        // Fallback: Use database matching ONLY if Gemini fails
        console.error('❌ Fusion Engine failed, falling back to database matching:', fusionError);
        
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
            source = "Database Fallback";
            console.log(`✅ Database fallback: "${identifiedDishName}" (score: ${bestMatch.score.toFixed(1)})`);
        } else {
            // Last resort: use top concept
            identifiedDishName = normalizeDishName(topConcepts[0].name);
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
            console.log('⚠️ Gemini did not return a valid composition. Falling back to components...');
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

    let aiAnalysis;
    try {
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
                  `You are a professional nutritionist analyzing food using ONLY the provided USDA nutrition data. CRITICAL RULES:`,
                  `1. DO NOT invent, estimate, or assume ANY nutritional values not present in the data below`,
                  `2. DO NOT mention nutrients or values that are not explicitly provided`,
                  `3. ONLY cite exact numbers from the USDA data - never round significantly or extrapolate`,
                  `4. If a nutrient value is null/missing, DO NOT mention it or guess its value`,
                  `5. Base your health score EXCLUSIVELY on the metrics provided, using the formula below`,
                  ``,
                  `Food Being Analyzed: "${identifiedDishName}"`,
                  `${finalFoodItems.length > 1 ? `This is a composite dish with ingredients: ${finalFoodItems.join(', ')}` : 'This is a single food item'}`,
                  ``,
                  `USDA NUTRITION DATA (THE ONLY SOURCE OF TRUTH):`,
                  `${JSON.stringify(conciseNutrition, null, 2)}`,
                  ``,
                  `HEALTH SCORE CALCULATION FORMULA (Apply strictly, showing your work):`,
                  `Base score = 50`,
                  `+ Calories: <200cal=+20, 200-400=+10, 400-600=0, >600=-10`,
                  `+ Protein: >20g=+20, 10-20g=+10, <10g=-5`,
                  `+ Fat: <10g=+15, 10-20g=+10, 20-35g=0, >35g=-15`,
                  `+ Fiber: >5g=+15, 2-5g=+10, <2g=0`,
                  `+ Sugars: <5g=+15, 5-15g=+5, >15g=-15`,
                  `+ Sodium: <200mg=+10, 200-500mg=+5, >500mg=-10`,
                  `Final score = CLAMP(calculated value, 1, 100)`,
                  ``,
                  `REQUIRED OUTPUT FORMAT (valid JSON only, no markdown, no code blocks):`,
                  `{"description":"<1-2 sentences citing ONLY the nutrient values from the data above${finalFoodItems.length > 1 ? ', mentioning key ingredients' : ''}>","healthScore":<number 1-100 calculated using formula>,"suggestions":["<actionable tip 1, max 10 words>","<actionable tip 2, max 10 words>"]}`,
                  ``,
                  `ANTI-HALLUCINATION EXAMPLES:`,
                  `✅ CORRECT: "Contains 245 calories with 8g protein and 42g carbs; moderate sodium at 480mg."`,
                  `❌ WRONG: "Rich in vitamins and minerals" (not in data)`,
                  `❌ WRONG: "Approximately 250 calories" (must use exact value: 245)`,
                  `❌ WRONG: "Good source of iron" (iron not provided in data)`,
                  ``,
                  `${finalFoodItems.length > 1 ? 'For composite dishes, describe the combined nutritional profile using the aggregate USDA data. ' : ''}Ensure every claim is traceable to a specific value in the JSON data above.`
                ].join('\n');                
                
                // Enhanced AI analysis with better error handling
                let parsed: unknown | null = null;
                let raw: unknown = null;
                
                console.log('Attempting AI analysis with Gemini...');
                try {
                    raw = await callGeminiWithRetry(analysisPrompt, { 
                        maxTokens: 1200,  // Increased for multi-ingredient analysis
                        temperature: 0.3, 
                        retries: 3, // Increased retries
                        responseMimeType: 'application/json' 
                    });
                    console.log('✅ Gemini API call successful');
                } catch (gemErr) {
                    console.error('❌ Gemini analysis call failed after retries:', gemErr);
                    // Provide helpful error context
                    const errorMsg = gemErr instanceof Error ? gemErr.message : String(gemErr);
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
                            aiAnalysis = validateAIAnalysis(parsed);
                        } catch (strictErr) {
                            console.warn('Strict AI analysis validation failed; applying coercion:', strictErr);
                            aiAnalysis = coerceAIAnalysis(parsed);
                            warnings.push('AI analysis normalized from non-standard format.');
                        }
                    } catch (parseErr) {
                        console.warn('AI analysis JSON parse failed; attempting reformat pass:', parseErr);
                        // Try a single reformat pass: ask the model to convert its previous reply into strict JSON
                        try {
                            const reformatPrompt = `The previous response was not valid JSON. Extract or reformat it into EXACTLY this schema: {"description":"<evidence-based 1-sentence summary>","healthScore":<1-100>,"suggestions":["<tip 1>","<tip 2>"]}. Return ONLY the JSON object with no extra text.\n\nPrevious output:\n${String(raw)}`;
                            const reformatted = await callGeminiWithRetry(reformatPrompt, { maxTokens: 400, temperature: 0.0, retries: 1, responseMimeType: 'application/json' });
                            try {
                                parsed = parseModelJson(reformatted);
                                aiAnalysis = validateAIAnalysis(parsed);
                                // Validate healthScore is reasonable given nutrition data
                                const cals = ('macros' in conciseNutrition) ? (conciseNutrition.macros?.calories || 0) : (nutritionData[0]?.nf_calories || 0);
                                const fat = ('macros' in conciseNutrition) ? (conciseNutrition.macros?.fat || 0) : (nutritionData[0]?.nf_total_fat || 0);
                                const sugars = ('macros' in conciseNutrition) ? (conciseNutrition.macros?.sugars || 0) : (nutritionData[0]?.nf_sugars || 0);
                                // If healthScore seems too high given unhealthy macros, cap it
                                if (aiAnalysis.healthScore > 70 && (cals > 500 || fat > 30 || sugars > 20)) {
                                    aiAnalysis.healthScore = Math.min(aiAnalysis.healthScore, 65);
                                    warnings.push('AI health score adjusted based on nutrition data.');
                                }
                                warnings.push('AI analysis reformatted into JSON from model output.');
                            } catch (reparseErr) {
                                console.warn('Reformat attempt failed to produce valid JSON:', reparseErr);
                                aiAnalysis = coerceAIAnalysis(raw);
                                warnings.push('AI analysis normalized from non-JSON model output.');
                            }
                        } catch (reformatErr) {
                            console.warn('Reformat attempt failed:', reformatErr);
                            aiAnalysis = coerceAIAnalysis(raw);
                            warnings.push('AI analysis normalized from non-JSON model output.');
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
        
        // METRIC 2: Nutritional Plausibility Checks (±20% tolerance from USDA data)
        // If AI mentions specific values in description, verify they're within acceptable range
        const descLower = aiAnalysis.description.toLowerCase();
        
        // Extract any calorie mentions from AI description and verify plausibility
        const calMatch = descLower.match(/(\d+)\s*(cal|kcal|calories?)/i);
        if (calMatch) {
            const aiCals = parseInt(calMatch[1]);
            const tolerance = 0.20; // ±20% tolerance
            const minAcceptable = cals * (1 - tolerance);
            const maxAcceptable = cals * (1 + tolerance);
            if (aiCals < minAcceptable || aiCals > maxAcceptable) {
                validationIssues.push(`AI calorie claim (${aiCals}) outside acceptable range (${Math.round(minAcceptable)}-${Math.round(maxAcceptable)} for actual ${Math.round(cals)}cal)`);
                // Force correction in description
                aiAnalysis.description = aiAnalysis.description.replace(calMatch[0], `${Math.round(cals)}cal`);
                console.warn(`⚠️ Corrected hallucinated calorie value from ${aiCals} to ${Math.round(cals)}`);
            }
        }
        
        // Verify protein claims
        const proteinMatch = descLower.match(/(\d+\.?\d*)\s*g?\s*protein/i);
        if (proteinMatch) {
            const aiProtein = parseFloat(proteinMatch[1]);
            if (Math.abs(aiProtein - protein) > protein * 0.25) {
                validationIssues.push(`AI protein claim (${aiProtein}g) deviates significantly from actual (${protein?.toFixed(1)}g)`);
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
        
        // METRIC 2: Enforce plausible health score bounds
        if (aiAnalysis.healthScore > expectedMaxScore) {
            validationIssues.push(`Health score ${aiAnalysis.healthScore} implausibly high (max ${expectedMaxScore} for nutrition profile)`);
            aiAnalysis.healthScore = expectedMaxScore;
            console.warn(`⚠️ Capped health score to ${expectedMaxScore} (nutritional plausibility enforcement)`);
        }

        if (aiAnalysis.healthScore < expectedMinScore - 20) {
            validationIssues.push(`Health score ${aiAnalysis.healthScore} unexpectedly low (expected min ${expectedMinScore - 20})`);
        }
        
        // Additional plausibility check: healthScore should correlate with calorie density
        if (cals > 600 && aiAnalysis.healthScore > 60) {
            validationIssues.push('High calorie food (>600) cannot have health score >60');
            aiAnalysis.healthScore = Math.min(aiAnalysis.healthScore, 55);
        }
        if (cals < 100 && fiber > 3 && protein > 5 && aiAnalysis.healthScore < 70) {
            validationIssues.push('Low-cal, high-nutrient food deserves higher score');
            aiAnalysis.healthScore = Math.max(aiAnalysis.healthScore, 70);
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
        if (aiAnalysis.healthScore > 70 && aiAnalysis.suggestions.some(s => s.toLowerCase().includes('limit') || s.toLowerCase().includes('reduce'))) {
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
            if (pattern.test(aiAnalysis.description) || aiAnalysis.suggestions.some(s => pattern.test(s))) {
                // These claims can't be verified from USDA macronutrient data alone
                validationIssues.push(`Unverifiable health claim detected matching pattern: ${pattern.source} - likely hallucination`);
            }
        }

        if (validationIssues.length > 0) {
            console.warn(`⚠️ Validation found ${validationIssues.length} issue(s):`, validationIssues);
            warnings.push(`AI analysis validated and corrected (${validationIssues.length} accuracy improvement${validationIssues.length > 1 ? 's' : ''})`);
        } else {
            console.log('✅ AI analysis passed all accuracy validations (identification, plausibility, anti-hallucination)');
        }
    }

    const responsePayload = {
        foodItems: [{ name: identifiedDishName, confidence: 1.0, source }],
        aiAnalysis,
        nutritionData,
        priceData: [],
        warnings
    };
    return NextResponse.json(responsePayload);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('CRITICAL ERROR:', errorMessage);
    return NextResponse.json({ error: 'Failed to complete food analysis', details: errorMessage }, { status: 500 });
  }
}

// Define a specific type for healthImpact
interface HealthImpact {
  glycemicIndex?: number;
  glycemicLoad?: number;
  inflammatoryScore?: number;
}