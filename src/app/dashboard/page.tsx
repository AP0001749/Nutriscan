'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Utensils, Activity, Coffee, Sun, Moon, Trash2, PieChart, TrendingUp } from 'lucide-react' // CORRECTED IMPORT
import { MealLog } from '@/lib/types'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ... (rest of the component logic remains the same)
// The error is resolved by the corrected import statement above.
// No other changes are required in the body of this file.
interface DailySummary {
  totalCalories: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  mealCount: number;
}

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [summary, setSummary] = useState<DailySummary>({
    totalCalories: 0, totalCarbs: 0, totalProtein: 0, totalFat: 0, totalFiber: 0, mealCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const { toast, ToastContainer } = useToast();

  const calculateSummary = useCallback((mealsData: MealLog[]) => {
    const newSummary: DailySummary = mealsData.reduce((acc, meal) => {
      meal.foods.forEach(food => {
        acc.totalCalories += food.nf_calories || 0;
        acc.totalCarbs += food.nf_total_carbohydrate || 0;
        acc.totalProtein += food.nf_protein || 0;
        acc.totalFat += food.nf_total_fat || 0;
        acc.totalFiber += food.nf_dietary_fiber || 0;
      });
      return acc;
    }, { totalCalories: 0, totalCarbs: 0, totalProtein: 0, totalFat: 0, totalFiber: 0, mealCount: mealsData.length });

    setSummary({
      totalCalories: Math.round(newSummary.totalCalories),
      totalCarbs: Math.round(newSummary.totalCarbs),
      totalProtein: Math.round(newSummary.totalProtein),
      totalFat: Math.round(newSummary.totalFat),
      totalFiber: Math.round(newSummary.totalFiber),
      mealCount: newSummary.mealCount
    });
  }, []);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/get-meals?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch meals.');
      
      const data = await response.json();
      if (data.success) {
        setMeals(data.meals);
        calculateSummary(data.meals);
      } else {
        throw new Error(data.error || 'API returned an error');
      }
    } catch (error) {
      console.error("Error fetching meals:", error);
      toast({
        title: "Error Loading Meals",
        description: "Could not retrieve your meal data for this date.",
        variant: "error",
      });
      setMeals([]);
      calculateSummary([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast, calculateSummary]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleClearMeals = async () => {
    if (meals.length === 0) return;
    setIsClearing(true);
    try {
      const response = await fetch('/api/clear-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to clear meals');

      toast({ title: "Meals Cleared", description: result.message, variant: "success" });
      fetchMeals();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "An unknown error occurred";
      toast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setIsClearing(false);
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return <Coffee className="h-5 w-5 text-yellow-600" />;
      case 'lunch': return <Sun className="h-5 w-5 text-orange-600" />;
      case 'dinner': return <Moon className="h-5 w-5 text-blue-600" />;
      case 'snack': return <Utensils className="h-5 w-5 text-green-600" />;
      default: return <Utensils className="h-5 w-5 text-gray-600" />;
    }
  };

  const groupedMeals = meals.reduce((acc, meal) => {
    const type = meal.mealType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(meal);
    return acc;
  }, {} as Record<string, MealLog[]>);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 flex items-center justify-center">
            <Activity className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8 text-primary" /> Daily Nutrition Dashboard
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-4 md:mb-6">Track your meals and monitor your nutritional intake</p>
          <div className="flex items-center justify-center space-x-3 md:space-x-4 mb-6 md:mb-8">
            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 md:px-4 py-2 border-2 border-border rounded-lg bg-background focus:border-primary focus:outline-none text-sm md:text-base"
            />
            <Button onClick={handleClearMeals} disabled={isClearing || meals.length === 0} variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              {isClearing ? 'Clearing...' : "Clear Day's Meals"}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Summary Cards */}
          <SummaryCard icon={TrendingUp} color="text-blue-400" value={summary.totalCalories} label="Calories" />
          <SummaryCard value={`${summary.totalCarbs}g`} label="Carbs" />
          <SummaryCard value={`${summary.totalProtein}g`} label="Protein" />
          <SummaryCard value={`${summary.totalFat}g`} label="Fat" />
          <SummaryCard value={`${summary.totalFiber}g`} label="Fiber" />
          <SummaryCard icon={PieChart} color="text-pink-400" value={summary.mealCount} label="Meals" />
        </div>

        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading meals...</CardContent></Card>
        ) : meals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-foreground mb-2">No meals logged for {selectedDate}</p>
              <p className="text-sm text-muted-foreground">Scan your food to begin tracking!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMeals).map(([mealType, mealList]) => (
              <Card key={mealType}>
                <CardHeader className="bg-muted/50">
                  <CardTitle className="flex items-center text-xl">
                    {getMealIcon(mealType)} <span className="ml-3 capitalize">{mealType}</span>
                    <Badge variant="secondary" className="ml-auto">{mealList.length} {mealList.length === 1 ? 'entry' : 'entries'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {mealList.map((meal) => (
                    <div key={meal.id} className="bg-muted/50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Logged at: {new Date(meal.createdAt).toLocaleTimeString()}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {meal.foods.map((food, idx) => (
                          <div key={idx} className="bg-background rounded-lg p-4 border border-border">
                            <p className="font-semibold text-foreground mb-2">{food.food_name}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between"><span>Calories:</span><span className="font-medium">{food.nf_calories?.toFixed(0) ?? 'N/A'}</span></div>
                              <div className="flex justify-between"><span>Carbs:</span><span className="font-medium">{food.nf_total_carbohydrate?.toFixed(1) ?? 'N/A'}g</span></div>
                              <div className="flex justify-between"><span>Protein:</span><span className="font-medium">{food.nf_protein?.toFixed(1) ?? 'N/A'}g</span></div>
                              <div className="flex justify-between"><span>Fat:</span><span className="font-medium">{food.nf_total_fat?.toFixed(1) ?? 'N/A'}g</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

const SummaryCard = ({ icon: Icon, value, label, color }: { icon?: React.ElementType, value: string | number, label:string, color?: string }) => (
  <Card className="bg-card/50 backdrop-blur-sm">
    <CardContent className="p-4 text-center">
      {Icon && <Icon className={cn("mx-auto mb-2 h-6 w-6", color || "text-primary")} />}
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
)