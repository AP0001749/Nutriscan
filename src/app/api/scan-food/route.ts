import { NextRequest, NextResponse } from 'next/server';
import callGeminiWithRetry from '@/lib/gemini-client';
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

export const runtime = "nodejs";

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

    // --- Deterministic Fusion Engine ---
    console.log('Fusion Engine: Step 1 - High-Confidence Concept Generation...');
    const aiConcepts = await getAIConcepts(imageBuffer);
    if (!aiConcepts || aiConcepts.length === 0) {
        // Gracefully return a client error with clear message, rather than throwing
        return NextResponse.json({ error: 'No food items detected in image', details: 'Vision model returned no detectable concepts.' }, { status: 422 });
    }
    // EXTREME ACCURACY MODE: Require 98% confidence minimum
    const highConfidenceConcepts = aiConcepts
        .filter(c => c.confidence >= 0.98)
        .map(c => c.name.toLowerCase());

    if (highConfidenceConcepts.length > 0) {
        let bestMatch = { score: 0, item: null as typeof foodDatabase[0] | null };
        foodDatabase.forEach(item => {
            let score = 0;
            const keywords = item.keywords.map(k => k.toLowerCase());
            highConfidenceConcepts.forEach(concept => {
                if (keywords.includes(concept)) {
                    score++;
                }
            });
            if (score > bestMatch.score) {
                bestMatch = { score, item };
            }
        });

        if (bestMatch.score > 0 && bestMatch.item) {
            finalFoodItems = bestMatch.item.ingredients;
            identifiedDishName = bestMatch.item.name;
            source = "Sovereign Database";
            console.log(`Tier 1 Success. Matched: "${identifiedDishName}" with score ${bestMatch.score}.`);
        } else {
            // EXTREME MODE: Reject if no database match at 98%+ confidence
            console.log('Tier 1 match not found with 98%+ confidence. Rejecting scan.');
            return NextResponse.json({ 
                error: 'Unable to identify food with high confidence', 
                details: `Top concept "${aiConcepts[0].name}" at ${(aiConcepts[0].confidence * 100).toFixed(1)}% confidence does not meet 98% threshold. Please retake photo with better lighting and angle.` 
            }, { status: 422 });
        }
    } else {
        // EXTREME MODE: Reject if no 98%+ concepts found
        console.log('No 98%+ confidence concepts. Rejecting scan.');
        const topConcept = aiConcepts[0];
        return NextResponse.json({ 
            error: 'Food identification confidence too low', 
            details: `Highest confidence: "${topConcept.name}" at ${(topConcept.confidence * 100).toFixed(1)}%. Requires 98%+. Retake photo with clearer view of food.` 
        }, { status: 422 });
    }
    
    const nutritionPromises = finalFoodItems.map(name => getNutritionData(name));
    const nutritionResults = await Promise.all(nutritionPromises);
    const nutritionData: NutritionInfo[] = [];
    const warnings: string[] = [];
    nutritionResults.forEach((res, idx) => {
      if (res) nutritionData.push(res);
      else warnings.push(`Nutrition lookup failed for: ${finalFoodItems[idx]}`);
    });

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
                const analysisPrompt = [
                  `You are a professional nutritionist analyzing food based on USDA nutrition data. Be precise and evidence-based.`,
                  `Task: Analyze "${identifiedDishName}" with ingredients: ${finalFoodItems.join(', ')}.`,
                  `USDA Data: ${JSON.stringify(conciseNutrition)}`,
                  ``,
                  `Calculate healthScore (1-100) using these weighted factors:`,
                  `- Calories per serving: under 200=+20, 200-400=+10, over 400=-10`,
                  `- Protein %: >20%=+20, 10-20%=+10, <10%=-5`,
                  `- Fat %: <20%=+15, 20-35%=+10, >35%=-10`,
                  `- Fiber: >5g=+15, 2-5g=+10, <2g=0`,
                  `- Sugars: <5g=+15, 5-15g=+5, >15g=-15`,
                  `- Sodium: <200mg=+10, 200-500mg=+5, >500mg=-10`,
                  ``,
                  `Return ONLY valid JSON (no code fences, no prose):`,
                  `{"description":"Evidence-based 1-sentence health summary citing specific nutrients.","healthScore":<calculated 1-100>,"suggestions":["Data-driven tip 1","Data-driven tip 2"]}`,
                  ``,
                  `Example: {"description":"High in saturated fat (12g) and sodium (680mg); moderate protein (15g).","healthScore":45,"suggestions":["Limit to half serving","Choose low-sodium alternative"]}`,
                  ``,
                  `Base healthScore strictly on the provided USDA data. Keep suggestions actionable and under 8 words each.`
                ].join(' ');                // Try primary model
                let parsed: unknown | null = null;
                let raw: unknown = null;
                try {
                    raw = await callGeminiWithRetry(analysisPrompt, { maxTokens: 700, temperature: 0.2, retries: 2, responseMimeType: 'application/json' });
                } catch (gemErr) {
                    console.error('Gemini analysis call failed:', gemErr);
                    warnings.push('AI analysis provider unavailable. Showing nutrition facts only.');
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

    // EXTREME MODE: Cross-validate AI analysis against USDA nutrition data
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

        // Calculate expected health score range based on nutritional values
        let expectedMinScore = 40;
        let expectedMaxScore = 70;

        // Adjust expectations based on nutrition profile
        if (cals < 200 && fat < 10 && sugars < 10 && fiber > 3) expectedMinScore = 60;
        if (cals < 150 && protein > 10 && fat < 5) expectedMinScore = 70;
        if (cals > 500 || fat > 30 || sugars > 20 || sodium > 800) expectedMaxScore = 55;
        if (cals > 700 || fat > 40 || sugars > 30 || sodium > 1200) expectedMaxScore = 45;

        // Validate health score is within expected range
        if (aiAnalysis.healthScore > expectedMaxScore) {
            validationIssues.push(`Health score ${aiAnalysis.healthScore} too high (expected max ${expectedMaxScore} based on nutrition profile)`);
            aiAnalysis.healthScore = expectedMaxScore;
            console.warn(`⚠️ Adjusted health score down to ${expectedMaxScore}`);
        }

        if (aiAnalysis.healthScore < expectedMinScore - 20) {
            validationIssues.push(`Health score ${aiAnalysis.healthScore} unexpectedly low (expected min ${expectedMinScore - 20})`);
        }

        // Validate description mentions key nutritional concerns
        const descLower = aiAnalysis.description.toLowerCase();
        if (protein > 20 && !descLower.includes('protein')) {
            validationIssues.push('High protein (>20g) not mentioned');
        }
        if (sugars > 20 && !descLower.includes('sugar')) {
            validationIssues.push('High sugar (>20g) not mentioned');
        }
        if (fat > 30 && !descLower.includes('fat')) {
            validationIssues.push('High fat (>30g) not mentioned');
        }
        if (sodium > 1000 && !descLower.includes('sodium') && !descLower.includes('salt')) {
            validationIssues.push('High sodium (>1000mg) not mentioned');
        }

        // Consistency check: health score vs suggestions
        if (aiAnalysis.healthScore > 70 && aiAnalysis.suggestions.some(s => s.toLowerCase().includes('limit') || s.toLowerCase().includes('reduce'))) {
            validationIssues.push('High health score contradicts cautionary suggestions');
        }

        if (validationIssues.length > 0) {
            console.warn(`⚠️ Cross-validation found ${validationIssues.length} issue(s):`, validationIssues);
            warnings.push(`AI analysis adjusted for consistency with nutrition data (${validationIssues.length} correction${validationIssues.length > 1 ? 's' : ''})`);
        } else {
            console.log('✅ AI analysis validated against USDA data - no issues found');
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