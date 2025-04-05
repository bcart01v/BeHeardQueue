//Typical Login Page.
// Client side rendering

"use client";
export const dynamic = 'force-dynamic';

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/lib/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/user";

const LoginPage = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  // Prevent browser behavior of submitting form & page reload
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const firebaseUser = await loginWithEmail(email, password);
      if (firebaseUser) {
        // Get the user's role from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          
          // Redirect based on user role
          if (userData.role === 'admin' || userData.role === 'software-owner') {
            router.push("/admin");
          } else {
            router.push("/userDashboard");
          }
        } else {
          // If user document doesn't exist, redirect to admin as fallback
          router.push("/admin");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-black text-center">Login</h2>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6 mt-6">
          {/* Email Field */}
          <div>
            <label
              className="block text-sm font-medium text-black"
            >
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md text-black placeholder-gray-500"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
          {/* Password Field */}
          <div>
            <label
              className="block text-sm font-medium text-black"
            >
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md text-black placeholder-gray-500"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          
          {/* Forgot Password Link */}
          <div className="text-right">
            <a href="/forgot-password" className="text-sm text-black hover:text-gray-700">
              Forgot your password?
            </a>
          </div>
          
          {/* Submit Button */}
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        
        {/* Register Redirect */}
        <div className="mt-6 text-center">
          <p className="text-sm text-black">
            Don't have an account?
          </p>
          <a
            href="/register"
            className="mt-2 inline-block text-black hover:text-gray-700"
          >
            Register here
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
