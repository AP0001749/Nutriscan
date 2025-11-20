import { NextResponse } from 'next/server';

/**
 * Deprecated route: Nutritionix integration has been removed.
 * Return 410 Gone to indicate the resource is intentionally removed.
 */
export async function POST() {
  return NextResponse.json({ error: 'Nutritionix integration removed. This endpoint is deprecated.' }, { status: 410 });
}
