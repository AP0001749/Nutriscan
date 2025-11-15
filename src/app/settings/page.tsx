'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Flame, Save, Edit2 } from 'lucide-react';
import { showToast } from '@/components/Toast';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(2000);
  const [dailyProteinGoal, setDailyProteinGoal] = useState<number>(150);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Load from localStorage
    const savedCalorieGoal = localStorage.getItem('dailyCalorieGoal');
    const savedProteinGoal = localStorage.getItem('dailyProteinGoal');
    
    if (savedCalorieGoal) setDailyCalorieGoal(Number(savedCalorieGoal));
    if (savedProteinGoal) setDailyProteinGoal(Number(savedProteinGoal));
  }, [status, router]);

  const handleSave = () => {
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
            <span className="text-gradient">Daily Goals</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-lg">Set your nutrition targets</p>
      </div>

      {/* Goals Card */}
      <Card className="glass-card border-0 max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              Nutrition Goals
            </CardTitle>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calorie Goal */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Flame className="w-5 h-5 text-orange-400" />
              Daily Calorie Goal
            </label>
            {isEditing ? (
              <input
                type="number"
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white"
                min="1000"
                max="5000"
                step="50"
              />
            ) : (
              <div className="text-4xl font-bold text-gradient">
                {dailyCalorieGoal} <span className="text-2xl text-muted-foreground">kcal</span>
              </div>
            )}
          </div>

          {/* Protein Goal */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Daily Protein Goal
            </label>
            {isEditing ? (
              <input
                type="number"
                value={dailyProteinGoal}
                onChange={(e) => setDailyProteinGoal(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white"
                min="50"
                max="300"
                step="5"
              />
            ) : (
              <div className="text-4xl font-bold text-gradient">
                {dailyProteinGoal} <span className="text-2xl text-muted-foreground">g</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Goals
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
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
              💡 <strong>Tip:</strong> Set realistic goals based on your activity level and health objectives. Track your progress on the History page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
