# Course Setup Guide

This guide explains how to set up the course discovery and integration in EduGenie.

## Overview

The course discovery system in EduGenie consists of:
- **API routes**: [app/api/search-courses/route.ts](app/api/search-courses/route.ts) and [app/api/proxy-courses/route.ts](app/api/proxy-courses/route.ts) — handles course search requests
- **Course Fetcher**: [course-fetcher/server.js](course-fetcher/server.js) — Express server that fetches courses from external APIs
- **Database Tables**: Supabase tables for storing user data related to learning progress

## Existing Database Tables

The following tables are already configured in your Supabase project and used throughout EduGenie:

### 1. `profiles` Table
Stores user profile and skill information:
```
id (UUID) — User ID
user_email (TEXT) — User email
full_name (TEXT) — User's full name
skills (TEXT[]) — Array of user skills
learning_goals (TEXT) — User's learning objectives
skill_level (TEXT) — Proficiency level (beginner/intermediate/advanced/expert)
is_onboarded (BOOLEAN) — Onboarding completion status
created_at (TIMESTAMP) — Account creation time
updated_at (TIMESTAMP) — Last profile update
```
**Purpose**: Personalizes course recommendations based on user skills and goals

### 2. `chat_sessions` Table
Manages user chat/tutoring sessions:
```
id (UUID) — Session ID
user_id (UUID) — Reference to auth user
created_at (TIMESTAMP) — Session start time
```
**Purpose**: Groups messages within conversational sessions

### 3. `chat_messages` Table
Stores messages within chat sessions:
```
id (UUID) — Message ID
session_id (UUID) — Reference to chat_sessions
user_id (UUID) — Reference to auth user
message (TEXT) — Message content
role (TEXT) — "user" or "assistant"
created_at (TIMESTAMP) — Message timestamp
```
**Purpose**: Stores chat history for AI tutor and PDF tutor features

### 4. `schedules` Table
Stores generated study schedules:
```
id (UUID) — Schedule ID
user_id (UUID) — Reference to auth user
schedule_data (JSONB) — Schedule content (topics, times, duration)
created_at (TIMESTAMP) — Creation timestamp
```
**Purpose**: Stores AI-generated study schedules

### 5. `quiz_results` Table
Tracks quiz performance:
```
id (UUID) — Result ID
user_id (UUID) — Reference to auth user
quiz_data (JSONB) — Quiz questions and user answers
score (NUMERIC) — Score achieved
created_at (TIMESTAMP) — Quiz completion time
```
**Purpose**: Tracks quiz history and learning progress

### 6. `pdfs` Table
Stores uploaded PDF documents:
```
id (UUID) — PDF ID
user_id (UUID) — Reference to auth user
file_name (TEXT) — Original file name
file_path (TEXT) — Storage path
text_content (TEXT) — Extracted text from PDF
created_at (TIMESTAMP) — Upload timestamp
```
**Purpose**: Stores PDFs for document-grounded tutoring

## Environment Variables

Add these to your `.env.local`:

```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-key>

# Course Fetcher Service (optional, for course discovery)
COURSE_FETCHER_URL=http://localhost:4000

# External API Keys (configure as needed)
UDEMY_API_KEY=<your-udemy-api-key>
COURSERA_API_KEY=<your-coursera-api-key>
```

## Running the Course Fetcher Service

The course-fetcher is an optional Express server that handles course fetching from external APIs.

### Installation

```bash
cd course-fetcher
npm install
```

### Start Development Server

```bash
npm run dev
```

The service runs on `http://localhost:4000` by default.

### Build for Production

```bash
npm run build
```

### API Endpoints (Course Fetcher)

- **GET** `/search?q=<query>` — Search for courses matching the query
- **GET** `/health` — Health check endpoint

## How Course Discovery Works

1. **User searches** for a course in the Course Finder page
2. **Frontend** sends request to [app/api/search-courses/route.ts](app/api/search-courses/route.ts)
3. **Search API** processes the query:
   - Calls [app/api/proxy-courses/route.ts](app/api/proxy-courses/route.ts)
   - Proxy forwards to course-fetcher service
4. **Course-fetcher** fetches from external APIs (Udemy, Coursera, etc.)
5. **Results returned** to user on the frontend
6. **User interactions** with courses are tracked through related database tables

## Testing the Course System

### Test via Frontend
1. Run the main app: `npm run dev`
2. Navigate to the **Course Finder** page
3. Search for a course (e.g., "Web Development")
4. Verify results are displayed correctly
5. Check browser console for API errors

### Test via API (curl)

```bash
# Test search endpoint
curl "http://localhost:3000/api/search-courses?q=Python%20programming"

# Test proxy endpoint
curl "http://localhost:3000/api/proxy-courses?q=JavaScript"
```

### Test Course Fetcher Service Directly

```bash
# Health check
curl http://localhost:4000/health

# Search courses
curl "http://localhost:4000/search?q=Machine%20Learning"
```

### Verify Database Integration

Check user data is properly stored:

```sql
-- View user's profile with skills
SELECT user_email, skills, learning_goals, is_onboarded 
FROM profiles 
WHERE user_email = 'test@example.com';

-- View user's chat history
SELECT session_id, message, role, created_at 
FROM chat_messages 
WHERE user_id = '<user_id>'
ORDER BY created_at DESC;

-- View generated schedules
SELECT schedule_data, created_at 
FROM schedules 
WHERE user_id = '<user_id>'
ORDER BY created_at DESC;

-- View quiz results
SELECT quiz_data, score, created_at 
FROM quiz_results 
WHERE user_id = '<user_id>'
ORDER BY created_at DESC;
```

## Troubleshooting

### "Course Fetcher unreachable"
- Ensure course-fetcher service is running: `npm run dev` in `course-fetcher` folder
- Check `COURSE_FETCHER_URL` environment variable
- Verify port 4000 is not blocked
- Check firewall settings

### "No results returned"
- Check external API keys are valid (Udemy, Coursera, etc.)
- Verify the query is properly URL-encoded
- Check browser console for error messages
- Verify course-fetcher service is responsive

### "Search endpoint errors"
- Verify Supabase connection in API route
- Check API keys in environment variables
- Ensure RLS policies on database tables are configured correctly
- Check that profiles table has user's skills set

### CORS Issues
- Ensure course-fetcher handles CORS headers properly
- Check proxy endpoint is forwarding requests correctly
- Verify origin settings in CORS configuration

### Database Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Ensure database tables exist in Supabase
- Check RLS policies are properly configured
- Verify user is authenticated before accessing protected endpoints

## Production Deployment

For production:

1. **Deploy main app** to Vercel/your hosting
2. **Deploy course-fetcher** to separate server (Heroku, Railway, etc.)
3. **Update environment variables** with production URLs and API keys
4. **Set up database backups** in Supabase
5. **Configure RLS policies** for all database tables
6. **Monitor API performance** and error rates
7. **Implement rate limiting** on course search endpoints

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Course Content Component](app/components/CourseContent.tsx)
- [Search API Route](app/api/search-courses/route.ts)
- [Proxy API Route](app/api/proxy-courses/route.ts)
- [Course Fetcher Server](course-fetcher/server.js)
- [ONBOARDING_README.md](ONBOARDING_README.md) — Skills-based personalization guide
