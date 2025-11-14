# API Protection & Quota Management Guide

## 🛡️ Overview

NutriScan now includes comprehensive API protection to prevent excessive costs and service interruptions.

## 📊 Quota Limits

### Clarifai (Vision API)
- **Limit**: 1,000 operations/month (free tier)
- **Resets**: First day of each month
- **Behavior**: Returns graceful error when exceeded

### Claude (Anthropic AI)
- **Safety Cap**: 10,000 requests/month
- **Billing**: Token-based (pay-as-you-go)
- **Resets**: First day of each month

## 🚨 Error Handling

### When Clarifai Quota Exhausted
**User sees:**
```
🚫 Vision API quota exhausted
Clarifai free tier limit reached (1000 ops/month). 
Service will resume on [reset date].
To continue using NutriScan now, please upgrade your Clarifai plan at https://clarifai.com/pricing
```

**HTTP Status**: 429 (Too Many Requests)

### When Claude Credits Run Out
**User sees:**
```
💳 Claude AI credits exhausted
Please add credits to your Anthropic account at https://console.anthropic.com/settings/billing 
to continue using NutriScan.
```

**HTTP Status**: 402 (Payment Required)

**Action**: Add credits at https://console.anthropic.com/settings/billing

### When Claude Quota Cap Reached
**User sees:**
```
🚫 Claude API quota exhausted (0 remaining). 
Resets on [reset date]. 
Please wait or add more credits to your Anthropic account.
```

**HTTP Status**: 429 (Too Many Requests)

## 📈 Monitoring Quotas

### Check Current Usage
```bash
GET /api/quota-status
```

**Response:**
```json
{
  "success": true,
  "quotas": {
    "clarifai": {
      "used": 245,
      "limit": 1000,
      "remaining": 755,
      "resetDate": "2025-12-01T00:00:00.000Z",
      "allowed": true
    },
    "claude": {
      "used": 1523,
      "limit": 10000,
      "remaining": 8477,
      "resetDate": "2025-12-01T00:00:00.000Z",
      "allowed": true,
      "note": "Safety cap to prevent excessive token usage"
    }
  }
}
```

## 🔧 Configuration

### Adjust Quota Limits
Edit `src/lib/quota-tracker.ts`:

```typescript
const QUOTA_LIMITS: QuotaLimits = {
    clarifai: { limit: 1000, period: 'month' },  // Adjust based on your plan
    claude: { limit: 10000, period: 'month' }    // Safety cap
};
```

### Disable Quota Tracking
To disable quota tracking (for unlimited plans), set limits very high:

```typescript
const QUOTA_LIMITS: QuotaLimits = {
    clarifai: { limit: 999999, period: 'month' },
    claude: { limit: 999999, period: 'month' }
};
```

## 🔄 Automatic Behaviors

### Pre-Request Checks
- ✅ **Before Clarifai call**: Checks quota, returns empty array if exceeded
- ✅ **Before Claude call**: Checks quota, throws error if exceeded

### Post-Request Actions
- ✅ **After successful Clarifai call**: Increments counter
- ✅ **After successful Claude call**: Increments counter

### Monthly Reset
- ✅ **Automatic**: Resets on the 1st of each month
- ✅ **Tracked per API**: Clarifai and Claude have independent counters

## 💰 Cost Optimization

### Claude Model Selection
NutriScan uses **Claude 3.5 Haiku** (`claude-3-5-haiku-20241022`):
- ✅ Most cost-effective model
- ✅ Fast responses
- ✅ Excellent accuracy for food analysis
- ✅ Handles both vision and text

### Token Limits
- **Vision requests**: 1,024 tokens (comprehensive analysis)
- **Text requests**: 4,096 tokens (detailed responses)
- **Temperature**: 0.0 (deterministic, no wasted tokens)

## 📞 Support

### When Users Hit Limits

**Option 1 - Wait for Reset**
- Quota resets automatically on the 1st of each month
- No action required

**Option 2 - Upgrade Clarifai**
- Visit: https://clarifai.com/pricing
- Choose a paid plan with higher limits

**Option 3 - Add Claude Credits**
- Visit: https://console.anthropic.com/settings/billing
- Add credits to continue immediately

## 🧪 Testing

### Reset Quotas (Development Only)
In `quota-tracker.ts`:
```typescript
import { resetQuotas } from '@/lib/quota-tracker';

// Call this to reset counters
resetQuotas();
```

### Simulate Quota Exhaustion
Temporarily lower limits in `quota-tracker.ts`:
```typescript
const QUOTA_LIMITS: QuotaLimits = {
    clarifai: { limit: 1, period: 'month' },  // Will fail after 1 request
    claude: { limit: 1, period: 'month' }
};
```

## 🚀 Production Notes

### Important
- ⚠️ Quota tracking is **in-memory** (resets on server restart)
- ⚠️ For production with multiple servers, use **Redis** or **database** for shared quota state
- ✅ All quota checks happen **before** API calls to avoid wasted requests
- ✅ User-friendly error messages guide users to solutions

### Upgrade Path
For persistent quota tracking across server restarts:

1. Install Redis or use Vercel KV
2. Replace in-memory `quotaUsage` object with Redis/DB calls
3. Update `checkClarifaiQuota()` and `checkClaudeQuota()` to query persistent storage

## 📋 Summary

✅ **Clarifai**: 1,000 ops/month cap with graceful degradation  
✅ **Claude**: 10,000 requests/month safety cap + credit exhaustion handling  
✅ **User Messages**: Clear, actionable error messages with links to solutions  
✅ **Monitoring**: `/api/quota-status` endpoint for real-time tracking  
✅ **Cost Optimization**: Haiku 3.5 model with optimal token limits  
✅ **Auto-Reset**: Monthly quota refresh on the 1st  

Your API costs are now protected! 🛡️
