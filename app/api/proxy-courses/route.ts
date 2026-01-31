import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Use environment variable or fallback
    const backendUrl = process.env.COURSE_FETCHER_URL || 'http://localhost:4000';
    
    console.log(`[Proxy] Forwarding course search for "${topic}" to ${backendUrl}/api/courses`);

    const response = await fetch(`${backendUrl}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[Proxy] Backend error: ${response.status}`, errorData);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[Proxy] Received ${Array.isArray(data) ? data.length : 0} courses from backend`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Proxy] Error forwarding request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    );
  }
}
