// src/app/api/get-meals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMealLogsByDate } from '@/lib/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ 
        success: false,
        error: 'Date parameter is required',
      }, { status: 400 });
    }

    const meals = await getMealLogsByDate(userId, date);
    
    return NextResponse.json({ success: true, meals });

  } catch (error) {
    console.error('Error fetching meals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch meals',
      details: errorMessage
    }, { status: 500 });
  }
}