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
            router.push("/admin_home");
          } else {
            router.push("/userDashboard");
          }
        } else {
          // If user document doesn't exist, redirect to admin_home as fallback
          router.push("/admin_home");
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
    <div className="flex min-h-screen items-center justify-center bg-[#1e1b1b]">
      <div className="bg-[#ffa300] shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-[#3e2802] text-center">Login</h2>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6 mt-6">
          {/* Email Field */}
          <div>
            <label
              className="block text-sm font-medium text-[#3e2802]"
            >
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff] placeholder-[#3e2802]"
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
          {/* Password Field */}
          <div>
            <label
              className="block text-sm font-medium text-[#3e2802]"
            >
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border border-[#3e2802] rounded-md text-[#3e2802] bg-[#ffffff] placeholder-[#3e2802]"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          
          {/* Forgot Password Link */}
          <div className="text-right">
            <a href="/forgot-password" className="text-sm text-[#3e2802] hover:text-[#2a1c01]">
              Forgot your password?
            </a>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#3e2802] text-[#ffa300] font-semibold py-2 px-4 rounded-md hover:bg-[#2a1c01] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        
        {/* Register Redirect */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#3e2802]">
            Don't have an account?
          </p>
          <a
            href="/register"
            className="mt-2 inline-block text-[#3e2802] hover:text-[#2a1c01]"
          >
            Register here
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
