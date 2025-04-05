'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Company } from '@/types/company';
import Link from 'next/link';

// Component that uses useSearchParams
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        
        if (companyDoc.exists()) {
          setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
        } else {
          setError('Company not found');
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
        setError('An error occurred while fetching company data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  const handleSignup = () => {
    if (companyId) {
      router.push(`/signup?companyId=${companyId}`);
    } else {
      router.push('/signup');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-black">BeHeard Queue</h1>
            <div className="flex space-x-4">
              <Link 
                href="/login" 
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Log in
              </Link>
              <button
                onClick={handleSignup}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : null}

        {company ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-black">
                Welcome to {company.name}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-black">
                {company.description}
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium text-black">Operating Hours</h3>
                  <p className="mt-1 text-sm text-black">
                    {company.openTime} - {company.closeTime}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-black">Booking Policy</h3>
                  <p className="mt-1 text-sm text-black">
                    {company.maxBookingDays 
                      ? `You can book appointments up to ${company.maxBookingDays} days in advance.`
                      : 'Booking policy information not available.'}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSignup}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Sign up for {company.name}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
              Welcome to BeHeard Queue
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-black sm:mt-4">
              The appointment scheduling system for mobile service providers.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="inline-flex rounded-md shadow">
                <button
                  onClick={handleSignup}
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Loading fallback component
function HomeContentFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-black">BeHeard Queue</h1>
            <div className="flex space-x-4">
              <Link 
                href="/login" 
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors duration-200"
              >
                Log in
              </Link>
              <div className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Sign up
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-black sm:text-4xl">
            Loading...
          </h2>
        </div>
      </main>
    </div>
  );
}
export default function HomePage() {
  return (
    <Suspense fallback={<HomeContentFallback />}>
      <HomeContent />
    </Suspense>
  );
}
