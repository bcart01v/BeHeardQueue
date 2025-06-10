'use client';

import { useState } from 'react';
import { generateCompanySignupLink } from '@/lib/utils';
import { useTheme } from '@/app/context/ThemeContext';
import { getThemeColor, getUIColor } from '@/app/colors';

interface CompanySignupLinkProps {
  companyId: string;
  companyName: string;
}

export default function CompanySignupLink({ companyId, companyName }: CompanySignupLinkProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  
  const signupLink = generateCompanySignupLink(companyId);
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupLink);
      setCopied(true);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };
  
  return (
    <div className={`shadow rounded-lg p-6 mb-6 ${getThemeColor(theme, 'cardBackground')}`}>
      <h3 className={`text-lg font-medium mb-2 ${getThemeColor(theme, 'text')}`}>Company Signup Link</h3>
      <p className={`text-sm mb-4 ${getThemeColor(theme, 'text')}`}>
        Share this link with users to allow them to sign up and automatically join {companyName}.
      </p>
      
      <div className="flex items-center space-x-2">
        <input
          type="text"
          readOnly
          value={signupLink}
          className={`flex-1 p-2 rounded-md text-sm
            ${theme === 'dark' ? 'bg-[#1e1b1b] text-[#ffa300] border border-white' : 'bg-white text-amber-900 border border-amber-900'}`}
        />
        <button
          onClick={handleCopyLink}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      <div className={`mt-4 text-sm ${getThemeColor(theme, 'text')}`}>
        <p>When users click this link, they will be directed to the signup page with your company pre-selected.</p>
      </div>
    </div>
  );
} 