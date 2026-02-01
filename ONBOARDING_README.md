# Skills-Based Onboarding Guide

This guide explains the onboarding system that personalizes the EduGenie learning experience based on user skills.

## Overview

The skills-based onboarding system:
- **Collects user skills** during sign-up or profile setup
- **Personalizes recommendations** based on selected skills
- **Stores skill data** in Supabase for future reference
- **Powers content filtering** across the platform

## How Onboarding Works

### 1. Sign-Up Flow

When users create an account:
1. **User enters basic info**: email, password
2. **Redirected to skill selection** page after account creation
3. **User selects relevant skills** from predefined categories
4. **Skills saved to Supabase** `profiles` table
5. **Redirect to dashboard** with personalized experience

### 2. Skill Categories

Skills are organized by subject area:

```
**Programming & Development**
- Python
- JavaScript / TypeScript
- Web Development (HTML, CSS)
- Backend Development
- Database Design
- Mobile Development (iOS, Android)

**Data & AI**
- Data Science
- Machine Learning
- Artificial Intelligence
- Data Analysis
- Statistics

**Business & Soft Skills**
- Project Management
- Communication
- Leadership
- Business Strategy
- Digital Marketing

**Science & Math**
- Mathematics
- Physics
- Chemistry
- Biology
- Engineering

**Creative**
- Graphic Design
- UI/UX Design
- Video Production
- Music Production
- Content Writing
```

Users can select multiple skills that match their interests and goals.

## Database Schema

### Profiles Table (Already Exists)

Your Supabase project already has a `profiles` table configured:

```
id (UUID) — User ID (linked to auth.users)
created_at (TIMESTAMP) — Account creation timestamp
updated_at (TIMESTAMP) — Last profile update timestamp
user_email (TEXT) — User's email address
full_name (TEXT) — User's full name (optional)
skills (TEXT[]) — Array of selected skills
learning_goals (TEXT) — Free-text learning objectives
skill_level (TEXT) — Proficiency level (beginner/intermediate/advanced/expert)
preferences (JSONB) — JSON object for learning preferences
is_onboarded (BOOLEAN) — Onboarding completion status
```

### Related Tables Used for Personalization

The onboarding system works with these tables:

1. **chat_messages** — Stores chat history personalized by user skills
2. **chat_sessions** — Groups tutoring sessions
3. **quiz_results** — Tracks quiz performance and learning progress
4. **schedules** — Stores AI-generated schedules personalized to skill level
5. **pdfs** — Stores uploaded PDFs for document-grounded learning

## Environment Setup

No additional environment variables needed — onboarding uses existing Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-key>
```

## Personalization Features

### 1. Dashboard Customization
- **Recommended content** filtered by selected skills
- **Course suggestions** based on skill gaps
- **Relevant learning paths** displayed prominently

### 2. AI Tutor Context
- AI tutor references user skills to provide better explanations
- Avoids teaching fundamentals user already knows
- Suggests advanced topics based on proficiency level

### 3. Quiz Generation
- Quizzes tailored to selected skills
- Difficulty adjusted to proficiency level
- Content focused on skill areas

### 4. Schedule Generation
- Study schedules prioritize skill development areas
- Time allocation based on user goals and skill level

### 5. Course Discovery
- Course recommendations filtered by user skills
- "Popular in your field" suggestions
- Skill progression paths

## Frontend Components

### Skills Selection Component

The main onboarding flow uses the **SkillsContent** component:

- Located at: [app/components/SkillsContent.tsx](app/components/SkillsContent.tsx)
- Used on: Onboarding page or settings
- Features:
  - Multi-select skill picker
  - Category grouping
  - Search/filter
  - Save to Supabase

### Usage in Routes

Onboarding page typically accessible at:
- `/skills` — Standalone skill selection
- `/onboarding` — Full onboarding flow (after signup)
- Settings page — Re-edit skills anytime

## Testing the Onboarding System

### Test via Frontend

1. **Create a new account**:
   - Go to `http://localhost:3000/signup`
   - Enter email and password
   - Click sign up

2. **Complete skill selection**:
   - Select at least 3 skills
   - Click "Save" or "Continue"
   - Should redirect to dashboard

3. **Verify in Supabase**:
   - Open Supabase dashboard
   - Check `profiles` table
   - Verify `skills` array contains selected skills
   - Verify `is_onboarded` is `true`

### Test via SQL

```sql
-- View a user's profile and skills
SELECT id, user_email, skills, is_onboarded, created_at 
FROM profiles 
WHERE user_email = 'test@example.com';

-- Update a user's skills
UPDATE profiles 
SET skills = ARRAY['Python', 'Data Science', 'Machine Learning']
WHERE user_email = 'test@example.com';

-- Find all users with specific skill
SELECT user_email, skills 
FROM profiles 
WHERE skills @> ARRAY['Python'];
```

## Retrieving User Skills in Code

### Getting Skills in API Routes

```typescript
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('skills, skill_level')
    .eq('id', user.id)
    .single();

  const userSkills = profile?.skills || [];
  const userLevel = profile?.skill_level || 'beginner';

  // Use skills to personalize response
  return Response.json({ skills: userSkills });
}
```

### Getting Skills in React Components

```typescript
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('profiles')
        .select('skills')
        .eq('id', user.id)
        .single();
      
      setSkills(data?.skills || []);
    };

    fetchSkills();
  }, []);

  return <div>Your skills: {skills.join(', ')}</div>;
}
```

## Customizing Skills List

To modify available skills, edit the skills configuration (typically in [app/components/SkillsContent.tsx](app/components/SkillsContent.tsx)):

```typescript
const skillCategories = {
  'Programming & Development': [
    'Python',
    'JavaScript / TypeScript',
    'Web Development (HTML, CSS)',
    // Add more skills here
  ],
  'Data & AI': [
    'Data Science',
    'Machine Learning',
    // Add more skills here
  ],
  // Add more categories
};
```

## Troubleshooting

### "Skills not saving"
- Verify Supabase connection
- Check `profiles` table exists in Supabase
- Check RLS policies allow INSERT/UPDATE on profiles table
- Check browser console for errors
- Verify user is authenticated

### "Onboarding not appearing after signup"
- Verify signup flow redirects to onboarding/skills route
- Check `is_onboarded` flag in profiles table
- Verify auth state is properly synced
- Check that signup creates a profiles record

### "Skills not filtering content"
- Verify skills are stored in profiles table
- Check component logic uses `profile.skills`
- Ensure API routes read from profiles table
- Verify skills array is not empty

### "Can't modify skills after signup"
- Check RLS policies allow UPDATE on profiles table
- Verify user is authenticated
- Ensure settings page uses correct Supabase client
- Verify `is_onboarded` is true before allowing updates

### Skills not displaying in dashboard
- Verify user's profile is loaded from Supabase
- Check that dashboard component fetches skills
- Verify API endpoint returns user skills
- Check network requests in browser console

## Best Practices

1. **Always validate skills** on the backend before saving to profiles table
2. **Cache skill data** in component state to reduce DB queries
3. **Use skill arrays** for flexible filtering and recommendations
4. **Update `updated_at`** whenever profile changes
5. **Index skills column** for efficient queries with many users
6. **Handle missing profiles** gracefully — trigger profile creation on first login
7. **Check `is_onboarded` status** before personalizing content
8. **Use RLS policies** to ensure users only access their own profile

## Production Considerations

1. **Database Backups**: Supabase automatically backs up your data
2. **Skill Validation**: Use a controlled list of approved skills (defined in SkillsContent.tsx)
3. **Performance**: The skills column is indexed (GIN) for fast queries
4. **Analytics**: Track skill distribution and recommendation effectiveness
5. **A/B Testing**: Test different skill categories and personalization approaches
6. **Data Migration**: For existing users, trigger profile creation on first login
7. **Monitoring**: Track onboarding completion rates and skill selection patterns

## Database Indexes

The profiles table uses these indexes for performance:

```sql
-- Already configured in your Supabase project
CREATE INDEX idx_profiles_user_id ON profiles(id);
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
```

The GIN index on skills enables fast queries like:
```sql
SELECT user_email FROM profiles WHERE skills @> ARRAY['Python'];
```

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Skills Component](app/components/SkillsContent.tsx)
- [Dashboard Component](app/components/DashboardContent.tsx)
