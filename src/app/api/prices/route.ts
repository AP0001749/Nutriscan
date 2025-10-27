import { NextResponse } from 'next/server';
import { mockPriceData } from '../../../lib/demo-data';

type PriceResult = {
  foodName: string;
  price?: number | null;
  cheapestPrice?: number | null;
  averagePrice?: number | null;
  stores?: Array<{ name: string; price: number; url?: string }> | null;
};

function findMockPrice(foodName: string): PriceResult | null {
  if (!foodName) return null;
  // Direct key match
  if (mockPriceData[foodName]) {
    const d = mockPriceData[foodName];
    return {
      foodName,
      price: d.cheapestPrice ?? null,
      cheapestPrice: d.cheapestPrice ?? null,
      averagePrice: d.averagePrice ?? null,
      stores: d.stores ?? null,
    };
  }

  // Case-insensitive search
  const key = Object.keys(mockPriceData).find(k => k.toLowerCase() === foodName.toLowerCase());
  if (key) {
    const d = mockPriceData[key];
    return {
      foodName: key,
      price: d.cheapestPrice ?? null,
      cheapestPrice: d.cheapestPrice ?? null,
      averagePrice: d.averagePrice ?? null,
      stores: d.stores ?? null,
    };
  }

  // Partial match (contains)
  const partial = Object.keys(mockPriceData).find(k => k.toLowerCase().includes(foodName.toLowerCase()));
  if (partial) {
    const d = mockPriceData[partial];
    return {
      foodName: partial,
      price: d.cheapestPrice ?? null,
      cheapestPrice: d.cheapestPrice ?? null,
      averagePrice: d.averagePrice ?? null,
      stores: d.stores ?? null,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { foodItems } = await request.json();

    if (!foodItems || !Array.isArray(foodItems)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid food items provided',
      }, { status: 400 });
    }

    // If there is a real pricing provider configured (e.g. PRICE_API_KEY),
    // you would call that provider here. For now, fall back to mock data.
    const results: PriceResult[] = foodItems.map((f: string) => {
      const found = findMockPrice(f);
      if (found) return found;
      return { foodName: f, price: null, cheapestPrice: null, averagePrice: null, stores: null };
    });

    return NextResponse.json({
      success: true,
      prices: results,
      source: 'mock',
    });
  } catch (error) {
    console.error('Error in /api/prices:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Prices API is available. Use POST with { foodItems: ["Apple","Banana"] }',
  });
}
