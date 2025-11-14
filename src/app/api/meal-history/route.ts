import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mealType = searchParams.get('mealType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = 'SELECT * FROM meal_logs WHERE user_id = $1';
    const params: (string | number)[] = [session.user.email];

    // Add filters
    let paramIndex = 2;
    if (mealType) {
      query += ` AND meal_type = $${paramIndex}`;
      params.push(mealType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await sql.query(query, params);
    const meals = result.rows;

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM meal_logs WHERE user_id = $1';
    const countParams: (string | number)[] = [session.user.email];
    let countIndex = 2;
    
    if (mealType) {
      countQuery += ` AND meal_type = $${countIndex}`;
      countParams.push(mealType);
      countIndex++;
    }
    if (startDate) {
      countQuery += ` AND date >= $${countIndex}`;
      countParams.push(startDate);
      countIndex++;
    }
    if (endDate) {
      countQuery += ` AND date <= $${countIndex}`;
      countParams.push(endDate);
    }

    const countResult = await sql.query(countQuery, countParams);
    const total = countResult.rows[0]?.total || 0;

    // Get nutrition aggregates - simplified version
    const aggregates = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      mealCount: meals.length,
    };

    // Calculate aggregates from meals
    meals.forEach((meal: { foods: string }) => {
      try {
        const foods = typeof meal.foods === 'string' ? JSON.parse(meal.foods) : meal.foods;
        if (Array.isArray(foods) && foods[0]) {
          aggregates.totalCalories += foods[0].nf_calories || 0;
          aggregates.totalProtein += foods[0].nf_protein || 0;
          aggregates.totalCarbs += foods[0].nf_total_carbohydrate || 0;
          aggregates.totalFat += foods[0].nf_total_fat || 0;
        }
      } catch (e) {
        console.error('Error parsing meal foods:', e);
      }
    });

    return NextResponse.json({
      meals,
      total: Number(total),
      aggregates: {
        totalCalories: Math.round(aggregates.totalCalories),
        totalProtein: Math.round(aggregates.totalProtein),
        totalCarbs: Math.round(aggregates.totalCarbs),
        totalFat: Math.round(aggregates.totalFat),
        mealCount: aggregates.mealCount,
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + meals.length < Number(total),
      },
    });

  } catch (error) {
    console.error('Error fetching meal history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch meal history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
