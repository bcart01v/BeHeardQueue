//Typical Login Page.
// Client side rendering

"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/lib/auth";

const LoginPage = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Prevent browser behavior of submitting form & page reload
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const user = await loginWithEmail(email, password);
      if (user) {
        router.push("/admin");
      }
    } catch (err: any) {
      setError("Login failed. Check credentials.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6 mt-6">
          {/* Email Field */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
            >
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md"
              placeholder="Enter your email"
            />
          </div>
          {/* Password Field */}
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
            >
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md"
              placeholder="Enter your password"
            />
          </div>
          {/* Submit Button */}
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
            >
              Login
            </button>
        </form>
        {/* Register Redirect */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?
          <div>
            <a
              href="/register"
              className="text-blue-500"
            >
              Register here
            </a>
          </div>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
