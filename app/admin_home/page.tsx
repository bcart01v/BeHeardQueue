'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAdminGuard } from '../hooks/useAdminGuard';
import { 
  MegaphoneIcon,
  BookOpenIcon,
  UserGroupIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';


export default function AdminHomePage() {
  const { authorized, loading } = useAdminGuard();
  const [currentDate] = useState(new Date());
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1e1b1b]">
        <div className="text-xl text-[#ffa300]">Loading...</div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1e1b1b]' : 'bg-stone-100'}`}>
      {/* Date Display */}
      <div className="pt-24 pb-8 text-center">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#ffa300]' : 'text-amber-900'}`}>
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      {/* Card Buttons Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Outreach Card */}
          <Link href="/outreach" className="block">
            <div
              className={`p-6 rounded-lg shadow transition-colors duration-200 ${
                theme === 'dark'
                ? 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
                : 'bg-[#ffa300] text-[#3e2802] hover:bg-[#e69200]'
              }`}
            >
              <div className="flex items-center">
                <MegaphoneIcon className="h-8 w-8 mr-4" />
                  <div>
                    <h3 className="text-xl font-semibold">Outreach</h3>
                    <p className="text-sm mt-1">Manage outreach programs and initiatives</p>
                  </div>
                </div>
            </div>
          </Link>

          {/* Resources Card */}
          <Link href="/resource_home" className="block">
            <div
              className={`p-6 rounded-lg shadow transition-colors duration-200 ${
                theme === 'dark'
                ? 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
                : 'bg-[#ffa300] text-[#3e2802] hover:bg-[#e69200]'
              }`}
            >
              <div className="flex items-center">
                <BookOpenIcon className="h-8 w-8 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold">Resources</h3>
                  <p className="text-sm mt-1">Access and manage available resources</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Staff Card */}
          <Link href="/staff" className="block">
          <div 
            className={`p-6 rounded-lg shadow transition-colors duration-200 ${
              theme === 'dark'
              ? 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
              : 'bg-[#ffa300] text-[#3e2802] hover:bg-[#e69200]'
            }`}
          >              
            <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold">Staff</h3>
                  <p className="text-sm mt-1">Manage staff members and schedules</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Volunteers Card */}
          <Link href="/volunteers" className="block">
          <div
            className={`p-6 rounded-lg shadow transition-colors duration-200 ${
              theme === 'dark'
              ? 'bg-[#3e2802] text-[#ffa300] hover:bg-[#2a1c01]'
              : 'bg-[#ffa300] text-[#3e2802] hover:bg-[#e69200]'
            }`}
          >              
            <div className="flex items-center">
                <UserIcon className="h-8 w-8 mr-4" />
                <div>
                  <h3 className="text-xl font-semibold">Volunteers</h3>
                  <p className="text-sm mt-1">Manage volunteer programs and schedules</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 