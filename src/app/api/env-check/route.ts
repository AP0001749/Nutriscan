import { NextResponse } from 'next/server';

export async function GET() {
  // Server-side endpoint to verify presence of key environment variables.
  // This is intended as a debug endpoint. Do not expose secrets in production.
  const present = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'not-set',
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'not-set',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_FRONTEND_API: !!process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
    CLERK_API_KEY: !!process.env.CLERK_API_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  return NextResponse.json({ present });
}
