# Skills Onboarding Feature

## Overview
After signup, users are redirected to a skills selection page where they can choose their existing skills or skills they want to learn. This helps personalize their learning experience.

## User Flow
1. User signs up → `/signup`
2. Account created → Redirected to `/onboarding`
3. Select skills from 7 categories
4. Submit → Redirected to `/` (Dashboard)

## Skill Categories

### 1. Programming (14 skills)
Python, JavaScript, Java, C++, C#, Go, Rust, PHP, TypeScript, Ruby, Swift, Kotlin, R, MATLAB

### 2. Web Development (12 skills)
HTML/CSS, React, Vue.js, Angular, Node.js, Next.js, Express.js, Django, Flask, FastAPI, Spring Boot, Laravel

### 3. Data & AI (12 skills)
Machine Learning, Data Science, Deep Learning, NLP, Computer Vision, TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn, Data Analysis, Statistics

### 4. Databases (11 skills)
SQL, PostgreSQL, MySQL, MongoDB, Redis, Firebase, Supabase, DynamoDB, Cassandra, Neo4j, Oracle

### 5. DevOps & Cloud (11 skills)
AWS, Azure, Google Cloud, Docker, Kubernetes, CI/CD, Jenkins, GitHub Actions, Terraform, Ansible, Linux

### 6. Design & Creative (10 skills)
UI/UX Design, Figma, Adobe XD, Photoshop, Illustrator, Sketch, InVision, Graphic Design, Video Editing, 3D Modeling

### 7. Business & Soft Skills (8 skills)
Project Management, Agile/Scrum, Communication, Leadership, Problem Solving, Critical Thinking, Time Management, Teamwork

## Database Setup

### Run the SQL query in your Supabase SQL Editor:

```sql
-- Add skills column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
```

Or use the complete setup from `database_setup.sql` which includes:
- Skills column (TEXT[] array)
- Indexes for performance
- Row Level Security policies
- Automatic timestamp updates

## Features

✅ **Multi-select interface** - Click to toggle skills
✅ **Category organization** - 7 distinct categories with icons
✅ **Visual feedback** - Selected skills are highlighted
✅ **Skills summary** - Live preview of selected skills
✅ **Skip option** - Users can skip and complete later
✅ **Validation** - Must select at least 1 skill
✅ **Responsive design** - Works on all devices

## Future Enhancements

- [ ] Add skill proficiency levels (Beginner, Intermediate, Advanced)
- [ ] Recommend learning paths based on selected skills
- [ ] Show related courses for each skill
- [ ] Add custom skill input
- [ ] Skill-based dashboard customization
- [ ] Skill progress tracking

## API Integration

The onboarding page uses Supabase to:
1. Get authenticated user
2. Update profile with skills array
3. Redirect after successful save

## Component Structure

```
/onboarding/page.tsx
├── Header (Step indicator)
├── Skills Selection (7 categories)
├── Selected Skills Summary
└── Action Buttons (Skip / Continue)
```
