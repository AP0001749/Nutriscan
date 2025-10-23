// src/app/api/log-meal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveMealLog } from '@/lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // *** CRITICAL FIX: Destructure 'mealName' from the incoming request body ***
    const { mealType, mealName, foods } = await request.json();

    // Add validation to ensure mealName is present
    if (!mealType || !mealName || !foods || !Array.isArray(foods) || foods.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid mealType, mealName, or foods' }, { status: 400 });
    }

    const mealLog = await saveMealLog({
      userId,
      date: new Date().toISOString().split('T')[0],
      mealType,
      mealName, // Pass the mealName to the database function
      foods,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Meal logged successfully',
      log: mealLog
    });

  } catch (error) {
    console.error('Error in log-meal API route:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to log meal',
      details: errorMessage
    }, { status: 500 });
  }
}