// app/register/page.tsx

"use client";
export const dynamic = 'force-dynamic';
import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types/user";
import { Company } from "@/types/company";
import { createBubbleUser } from '@/lib/bubble';
import IntakeForm from '@/app/components/IntakeForm';
import { useTheme } from '../context/ThemeContext';
import { getThemeColor, getUIColor } from '../colors';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCompanyId = searchParams.get('companyId');
  const { theme } = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyNotFound, setCompanyNotFound] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(urlCompanyId || '');
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<Partial<User>>({});

  useEffect(() => {
    // Check if step parameter exists in URL
    const stepParam = searchParams.get('step');
    if (stepParam === '2') {
      setStep(2);
    }
  }, [searchParams]);

  // Fetch all companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Company[];
        setCompanies(companiesData);
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch company details if companyId is provided
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!urlCompanyId) return;
      
      try {
        const companyDoc = await getDoc(doc(db, 'companies', urlCompanyId));
        
        if (companyDoc.exists()) {
          setCompanyName(companyDoc.data().name);
          setCompanyNotFound(false);
          setSelectedCompanyId(urlCompanyId);
        } else {
          if (urlCompanyId !== '7CHBsxVGqC353T7pA2xg') {
            setCompanyNotFound(true);
          } else {
            setCompanyName('BeHeard');
            setCompanyNotFound(false);
          }
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
        if (urlCompanyId !== '7CHBsxVGqC353T7pA2xg') {
          setCompanyNotFound(true);
        } else {
          setCompanyName('BeHeard');
          setCompanyNotFound(false);
        }
      }
    };

    fetchCompanyDetails();
  }, [urlCompanyId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Validate company exists - only if it's not the default company
      if (selectedCompanyId !== '7CHBsxVGqC353T7pA2xg' && (!selectedCompanyId || companyNotFound)) {
        setError('Please select a valid company');
        setIsLoading(false);
        return;
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // Create user document in Firestore
      const userData: User = {
        id: user.uid,
        email: email,
        firstName,
        lastName,
        nickname: '',
        phone: phone || '',
        race: 'Asian' as const,
        gender: 'Male' as const,
        isVeteran: false,
        role: 'user',
        companyId: selectedCompanyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedIntake: false // Set to false initially
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      setCurrentUser(userData);

      // Create user in Bubble
      const bubbleSuccess = await createBubbleUser(userData);
      if (!bubbleSuccess) {
        console.warn('Failed to create user in Bubble, but user was created in BeHeard');
      }

      // Show intake form immediately after registration
      setShowIntakeForm(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please try logging in instead.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntakeFormSubmit = async (userData: Partial<User>, intakeData: any) => {
    try {
      if (!currentUser) return;

      // Update user data with intake form data and set completedIntake to true
      // This doesn't seem to work 100% of the the time I've tested it? 
      // But it should...
      await setDoc(doc(db, 'users', currentUser.id), {
        ...currentUser,
        ...userData,
        completedIntake: true, // Set to true after completing intake
        updatedAt: new Date()
      });

      // Create intake form document
      await setDoc(doc(db, 'intakeForms', currentUser.id), {
        ...intakeData,
        userId: currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Redirect to dashboard
      router.push('/userDashboard');
    } catch (error) {
      console.error('Error saving intake form:', error);
      setError('Failed to save intake form. Please try again.');
    }
  };

  // Check URL parameters and auth state on component mount
  useEffect(() => {
    const checkUserStatus = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUser(userData);
          // Pre-fill form data for logged-in users
          setFirstName(userData.firstName || '');
          setLastName(userData.lastName || '');
          setPhone(userData.phone || '');
          setEmail(userData.email || '');
          if (!userData.completedIntake) {
            setShowIntakeForm(true);
          }
        }
      }
      setIsLoading(false);
    };

    // Check immediately on mount
    checkUserStatus();

    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkUserStatus();
      } else {
        setIsLoading(false);
      }
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array since we want this to run only on mount

  // Separate effect for URL parameters
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam === '2') {
      setShowIntakeForm(true);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className={`min-h-screen ${getThemeColor(theme, 'pageBackground')} flex flex-col justify-center py-12 sm:px-6 lg:px-8`}>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${getThemeColor(theme, 'textHeader')}`}>
            Loading...
          </h2>
        </div>
      </div>
    );
  }

  if (showIntakeForm) {
    return (
      <div className={`min-h-screen ${getThemeColor(theme, 'pageBackground')} flex flex-col justify-center py-12 sm:px-6 lg:px-8`}>
        <IntakeForm
          onSubmit={handleIntakeFormSubmit}
          onCancel={() => {
            setShowIntakeForm(false);
            router.push('/');
          }}
          initialUserData={{
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            email: email,
            ...currentUser // Include any additional user data we have
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${getThemeColor(theme, 'background')} flex flex-col justify-center py-12 sm:px-6 lg:px-8`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className={`mt-6 text-center text-3xl font-extrabold ${getThemeColor(theme, 'textHeader')}`}>
          Create your account
        </h2>
        {companyName && (
          <p className={`mt-2 text-center text-sm ${getThemeColor(theme, 'text')}`}>
            Registering for {companyName}
          </p>
        )}
        {companyNotFound && (
          <p className="mt-2 text-center text-sm text-red-600">
            Invalid company link. Please contact your company administrator.
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${getThemeColor(theme, 'primary')} py-8 px-4 shadow sm:rounded-lg sm:px-10`}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!urlCompanyId && (
              <div>
                <label htmlFor="company" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
                  Location
                </label>
                <select
                  id="company"
                  name="company"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className={`mt-1 block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                  required
                >
                  <option value="">Select a location</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
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
                    className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="lastName" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
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
                    className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
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
                  className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
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
                  className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium ${getThemeColor(theme, 'text')}`}>
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
                  className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || companyNotFound}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${getUIColor('button', 'primary', theme)} ${getUIColor('hover', 'button')} disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
              >
                {isLoading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${getUIColor('form', 'input', theme, 'border')}`} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${getThemeColor(theme, 'primary')} ${getThemeColor(theme, 'text')}`}>
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/login"
                className={`w-full flex justify-center py-2 px-4 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm text-sm font-medium ${getUIColor('button', 'secondary', theme)} ${getUIColor('hover', 'button')} transition-colors duration-200`}
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
function RegisterFormFallback() {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen ${getThemeColor(theme, 'background')} flex flex-col justify-center py-12 sm:px-6 lg:px-8`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className={`mt-6 text-center text-3xl font-extrabold ${getThemeColor(theme, 'textHeader')}`}>
          Loading...
        </h2>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFormFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
