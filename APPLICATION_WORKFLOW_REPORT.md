# EduGenie - Complete Application Workflow & Technical Report

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema & Design](#database-schema--design)
5. [Feature Workflows](#feature-workflows)
6. [API Documentation](#api-documentation)
7. [Component Architecture](#component-architecture)
8. [Authentication & Security](#authentication--security)
9. [Google Calendar Integration](#google-calendar-integration)
10. [Setup & Deployment](#setup--deployment)
11. [Technology Stack Details](#technology-stack-details)

---

## Executive Summary

**EduGenie** is a comprehensive AI-powered learning platform built with Next.js 16, designed to provide personalized education through intelligent automation. The platform combines AI tutoring, automated quiz generation, schedule management, course discovery, and Google Calendar integration to create a seamless learning experience.

### Key Metrics
- **Framework**: Next.js 16.1.6 (App Router)
- **AI Models**: Groq LLM (llama-3.1-8b-instant), Google Generative AI
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Supabase Auth with OTP-based email verification
- **Production Status**: Deployed on Render (https://ai-tutor-frontend-2jv7.onrender.com)

### Core Capabilities
1. **AI Chat Tutoring** - Interactive multi-topic learning with conversation history
2. **PDF Document Analysis** - Upload and chat with PDF content
3. **Automated Quiz Generation** - AI-generated quizzes with instant grading
4. **Smart Schedule Creation** - Personalized study schedules with calendar sync
5. **Course Discovery** - Search and cache learning resources
6. **Google Calendar Integration** - Automated reminder and event management
7. **Pomodoro Timer** - Focus management with study sessions
8. **Skills Management** - Personalized learning path based on user skills

---

## Application Overview

### Purpose
EduGenie addresses the challenge of personalized learning by leveraging AI to automate educational workflows. It eliminates manual schedule planning, quiz creation, and content discovery, allowing students to focus on actual learning.

### Target Users
- Students seeking personalized tutoring
- Educators looking for automated assessment tools
- Self-learners requiring structured study schedules
- Teams needing collaborative learning resources

### Problem Solved
- **Manual Schedule Creation**: AI generates optimized study schedules instantly
- **Generic Learning Paths**: Skills-based personalization for relevant content
- **Content Overload**: Intelligent course discovery with caching
- **Assessment Gap**: Automated quiz generation with AI analysis
- **Time Management**: Integrated Pomodoro timer and calendar reminders

---

## Technical Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  (Next.js Frontend - React 19 + Tailwind CSS)               │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard│ │AI Tutor │ │ Schedule │ │  Courses  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│                  (Serverless Functions)                     │
│                                                             │
│  /api/generate       /api/generate-quiz                     │
│  /api/generate-schedule  /api/chat-pdf                      │
│  /api/google/*       /api/reminder/parse                    │
│  /api/search-courses /api/update-skills                     │
└───────────────┬────────────────────────┬────────────────────┘
                │                        │
                ▼                        ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│    Supabase Backend     │   │   External Services      │
│                         │   │                          │
│  • PostgreSQL Database  │   │  • Groq AI API           │
│  • Authentication       │   │  • Google Calendar API   │
│  • Row-Level Security   │   │  • Google OAuth 2.0      │
│  • Real-time Updates    │   │  • Course Fetcher API    │
└─────────────────────────┘   └──────────────────────────┘
```

### Architecture Layers

#### 1. Presentation Layer (Frontend)
- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide React
- **Rich Text**: TipTap Editor
- **PDF Processing**: PDF.js 5.4.530

#### 2. Application Layer (API Routes)
- **Runtime**: Node.js (serverless functions)
- **API Style**: RESTful POST/GET endpoints
- **Authentication**: Supabase session tokens
- **Validation**: Request payload validation with error handling

#### 3. Data Layer (Supabase)
- **Database**: PostgreSQL with pgcrypto extension
- **Auth Provider**: Supabase Auth (Magic Links/OTP)
- **Security**: Row-Level Security (RLS) policies
- **Storage**: JSONB for flexible data structures

#### 4. Integration Layer
- **AI Provider**: Groq SDK + Google Generative AI
- **Calendar**: Google Calendar API v3
- **OAuth**: Google OAuth 2.0 with PKCE-like signing
- **Course Data**: Custom Express.js Course Fetcher microservice

### Network Architecture
```
Local Development:
  Frontend: localhost:3000
  Backend API: localhost:3000/api/*
  Course Fetcher: localhost:4000

Network Access (Same WiFi):
  Frontend: 192.168.x.x:3000
  Backend API: 192.168.x.x:3000/api/*
  Course Fetcher: 192.168.x.x:4000

Production:
  Frontend: https://ai-tutor-frontend-2jv7.onrender.com
  Backend API: https://ai-tutor-frontend-2jv7.onrender.com/api/*
  Course Fetcher: Integrated or separate microservice
```

---

## Database Schema & Design

### Entity Relationship Diagram
```
┌─────────────┐
│ auth.users  │ (Supabase Managed)
└──────┬──────┘
       │ 1
       │
       │ *
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────────┐   ┌───────────────┐   ┌──────────────┐ │
│  │  profiles    │   │ chat_sessions │   │  schedules   │ │
│  ├──────────────┤   ├───────────────┤   ├──────────────┤ │
│  │ id (uuid)    │   │ id (uuid)     │   │ id (bigint)  │ │
│  │ email        │   │ user_id       │   │ user_id      │ │
│  │ full_name    │   │ title         │   │ name         │ │
│  │ skills[]     │   │ created_at    │   │ content      │ │
│  │ created_at   │   │ updated_at    │   │ created_at   │ │
│  └──────────────┘   └───────┬───────┘   └──────────────┘ │
│                             │                            │
│                             │ 1                          │
│                             │ *                          │
│                     ┌───────────────┐                    │
│                     │ chat_messages │                    │
│                     ├───────────────┤                    │
│                     │ id (uuid)     │                    │
│                     │ session_id    │                    │
│                     │ user_id       │                    │
│                     │ role          │                    │
│                     │ content       │                    │
│                     │ created_at    │                    │
│                     └───────────────┘                    │
│                                                          │
│  ┌──────────────┐   ┌───────────────┐   ┌──────────────┐ │
│  │    pdfs      │   │ quiz_results  │   │ google_      │ │
│  │              │   │               │   │ calendar_    │ │
│  ├──────────────┤   ├───────────────┤   │ tokens       │ │
│  │ id (uuid)    │   │ id (bigint)   │   ├──────────────┤ │
│  │ user_id      │   │ user_id       │   │ user_id      │ │
│  │ file_name    │   │ topic         │   │ access_token │ │
│  │ content      │   │ score         │   │ refresh_token│ │
│  │ file_size    │   │ total_qs      │   │ scope        │ │
│  │ uploaded_at  │   │ quiz_data     │   │ expiry_date  │ │
│  └──────────────┘   │ user_answers  │   │ created_at   │ │
│                     │ ai_analysis   │   │ updated_at   │ │
│                     │ created_at    │   └──────────────┘ │
│                     └───────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

### Table Descriptions

#### 1. `profiles` Table
- **Purpose**: Extended user profile information
- **Key Fields**:
  - `id` (uuid): Foreign key to auth.users
  - `skills` (text[]): Array of user skills for personalization
  - `email`, `full_name`: User identification
- **Indexes**: GIN index on skills for fast skill-based queries
- **RLS**: Users can only view/update their own profiles

#### 2. `chat_sessions` Table
- **Purpose**: Store AI tutor conversation sessions
- **Key Fields**:
  - `id` (uuid): Session identifier
  - `user_id` (uuid): Session owner
  - `title` (text): Session title (first message preview)
  - `updated_at`: Last activity timestamp
- **Use Case**: Conversation history and session management
- **RLS**: Users can only access their own sessions

#### 3. `chat_messages` Table
- **Purpose**: Individual messages within chat sessions
- **Key Fields**:
  - `session_id` (uuid): Parent session
  - `role` (text): 'user' | 'assistant' | 'system'
  - `content` (text): Message body
- **Cascade**: Deletes when parent session is deleted
- **RLS**: Users can only access messages from their sessions

#### 4. `pdfs` Table
- **Purpose**: Store uploaded PDF documents and extracted text
- **Key Fields**:
  - `file_name` (text): Original filename
  - `content` (text): Extracted text content
  - `file_size` (integer): File size in bytes
- **Use Case**: PDF-based tutoring and document Q&A
- **RLS**: Users can only access their uploaded PDFs

#### 5. `schedules` Table
- **Purpose**: Store generated study schedules
- **Key Fields**:
  - `name` (text): Schedule name
  - `content` (jsonb): Schedule items with time, activity, status
- **Schema**: `[{time, activity, description, status, day}]`
- **Features**: Editable, printable, exportable to Google Calendar
- **RLS**: Users can CRUD their own schedules

#### 6. `quiz_results` Table
- **Purpose**: Store quiz attempts and AI analysis
- **Key Fields**:
  - `topic` (text): Quiz subject
  - `score`, `total_questions`: Performance metrics
  - `quiz_data` (jsonb): Original questions and answers
  - `user_answers` (jsonb): User's submitted answers
  - `ai_analysis` (jsonb): AI feedback and improvements
- **Use Case**: Track learning progress and provide feedback
- **RLS**: Users can view/insert their own quiz results

#### 7. `google_calendar_tokens` Table
- **Purpose**: Store Google OAuth tokens for calendar integration
- **Key Fields**:
  - `refresh_token` (text): Long-lived refresh token
  - `access_token` (text): Short-lived access token
  - `scope` (text): Granted permissions
  - `expiry_date` (timestamptz): Token expiration
- **Security**: RLS ensures users only access their own tokens
- **Auto-refresh**: Backend refreshes expired access tokens

### Indexes & Performance
```sql
-- Frequently queried fields
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at);
CREATE INDEX idx_quiz_results_topic ON quiz_results(topic);
CREATE INDEX idx_profiles_email ON profiles(email);

-- GIN index for array operations
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
```

### Triggers & Automation
```sql
-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Similar triggers for: pdfs, chat_sessions, google_calendar_tokens
```

---

## Feature Workflows

### 1. User Authentication Flow
```
┌──────────────────────────────────────────────────────────┐
│                    User Opens App                        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ Signed In?│
                   └─────┬────┘
                         │
           ┌─────────────┴─────────────┐
           │ No                        │ Yes
           ▼                           ▼
    ┌──────────────┐          ┌──────────────┐
    │ Login Page   │          │ Dashboard    │
    └──────┬───────┘          └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Enter Email  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Send OTP     │
    │ (Supabase)   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Enter OTP    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Create       │
    │ Session      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Skills       │
    │ Onboarding   │
    │ (First Time) │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Dashboard    │
    └──────────────┘
```

**Implementation Details**:
- **Route**: `/login/page.tsx`, `/signup/page.tsx`
- **API**: Supabase Auth Magic Link (OTP)
- **Flow**:
  1. User enters email
  2. System sends OTP to email via Supabase
  3. User enters 6-digit OTP
  4. Supabase verifies OTP and creates session
  5. Session token stored in cookies
  6. First-time users redirected to skills onboarding
  7. Returning users go directly to dashboard

**Security**:
- OTP expires after 60 seconds
- Failed attempts tracked and rate-limited
- Session tokens expire after 1 hour (configurable)
- Refresh tokens used for silent re-authentication

---

### 2. AI Tutor Chat Workflow
```
┌────────────────────────────────────────────────────────┐
│            User Opens AI Tutor Tab                     │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Load/Create     │
             │ Chat Session    │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Display History │
             │ (if existing)   │
             └────────┬────────┘
                      │
           User Types Message
                      │
                      ▼
        ┌─────────────────────────┐
        │ Detect Intent           │
        │ • Reminder?             │
        │ • Event Removal?        │
        │ • General Question?     │
        └───────────┬─────────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
      ▼             ▼             ▼
┌──────────┐ ┌───────────┐ ┌────────────┐
│ Reminder │ │ Event     │ │ AI         │
│ Detected │ │ Removal   │ │ Response   │
└────┬─────┘ └─────┬─────┘ └─────┬──────┘
     │             │             │
     ▼             ▼             ▼
┌──────────┐ ┌───────────┐ ┌────────────┐
│ Parse    │ │ Parse     │ │ Call Groq  │
│ Date/Time│ │ Date      │ │ LLM API    │
└────┬─────┘ └─────┬─────┘ └─────┬──────┘
     │             │             │
     ▼             ▼             ▼
┌──────────┐ ┌───────────┐ ┌────────────┐
│ Google   │ │ Delete    │ │ Display    │
│ Calendar?│ │ Events    │ │ Response   │
└────┬─────┘ └─────┬─────┘ └─────┬──────┘
     │             │             │
     ▼             ▼             │
┌──────────┐ ┌───────────┐       │
│ Add      │ │ Show      │       │
│ Event    │ │ Count     │       │
└────┬─────┘ └─────┬─────┘       │
     │             │             │
     └─────────────┴─────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Save to         │
          │ chat_messages   │
          └─────────────────┘
```

**Implementation Details**:

**Component**: `AITutorContent.tsx`

**Key Functions**:
```typescript
// 1. Send Message
handleSend() {
  // Detect reminder intent
  if (shouldCheckReminder(text)) {
    maybeParseReminder(text)  // /api/reminder/parse
    if (googleConnected) {
      handleAddReminderToCalendar()  // Auto-add event
    }
  }
  
  // Detect event removal intent
  if (shouldCheckRemoveEvent(text)) {
    const date = parseRemovalDate(text)
    handleRemoveAllEventsForDate(date)  // Auto-delete events
  }
  
  // Send to AI
  fetch('/api/generate', { message, language })
}

// 2. Reminder Detection
shouldCheckReminder(text: string) {
  return /(remind|reminder|notify|alarm|schedule|@)/.test(text)
}

// 3. Event Removal Detection
shouldCheckRemoveEvent(text: string) {
  return /(remove|delete|clear).*(event|all)/.test(text)
}

// 4. Date Parsing
parseRemovalDate(text: string) {
  // Supports: "today", "tomorrow", "2/10/2026", "10th february"
  // Returns: "YYYY-MM-DD" format
}
```

**API Routes**:
1. **`/api/generate`** - Main AI response generation
2. **`/api/reminder/parse`** - Extract reminder details from text
3. **`/api/google/add-event`** - Create calendar event
4. **`/api/google/list-delete-events`** - Bulk delete events by date

**Data Flow**:
```
User Message → Intent Detection → API Call → AI Response
                    ↓
              Side Effects:
              - Add Calendar Event (if reminder)
              - Delete Calendar Events (if removal request)
              - Save to Database (chat_messages)
```

**Features**:
- ✅ Conversation history with session management
- ✅ Markdown rendering with syntax highlighting
- ✅ Automatic reminder detection and calendar integration
- ✅ Bulk event deletion with date parsing
- ✅ Animated "processing" indicators
- ✅ Copy message to clipboard
- ✅ Multi-language support

---

### 3. Google Calendar Integration Workflow

#### A. OAuth Connection Flow
```
┌─────────────────────────────────────────────────────────┐
│        User Clicks "Connect Google Calendar"            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ POST /api/google│
              │ /oauth          │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Generate OAuth  │
              │ URL with state  │
              │ (userId + view) │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Redirect to     │
              │ Google Login    │
              └────────┬────────┘
                       │
                       ▼
         ┌────────────────────────┐
         │ User Authorizes        │
         │ Calendar Access        │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Google Redirects to:   │
         │ /api/google/callback   │
         │ ?code=xxx&state=yyy    │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Verify State Signature │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Exchange Code for      │
         │ Access + Refresh Token │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Store in               │
         │ google_calendar_tokens │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Redirect to App        │
         │ /?view=tutor           │
         │ &google=connected      │
         └────────┬───────────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Update UI:             │
         │ "Calendar Connected"✅│
         └────────────────────────┘
```

**Implementation**:

**OAuth Routes**:
```javascript
// 1. Initiate OAuth
POST /api/google/oauth
Input: { userId, currentView }
Output: { url: "https://accounts.google.com/o/oauth2/v2/auth?..." }

// 2. Handle Callback
GET /api/google/callback?code=xxx&state=yyy
Process:
  - Verify state signature
  - Exchange code for tokens
  - Store in database
  - Redirect to app with view parameter

// 3. Check Status
POST /api/google/status
Input: { userId, accessToken }
Output: { connected: boolean }
```

**Security Features**:
- State parameter with HMAC signature for CSRF protection
- Secure token storage with Row-Level Security
- Automatic token refresh when expired
- Scope limitation to calendar.events only

#### B. Reminder Creation Flow
```
User Says: "Remind me @ 10:45 for visiting bike broker"
                       │
                       ▼
              ┌─────────────────┐
              │ Detect Reminder │
              │ Intent (Regex)  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ POST /api/      │
              │ reminder/parse  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Groq LLM Parse: │
              │ {               │
              │   title: "Visit"│
              │   date: 2026-.. │
              │   time: "10:45" │
              │ }               │
              └────────┬────────┘
                       │
                       ▼
         ┌────────────────────────┐
         │ Google Calendar        │
         │ Connected?             │
         └──────┬─────────┬───────┘
                │ No      │ Yes
                ▼         ▼
         ┌──────────┐ ┌─────────────┐
         │ Show     │ │ Auto-Add    │
         │ "Connect"│ │ Event       │
         │ Message  │ │ After 500ms │
         └──────────┘ └──────┬──────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ POST /api/google│
                    │ /add-event      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ Get refresh_token │
                    │ from DB           │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Create OAuth    │
                    │ Client          │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Call Google     │
                    │ Calendar API    │
                    │ events.insert() │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Return eventId  │
                    │ Store in UI     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ Show Success:     │
                    │ "✅ Reminder set" │
                    │ with Delete btn   │
                    └───────────────────┘
```

**Date/Time Parsing Examples**:
```javascript
// User Input → Parsed Output
"Remind me @ 10:45" → { time: "10:45", date: "2026-02-08" }
"Remind me tomorrow at 3pm" → { time: "15:00", date: "2026-02-09" }
"Set alarm for 10th february 9am" → { time: "09:00", date: "2026-02-10" }
"Notify me in 2 hours" → { time: "14:30", date: "2026-02-08" }
```

#### C. Event Removal Flow
```
User Says: "remove every event for 10th february"
                       │
                       ▼
              ┌─────────────────┐
              │ Detect Removal  │
              │ Intent (Regex)  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Parse Date:     │
              │ "10th february" │
              │ → "2026-02-10"  │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ AI Response:    │
              │ "I'll remove    │
              │ all events..."  │
              └────────┬────────┘
                       │
                       ▼
         ┌────────────────────────┐
         │ POST /api/google/      │
         │ list-delete-events     │
         │ { date: "2026-02-10" } │
         └──────┬─────────────────┘
                │
                ▼
         ┌────────────────────────┐
         │ Google Calendar API:   │
         │ events.list()          │
         │ timeMin: 00:00:00      │
         │ timeMax: 23:59:59      │
         └──────┬─────────────────┘
                │
                ▼
         ┌────────────────────────┐
         │ Loop Events:           │
         │ events.delete(eventId) │
         └──────┬─────────────────┘
                │
                ▼
         ┌────────────────────────┐
         │ Return Count:          │
         │ { deletedCount: 3 }    │
         └──────┬─────────────────┘
                │
                ▼
         ┌────────────────────────┐
         │ Show Success:          │
         │ "✅ Removed 3 events   │
         │  from 2/10/2026"       │
         └────────────────────────┘
```

**Date Parsing Support**:
- "today" → current date
- "tomorrow" → next day
- "10th february" → 2026-02-10
- "2/10/2026" → 2026-02-10
- "feb 10" → 2026-02-10

---

### 4. Schedule Generator Workflow
```
┌────────────────────────────────────────────────────────┐
│        User Opens Schedule Tab                         │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Enter Prompt:   │
             │ "Create study   │
             │  schedule for   │
             │  Data Science"  │
             └────────┬────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ POST /api/generate-      │
        │ schedule                 │
        │ { prompt, action: "gen" }│
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Groq LLM generates:      │
        │ [                        │
        │   {                      │
        │     time: "9:00-10:00"   │
        │     activity: "Python"   │
        │     description: "..."   │
        │     status: "UPCOMING"   │
        │     day: "Monday"        │
        │   },                     │
        │   ...                    │
        │ ]                        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Display in Timetable     │
        │ with Status Dropdowns    │
        └────────┬─────────────────┘
                 │
      ┌──────────┴──────────────┐
      │                         │
      ▼                         ▼
┌──────────┐           ┌─────────────┐
│ Save     │           │ Individual  │
│ Schedule │           │ Events      │
└────┬─────┘           └──────┬──────┘
     │                        │
     ▼                        ▼
┌──────────┐         ┌──────────────┐
│ POST     │         │ Click "Add"  │
│ /api/    │         │ Button       │
│ generate-│         └──────┬───────┘
│ schedule │                │
│ {action: │                ▼
│ "save"}  │      ┌─────────────────┐
└────┬─────┘      │ Parse Time:     │
     │            │ "9:00-10:00"    │
     ▼            │ → startMinutes  │
┌──────────┐      │ → endMinutes    │
│ Insert   │      └──────┬──────────┘
│ into     │             │
│ schedules│             ▼
│ table    │   ┌──────────────────────┐
└────┬─────┘   │ Get Next Date:       │
     │         │ "Monday" → 2026-02-10│
     ▼         └──────┬───────────────┘
┌──────────┐          │
│ Show     │          ▼
│ Success  │   ┌──────────────────────┐
└──────────┘   │ POST /api/google/    │
               │ add-event            │
               │ {                    │
               │   summary: "Python"  │
               │   start: ISO string  │
               │   end: ISO string    │
               │ }                    │
               └──────┬───────────────┘
                      │
                      ▼
               ┌──────────────────────┐
               │ Event Created in     │
               │ Google Calendar ✅   │
               └──────────────────────┘
```

**Schedule Actions**:
```javascript
// Generate Schedule
{ action: "generate", prompt: "..." }
→ Returns: { schedule: [...items] }

// Save Schedule
{ action: "save", userId, name, content }
→ Returns: { id: 123, success: true }

// Load Saved Schedules
{ action: "load", userId }
→ Returns: { schedules: [...] }

// Update Schedule
{ action: "update", id, name, content }
→ Returns: { success: true }

// Delete Schedule
{ action: "delete", id }
→ Returns: { success: true }
```

**Time Parsing Logic**:
```javascript
// Supported formats:
"9:00" → 540 minutes
"9am" → 540 minutes
"3:30pm" → 930 minutes
"9:00-10:30" → start: 540, end: 630
"9am-12pm" → start: 540, end: 720

// Day of week → Next occurrence:
"Monday" → 2026-02-10 (next Monday)
"Friday" → 2026-02-14 (next Friday)
```

**Features**:
- ✅ AI-generated schedules with time blocks
- ✅ Editable status (PENDING, UPCOMING, DONE)
- ✅ Individual calendar export per item
- ✅ Save/load multiple schedules
- ✅ Print to PDF
- ✅ Skip DONE items when exporting

---

### 5. Quiz Generation Workflow
```
┌────────────────────────────────────────────────────────┐
│         User Opens Quiz Tab                            │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Enter Topic:    │
             │ "Machine        │
             │  Learning"      │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Select:         │
             │ • Difficulty    │
             │ • Num Questions │
             └────────┬────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ POST /api/generate-quiz  │
        │ {                        │
        │   topic,                 │
        │   difficulty,            │
        │   numQuestions           │
        │ }                        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Groq LLM generates:      │
        │ [                        │
        │   {                      │
        │     question: "What is?" │
        │     options: [A,B,C,D]   │
        │     correct: 1           │
        │     explanation: "..."   │
        │   },                     │
        │   ...                    │
        │ ]                        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Display Quiz Interface   │
        │ • Radio buttons          │
        │ • Next/Previous buttons  │
        │ • Submit button          │
        └────────┬─────────────────┘
                 │
        User Answers Questions
                 │
                 ▼
        ┌──────────────────────────┐
        │ Submit Answers           │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Calculate Score:         │
        │ correctAnswers / total   │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ POST /api/generate-quiz  │
        │ (with userAnswers)       │
        │ → Get AI Analysis        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Save to quiz_results:    │
        │ {                        │
        │   topic,                 │
        │   score,                 │
        │   total_questions,       │
        │   quiz_data,             │
        │   user_answers,          │
        │   ai_analysis            │
        │ }                        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Show Results Screen:     │
        │ • Score: 8/10            │
        │ • Percentage: 80%        │
        │ • Per-question feedback  │
        │ • AI suggestions         │
        └──────────────────────────┘
```

**Quiz Configuration**:
```typescript
interface QuizConfig {
  topic: string;              // "Machine Learning"
  difficulty: "easy" | "medium" | "hard";
  numQuestions: 5 | 10 | 15 | 20;
}

interface QuizQuestion {
  question: string;
  options: string[];          // [A, B, C, D]
  correct: number;            // Index of correct answer (0-3)
  explanation: string;        // Why the answer is correct
}

interface QuizResult {
  score: number;              // Number correct
  totalQuestions: number;
  percentage: number;
  aiAnalysis: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
}
```

**Features**:
- ✅ Adjustable difficulty levels
- ✅ Customizable question count
- ✅ Instant grading
- ✅ Per-question explanations
- ✅ AI-powered improvement suggestions
- ✅ Quiz history tracking
- ✅ Progress visualization

---

### 6. PDF Tutor Workflow
```
┌────────────────────────────────────────────────────────┐
│          User Opens PDF Tutor Tab                      │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Upload PDF File │
             └────────┬────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ Client-side PDF.js:      │
        │ • Extract text           │
        │ • Count pages            │
        │ • Get file size          │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Save to Database:        │
        │ INSERT INTO pdfs         │
        │ {                        │
        │   user_id,               │
        │   file_name,             │
        │   content: extractedText,│
        │   file_size              │
        │ }                        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Display PDF Info:        │
        │ • Name                   │
        │ • Size                   │
        │ • Page count             │
        │ • Delete button          │
        └────────┬─────────────────┘
                 │
        User Asks Question
                 │
                 ▼
        ┌──────────────────────────┐
        │ POST /api/chat-pdf       │
        │ {                        │
        │   message: "What is...?" │
        │   pdfText: content       │
        │ }                        │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Groq LLM with Context:   │
        │ System Prompt:           │
        │ "You are analyzing PDF"  │
        │ Context: [PDF content]   │
        │ Question: [user message] │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ AI Response with         │
        │ Document-grounded Answer │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ Display in Chat UI       │
        │ with Markdown Formatting │
        └──────────────────────────┘
```

**Supported PDF Features**:
- Text extraction (not scanned images)
- Multi-page documents
- Maximum size: 10MB (configurable)
- Formats: PDF only

**Limitations**:
- OCR not supported (scanned PDFs won't work)
- No image analysis
- Text-based content only

---

### 7. Course Discovery Workflow
```
┌────────────────────────────────────────────────────────┐
│        User Opens Courses Tab                          │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
             ┌─────────────────┐
             │ Enter Search:   │
             │ "Python for     │
             │  Beginners"     │
             └────────┬────────┘
                      │
                      ▼
        ┌──────────────────────────┐
        │ Check Local Cache:       │
        │ SELECT FROM courses      │
        │ WHERE query LIKE ?       │
        └────────┬─────────────────┘
                 │
        ┌────────┴────────┐
        │ Cached?         │
        └─────┬─────┬─────┘
              │ Yes │ No
              ▼     ▼
        ┌──────┐ ┌──────────────┐
        │Return│ │ POST /api/   │
        │Cache │ │ proxy-courses│
        └──────┘ └──────┬───────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Course Fetcher  │
               │ Microservice    │
               │ (port 4000)     │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Fetch from      │
               │ External API    │
               │ (Udemy/etc)     │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Cache Results:  │
               │ INSERT INTO     │
               │ courses         │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ Return Courses  │
               └────────┬────────┘
                        │
                        ▼
        ┌──────────────────────────┐
        │ Display Course Cards:    │
        │ • Title                  │
        │ • Provider               │
        │ • Rating                 │
        │ • Price                  │
        │ • Link                   │
        └──────────────────────────┘
```

**Course Fetcher Microservice**:
```javascript
// course-fetcher/server.js
app.post('/api/courses', async (req, res) => {
  const { topic } = req.body;
  
  // Call external API (Udemy, Coursera, etc.)
  const courses = await fetchCoursesFromProvider(topic);
  
  return res.json({ courses });
});
```

**Caching Strategy**:
- Cache key: Search query (lowercase, trimmed)
- Cache duration: 7 days
- Cache invalidation: Manual or time-based
- Benefits: Faster repeat searches, reduced API calls

---

## API Documentation

### Authentication APIs

#### 1. Send OTP
```typescript
POST /api/send-otp
Body: {
  email: string;
}
Response: {
  success: boolean;
  message: string;
}
```

#### 2. Reset Password
```typescript
POST /api/reset-password
Body: {
  email: string;
  newPassword: string;
  otp: string;
}
Response: {
  success: boolean;
  message: string;
}
```

---

### AI Generation APIs

#### 3. AI Tutor Generate
```typescript
POST /api/generate
Body: {
  message: string;
  language?: string;
}
Response: {
  text: string;
}

System Prompt Includes:
- REMINDER HANDLING: Detect and respond to reminder requests
- EVENT REMOVAL HANDLING: Detect and handle event deletion requests
- General tutoring instructions
```

#### 4. Generate Quiz
```typescript
POST /api/generate-quiz
Body: {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  numQuestions: 5 | 10 | 15 | 20;
}
Response: {
  questions: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}
```

#### 5. Generate Schedule
```typescript
POST /api/generate-schedule
Body: {
  action: "generate" | "save" | "load" | "update" | "delete";
  prompt?: string;         // For "generate"
  userId?: string;         // For user-specific actions
  name?: string;           // For "save" and "update"
  content?: ScheduleItem[];// For "save" and "update"
  id?: number;             // For "update" and "delete"
}

Response (generate): {
  schedule: Array<{
    time: string;
    activity: string;
    description: string;
    status: "PENDING" | "UPCOMING" | "DONE";
    day?: string;
  }>;
}

Response (save/update): {
  id: number;
  success: boolean;
}

Response (load): {
  schedules: Array<{
    id: number;
    name: string;
    content: ScheduleItem[];
    created_at: string;
  }>;
}
```

#### 6. Generate Notes
```typescript
POST /api/generate-notes
Body: {
  topic: string;
  detail?: string;
}
Response: {
  notes: string; // Markdown formatted
}
```

---

### PDF APIs

#### 7. Chat with PDF
```typescript
POST /api/chat-pdf
Body: {
  message: string;
  pdfText: string;
}
Response: {
  text: string;
}
```

---

### Google Calendar APIs

#### 8. Initiate OAuth
```typescript
POST /api/google/oauth
Body: {
  userId: string;
  nextPath?: string;
  currentView?: "tutor" | "schedule" | "dashboard";
}
Response: {
  url: string; // Google OAuth URL
}
```

#### 9. OAuth Callback
```typescript
GET /api/google/callback?code=xxx&state=yyy
Process:
  - Verify state signature
  - Exchange code for tokens
  - Store in google_calendar_tokens
  - Redirect to /?view={currentView}&google=connected
```

#### 10. Check Calendar Status
```typescript
POST /api/google/status
Body: {
  userId: string;
  accessToken: string;
}
Response: {
  connected: boolean;
}
```

#### 11. Add Calendar Event
```typescript
POST /api/google/add-event
Body: {
  userId: string;
  accessToken: string;
  event: {
    summary: string;
    description?: string;
    start: string;    // ISO 8601
    end: string;      // ISO 8601
    timeZone?: string;
  };
}
Response: {
  success: boolean;
  eventId: string;
}
```

#### 12. Delete Calendar Event
```typescript
POST /api/google/delete-event
Body: {
  userId: string;
  accessToken: string;
  eventId: string;
}
Response: {
  success: boolean;
}
```

#### 13. Bulk Delete Events by Date
```typescript
POST /api/google/list-delete-events
Body: {
  userId: string;
  accessToken: string;
  date: string; // "YYYY-MM-DD"
}
Response: {
  success: boolean;
  deletedCount: number;
  events: Array<{ id, summary, start, end }>;
}
```

---

### Reminder API

#### 14. Parse Reminder
```typescript
POST /api/reminder/parse
Body: {
  text: string;
  timeZone: string;
  nowIso: string;
}
Response: {
  isReminder: boolean;
  title?: string;
  date?: string;        // "YYYY-MM-DD"
  time?: string;        // "HH:MM"
  durationMinutes?: number;
  description?: string;
}

Example:
Input: "Remind me @ 10:45 for visiting bike broker"
Output: {
  isReminder: true,
  title: "Visiting bike broker",
  date: "2026-02-08",
  time: "10:45",
  durationMinutes: 60
}
```

---

### Course APIs

#### 15. Search Courses (Proxy)
```typescript
POST /api/proxy-courses
Body: {
  topic: string;
}
Response: {
  courses: Array<{
    title: string;
    provider: string;
    rating: number;
    price: string;
    url: string;
    thumbnail?: string;
  }>;
}
```

#### 16. Search Courses (Cached)
```typescript
POST /api/search-courses
Body: {
  query: string;
}
Response: {
  courses: Array<Course>;
  cached: boolean;
}
```

---

### Skills API

#### 17. Update User Skills
```typescript
POST /api/update-skills
Body: {
  userId: string;
  skills: string[];
}
Response: {
  success: boolean;
  skills: string[];
}
```

---

## Component Architecture

### Page Components

#### 1. `page.tsx` (Dashboard/Main)
- **Purpose**: Main application shell
- **State Management**:
  - Current view (dashboard, tutor, pdf, quiz, schedule, etc.)
  - User session
  - Dark mode toggle
  - Google OAuth redirect handling
- **Routing**: URL parameter parsing for `?view=tutor&google=connected`
- **Components Used**: Sidebar, all content components

#### 2. `login/page.tsx`
- **Purpose**: User authentication
- **Flow**: Email → OTP → Session creation
- **Redirect**: Dashboard or skills onboarding for new users

#### 3. `signup/page.tsx`
- **Purpose**: New user registration
- **Flow**: Email → OTP → Profile creation → Skills onboarding
- **Redirect**: Dashboard after skills setup

---

### Content Components

#### 4. `DashboardContent.tsx`
- **Purpose**: Main dashboard view
- **Features**:
  - Welcome message with user stats
  - Quick action buttons
  - Recent activity
  - Skills display
- **State**: User profile, recent sessions, quiz results

#### 5. `AITutorContent.tsx`
- **Purpose**: AI chat interface
- **Key Features**:
  - Conversation history with session management
  - Reminder detection and auto-calendar integration
  - Event removal detection and bulk deletion
  - Markdown rendering with syntax highlighting
  - Message copying
  - Google Calendar connection status
- **State**:
  ```typescript
  {
    messages: ChatMessage[];
    currentSessionId: string | null;
    sessions: ChatSession[];
    input: string;
    isLoading: boolean;
    googleConnected: boolean;
    pendingReminder: ReminderState | null;
    reminderAdding: boolean;
    reminderDeleting: boolean;
  }
  ```
- **Functions**:
  - `handleSend()` - Send message, detect intents
  - `shouldCheckReminder()` - Regex for reminder detection
  - `shouldCheckRemoveEvent()` - Regex for event removal
  - `parseRemovalDate()` - Extract date from text
  - `handleAddReminderToCalendar()` - Create calendar event
  - `handleDeleteReminder()` - Delete single event
  - `handleRemoveAllEventsForDate()` - Bulk delete events

#### 6. `pdf_tutorContent.tsx`
- **Purpose**: PDF upload and chat interface
- **Features**:
  - Client-side PDF text extraction
  - Document-grounded Q&A
  - PDF management (upload, delete)
- **State**:
  ```typescript
  {
    pdfs: PDF[];
    selectedPdfId: string | null;
    messages: ChatMessage[];
    uploading: boolean;
    chatLoading: boolean;
  }
  ```

#### 7. `QuizContent.tsx`
- **Purpose**: Quiz generation and taking interface
- **Features**:
  - Configurable difficulty and question count
  - Multiple-choice interface
  - Instant grading
  - AI analysis and feedback
  - Quiz history
- **State**:
  ```typescript
  {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    numQuestions: 5 | 10 | 15 | 20;
    quiz: QuizQuestion[];
    currentQuestion: number;
    userAnswers: number[];
    submitted: boolean;
    score: number;
    aiAnalysis: object;
  }
  ```

#### 8. `ScheduleContent.tsx`
- **Purpose**: Schedule generation and management
- **Features**:
  - AI-generated schedules from prompts
  - Save/load multiple schedules
  - Export individual items to Google Calendar
  - Edit status (PENDING, UPCOMING, DONE)
  - Print to PDF
- **State**:
  ```typescript
  {
    schedule: ScheduleItem[];
    scheduleId: number | null;
    scheduleName: string;
    prompt: string;
    loading: boolean;
    savedSchedules: Schedule[];
    googleConnected: boolean;
    calendarAdding: boolean;
  }
  ```
- **Functions**:
  - `generateSchedule()` - Create from prompt
  - `saveAsNew()` - Save to database
  - `loadSchedule()` - Load saved schedule
  - `addItemToCalendar()` - Export single item
  - `parseTimeRange()` - Parse "9:00-10:30" format
  - `getNextDateForDay()` - "Monday" → next Monday's date

#### 9. `DynamicTimetable.tsx`
- **Purpose**: Reusable timetable display component
- **Props**:
  ```typescript
  {
    schedule: ScheduleItem[];
    onStatusChange: (index, newStatus) => void;
    onAddItemToCalendar: (index) => void;
    calendarConnected: boolean;
    calendarAdding: boolean;
    connectGoogleCalendar: () => void;
  }
  ```
- **Features**:
  - Responsive table with day column (if present)
  - Status selector dropdown
  - Individual "Add to Calendar" buttons
  - Print support
  - Hover effects and transitions

#### 10. `CourseContent.tsx`
- **Purpose**: Course discovery interface
- **Features**:
  - Search with caching
  - Course cards with provider, rating, price
  - External links to course platforms
  - Loading states
- **State**:
  ```typescript
  {
    searchQuery: string;
    courses: Course[];
    loading: boolean;
    cached: boolean;
  }
  ```

#### 11. `PomodoroContent.tsx`
- **Purpose**: Focus timer with Pomodoro technique
- **Features**:
  - 25-minute work sessions
  - 5-minute short breaks
  - 15-minute long breaks
  - Notification sounds
  - Session counter
- **State**:
  ```typescript
  {
    timeLeft: number;
    isRunning: boolean;
    mode: "work" | "shortBreak" | "longBreak";
    sessionsCompleted: number;
  }
  ```

#### 12. `SkillsContent.tsx`
- **Purpose**: User skills management
- **Features**:
  - Add/remove skills with chips
  - Skill suggestions
  - Save to profile
- **State**:
  ```typescript
  {
    skills: string[];
    newSkill: string;
    saving: boolean;
  }
  ```

#### 13. `notesllm.tsx`
- **Purpose**: AI-powered note generation
- **Features**:
  - Generate notes from topics
  - Markdown editor (TipTap)
  - Export as PDF or DOCX
  - Save to local storage
- **State**:
  ```typescript
  {
    topic: string;
    generatedNotes: string;
    loading: boolean;
    editor: Editor | null;
  }
  ```

---

### Utility Components

#### 14. `Sidebar.tsx`
- **Purpose**: Navigation menu
- **Props**: `currentView`, `setView`, `onLogout`
- **Features**: Icon-based navigation, logout button

#### 15. `MessageContent.tsx`
- **Purpose**: Individual chat message rendering
- **Props**: `role`, `content`
- **Features**: Markdown rendering, code syntax highlighting

#### 16. `NotificationOverlay.tsx`
- **Purpose**: Toast notifications
- **Props**: `open`, `message`, `type`, `onClose`
- **Types**: success, error, info, warning

#### 17. `GlobalNotificationListener.tsx`
- **Purpose**: System-wide notification handler
- **Features**: Listen for events, display toasts

#### 18. `ThemeInitializer.tsx`
- **Purpose**: Initialize dark mode on page load
- **Features**: Read from localStorage, apply to DOM

#### 19. `SchedulePrint.tsx`
- **Purpose**: Print-optimized schedule layout
- **Props**: `schedule`
- **Features**: Clean table format, page break handling

---

## Authentication & Security

### Authentication Flow

#### Supabase Auth Integration
```typescript
// Initialize Supabase client
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Sign in with OTP
await supabase.auth.signInWithOtp({ email });

// Verify OTP
await supabase.auth.verifyOtp({ email, token, type: 'email' });

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Sign out
await supabase.auth.signOut();
```

### Row-Level Security (RLS)

All database tables have RLS policies that enforce:
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

### API Security

#### 1. Session Validation
```typescript
// Every API route validates session
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### 2. User ID Verification
```typescript
// Match session user with request user
const { data: userData } = await supabaseAuth.auth.getUser();
if (userData?.user?.id !== userId) {
  return NextResponse.json({ error: "Invalid user" }, { status: 401 });
}
```

#### 3. Google OAuth State Verification
```typescript
// HMAC signature for state parameter
const stateObj = { userId, currentView, timestamp };
const stateString = JSON.stringify(stateObj);
const signature = crypto
  .createHmac('sha256', OAUTH_STATE_SECRET)
  .update(stateString)
  .digest('hex');

const state = Buffer.from(
  JSON.stringify({ ...stateObj, signature })
).toString('base64');
```

### Environment Variables Security

#### Required Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Server-side only

# AI Providers
GROQ_API_KEY=gsk_...
GENERATIVE_API_KEY=AIza...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_OAUTH_STATE_SECRET=your-secret-min-32-chars

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
COURSE_FETCHER_URL=http://localhost:4000
```

#### Security Best Practices
1. Never commit `.env.local` to version control
2. Use different credentials for dev/staging/production
3. Rotate API keys periodically
4. Use service role key only on server-side
5. Store OAuth secrets securely (min 32 characters)

---

## Google Calendar Integration

### OAuth 2.0 Setup

#### 1. Google Cloud Console Setup
```
1. Go to: https://console.cloud.google.com
2. Create a new project or select existing
3. Enable Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Authorized redirect URIs:
   - http://localhost:3000/api/google/callback (development)
   - https://your-domain.com/api/google/callback (production)
7. Copy Client ID and Client Secret
8. Add to .env.local
```

#### 2. Scopes Requested
```javascript
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events'
];
```
- Limited to calendar events only (not full calendar access)
- Read and write event permissions

### Token Management

#### Token Storage
```sql
CREATE TABLE google_calendar_tokens (
  user_id uuid PRIMARY KEY,
  refresh_token text NOT NULL,      -- Never expires
  access_token text,                 -- Expires in 1 hour
  token_type text,                   -- "Bearer"
  scope text,                        -- Granted scopes
  expiry_date timestamptz,           -- Token expiration
  created_at timestamptz,
  updated_at timestamptz
);
```

#### Token Refresh Flow
```typescript
async function getValidAccessToken(userId: string) {
  // 1. Fetch refresh token from database
  const { data: tokenRow } = await supabase
    .from('google_calendar_tokens')
    .select('refresh_token, access_token, expiry_date')
    .eq('user_id', userId)
    .single();

  // 2. Check if access token is still valid
  if (tokenRow.expiry_date > new Date()) {
    return tokenRow.access_token;
  }

  // 3. Use refresh token to get new access token
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    refresh_token: tokenRow.refresh_token
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  // 4. Update database with new access token
  await supabase
    .from('google_calendar_tokens')
    .update({
      access_token: credentials.access_token,
      expiry_date: new Date(credentials.expiry_date)
    })
    .eq('user_id', userId);

  return credentials.access_token;
}
```

### Calendar Operations

#### Create Event
```typescript
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const event = {
  summary: 'Study Python',
  description: 'Learn basics of Python programming',
  start: {
    dateTime: '2026-02-10T10:00:00',
    timeZone: 'America/Los_Angeles',
  },
  end: {
    dateTime: '2026-02-10T11:30:00',
    timeZone: 'America/Los_Angeles',
  },
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 10 },
    ],
  },
};

const response = await calendar.events.insert({
  calendarId: 'primary',
  requestBody: event,
});

return response.data.id; // Event ID for later deletion
```

#### Delete Event
```typescript
await calendar.events.delete({
  calendarId: 'primary',
  eventId: 'event123abc',
});
```

#### List Events (for bulk deletion)
```typescript
const response = await calendar.events.list({
  calendarId: 'primary',
  timeMin: '2026-02-10T00:00:00Z',
  timeMax: '2026-02-10T23:59:59Z',
  singleEvents: true,
  orderBy: 'startTime',
});

const events = response.data.items || [];

// Delete each event
for (const event of events) {
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: event.id,
  });
}
```

### Error Handling

#### Common Errors
```typescript
try {
  await calendar.events.insert(...);
} catch (error) {
  if (error.code === 401) {
    // Token expired or invalid
    // Trigger re-authentication
  } else if (error.code === 403) {
    // Insufficient permissions
    // Request additional scopes
  } else if (error.code === 404) {
    // Event not found
  } else {
    // Generic error
    console.error('Calendar API Error:', error);
  }
}
```

---

## Setup & Deployment

### Local Development Setup

#### Prerequisites
```bash
Node.js 18+ (recommended 20+)
npm / pnpm / yarn
Supabase account
Groq API key
Google Generative AI key
Google Cloud OAuth credentials
```

#### Step 1: Clone and Install
```bash
git clone <repository-url>
cd ai_tutor
npm install
```

#### Step 2: Environment Configuration
Create `.env.local` in the project root:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# AI Providers
GROQ_API_KEY=gsk_...
GENERATIVE_API_KEY=AIza...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
GOOGLE_OAUTH_STATE_SECRET=your-secret-key-min-32-characters

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
COURSE_FETCHER_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Step 3: Database Setup
1. Go to Supabase SQL Editor
2. Copy contents of `database_setup.sql`
3. Execute the SQL
4. Verify tables created with RLS enabled

#### Step 4: Start Development Servers

**Option A: Automated (Windows)**
```bash
start-servers.bat
```

**Option B: Automated (Mac/Linux)**
```bash
bash start-servers.sh
```

**Option C: Manual**
```bash
# Terminal 1: Course Fetcher
cd course-fetcher
npm install
npm run dev

# Terminal 2: Next.js App
npm run dev
```

#### Step 5: Access Application
```
http://localhost:3000
```

### Network Access Setup

#### For Same WiFi Access

1. **Find Computer IP**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
   Look for IPv4 address (e.g., 192.168.1.100)

2. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000
   NEXT_PUBLIC_API_URL=http://192.168.1.100:4000
   COURSE_FETCHER_URL=http://192.168.1.100:4000
   ```

3. **Update CORS in course-fetcher/server.js**
   ```javascript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'http://192.168.1.100:3000'
     ]
   }));
   ```

4. **Restart Both Servers**

5. **Access from Other Device**
   ```
   http://192.168.1.100:3000
   ```

### Production Deployment

#### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Deploy course-fetcher separately or integrate into Next.js
```

**Environment Variables in Vercel**:
- Add all variables from `.env.local`
- Update `NEXT_PUBLIC_APP_URL` to production domain
- Update `GOOGLE_REDIRECT_URI` to production callback URL

#### Option 2: Docker

**Create Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Build and Run**:
```bash
docker build -t ai-tutor .
docker run -p 3000:3000 --env-file .env.local ai-tutor
```

#### Option 3: Render (Current Production)

1. Connect GitHub repository to Render
2. Create Web Service
3. Set environment variables
4. Deploy
5. Access at: `https://your-app.onrender.com`

**Note**: Free tier may have cold starts (slower initial load)

### Database Migration

#### Export from Local Supabase
```bash
# Backup
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql

# Restore to production
psql -h db.yyyyy.supabase.co -U postgres -d postgres < backup.sql
```

### Post-Deployment Checklist

- [ ] All environment variables set correctly
- [ ] Database tables created with RLS
- [ ] Google OAuth redirect URI updated
- [ ] Google Calendar API enabled
- [ ] Supabase auth configured
- [ ] CORS settings updated for production domain
- [ ] SSL certificate installed (for HTTPS)
- [ ] DNS records configured
- [ ] Test all features end-to-end
- [ ] Monitor error logs
- [ ] Set up analytics (optional)

---

## Technology Stack Details

### Frontend Technologies

#### Next.js 16.1.6
- **App Router**: Modern routing with layouts and server components
- **React Server Components**: Improved performance with server-side rendering
- **API Routes**: Serverless functions for backend logic
- **Image Optimization**: Automatic image optimization
- **Code Splitting**: Automatic code splitting for faster page loads

#### React 19.2.3
- **Hooks**: useState, useEffect, useRef, useCallback, useMemo
- **Context API**: Not heavily used (Supabase client shared via import)
- **Component Patterns**: Functional components with hooks

#### Tailwind CSS 4.x
- **Utility-First**: Rapid UI development with utility classes
- **Responsive Design**: Mobile-first responsive utilities
- **Dark Mode**: Built-in dark mode support
- **Custom Theme**: Extended with custom colors and utilities

#### Lucide React 0.563.0
- **Icon Library**: Clean, consistent icon set
- **Tree-Shakable**: Only imports used icons
- **Customizable**: Size, color, stroke width

### Backend Technologies

#### Supabase
- **PostgreSQL Database**: Relational database with full SQL support
- **Authentication**: Built-in auth with magic links, OAuth, etc.
- **Row-Level Security**: Database-level access control
- **Real-time**: WebSocket subscriptions (not heavily used in this app)
- **Storage**: File storage capability (not used in this app)

#### Groq SDK 0.37.0
- **LLM Provider**: Fast AI inference
- **Model**: llama-3.1-8b-instant
- **Use Cases**:
  - AI tutoring responses
  - Quiz generation
  - Schedule generation
  - Reminder parsing
  - PDF Q&A

#### Google APIs
- **googleapis 155.0.0**: Official Google API client
- **Calendar API v3**: Event creation, deletion, listing
- **OAuth 2.0**: User authorization flow

### Document Processing

#### PDF.js 5.4.530
- **Client-Side PDF Parsing**: Extract text from PDFs in browser
- **Canvas Rendering**: Display PDF pages
- **Text Layer**: Searchable text extraction
- **Worker Support**: Background processing for better performance

#### TipTap
- **Rich Text Editor**: WYSIWYG markdown editor
- **Extensions**: Task lists, text alignment, color, underline
- **React Integration**: React components for editor

### Utility Libraries

#### React Markdown
- **Markdown Rendering**: Convert markdown to React components
- **Syntax Highlighting**: rehype-highlight for code blocks
- **GFM Support**: GitHub Flavored Markdown (tables, strikethrough)

#### React-to-Print 3.2.0
- **Print Support**: Print React components as PDFs
- **Custom Styles**: Print-specific CSS

#### File Saver 2.0.5
- **File Downloads**: Save generated files (PDF, DOCX)

#### html-docx-js-typescript
- **DOCX Generation**: Convert HTML to Word documents

### Development Tools

#### TypeScript 5.x
- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Better IDE support
- **Interfaces**: Clear data structure definitions

#### ESLint 9.x
- **Code Quality**: Enforce coding standards
- **Next.js Config**: eslint-config-next

#### PostCSS
- **CSS Processing**: Transform CSS with plugins
- **Tailwind Integration**: Process Tailwind directives

---

## Performance Optimizations

### 1. Course Search Caching
- **Strategy**: Cache search results in database
- **Duration**: 7 days
- **Impact**: Faster repeat searches, reduced API calls

### 2. Session Management
- **Strategy**: Reuse chat sessions instead of creating new ones
- **Impact**: Reduced database writes, better history

### 3. Lazy Loading
- **Components**: Dynamic imports for heavy components
- **Images**: Next.js Image component with automatic optimization

### 4. API Response Optimization
- **JSON**: Minimized response payloads
- **Compression**: Enable gzip compression in production

### 5. Database Indexing
- **Indexes**: Created on frequently queried columns
- **Impact**: Faster query performance

---

## Future Enhancements

### Planned Features
1. **Multi-language Support**: i18n integration
2. **Voice Input**: Speech-to-text for AI tutor
3. **Collaborative Learning**: Share schedules and notes with teammates
4. **Mobile App**: React Native version
5. **Advanced Analytics**: Learning progress tracking with charts
6. **Spaced Repetition**: AI-powered review recommendations
7. **Video Tutoring**: Integration with video conferencing
8. **Gamification**: Points, badges, leaderboards
9. **Social Features**: Connect with other learners
10. **AI Tutor Personalities**: Choose different tutoring styles

### Technical Debt
1. **Error Boundaries**: Add React error boundaries
2. **Logging**: Implement proper logging (e.g., Sentry)
3. **Monitoring**: Set up uptime monitoring
4. **Testing**: Add unit and integration tests
5. **CI/CD**: Automated deployment pipeline

---

## Conclusion

EduGenie represents a comprehensive AI-powered learning platform that successfully integrates multiple educational workflows into a cohesive user experience. The application demonstrates:

### Technical Achievements
- ✅ Full-stack Next.js 16 implementation with App Router
- ✅ Secure authentication with Supabase Auth
- ✅ Google Calendar integration with OAuth 2.0
- ✅ Multiple AI providers (Groq, Google Generative AI)
- ✅ Real-time document processing (PDF.js)
- ✅ Responsive UI with Tailwind CSS
- ✅ Row-Level Security for data protection

### User Experience Wins
- ✅ Seamless authentication with OTP
- ✅ Intelligent reminder detection and auto-calendar integration
- ✅ Natural language date parsing
- ✅ Auto-generated quizzes and schedules
- ✅ Document-grounded tutoring with PDFs
- ✅ Cross-device accessibility

### Business Value
- ✅ Automation of manual educational tasks
- ✅ Personalized learning paths based on skills
- ✅ Reduced friction in scheduling and reminders
- ✅ Comprehensive course discovery
- ✅ Progress tracking with quiz results

### Scalability
- ✅ Serverless architecture (Next.js API routes)
- ✅ Managed database (Supabase)
- ✅ Row-Level Security for multi-tenancy
- ✅ Caching strategy for external APIs
- ✅ Microservice architecture (course fetcher)

---

## Support & Contact

### Documentation
- **README**: `README.md`
- **Setup Guide**: `COMPLETE_SETUP_GUIDE.md`
- **Course Setup**: `COURSE_SETUP_GUIDE.md`
- **Onboarding**: `ONBOARDING_README.md`

### Live Demo
https://ai-tutor-frontend-2jv7.onrender.com

### Repository Structure
```
ai_tutor/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard
├── course-fetcher/        # Course API microservice
├── lib/                   # Shared utilities
├── public/               # Static assets
├── images/               # Screenshots
├── .env.local           # Environment variables (not in repo)
├── database_setup.sql   # Database schema
├── package.json         # Dependencies
└── README.md            # Project overview
```

---

**Document Version**: 1.0  
**Last Updated**: February 8, 2026  
**Author**: EduGenie Development Team  
**Status**: Production Ready
