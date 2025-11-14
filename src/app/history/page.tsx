'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Calendar, Filter, TrendingUp, Flame, Utensils, BarChart3, Clock, RefreshCw } from 'lucide-react';
import { showToast } from '@/components/Toast';

interface Meal {
  id: number;
  user_email: string;
  meal_type: string;
  meal_name: string;
  timestamp: string;
  nutrition_data: string;
}

interface MealHistoryResponse {
  meals: Meal[];
  total: number;
  aggregates: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    mealCount: number;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function MealHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<MealHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (mealTypeFilter) params.append('mealType', mealTypeFilter);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await fetch(`/api/meal-history?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meal history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching meal history:', error);
      showToast('error', 'Failed to load meal history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchHistory();
    }
  }, [status, router, mealTypeFilter, dateRange]);

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your meal history...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getMealTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Breakfast: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      Lunch: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      Dinner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      Snack: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="container mx-auto px-4 py-12 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
            <History className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-gradient">Meal History</span>
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">Track your nutrition journey over time</p>
      </div>

      {/* Filters */}
      <Card className="glass-card border-0 mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={mealTypeFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMealTypeFilter('')}
            >
              All Meals
            </Button>
            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
              <Button
                key={type}
                variant={mealTypeFilter === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMealTypeFilter(type)}
              >
                {type}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {history && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/20">
                  <Flame className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">{history.aggregates.totalCalories}</p>
                  <p className="text-sm text-muted-foreground">Total Calories</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/20">
                  <Utensils className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">{history.aggregates.totalProtein}g</p>
                  <p className="text-sm text-muted-foreground">Total Protein</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">{history.aggregates.totalCarbs}g</p>
                  <p className="text-sm text-muted-foreground">Total Carbs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">{history.aggregates.mealCount}</p>
                  <p className="text-sm text-muted-foreground">Total Meals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Meal List */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Your Meals
          </CardTitle>
          <CardDescription>
            {history ? `Showing ${history.meals.length} of ${history.total} meals` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history && history.meals.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No meals found</p>
              <p className="text-sm text-muted-foreground">Start scanning your meals to track your nutrition!</p>
              <Button onClick={() => router.push('/scan')} className="mt-4 btn-premium">
                Scan Your First Meal
              </Button>
            </div>
          ) : (
            <>
              {history?.meals.map((meal) => {
                const nutritionData = JSON.parse(meal.nutrition_data)[0];
                return (
                  <Card key={meal.id} className="glass-card border-0 hover:border-emerald-500/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={getMealTypeColor(meal.meal_type)}>
                              {meal.meal_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(meal.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{meal.meal_name}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Flame className="w-4 h-4 text-red-400" />
                              {Math.round(nutritionData.nf_calories || 0)} cal
                            </span>
                            <span>P: {Math.round(nutritionData.nf_protein || 0)}g</span>
                            <span>C: {Math.round(nutritionData.nf_total_carbohydrate || 0)}g</span>
                            <span>F: {Math.round(nutritionData.nf_total_fat || 0)}g</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
