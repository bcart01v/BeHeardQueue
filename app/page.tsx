"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Company } from '@/types/company';
import Link from 'next/link';
import { useAuth } from './components/AuthContext';

// Component that uses useSearchParams
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId');
  const { user, loading: authLoading } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user is logged in, redirect based on role
    if (!authLoading && user) {
      if (user.role === 'admin') {
        router.push('/admin_home');
      } else {
        router.push('/userDashboard');
      }
      return;
    }

    const fetchCompanyData = async () => {
      if (!companyId) {
        setIsLoading(false);
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
        setIsLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId, user, authLoading, router]);

  const handleSignup = () => {
    if (companyId) {
      router.push(`/register?companyId=${companyId}`);
    } else {
      router.push('/register');
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1b1b] flex flex-col items-center">
      <div className="flex justify-center mt-32 mb-8">
        <img src="/BeHeardLogo.svg" alt="BeHeard Logo" className="h-32" />
      </div>

      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full max-w-7xl mx-4">
          {error}
        </div>
      ) : null}

      {company ? (
        <div className="bg-[#ffa300] shadow overflow-hidden sm:rounded-lg w-full max-w-7xl mx-4">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-[#3e2802]">
              Welcome to {company.name}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[#3e2802]">
              {company.description}
            </p>
          </div>
          <div className="border-t border-[#3e2802] px-4 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-lg font-medium text-[#3e2802]">Operating Hours</h3>
                <p className="mt-1 text-sm text-[#3e2802]">
                  {company.openTime} - {company.closeTime}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#3e2802]">Booking Policy</h3>
                <p className="mt-1 text-sm text-[#3e2802]">
                  {company.maxBookingDays 
                    ? `You can book appointments up to ${company.maxBookingDays} days in advance.`
                    : 'Booking policy information not available.'}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={handleSignup}
                className="w-full bg-[#3e2802] text-[#ffa300] px-4 py-2 rounded-md hover:bg-[#2a1c01] transition-colors duration-200"
              >
                Register for {company.name}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#ffffff] sm:text-4xl">
            Welcome to BeHeard Queue
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-[#ffffff] sm:mt-4">
            The appointment scheduling system for the BeHeard Organization.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-md shadow">
              <button
                onClick={handleSignup}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-[#ffa300] bg-[#3e2802] hover:bg-[#2a1c01] transition-colors duration-200"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      )}
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
                Register
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

export default function HomeClient() {
  return (
    <Suspense fallback={<HomeContentFallback />}>
      <HomeContent />
    </Suspense>
  );
}
