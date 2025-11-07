// API Quota Tracker for free tier limits
// Tracks usage and provides graceful degradation when limits are reached

interface QuotaUsage {
    count: number;
    resetDate: string; // ISO date string
}

interface QuotaLimits {
    clarifai: { limit: number; period: 'month' };
    gemini: { limit: number; period: 'minute' };
}

const QUOTA_LIMITS: QuotaLimits = {
    clarifai: { limit: 1000, period: 'month' },
    gemini: { limit: 15, period: 'minute' }
};

// In-memory quota tracking (resets on server restart)
// For production, use Redis or database persistence
const quotaUsage: {
    clarifai: QuotaUsage;
    gemini: QuotaUsage[];
} = {
    clarifai: { count: 0, resetDate: getNextMonthReset() },
    gemini: [] // Array of timestamps for rate limiting
};

function getNextMonthReset(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
}

function getNextMinuteReset(): string {
    const now = new Date();
    const nextMinute = new Date(now.getTime() + 60000);
    return nextMinute.toISOString();
}

export function checkClarifaiQuota(): { allowed: boolean; remaining: number; resetDate: string } {
    const now = new Date();
    const resetDate = new Date(quotaUsage.clarifai.resetDate);
    
    // Reset counter if we've passed the reset date
    if (now >= resetDate) {
        quotaUsage.clarifai = { count: 0, resetDate: getNextMonthReset() };
    }
    
    const remaining = Math.max(0, QUOTA_LIMITS.clarifai.limit - quotaUsage.clarifai.count);
    const allowed = remaining > 0;
    
    return {
        allowed,
        remaining,
        resetDate: quotaUsage.clarifai.resetDate
    };
}

export function incrementClarifaiQuota(): void {
    quotaUsage.clarifai.count++;
    console.log(`📊 Clarifai quota: ${quotaUsage.clarifai.count}/${QUOTA_LIMITS.clarifai.limit} used this month`);
}

export function checkGeminiQuota(): { allowed: boolean; remaining: number; resetDate: string } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Remove timestamps older than 1 minute
    quotaUsage.gemini = quotaUsage.gemini.filter(usage => new Date(usage.resetDate) > oneMinuteAgo);
    
    const remaining = Math.max(0, QUOTA_LIMITS.gemini.limit - quotaUsage.gemini.length);
    const allowed = remaining > 0;
    
    return {
        allowed,
        remaining,
        resetDate: quotaUsage.gemini.length > 0 
            ? quotaUsage.gemini[0].resetDate 
            : getNextMinuteReset()
    };
}

export function incrementGeminiQuota(): void {
    quotaUsage.gemini.push({ count: 1, resetDate: getNextMinuteReset() });
    console.log(`📊 Gemini quota: ${quotaUsage.gemini.length}/${QUOTA_LIMITS.gemini.limit} used this minute`);
}

export function getQuotaStatus() {
    const clarifai = checkClarifaiQuota();
    const gemini = checkGeminiQuota();
    
    return {
        clarifai: {
            used: quotaUsage.clarifai.count,
            limit: QUOTA_LIMITS.clarifai.limit,
            remaining: clarifai.remaining,
            resetDate: clarifai.resetDate,
            allowed: clarifai.allowed
        },
        gemini: {
            used: quotaUsage.gemini.length,
            limit: QUOTA_LIMITS.gemini.limit,
            remaining: gemini.remaining,
            resetDate: gemini.resetDate,
            allowed: gemini.allowed
        }
    };
}

// Reset quota counters (for testing)
export function resetQuotas(): void {
    quotaUsage.clarifai = { count: 0, resetDate: getNextMonthReset() };
    quotaUsage.gemini = [];
    console.log('✅ Quota counters reset');
}
