export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

interface UdemyCourse {
  id: string;
  title: string;
  description: string;
  price: 'Free' | 'Paid';
  rating: number;
  courseUrl: string;
  image: string;
  platform: string;
}

async function fetchRealCoursesFromUdemy(searchQuery: string): Promise<UdemyCourse[]> {
  try {
    // Udemy's public API endpoint - fetch real courses
    const apiUrl = `https://www.udemy.com/api-2.0/courses/?search=${encodeURIComponent(searchQuery)}&ordering=-popularity&page_size=20`;
    
    console.log(`🔍 Fetching REAL courses from Udemy API for: "${searchQuery}"`);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.udemy.com/courses/search/',
        'Origin': 'https://www.udemy.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      signal: AbortSignal.timeout(20000),
    });

    console.log(`📡 API Response Status: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ Udemy API error: ${response.status} ${response.statusText}`);
      throw new Error(`Udemy API failed with status ${response.status}`);
    }

    const data = await response.json() as any;
    const courses: UdemyCourse[] = [];

    if (!data.results || !Array.isArray(data.results)) {
      console.error('❌ No results in API response');
      throw new Error('Invalid API response format');
    }

    console.log(`📦 Processing ${data.results.length} results from Udemy API`);

    for (const course of data.results) {
      try {
        // Validate required fields
        if (!course.id || !course.title || !course.url) {
          console.log(`⏭️  Skipping course - missing required fields`);
          continue;
        }

        // Get image - prefer 480x270
        let imageUrl = course.image_480x270 || course.image_750x422 || null;
        
        // Check if it's already a full URL or just an ID
        if (imageUrl && !imageUrl.startsWith('http')) {
          // It's just an ID, construct the full URL
          imageUrl = `https://img-c.udemycdn.com/course/240x135/${imageUrl}.jpg`;
        }

        // Verify image URL is valid
        if (!imageUrl) {
          console.log(`⚠️  No image for course: ${course.title}`);
          imageUrl = 'https://img-c.udemycdn.com/course/240x135/placeholder.jpg';
        }

        // Determine if paid
        const isPaid = course.is_paid === true;
        
        // Get rating
        const rating = parseFloat(course.rating) || 0;
        if (rating === 0 && !course.rating) {
          console.log(`⚠️  No rating for: ${course.title}`);
        }

        // Construct proper URL
        const courseUrl = course.url.startsWith('http') 
          ? course.url 
          : `https://www.udemy.com${course.url}`;

        const courseObj: UdemyCourse = {
          id: `${course.id}`,
          title: course.title.trim(),
          description: (course.headline || course.description || 'No description available').trim(),
          price: isPaid ? 'Paid' : 'Free',
          rating: isNaN(rating) ? 0 : parseFloat(rating.toFixed(1)),
          courseUrl: courseUrl,
          image: imageUrl,
          platform: 'Udemy',
        };

        console.log(`✅ Added: ${courseObj.title} (${courseObj.price}, ${courseObj.rating}⭐)`);
        courses.push(courseObj);

        if (courses.length >= 12) break;
      } catch (err) {
        console.error(`❌ Error processing course:`, err);
        continue;
      }
    }

    if (courses.length === 0) {
      console.error('❌ No valid courses extracted from API response');
      throw new Error('No valid courses found');
    }

    console.log(`✨ Successfully fetched ${courses.length} REAL courses from Udemy`);
    return courses;
  } catch (error) {
    console.error('❌ Error in fetchRealCoursesFromUdemy:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchQuery } = await request.json();

    if (!searchQuery || searchQuery.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();
    console.log(`\n🚀 Search request for: "${normalizedQuery}"`);

    // Try to check database for cached results
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const { data: existingCourses, error: dbError } = await supabaseAdmin
          .from('courses')
          .select('*')
          .ilike('search_query', `%${normalizedQuery}%`)
          .limit(12);

        if (!dbError && existingCourses && existingCourses.length > 0) {
          console.log(`💾 Found ${existingCourses.length} cached courses in database`);
          return NextResponse.json(existingCourses);
        }
      } else {
        console.log('⚠️  Supabase env missing, skipping cache lookup');
      }
    } catch (dbError) {
      console.log('⚠️  Database not available, will fetch fresh courses');
    }

    console.log(`🌐 Fetching REAL courses from Udemy API...`);
    const realCourses = await fetchRealCoursesFromUdemy(normalizedQuery);

    if (realCourses.length === 0) {
      return NextResponse.json({ error: 'No courses found on Udemy' }, { status: 404 });
    }

    // Try to cache in database (non-critical)
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        const coursesToInsert = realCourses.map((course) => ({
          id: `udemy_${course.id}`,
          title: course.title,
          description: course.description,
          price: course.price,
          rating: course.rating,
          course_url: course.courseUrl,
          image: course.image,
          platform: course.platform,
          search_query: normalizedQuery,
          created_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabaseAdmin
          .from('courses')
          .insert(coursesToInsert);

        if (!insertError) {
          console.log(`💾 Cached ${realCourses.length} courses in database`);
        }
      } else {
        console.log('⚠️  Supabase env missing, skipping cache insert');
      }
    } catch (cacheError) {
      console.log('⚠️  Could not cache courses (database unavailable)');
    }

    return NextResponse.json(realCourses);
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch courses from Udemy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
