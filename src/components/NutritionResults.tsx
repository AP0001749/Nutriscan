"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Star, Utensils, HeartPulse, Flame, BrainCircuit, Lightbulb, CheckCircle, AlertTriangle, Scale, Gauge, ListChecks } from "lucide-react";
import { NutritionInfo } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

// --- TYPE DEFINITIONS ---
interface FoodRecognitionResult {
  name: string;
  confidence: number;
}

interface ScanResults {
  foodItems: FoodRecognitionResult[];
  // aiAnalysis may be null when the AI provider failed to return a result.
  aiAnalysis: {
    description: string;
    healthScore: number;
    suggestions: string[];
  } | null;
  nutritionData: NutritionInfo[];
  warnings?: string[];
}

interface NutritionResultsProps {
  results: ScanResults;
  onClear: () => void;
}

// --- SUB-COMPONENTS (DEFINED ONCE, BEFORE USE) ---

const HealthScoreRing = ({ score }: { score: number }) => {
    const radius = 60;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const progress = Math.max(0, Math.min(score, 100));
    const offset = circumference - (progress / 100) * circumference;

    let color = "hsl(var(--primary))"; // Green
    if (score < 75) color = "hsl(48, 96%, 51%)"; // Yellow
    if (score < 50) color = "hsl(29, 96%, 51%)"; // Orange
    if (score < 30) color = "hsl(var(--destructive))"; // Red

    return (
      <div className="relative w-36 h-36 flex items-center justify-center animate-in fade-in duration-500">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: color, stopOpacity:1}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity:1}} />
            </linearGradient>
          </defs>
          <circle className="text-border" stroke="currentColor" strokeOpacity="0.3" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius}/>
          <circle
            stroke="url(#ringGradient)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.5s ease-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
            filter="url(#glow)"
          />
        </svg>
        <span className="absolute text-4xl font-bold" style={{ color: color, textShadow: `0 0 10px ${color}` }}>{score}</span>
      </div>
    );
};

const NutrientCard = ({ label, value, unit, icon: Icon, color }: { label: string, value: number | null | undefined, unit: string, icon: React.ElementType, color: string }) => {
  const hasValue = value !== null && value !== undefined && !Number.isNaN(Number(value));
  const display = hasValue ? Number(value).toFixed(0) : 'N/A';
  return (
  <div className="bg-muted/50 p-4 rounded-xl text-center border border-white/10">
    <Icon className={`w-7 h-7 mx-auto mb-2 ${color}`} />
    <span className="text-2xl font-bold text-foreground">{display}</span>
    {hasValue ? <span className="text-xs text-muted-foreground ml-1">{unit}</span> : <span className="text-xs text-muted-foreground ml-1">&nbsp;</span>}
    <p className="text-sm font-medium text-muted-foreground mt-1">{label}</p>
  </div>
  );
};

const MicroNutrientRow = ({ label, value, unit }: { label: string, value: number | null | undefined, unit: string }) => {
  const hasValue = value !== null && value !== undefined && !Number.isNaN(Number(value));
  const display = hasValue ? Number(value).toFixed(1) : 'N/A';
  return (
  <li className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{display}{hasValue ? ` ${unit}` : ''}</span>
  </li>
  );
};

const NutritionTable = ({ data }: { data: NutritionInfo }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center"><Star className="w-5 h-5 mr-2 text-yellow-400"/>Macronutrients</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <NutrientCard label="Calories" value={data.nf_calories} unit="kcal" icon={Flame} color="text-red-400" />
                <NutrientCard label="Protein" value={data.nf_protein} unit="g" icon={Utensils} color="text-orange-400" />
                <NutrientCard label="Carbs" value={data.nf_total_carbohydrate} unit="g" icon={BrainCircuit} color="text-blue-400" />
                <NutrientCard label="Fat" value={data.nf_total_fat} unit="g" icon={HeartPulse} color="text-purple-400" />
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center"><Activity className="w-5 h-5 mr-2 text-accent"/>Micronutrients & More</h3>
            <ul className="space-y-2 text-sm">
                <MicroNutrientRow label="Saturated Fat" value={data.nf_saturated_fat} unit="g" />
                <MicroNutrientRow label="Sugars" value={data.nf_sugars} unit="g" />
                <MicroNutrientRow label="Dietary Fiber" value={data.nf_dietary_fiber} unit="g" />
                <MicroNutrientRow label="Sodium" value={data.nf_sodium} unit="mg" />
                <MicroNutrientRow label="Potassium" value={data.nf_potassium} unit="mg" />
                <MicroNutrientRow label="Cholesterol" value={data.nf_cholesterol} unit="mg" />
            </ul>
        </div>
    </div>
);

const HealthImpactSection = ({ healthData }: { healthData: NutritionInfo['healthData'] }) => {
  const getScoreStyling = (score: number, type: 'gi' | 'inflammatory') => {
    if (type === 'gi') {
        if (score <= 55) return { text: 'text-green-400', bg: 'bg-green-500', label: 'Low' };
        if (score <= 69) return { text: 'text-yellow-400', bg: 'bg-yellow-500', label: 'Medium' };
        return { text: 'text-red-400', bg: 'bg-red-500', label: 'High' };
    }
    if (score < 0) return { text: 'text-green-400', bg: 'bg-green-500/20', label: 'Anti-inflammatory' };
    if (score > 0) return { text: 'text-red-400', bg: 'bg-red-500/20', label: 'Pro-inflammatory' };
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Neutral' };
  };

  const giStyling = healthData?.glycemicIndex !== undefined ? getScoreStyling(healthData.glycemicIndex, 'gi') : null;
  const inflammatoryStyling = healthData?.inflammatoryScore !== undefined ? getScoreStyling(healthData.inflammatoryScore, 'inflammatory') : null;

  return (
    <div className="space-y-6">
      {giStyling && healthData?.glycemicIndex !== undefined && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-muted-foreground">Glycemic Index</h4>
            <span className={`font-bold text-lg ${giStyling.text}`}>{healthData.glycemicIndex} <Badge variant="outline" className={`${giStyling.text} border-current`}>{giStyling.label}</Badge></span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className={`${giStyling.bg} h-2.5 rounded-full`} style={{ width: `${Math.min(healthData.glycemicIndex, 100)}%` }} />
          </div>
        </div>
      )}
       {healthData?.glycemicLoad !== undefined && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-muted-foreground">Glycemic Load</h4>
              <span className="font-bold text-lg text-foreground">{healthData.glycemicLoad}</span>
            </div>
             <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.min((healthData.glycemicLoad / 40) * 100, 100)}%` }}/>
            </div>
          </div>
        )}
      {inflammatoryStyling && (
        <div className="flex justify-between items-center p-4 bg-muted/50 rounded-xl">
          <h4 className="font-semibold text-muted-foreground">Inflammatory Profile</h4>
          <Badge className={`${inflammatoryStyling.bg} ${inflammatoryStyling.text} text-sm`}>
            {inflammatoryStyling.label}
          </Badge>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function NutritionResults({ results, onClear }: NutritionResultsProps) {
  const { foodItems, aiAnalysis, nutritionData, warnings } = results;
  const [activeTab, setActiveTab] = useState<'nutrition' | 'health'>('nutrition');
  const [isLogging, setIsLogging] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | null>(null);
  const [viewBasis, setViewBasis] = useState<'serving' | '100g'>('serving');
  const [servings, setServings] = useState<number>(1);
  const { toast, ToastContainer } = useToast();
  const topFood = nutritionData && nutritionData.length > 0 ? nutritionData[0] : undefined;
  const effectiveWarnings = useMemo(() => {
    const list = [...(warnings || [])];
    const desc = aiAnalysis?.description?.toLowerCase() || '';
    const mentionsTruncation = desc.includes('max tokens') || desc.includes('truncated');
    if (mentionsTruncation) {
      return list.filter(w => !w.toLowerCase().includes('normalized'));
    }
    return list;
  }, [warnings, aiAnalysis]);

  // Prevent raw JSON or oversized blobs from appearing in the description
  const normalizeDescription = (s: string | undefined | null): string => {
    if (!s) return '';
    const t = String(s).trim();
    if (!t) return '';
    // Heuristic: if it looks like JSON or contains Gemini metadata, hide it behind a friendly message
    if (t.startsWith('{') || t.startsWith('[') || t.includes('"candidates"') || t.includes('finishReason')) {
      return 'AI returned a non-standard response. Showing nutrition facts below.';
    }
    return t.length > 600 ? t.slice(0, 600) + '…' : t;
  };

  const handleLogMeal = async () => {
    if (!selectedMealType) {
      toast({ title: "Selection Required", description: "Please select a meal type.", variant: "error" });
      return;
    }
    setIsLogging(true);
    try {
      const mealName = foodItems.map((item) => item.name).join(', ');
      const response = await fetch('/api/log-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealType: selectedMealType,
          mealName: mealName,
          foods: nutritionData,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to log meal.');
      
      toast({
        title: "Meal Logged!",
        description: `${selectedMealType} saved to your dashboard.`,
        variant: "success",
      });
      setTimeout(onClear, 1500);

    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Logging Failed", description: msg, variant: "error" });
    } finally {
      setIsLogging(false);
    }
  };

  // Helpers for scaling and macro distribution
  const scale = (val: number | null | undefined): number | null => {
    if (val === null || val === undefined) return null;
    const base = Number(val);
    if (Number.isNaN(base)) return null;
    // Convert per 100g if requested and we have serving_weight_grams
    if (viewBasis === '100g') {
      const grams = topFood?.serving_weight_grams ?? 100;
      if (!grams || grams === 0) return base; // fallback: show raw
      return (base / grams) * 100 * servings;
    }
    // per serving
    return base * servings;
  };

  const macro = topFood ? {
    protein: Math.max(0, scale(topFood.nf_protein) ?? 0),
    carbs: Math.max(0, scale(topFood.nf_total_carbohydrate) ?? 0),
    fat: Math.max(0, scale(topFood.nf_total_fat) ?? 0)
  } : { protein: 0, carbs: 0, fat: 0 };
  const macroTotal = macro.protein + macro.carbs + macro.fat || 1;
  const macroPct = {
    protein: Math.round((macro.protein / macroTotal) * 100),
    carbs: Math.round((macro.carbs / macroTotal) * 100),
    fat: Math.round((macro.fat / macroTotal) * 100)
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header / Summary Card */}
      <Card className="w-full max-w-4xl mx-auto overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {aiAnalysis ? (
              <HealthScoreRing score={aiAnalysis.healthScore} />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center">
                <Badge variant="outline" className="px-3 py-2">AI Analysis Unavailable</Badge>
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="border-accent/20 bg-accent/10 text-accent-foreground">AI Health Score</Badge>
                {effectiveWarnings && effectiveWarnings.length > 0 && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/40"><AlertTriangle className="h-3.5 w-3.5 mr-1"/>Warnings</Badge>
                )}
              </div>
              <CardTitle className="text-3xl font-extrabold text-gradient">
                {foodItems.map((item) => item.name).join(', ')}
              </CardTitle>
              <CardDescription className="mt-2 text-base text-muted-foreground break-words whitespace-pre-wrap">
                {normalizeDescription(aiAnalysis?.description) || 'AI analysis unavailable for this meal.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Detected Items and Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center"><ListChecks className="h-4 w-4 mr-2"/>Detected Items</h3>
              <div className="flex flex-wrap gap-2">
                {foodItems.map((f, idx) => (
                  <Badge key={idx} variant="outline" className="border-border/60">
                    {f.name}
                  </Badge>
                ))}
              </div>
              {effectiveWarnings && effectiveWarnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {effectiveWarnings.map((w, i) => (
                    <div key={i} className="text-xs text-yellow-400/90 flex items-start"><AlertTriangle className="h-4 w-4 mr-2 mt-0.5"/>{w}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center"><Scale className="h-4 w-4 mr-2"/>View Options</h3>
              <div className="flex gap-2">
                <Button variant={viewBasis === 'serving' ? 'default' : 'secondary'} size="sm" onClick={() => setViewBasis('serving')}>Per Serving</Button>
                <Button variant={viewBasis === '100g' ? 'default' : 'secondary'} size="sm" onClick={() => setViewBasis('100g')}>Per 100g</Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Servings</span>
                <input type="number" min={1} step={1} value={servings} onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded-md bg-muted/50 border border-border px-2 py-1 text-sm" />
              </div>
              {topFood && (
                <p className="text-xs text-muted-foreground">
                  Base serving: {topFood.serving_qty} {topFood.serving_unit}{topFood.serving_weight_grams ? ` (~${topFood.serving_weight_grams}g)` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Macro Distribution */}
          {topFood && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center"><Gauge className="h-4 w-4 mr-2"/>Macro Distribution</h3>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div className="h-3 bg-blue-500" style={{ width: `${macroPct.carbs}%` }} />
                <div className="h-3 bg-green-500 -mt-3" style={{ width: `${macroPct.protein}%` }} />
                <div className="h-3 bg-yellow-500 -mt-3" style={{ width: `${macroPct.fat}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Carbs {macroPct.carbs}%</span>
                <span>Protein {macroPct.protein}%</span>
                <span>Fat {macroPct.fat}%</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b">
            <button onClick={() => setActiveTab('nutrition')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'nutrition' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Nutrition Details
            </button>
            <button onClick={() => setActiveTab('health')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'health' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Health Impact
            </button>
          </div>

          {/* Panels */}
          {activeTab === 'nutrition' && topFood && (
            <NutritionTable data={{
              ...topFood,
              nf_calories: scale(topFood.nf_calories),
              nf_protein: scale(topFood.nf_protein),
              nf_total_carbohydrate: scale(topFood.nf_total_carbohydrate),
              nf_total_fat: scale(topFood.nf_total_fat),
              nf_saturated_fat: scale(topFood.nf_saturated_fat),
              nf_sugars: scale(topFood.nf_sugars),
              nf_dietary_fiber: scale(topFood.nf_dietary_fiber),
              nf_sodium: scale(topFood.nf_sodium),
              nf_potassium: scale(topFood.nf_potassium),
              nf_cholesterol: scale(topFood.nf_cholesterol),
            } as NutritionInfo} />
          )}
          {activeTab === 'health' && topFood && topFood.healthData && (
            <HealthImpactSection healthData={topFood.healthData} />
          )}

          {/* AI Suggestions */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-accent"/>AI Suggestions</h3>
            <div className="space-y-2">
              {aiAnalysis?.suggestions?.map((suggestion: string, i: number) => (
                <div key={i} className="flex items-start p-3 bg-card rounded-lg border border-border">
                  <span className="text-accent font-bold mr-3 mt-1">✦</span>
                  <p className="text-sm text-foreground/90">{suggestion}</p>
                </div>
              )) ?? (
                <div className="p-3 text-sm text-muted-foreground">No suggestions available.</div>
              )}
            </div>
          </div>

          {/* Log Meal */}
          <div className="border-t border-white/10 pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-center text-foreground">Log this Meal to Your Dashboard</h3>
            <div className="flex justify-center gap-2 flex-wrap">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map(type => (
                <Button key={type} variant={selectedMealType === type ? 'default' : 'secondary'} onClick={() => setSelectedMealType(type)}>
                  {type}
                </Button>
              ))}
            </div>
            <Button onClick={handleLogMeal} disabled={isLogging || !selectedMealType} size="lg" className="w-full shadow-lg shadow-primary/30">
              <CheckCircle className="mr-2 h-5 w-5"/>
              {isLogging ? 'Logging...' : `Log as ${selectedMealType || '...'}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button onClick={onClear} variant="outline" size="lg">Scan Another Item</Button>
      </div>
      <ToastContainer />
    </div>
  );
}