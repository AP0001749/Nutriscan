# Deployment Configuration Notes

## Critical Environment Variables for Vercel

### Auth.js Configuration (CRITICAL)

**Required for OAuth to work on Vercel:**

1. **DELETE** the old `NEXTAUTH_URL` variable from Vercel environment settings
2. **ADD** the new higher-priority variable:
   - **Key:** `AUTH_URL`
   - **Value:** `https://nutriscan-eight.vercel.app`
   - **Environments:** ✓ Production, ✓ Preview, ✓ Development

### Why AUTH_URL is Required

- `AUTH_URL` has higher priority than `NEXTAUTH_URL` in Auth.js v5
- Overrides Vercel's automatic `VERCEL_URL` injection
- Prevents `redirect_uri_mismatch` errors in OAuth flow
- Must match the exact domain whitelisted in Google Cloud Console

### All Required Vercel Environment Variables

```
AUTH_URL=https://nutriscan-eight.vercel.app
NEXTAUTH_SECRET=[your-secret]
GOOGLE_CLIENT_ID=[your-client-id]
GOOGLE_CLIENT_SECRET=[your-client-secret]
GEMINI_API_KEY_SERVER=[your-gemini-server-key]
NEXT_PUBLIC_GEMINI_API_KEY=[your-gemini-public-key]
GEMINI_MODEL=gemini-2.5-flash
CLARIFAI_API_KEY=[your-clarifai-key]
USDA_API_KEY=[your-usda-key]
DATABASE_URL=[your-postgres-connection-string]
```

### Deployment Checklist

- [ ] Remove `NEXTAUTH_URL` from Vercel
- [ ] Add `AUTH_URL=https://nutriscan-eight.vercel.app` to Vercel (all environments)
- [ ] Verify Google Cloud Console has `https://nutriscan-eight.vercel.app/api/auth/callback/google` whitelisted
- [ ] Trigger redeploy (push to master or manual redeploy)
- [ ] Test OAuth login after deployment

## Local Development

For local development, use `.env.local` with:
```
AUTH_URL=http://localhost:3000
```

Do NOT commit `.env.local` to the repository.
