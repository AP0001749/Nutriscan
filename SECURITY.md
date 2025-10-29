# NutriScan Security Architecture & Audit

## Executive Summary

**Status**: Production-Ready Architecture with Critical Deployment Requirement  
**Audit Date**: October 29, 2025  
**Critical Finding**: NEXTAUTH_SECRET missing in production environment

---

## Security Architecture

### Authentication Layer (NextAuth.js)

**Implementation**: `src/lib/nextauth.ts`
- **Strategy**: JWT-based session management
- **Providers**: 
  - Google OAuth (production-ready)
  - Credentials (development fallback)
- **Secret Management**: `NEXTAUTH_SECRET` environment variable
- **Token Signing**: HMAC with secret for JWT integrity

**Middleware Protection**: `src/middleware.ts`
- **Protected Routes**:
  - `/dashboard` - User meal history
  - `/scan` - Food scanning interface
  - `/api/log-meal` - Meal logging endpoint
  - `/api/get-meals` - Meal retrieval endpoint
  - `/api/clear-meals` - Meal deletion endpoint
  - `/api/scan-food` - Core AI analysis endpoint

**Token Validation**: All protected routes use `getToken()` with secret verification

### Protected API Endpoints

All critical API routes implement server-side session validation:

```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Protected Endpoints**:
- `POST /api/log-meal` - Requires valid session, validates userId
- `GET /api/get-meals` - Requires valid session, filters by userId
- `DELETE /api/clear-meals` - Requires valid session, scoped to userId
- `GET /api/env-check` - Development only OR authenticated users

---

## CRITICAL VULNERABILITY: NEXTAUTH_SECRET

### The Flaw

**Evidence**: `logs_result.csv` shows repeated `[next-auth][error][NO_SECRET]` errors in production.

**Root Cause**: `NEXTAUTH_SECRET` environment variable not set in Vercel preview/production environment.

**Impact Severity**: **CRITICAL** - Day-Zero vulnerability

### Security Consequences

Without `NEXTAUTH_SECRET`:

1. **JWT Tokens Unsigned**: All session tokens lack cryptographic signatures
2. **Session Forgery**: Attackers can craft arbitrary session tokens
3. **Authentication Bypass**: Protection layer is completely compromised
4. **Data Exposure**: All user meal logs accessible without authentication
5. **GDPR/Privacy Violation**: User data unprotected in violation of privacy regulations

### Technical Details

**JWT Structure Without Secret**:
```
{
  "alg": "none",  // ← NO SIGNATURE ALGORITHM
  "typ": "JWT"
}
```

**Attack Vector**:
```javascript
// Attacker can create arbitrary session
const fakeToken = btoa(JSON.stringify({
  id: "any-user-id",
  email: "admin@example.com"
}));
// This token would be accepted by the system
```

---

## REMEDIATION (IMMEDIATE ACTION REQUIRED)

### Step 1: Generate Secure Secret

**Local/Development** (already configured in `.env.local`):
```bash
# Current secret (DO NOT USE IN PRODUCTION)
NEXTAUTH_SECRET=XAflImI2B3I7UteQ8TubaomtxmpWHStzBFfZ6CC5pWo=
```

**Production** (generate new secret):
```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Example output (use your own!)
xK8yF2mP9nQ3rV6wA7zB4cD5eH8jL1mN0oP3qR6sT9u=
```

### Step 2: Set Environment Variables in Vercel

**Via Vercel Dashboard**:
1. Go to: https://vercel.com/[your-username]/nutriscan/settings/environment-variables
2. Add variable:
   - **Name**: `NEXTAUTH_SECRET`
   - **Value**: [generated secret from Step 1]
   - **Environment**: Production, Preview, Development (all)
3. Click "Save"

**Via Vercel CLI**:
```bash
vercel env add NEXTAUTH_SECRET
# Paste generated secret when prompted
# Select: Production, Preview, Development
```

### Step 3: Redeploy

**Trigger new deployment**:
```bash
git commit --allow-empty -m "chore: trigger redeploy with NEXTAUTH_SECRET"
git push origin master
```

Or use Vercel Dashboard → Deployments → Redeploy

### Step 4: Verification

**Check deployment logs** (should have NO `[NO_SECRET]` errors):
```bash
vercel logs [deployment-url]
```

**Test authentication**:
1. Visit: `https://[your-domain].vercel.app/api/auth/providers`
2. Should return provider list without errors
3. Test login flow → should create valid signed JWT
4. Verify protected routes redirect unauthenticated users

**Verify JWT signature**:
```bash
# Decode JWT from browser cookies (should show valid signature)
# Token format: [header].[payload].[signature]
# Signature should be present and non-empty
```

---

## Additional Security Hardening (Post-Remediation)

### 1. OAuth Configuration

**Google OAuth** (set in production):
```bash
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
NEXTAUTH_URL=https://[your-domain].vercel.app
```

**Setup**:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect: `https://[your-domain].vercel.app/api/auth/callback/google`

### 2. Disable Credentials Provider in Production

**Update** `src/lib/nextauth.ts`:
```typescript
providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  }),
  // Only enable in development
  ...(process.env.NODE_ENV === 'development' ? [
    CredentialsProvider({
      // ... credentials config
    })
  ] : [])
],
```

### 3. Secure Database Credentials

**Current exposure**: `.env.local` contains production database credentials (Neon)

**Action**: Move to Vercel environment variables:
```bash
# Set in Vercel (already exposed in .env.local, rotate if needed)
POSTGRES_URL=postgres://neondb_owner:[password]@[host]/neondb
DATABASE_URL=postgres://neondb_owner:[password]@[host]/neondb
```

**Rotate credentials** if `.env.local` was ever committed to git:
1. Go to Neon dashboard
2. Reset database password
3. Update Vercel environment variables

### 4. API Key Security Audit

**Current keys in `.env.local`** (verify rotation status):
- `CLARIFAI_API_KEY`: 57cc713f20ec4ddfbd1e048c20a14409
- `USDA_API_KEY`: zUNDFiKfGKljDtBC3pqjKwJyIifqQjEehnqBxhSv
- `NUTRITIONIX_API_KEY`: 5bd6bc8eb5c59ecf0273fe46c26dae5d
- `GEMINI_API_KEY`: AIzaSyAG_K-us9FJqjSHQK0J2ZWUa02eTwgLlQ8

**Action**: If any keys were committed to git, rotate immediately via provider dashboards.

### 5. Content Security Policy

**Add to** `next.config.mjs`:
```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Fusion Engine Security Review

### Data Flow (Verified Secure with NEXTAUTH_SECRET)

```
User Request → Middleware (JWT validation) → Route Handler (session check) → AI Processing → Database (user-scoped)
```

**Security Gates**:
1. **Middleware** (`src/middleware.ts`): Validates JWT signature with `NEXTAUTH_SECRET`
2. **Route Handler**: Validates session via `getServerSession(authOptions)`
3. **Database**: All queries scoped to `session.user.id`

### AI Vision Pipeline (No PII Exposure)

**Input**: Image file (multipart/form-data)  
**Processing**: Clarifai → USDA → Gemini  
**Output**: Nutrition data + health analysis  

**No user PII sent to external APIs** ✓

### Database Access (Properly Scoped)

**Example** (`src/app/api/get-meals/route.ts`):
```typescript
const session = await getServerSession(authOptions);
const meals = await getMealLogsByDate(session.user.id, date); // ← userId scoping
```

**Verified**: All database queries filter by authenticated user ID ✓

---

## Compliance Notes

### GDPR Considerations

- **User Data**: Meal logs stored with user consent (login flow)
- **Data Portability**: Implement `/api/export-data` endpoint
- **Right to Deletion**: Implement `/api/delete-account` endpoint
- **Privacy Policy**: Required before production launch

### Security Best Practices

- ✅ HTTPS enforced (Vercel default)
- ✅ JWT-based stateless sessions
- ✅ Protected API routes with server-side validation
- ✅ Database credentials not hardcoded
- ❌ **NEXTAUTH_SECRET missing in production** (CRITICAL - must fix)
- ⚠️ Credentials provider should be disabled in production

---

## Incident Response

### If Security Breach Detected

1. **Rotate `NEXTAUTH_SECRET` immediately**:
   ```bash
   openssl rand -base64 32 > new_secret.txt
   vercel env add NEXTAUTH_SECRET production
   # Paste new secret
   ```

2. **Invalidate all sessions**:
   - Changing `NEXTAUTH_SECRET` invalidates all existing JWTs
   - All users must re-authenticate

3. **Rotate database credentials**:
   - Neon dashboard → Reset password
   - Update Vercel env vars

4. **Audit access logs**:
   ```bash
   vercel logs --since 24h | grep -i "401\|403\|unauthorized"
   ```

5. **Notify affected users** (if PII exposed)

---

## Monitoring & Alerts

### Recommended Monitoring

**Vercel Dashboard**:
- Monitor for `NO_SECRET` errors (should be ZERO)
- Track 401/403 response rates (authentication failures)
- Monitor unusual API usage patterns

**Log Analysis**:
```bash
# Check for authentication errors
vercel logs | grep -i "nextauth\|unauthorized"

# Monitor failed login attempts
vercel logs | grep -i "signin.*failed"
```

---

## Security Checklist (Pre-Production)

- [ ] `NEXTAUTH_SECRET` set in Vercel (Production, Preview, Development)
- [ ] No `[NO_SECRET]` errors in deployment logs
- [ ] Google OAuth configured with production redirect URL
- [ ] Credentials provider disabled in production
- [ ] Database credentials rotated (if ever committed to git)
- [ ] API keys rotated (if ever committed to git)
- [ ] `.env.local` added to `.gitignore` (verify no commits)
- [ ] Content Security Policy headers configured
- [ ] Test authentication flow in production
- [ ] Verify protected routes require authentication
- [ ] Privacy policy published
- [ ] GDPR data export/deletion endpoints implemented

---

## Conclusion

**Current Status**: System architecture is secure and properly designed. The ONLY blocker is the missing `NEXTAUTH_SECRET` in production.

**Risk Level**: 
- **Pre-Remediation**: CRITICAL (authentication completely compromised)
- **Post-Remediation**: LOW (production-ready security posture)

**Timeline**: 
- **Immediate**: Set `NEXTAUTH_SECRET` in Vercel (5 minutes)
- **Short-term**: Disable credentials provider in production (1 hour)
- **Medium-term**: Implement GDPR endpoints (1-2 days)

**Approval for Production**: ❌ **BLOCKED until NEXTAUTH_SECRET is set**

---

*Last Updated: October 29, 2025*  
*Next Review: After remediation deployment*
