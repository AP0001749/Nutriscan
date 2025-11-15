'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Flame, Save, Edit2, Coffee, Sun, Moon, Utensils } from 'lucide-react';
import { showToast } from '@/components/Toast';

interface MealGoal {
  calories: number;
  protein: number;
}

interface MealGoals {
  breakfast: MealGoal;
  lunch: MealGoal;
  dinner: MealGoal;
  snack: MealGoal;
}

const defaultMealGoals: MealGoals = {
  breakfast: { calories: 500, protein: 30 },
  lunch: { calories: 700, protein: 40 },
  dinner: { calories: 700, protein: 50 },
  snack: { calories: 200, protein: 15 },
};

const mealIcons = {
  breakfast: { icon: Coffee, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
  lunch: { icon: Sun, color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
  dinner: { icon: Moon, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
  snack: { icon: Utensils, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30' },
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mealGoals, setMealGoals] = useState<MealGoals>(defaultMealGoals);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(2100);
  const [dailyProteinGoal, setDailyProteinGoal] = useState<number>(135);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Load from localStorage
    const savedMealGoals = localStorage.getItem('mealGoals');
    const savedCalorieGoal = localStorage.getItem('dailyCalorieGoal');
    const savedProteinGoal = localStorage.getItem('dailyProteinGoal');
    
    if (savedMealGoals) {
      setMealGoals(JSON.parse(savedMealGoals));
    }
    if (savedCalorieGoal) setDailyCalorieGoal(Number(savedCalorieGoal));
    if (savedProteinGoal) setDailyProteinGoal(Number(savedProteinGoal));
  }, [status, router]);

  // Calculate totals from meal goals
  useEffect(() => {
    const totalCalories = Object.values(mealGoals).reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = Object.values(mealGoals).reduce((sum, meal) => sum + meal.protein, 0);
    setDailyCalorieGoal(totalCalories);
    setDailyProteinGoal(totalProtein);
  }, [mealGoals]);

  const handleMealGoalChange = (mealType: keyof MealGoals, field: 'calories' | 'protein', value: number) => {
    setMealGoals(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    localStorage.setItem('mealGoals', JSON.stringify(mealGoals));
    localStorage.setItem('dailyCalorieGoal', dailyCalorieGoal.toString());
    localStorage.setItem('dailyProteinGoal', dailyProteinGoal.toString());
    setIsEditing(false);
    showToast('success', '✅ Goals saved successfully!');
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12 min-h-screen">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
            <Target className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold">
            <span className="text-gradient">Nutrition Goals</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-lg">Set targets for each meal</p>
      </div>

      {/* Daily Summary Card */}
      <Card className="glass-card border-0 max-w-4xl mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              <Flame className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
              Daily Totals
            </CardTitle>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Goals
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Total Calories</p>
              <p className="text-3xl font-bold text-gradient">{dailyCalorieGoal} <span className="text-lg text-muted-foreground">kcal</span></p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">Total Protein</p>
              <p className="text-3xl font-bold text-gradient">{dailyProteinGoal} <span className="text-lg text-muted-foreground">g</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl">
        {(Object.keys(mealGoals) as Array<keyof MealGoals>).map((mealType) => {
          const { icon: Icon, color, bgColor, borderColor } = mealIcons[mealType];
          const meal = mealGoals[mealType];
          
          return (
            <Card key={mealType} className={`glass-card border-0 hover:border-emerald-500/30 transition-all ${borderColor}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <CardTitle className="text-lg capitalize">{mealType}</CardTitle>
                  </div>
                  <Badge variant="outline" className={`${borderColor} ${color}`}>
                    {meal.calories} cal
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Calories */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Calories (kcal)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={meal.calories}
                      onChange={(e) => handleMealGoalChange(mealType, 'calories', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white text-sm"
                      min="0"
                      max="2000"
                      step="50"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{meal.calories}</p>
                  )}
                </div>

                {/* Protein */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Protein (g)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={meal.protein}
                      onChange={(e) => handleMealGoalChange(mealType, 'protein', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white text-sm"
                      min="0"
                      max="150"
                      step="5"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{meal.protein}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save/Cancel Buttons */}
      {isEditing && (
        <div className="flex gap-3 mt-6 max-w-4xl">
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All Goals
          </Button>
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl max-w-4xl">
        <p className="text-sm text-blue-300">
          💡 <strong>Tip:</strong> Customize goals for each meal type. Daily totals are calculated automatically. Track your progress on the History and Dashboard pages.
        </p>
      </div>
    </div>
  );
}
