import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, skills } = body;

    if (!userId || !skills || !Array.isArray(skills)) {
      return NextResponse.json(
        { error: 'userId and skills array are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Update user skills in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ skills: skills, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating skills:', error);
      return NextResponse.json(
        { error: 'Failed to update skills' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Skills updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Update skills error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
