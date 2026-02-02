# Supabase Migration Plan for Restocka

## Current State
- ✅ Backend running on VPS: http://91.98.113.215:3001
- ✅ Prisma schema updated for PostgreSQL
- ✅ Supabase client created
- ❌ Supabase token expired (need new one)

## What's Needed to Complete Migration

### 1. Supabase Credentials (REQUIRED)
Go to: https://supabase.com/dashboard/project/db-mgoqrimdavhbduhwljeh

**Settings → API:**
- Copy `SUPABASE_URL` (should be: https://db-mgoqrimdavhbduhwljeh.supabase.co)
- Copy `service_role` secret OR generate new `anon` public key

**Add to ~/.env:**
```bash
SUPABASE_URL=https://db-mgoqrimdavhbduhwljeh.supabase.co
SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Migration
Once credentials are set:
```bash
cd ~/restocka-app/backend
npx prisma db push  # Creates tables in Supabase
npx prisma generate # Regenerates client
```

### 3. Auth Migration
The app currently uses Better Auth. Options:
- **Option A:** Keep Better Auth on VPS, use Supabase just for DB
- **Option B:** Switch to Supabase Auth (requires frontend changes)

### 4. Deploy Frontend to Vercel
```bash
cd ~/restocka-app
vercel --prod
```

## Files Modified
- `backend/prisma/schema.prisma` - Changed from sqlite to postgresql
- `backend/src/lib/supabase.ts` - New Supabase client
- `src/lib/supabase-client.ts` - Frontend Supabase integration
- `vercel.json` - Vercel deployment config
- `web-package.json` - Web build dependencies

## What Claudio (autonomous agent) is Working On
1. ✅ Restocka backend deployed to VPS
2. ✅ Supabase migration preparation
3. ⏳ Waiting for Supabase credentials
4. ⏳ Flavio building AI Content Tool
5. ⏳ WhatsApp outreach ready (needs QR scan)

## To Verify Supabase Connection
Once credentials are set, run:
```bash
curl -H "apikey: YOUR_ANON_KEY" \
  "https://db-mgoqrimdavhbduhwljeh.supabase.co/rest/v1/users?limit=1"
```

## Next Steps After Credentials
1. Push schema to Supabase: `npx prisma db push`
2. Test API: `curl http://91.98.113.215:3001/api/subscription/plans`
3. Deploy frontend: `vercel --prod`
