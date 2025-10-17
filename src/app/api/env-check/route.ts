import { NextResponse } from 'next/server';

export async function GET() {
  // Server-side endpoint to verify presence of key environment variables.
  // This is intended as a debug endpoint. Do not expose secrets in production.
  const present = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'not-set',
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'not-set',
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'not-set',
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  return NextResponse.json({ present });
}
