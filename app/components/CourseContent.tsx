"use client";
import React, { useState, useEffect } from 'react';
import { Search, Loader, AlertCircle } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  price: 'Free' | 'Paid' | 'Varies' | 'Free – Paid' | string;
  rating: number;
  url: string;
  image: string;
  platform: string;
}

export default function CourseContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      console.log('Fetching courses via proxy for:', searchQuery.trim());
      
      // Use Next.js API proxy to avoid browser extension blocks and CORS issues
      const response = await fetch('/api/proxy-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: searchQuery.trim() }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search courses');
      }

      const data = await response.json();
      console.log('Courses received:', Array.isArray(data) ? data.length : 0);
      setCourses(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching';
      console.error('Course search error:', errorMessage);
      console.error('Full error:', err);
      setError(errorMessage);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Search Section */}
      <div className="max-w-4xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses (e.g., Python, Web Development, Data Science)..."
              className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results Section */}
      <div className="max-w-7xl mx-auto">
        {hasSearched && !loading && courses.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">No courses found for "{searchQuery}"</p>
            <p className="text-slate-500 mt-2">Try searching with different keywords</p>
          </div>
        )}

        {!hasSearched && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Search for courses to get started</p>
            <p className="text-slate-500 mt-2">Search Coursera for professional courses from top institutions</p>
          </div>
        )}

        {courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl transition-all group flex flex-col h-full">
                
                {/* Course Image */}
                <div className="relative overflow-hidden bg-slate-200">
                  <img 
                    src={course.image} 
                    alt={course.name} 
                    className="w-full aspect-video object-cover group-hover:scale-110 transition duration-700" 
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/240x135?text=Course';
                    }}
                  />
                  {/* <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                    ⭐ {course.rating.toFixed(1)}
                  </div> */}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {/* Platform Badge */}
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{course.platform}</span>
                  
                  {/* Title */}
                  <h3 className="font-bold text-slate-800 text-lg mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {course.name}
                  </h3>

                  {/* Description Section */}
                  <p className="text-slate-500 text-sm mb-4 line-clamp-3 flex-grow">
                    {course.description}
                  </p>
         
                  {/* Footer with Link */}
                  <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end items-center">
                    {/* Link Button */}
                    <a 
                      href={course.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
                    >
                      Enroll Now
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}