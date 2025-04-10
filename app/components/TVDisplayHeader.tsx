'use client';

import Link from 'next/link';

export default function TVDisplayHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-[#ffa300] shadow-md z-50">
      <div className="max-w-7xl mx-auto py-3 px-2 sm:px-4 lg:px-6">
        <div className="flex items-center">
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-[#3e2802]">BeHeard Queue</h1>
          </div>
        </div>
      </div>
    </header>
  );
} 