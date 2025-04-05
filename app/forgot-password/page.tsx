'use client';

import { useState, FormEvent } from 'react';
import { resetPassword } from '@/lib/auth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Reset Your Password</h2>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="mt-6 text-center">
            <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm mb-4">
              Password reset email sent! Please check your inbox.
            </div>
            <Link 
              href="/login" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Return to login
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-4 text-gray-600 text-center">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 mt-1 border rounded-md"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 