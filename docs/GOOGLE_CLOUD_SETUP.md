# Google Cloud Console Setup Guide

## Prerequisites
- Google account (personal or workspace)
- Credit card (for billing verification - free tier available)
- A real business listing on Google Maps (for GBP testing)

---

## Part 1: Create Google Cloud Project

1. **Go to [console.cloud.google.com](https://console.cloud.google.com)**

2. **Create new project:**
   - Click project dropdown (top-left)
   - Click "New Project"
   - Name: `forma-digital-gbp-gsc`
   - Click "Create"

3. **Wait 30 seconds** for project to be created

4. **Select your new project** from the dropdown

---

## Part 2: Enable APIs

1. **Go to APIs & Services > Library**
   - URL: `https://console.cloud.google.com/apis/library`

2. **Enable these 3 APIs** (search and click "Enable" for each):

   | API Name | Search Term |
   |----------|-------------|
   | My Business Business Information API | `business information` |
   | Google Search Console API | `search console` |
   | My Business Account Management API | `business account` |

3. **Optional APIs** (for future features):
   - My Business Notifications API
   - My Business Verifications API

---

## Part 3: Configure OAuth Consent Screen

1. **Go to APIs & Services > OAuth consent screen**
   - URL: `https://console.cloud.google.com/apis/credentials/consent`

2. **Select User Type:**
   - Choose **"External"** (unless you have Google Workspace)
   - Click "Create"

3. **Fill App Information:**
   ```
   App name: Forma Digital Platform
   User support email: your-email@gmail.com
   Developer contact: your-email@gmail.com
   ```

4. **Click "Save and Continue"**

5. **Add Scopes:**
   - Click "Add or Remove Scopes"
   - Search and add these scopes:

   ```
   https://www.googleapis.com/auth/business.manage
   https://www.googleapis.com/auth/webmasters
   https://www.googleapis.com/auth/webmasters.readonly
   openid
   email
   profile
   ```

6. **Click "Save and Continue"**

7. **Add Test Users:**
   - Click "Add Users"
   - Add your Gmail address
   - Click "Save and Continue"

> ⚠️ **Important:** While in "Testing" mode, only test users can use OAuth. To go live, you'll need to submit for verification.

---

## Part 4: Create OAuth Credentials

1. **Go to APIs & Services > Credentials**
   - URL: `https://console.cloud.google.com/apis/credentials`

2. **Click "Create Credentials" > "OAuth client ID"**

3. **Configure:**
   ```
   Application type: Web application
   Name: Forma Digital Web Client
   
   Authorized JavaScript origins:
   - http://localhost:3000
   - http://localhost:3001
   
   Authorized redirect URIs:
   - http://localhost:3000/google-auth/callback
   - http://localhost:3000/api/auth/callback/google
   ```

4. **Click "Create"**

5. **Download JSON** or copy:
   - Client ID
   - Client Secret

---

## Part 5: Update Your .env File

1. **Open** `apps/backend/.env`

2. **Add these lines:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:3000/google-auth/callback
   USE_MOCK_DATA=false
   ```

3. **Save the file**

---

## Part 6: Run Database Migration

1. **Ensure Docker is running**

2. **Run migration:**
   ```bash
   cd apps/backend
   npx prisma migrate dev --name add_google_oauth_models
   ```

3. **Restart backend:**
   ```bash
   npm run start:dev
   ```

---

## Part 7: Test OAuth Flow

1. **Open** `http://localhost:3000/gmb`

2. **Click "Connect Google Account"** button

3. **Select your Google account** (must be a test user)

4. **Grant permissions** when prompted

5. **You should be redirected back** with a success message

---

## Part 8: Verify GBP Access

> ⚠️ **You need a real Google Business Profile** to see data.

### To create a GBP listing:
1. Go to [business.google.com](https://business.google.com)
2. Click "Manage now"
3. Add your business (or claim an existing one)
4. Complete verification (postcard, phone, or email)

### Once verified:
- Your locations will appear in the Reviews tab
- Real reviews will load from Google
- You can reply to reviews through the platform

---

## Part 9: Verify GSC Access

1. Go to [search.google.com/search-console](https://search.google.com/search-console)

2. Add your website as a property

3. Verify ownership (DNS, HTML file, or Google Analytics)

4. Your properties will appear in the Search Console tab

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access blocked" | Add your email as a test user in OAuth consent screen |
| "API not enabled" | Go back to Part 2 and enable the API |
| "Invalid redirect URI" | Check the redirect URI matches exactly in credentials |
| "No locations found" | You need a verified GBP listing |
| "No GSC data" | You need a verified Search Console property |

---

## Cost Considerations

| API | Free Tier |
|-----|-----------|
| GBP API | 10,000 calls/day |
| GSC API | 2,000 queries/day |

For an agency with ~50 clients, you'll stay well within free limits.

---

## Next Steps After Setup

1. [ ] Connect your Google account in the app
2. [ ] Verify you see your GBP locations
3. [ ] Test replying to a review
4. [ ] Check GSC analytics data
5. [ ] Add team members as test users (OAuth consent screen)
