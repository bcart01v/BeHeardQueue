'use client';

import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-md transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#3e2802]' : 'bg-[#ffa300]'
      }`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5 text-[#ffa300]" />
      ) : (
        <MoonIcon className="h-5 w-5 text-[#3e2802]" />
      )}
    </button>
  );
} 