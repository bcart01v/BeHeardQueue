//Typical Login Page.
// Client side rendering

"use client";
export const dynamic = 'force-dynamic';

import { useState, FormEvent, Suspense } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/lib/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/user";
import { useTheme } from '../context/ThemeContext';
import { getThemeColor, getUIColor } from '../colors';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function LoginForm() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        // Check if user has completed intake
        if (!userData.completedIntake && userData.role === "user") {
          // Redirect to step 2 of registration
          router.push('/register?step=2');
          return;
        }
        
        // If completed intake, proceed to dashboard
        router.push('/userDashboard');
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${getThemeColor(theme, 'background')} flex flex-col justify-center py-12 sm:px-6 lg:px-8`}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className={`mt-6 text-center text-3xl font-extrabold ${getThemeColor(theme, 'textHeader')}`}>
          Login
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className={`${getThemeColor(theme, 'primary')} py-8 px-4 shadow sm:rounded-lg sm:px-10`}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="Enter your email"
                  disabled={isLoading}
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`appearance-none block w-full px-3 py-2 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm placeholder-${getThemeColor(theme, 'text')} focus:outline-none focus:ring-${getThemeColor(theme, 'text')} focus:border-${getThemeColor(theme, 'text')} sm:text-sm ${getThemeColor(theme, 'text')} ${getUIColor('form', 'input', theme, 'background')}`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <a href="/forgot-password" className={`font-medium ${getThemeColor(theme, 'text')} hover:${getThemeColor(theme, 'textHeader')}`}>
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${getUIColor('button', 'primary', theme)} ${getUIColor('hover', 'button')} disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
              >
                {isLoading ? "Logging in..." : "Login"}
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
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/register"
                className={`w-full flex justify-center py-2 px-4 border ${getUIColor('form', 'input', theme, 'border')} rounded-md shadow-sm text-sm font-medium ${getUIColor('button', 'secondary', theme)} ${getUIColor('hover', 'button')} transition-colors duration-200`}
              >
                Register here
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function LoginFormFallback() {
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
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
