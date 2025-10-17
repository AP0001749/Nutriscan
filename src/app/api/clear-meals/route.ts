// src/app/api/clear-meals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { deleteMealLogsByDate } from '@/lib/database'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    
    const { date } = await req.json();

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'A valid date must be provided' }, { status: 400 });
    }

    await deleteMealLogsByDate(userId, date);

    return NextResponse.json({ message: `Meals for ${date} have been successfully cleared.` });

  } catch (error) {
    console.error('Error in clear-meals API route:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: 'An error occurred while clearing meals.', details: errorMessage }, { status: 500 });
  }
}