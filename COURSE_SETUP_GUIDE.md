# Setup Guide for Course Scraping

## Step 1: Create the Courses Table in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `iyxtpunmqtgzscanjiij`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire SQL from `courses_table.sql` file in your project
6. Click **Run**

This will create the `courses` table and all necessary indexes.

## Step 2: Verify Environment Variables

Make sure your `.env.local` has these variables (they should already be there):

```
NEXT_PUBLIC_SUPABASE_URL=https://iyxtpunmqtgzscanjiij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Test the Feature

1. Start your Next.js server: `npm run dev`
2. Go to the **Course** page
3. Try searching for "Python"
4. The system will:
   - Scrape Udemy's search page
   - Extract course data from HTML/JSON-LD
   - Store in Supabase automatically
   - Display results

## How It Works

- **First Search (Python)**: Scrapes Udemy HTML → Extracts JSON data → Stores in DB → Shows results
- **Second Search (Python)**: Checks database → Finds cached results → Returns instantly (no scraping!)
- **Different Search (JavaScript)**: Scrapes again → Stores separately → Shows results

## Troubleshooting

If you see "Could not find the table 'public.courses'":
→ Run the SQL setup from Step 1

If you see "No courses found":
→ Wait 2-3 seconds, the HTML parsing might be slow
→ Try a different search term (e.g., "web development", "machine learning")

If you see scraping errors:
→ Check browser console for details
→ The system extracts data from Udemy's HTML using JSON-LD structured data
