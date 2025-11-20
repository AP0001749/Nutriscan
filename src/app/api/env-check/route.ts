import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function GET() {
  // Security: Only allow in development or for authenticated admin users
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    const session = await getServerSession(authOptions);
    
    // In production, require authentication
    // Optional: Add admin check if you have user roles
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized. This endpoint is only available in development or to authenticated users.' },
        { status: 401 }
      );
    }
  }

  // Server-side endpoint to verify presence of key environment variables.
  // Returns boolean presence only - never exposes actual secret values.
  const present = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'not-set',
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    CLARIFAI_API_KEY: !!process.env.CLARIFAI_API_KEY,
    USDA_API_KEY: !!process.env.USDA_API_KEY,
  };

  return NextResponse.json({ 
    present,
    environment: process.env.NODE_ENV,
    aiProvider: 'Anthropic Claude',
    warning: 'Never expose actual secret values via API endpoints'
  });
}
