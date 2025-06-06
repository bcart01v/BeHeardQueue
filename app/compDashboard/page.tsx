'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Company } from '@/types/user';
import { useAuth } from '@/app/components/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getThemeColor, getUIColor } from '../colors';

export default function CompanyDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user || !user.companyId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const companyDoc = await getDoc(doc(db, 'companies', user.companyId));
        
        if (companyDoc.exists()) {
          setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
        } else {
          setError('Company not found');
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError('An error occurred while fetching company data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeColor(theme, 'background')}`}>
        <div className="text-center">
          <h1 className={`text-2xl font-bold mb-4 ${getThemeColor(theme, 'text')}`}>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeColor(theme, 'background')}`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className={`${getThemeColor(theme, 'text')}`}>{error}</p>
        </div>
      </div>
    );
  }

  if (!user || !user.companyId) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${getThemeColor(theme, 'background')}`}>
        <div className={`${getThemeColor(theme, 'text')}`}>No company selected</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${getThemeColor(theme, 'background')}`}>
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mt-16">
        {company ? (
          <div className={`${getThemeColor(theme, 'cardBackground')} shadow-md sm-rounded-lg`}>
            <div className="px-4 py-5 sm:px-6">
              <h3 className={`text-lg leading-6 font-medium ${getThemeColor(theme, 'text')}`}>Company Information</h3>
              <p className={`mt-1 max-w-2xl text-sm ${getThemeColor(theme, 'text')}`}>Details about your company.</p>
            </div>
            <div className={`border-t ${getThemeColor(theme, 'border')}`}>
              <dl>
                <div className={`px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#ffe0b2]'}`}>
                  <dt className={`text-sm font-medium ${getThemeColor(theme, 'text')}`}>Company Name</dt>
                  <dd className={`mt-1 text-sm ${getThemeColor(theme, 'text')} sm:mt-0 sm:col-span-2`}>{company.name}</dd>
                </div>
                 <div className={`px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${theme === 'dark' ? 'bg-[#ffb733]' : 'bg-[#fff3cd]'}`}>
                  <dt className={`text-sm font-medium ${getThemeColor(theme, 'text')}`}>Description</dt>
                  <dd className={`mt-1 text-sm ${getThemeColor(theme, 'text')} sm:mt-0 sm:col-span-2`}>{company.description || 'No description provided'}</dd>
                </div>
                 <div className={`px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 ${theme === 'dark' ? 'bg-[#ffa300]' : 'bg-[#ffe0b2]'}`}>
                  <dt className={`text-sm font-medium ${getThemeColor(theme, 'text')}`}>Created At</dt>
                  <dd className={`mt-1 text-sm ${getThemeColor(theme, 'text')} sm:mt-0 sm:col-span-2`}>
                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'Unknown'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className={`text-3xl font-extrabold ${getThemeColor(theme, 'text')} sm:text-4xl`}>
              No Company Selected
            </h2>
            <p className={`mt-3 max-w-2xl mx-auto text-xl ${getThemeColor(theme, 'text')} sm:mt-4`}>
              Please select a company to view its dashboard.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
