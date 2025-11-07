import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/quota-tracker';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const status = getQuotaStatus();
        return NextResponse.json({
            success: true,
            quotas: status
        });
    } catch (error) {
        console.error('Error getting quota status:', error);
        return NextResponse.json(
            { error: 'Failed to get quota status' },
            { status: 500 }
        );
    }
}
