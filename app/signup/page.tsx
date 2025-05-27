'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types/user';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId') || '7CHBsxVGqC353T7pA2xg';
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyNotFound, setCompanyNotFound] = useState(false);

  // Fetch company details if companyId is provided (Which it should always be)
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!companyId) return;
      
      try {
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        
        if (companyDoc.exists()) {
          setCompanyName(companyDoc.data().name);
          setCompanyNotFound(false);
        } else {
          // Only show company not found error if it's not the default company ID
          if (companyId !== '7CHBsxVGqC353T7pA2xg') {
            setCompanyNotFound(true);
          } else {
            // For default company, just set a generic name
            setCompanyName('BeHeard');
            setCompanyNotFound(false);
          }
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
        // Only show company not found error if it's not the default company ID
        if (companyId !== '7CHBsxVGqC353T7pA2xg') {
          setCompanyNotFound(true);
        } else {
          // For default company, just set a generic name
          setCompanyName('BeHeard');
          setCompanyNotFound(false);
        }
      }
    };

    fetchCompanyDetails();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Create user document in Firestore
      const userData: User = {
        id: user.uid,
        email: user.email || '',
        firstName,
        lastName,
        role: 'user',
        companyId: companyId, // Assign user to the company from URL
        createdAt: new Date(),
        updatedAt: new Date(),
        completedIntake: false
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      // Redirect to dashboard
      router.push('/userDashboard');
    } catch (error: any) {
      console.error('Error during signup:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or login.');
      } else {
        setError('An error occurred during signup. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1b1b] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#ffffff]">
          Create your account
        </h2>
        {companyName && (
          <p className="mt-2 text-center text-sm text-[#ffffff]">
            Signing up for {companyName}
          </p>
        )}
        {companyNotFound && (
          <p className="mt-2 text-center text-sm text-red-600">
            Invalid company link. Please contact your company administrator.
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#ffa300] py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[#3e2802]">
                  First Name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-[#3e2802] rounded-md shadow-sm placeholder-[#3e2802] focus:outline-none focus:ring-[#3e2802] focus:border-[#3e2802] sm:text-sm text-[#3e2802] bg-[#ffffff]"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-[#3e2802]">
                  Last Name
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-[#3e2802] rounded-md shadow-sm placeholder-[#3e2802] focus:outline-none focus:ring-[#3e2802] focus:border-[#3e2802] sm:text-sm text-[#3e2802] bg-[#ffffff]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#3e2802]">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-[#3e2802] rounded-md shadow-sm placeholder-[#3e2802] focus:outline-none focus:ring-[#3e2802] focus:border-[#3e2802] sm:text-sm text-[#3e2802] bg-[#ffffff]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#3e2802]">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-[#3e2802] rounded-md shadow-sm placeholder-[#3e2802] focus:outline-none focus:ring-[#3e2802] focus:border-[#3e2802] sm:text-sm text-[#3e2802] bg-[#ffffff]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#3e2802]">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-[#3e2802] rounded-md shadow-sm placeholder-[#3e2802] focus:outline-none focus:ring-[#3e2802] focus:border-[#3e2802] sm:text-sm text-[#3e2802] bg-[#ffffff]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || companyNotFound}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#ffa300] bg-[#3e2802] hover:bg-[#2a1c01] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3e2802] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? 'Creating account...' : 'Sign up'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3e2802]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#ffa300] text-[#3e2802]">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-[#3e2802] rounded-md shadow-sm text-sm font-medium text-[#3e2802] bg-[#ffffff] hover:bg-[#3e2802] hover:text-[#ffa300] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3e2802] transition-colors duration-200"
              >
                Log in
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function SignupFormFallback() {
  return (
    <div className="min-h-screen bg-[#1e1b1b] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#ffffff]">
          Loading...
        </h2>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormFallback />}>
      <SignupForm />
    </Suspense>
  );
} 