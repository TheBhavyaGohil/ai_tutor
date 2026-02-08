# Netlify + Railway Deployment Guide

This guide explains how to deploy your AI Tutor app with:
- **Netlify**: Hosting the Next.js frontend
- **Railway**: Running the Node.js backend (for course fetching and PDF generation)

## Why This Architecture?

Netlify's serverless functions have a 50MB limit and cannot run Chrome/Puppeteer (needed for PDF generation). Railway can handle the full Chrome binary, making it perfect for backend operations.

---

## 🚂 Railway Backend Setup

### 1. Deploy to Railway

1. Go to [Railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select the `course-fetcher` folder from your repository
4. Railway will automatically detect it as a Node.js project

### 2. Configure Railway Environment Variables

In your Railway project dashboard, add these environment variables:

```env
# Required for Puppeteer on Railway
RAILWAY_NIXPACKS_PROVIDERS=node,chrome

# Frontend URL (update after Netlify deployment)
FRONTEND_URL=https://your-app.netlify.app

# Port (Railway will override this automatically)
PORT=4000
```

### 3. Install Dependencies

Railway will automatically run:
```bash
npm install
npm run build  # This installs Chrome for Puppeteer
npm start
```

### 4. Get Your Railway URL

After deployment, Railway will give you a URL like:
```
https://your-app-name.up.railway.app
```

**Save this URL** - you'll need it for Netlify configuration.

---

## 🌐 Netlify Frontend Setup

### 1. Deploy to Netlify

1. Go to [Netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Configure build settings:
   - **Base directory**: Leave empty (root)
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### 2. Configure Netlify Environment Variables

In Netlify dashboard, go to **Site settings** → **Environment variables**, and add:

```env
# Railway Backend URL (CRITICAL - use your Railway URL)
NEXT_PUBLIC_BACKEND_URL=https://your-app-name.up.railway.app

# Course Fetcher (same as backend)
COURSE_FETCHER_URL=https://your-app-name.up.railway.app

# API URLs
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iyxtpunmqtgzscanjiij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHRwdW5tcXRnenNjYW5qaWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDMyNzMsImV4cCI6MjA4NTQxOTI3M30.SWqLPxL3U6T_Pn7nlGEa4vZDMxepi_zI32gh5-twTKE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eHRwdW5tcXRnenNjYW5qaWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg0MzI3MywiZXhwIjoyMDg1NDE5MjczfQ.A4MYqMNleQfpLk14jU4jaLOZizD4TEta0UORhGf9Ksw

# API Keys
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL=llama-3.1-8b-instant
GENERATIVE_API_KEY=your-google-api-key-here

# SMTP (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bhavyagohil809@gmail.com
SMTP_PASS=qqut gcng xffk cyis
SMTP_FROM=EduGenie <bhavyagohil809@gmail.com>
```

### 3. Deploy

Click **"Deploy site"** - Netlify will build and deploy your app.

---

## 🔄 Update Railway with Netlify URL

After your Netlify site is live:

1. Go back to **Railway dashboard**
2. Update the `FRONTEND_URL` environment variable:
   ```env
   FRONTEND_URL=https://your-actual-app.netlify.app
   ```
3. Redeploy (Railway will restart automatically)

This ensures CORS works properly between frontend and backend.

---

## 🧪 Testing Your Deployment

### Test Backend (Railway)
```bash
curl https://your-app-name.up.railway.app/api/health
```
Expected response:
```json
{"status":"OK","message":"Course Fetcher Server is running"}
```

### Test Frontend (Netlify)
1. Visit your Netlify URL
2. Log in to the app
3. Go to Notes section
4. Create a note and try exporting as PDF
5. Check browser console for any errors

---

## 🐛 Troubleshooting

### "Chrome not found" error
- ✅ Make sure `RAILWAY_NIXPACKS_PROVIDERS=node,chrome` is set in Railway
- ✅ Ensure `npm run build` executed successfully
- Check Railway logs for Chrome installation errors

### PDF export fails
- ✅ Verify `NEXT_PUBLIC_BACKEND_URL` in Netlify points to your Railway URL
- ✅ Check Railway logs when clicking PDF export
- Open browser DevTools Network tab and look for the `/generate-pdf` request

### CORS errors
- ✅ Ensure `FRONTEND_URL` in Railway matches your Netlify domain exactly
- ✅ Check Railway logs for "CORS blocked origin" messages
- The backend allows `.netlify.app` domains automatically

### Course fetching fails
- ✅ Make sure `COURSE_FETCHER_URL` points to Railway backend
- ✅ Check Railway logs for scraping errors
- Verify Railway backend is responding to requests

---

## 📁 What Changed in Your Code

### 1. `course-fetcher/package.json`
- ✅ Added `puppeteer` dependency
- ✅ Added build script to install Chrome

### 2. `course-fetcher/server.js`
- ✅ Updated CORS to allow Netlify domains
- ✅ Added `/generate-pdf` endpoint with full Puppeteer logic
- ✅ Imported `puppeteer` module

### 3. `app/components/notesllm.tsx`
- ✅ Updated `handlePdfExport` to call Railway backend URL
- ✅ Uses `process.env.NEXT_PUBLIC_BACKEND_URL` environment variable

### 4. `.env.local`
- ✅ Added `NEXT_PUBLIC_BACKEND_URL` variable for local development

---

## 🎯 Next Steps

1. **Deploy Railway first** (get the backend URL)
2. **Deploy Netlify** (use Railway URL in environment variables)
3. **Update Railway** with final Netlify URL
4. **Test PDF export** and course fetching features

---

## 💡 Local Development

For local development, both services run on localhost:

```bash
# Terminal 1 - Backend (Railway equivalent)
cd course-fetcher
npm install
npm start
# Runs on http://localhost:4000

# Terminal 2 - Frontend (Netlify equivalent)
npm install
npm run dev
# Runs on http://localhost:3000
```

Your `.env.local` is already configured for local development with `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000`.

---

## 🔒 Security Note

The API keys in this guide are visible in your code. Consider:
- Rotating Supabase keys regularly
- Using Gmail App Passwords instead of account passwords
- Not committing `.env.local` to version control (already in `.gitignore`)

---

**Your app is now production-ready! 🚀**
