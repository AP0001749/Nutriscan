// API Quota Tracker for free tier limits
// Tracks usage and provides graceful degradation when limits are reached

interface QuotaUsage {
    count: number;
    resetDate: string; // ISO date string
}

interface QuotaLimits {
    clarifai: { limit: number; period: 'month' };
    claude: { limit: number; period: 'month' }; // Monthly request cap for safety
}

const QUOTA_LIMITS: QuotaLimits = {
    clarifai: { limit: 1000, period: 'month' }, // Free tier: 1000 ops/month
    claude: { limit: 10000, period: 'month' }   // Safety cap: 10k requests/month
};

// In-memory quota tracking (resets on server restart)
// For production, use Redis or database persistence
const quotaUsage: {
    clarifai: QuotaUsage;
    claude: QuotaUsage;
} = {
    clarifai: { count: 0, resetDate: getNextMonthReset() },
    claude: { count: 0, resetDate: getNextMonthReset() }
};

function getNextMonthReset(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
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
    // Removed excessive quota logging
}

export function checkClaudeQuota(): { allowed: boolean; remaining: number; resetDate: string } {
    const now = new Date();
    const resetDate = new Date(quotaUsage.claude.resetDate);
    
    // Reset counter if we've passed the reset date
    if (now >= resetDate) {
        quotaUsage.claude = { count: 0, resetDate: getNextMonthReset() };
    }
    
    const remaining = Math.max(0, QUOTA_LIMITS.claude.limit - quotaUsage.claude.count);
    const allowed = remaining > 0;
    
    return {
        allowed,
        remaining,
        resetDate: quotaUsage.claude.resetDate
    };
}

export function incrementClaudeQuota(): void {
    quotaUsage.claude.count++;
}

// DEPRECATED: Legacy quota functions kept for backward compatibility only
export function checkGeminiQuota(): { allowed: boolean; remaining: number; resetDate: string } {
    // Silent deprecation - returns permissive values
    return { allowed: true, remaining: 999, resetDate: new Date().toISOString() };
}

export function incrementGeminiQuota(): void {
    // No-op: deprecated, silent
}

export function getQuotaStatus() {
    const clarifai = checkClarifaiQuota();
    const claude = checkClaudeQuota();
    
    return {
        clarifai: {
            used: quotaUsage.clarifai.count,
            limit: QUOTA_LIMITS.clarifai.limit,
            remaining: clarifai.remaining,
            resetDate: clarifai.resetDate,
            allowed: clarifai.allowed
        },
        claude: {
            used: quotaUsage.claude.count,
            limit: QUOTA_LIMITS.claude.limit,
            remaining: claude.remaining,
            resetDate: claude.resetDate,
            allowed: claude.allowed,
            note: 'Safety cap to prevent excessive token usage'
        }
    };
}

// Reset quota counters (for testing)
export function resetQuotas(): void {
    quotaUsage.clarifai = { count: 0, resetDate: getNextMonthReset() };
    quotaUsage.claude = { count: 0, resetDate: getNextMonthReset() };
    console.log('✅ Quota counters reset');
}
