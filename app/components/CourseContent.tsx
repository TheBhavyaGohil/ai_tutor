"use client";
import React from 'react';

const MOCK_COURSES = [
  { id: 1, title: "Python for Data Science", platform: "Udemy", price: "₹499", rating: 4.8, image: "https://placehold.co/300x180/2ecc71/ffffff?text=Python" },
  { id: 2, title: "Complete Web Development", platform: "Coursera", price: "Free", rating: 4.9, image: "https://placehold.co/300x180/3498db/ffffff?text=Web+Dev" },
  { id: 3, title: "AI & Machine Learning A-Z", platform: "Udemy", price: "₹699", rating: 4.7, image: "https://placehold.co/300x180/9b59b6/ffffff?text=AI+ML" },
  { id: 4, title: "Cybersecurity Basics", platform: "EdX", price: "Free", rating: 4.6, image: "https://placehold.co/300x180/e74c3c/ffffff?text=Security" },
];

export default function CourseContent() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {MOCK_COURSES.map(course => (
        <div key={course.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl transition-all group flex flex-col h-full">
          <img src={course.image} alt={course.title} className="w-full aspect-video object-cover group-hover:scale-110 transition duration-700" />
          <div className="p-5 flex flex-col flex-1">
            <h3 className="font-bold text-slate-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">{course.title}</h3>
            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-black text-slate-900">{course.price}</span>
              <button className="text-blue-600 font-bold text-sm">Enroll</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}