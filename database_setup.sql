-- SQL Query to add skills column to profiles table

-- Option 1: If profiles table already exists, alter it to add skills column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Option 2: If you need to create the entire profiles table from scratch
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on user id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable Row Level Security (RLS) for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Create policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Optional: Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Query to view skills for a specific user (example)
-- SELECT id, full_name, email, skills, created_at FROM profiles WHERE id = 'user-uuid-here';

-- Query to search users by skill (example)
-- SELECT id, full_name, skills FROM profiles WHERE 'Python' = ANY(skills);

-- Query to count users per skill (analytics)
-- SELECT unnest(skills) as skill, COUNT(*) as user_count 
-- FROM profiles 
-- GROUP BY skill 
-- ORDER BY user_count DESC;
