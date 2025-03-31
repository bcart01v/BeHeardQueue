// app/register/page.tsx

"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registerWithEmail } from "@/lib/auth";

const RegisterPage = () => {
  const [email, setEmail] = useState<string>(""); // Track email input
  const [password, setPassword] = useState<string>(""); // Track password input
  const [confirmPassword, setConfirmPassword] = useState<string>(""); // Track confirm password
  const router = useRouter();

  // Handle form submission
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    // Check if passwords match
    if (password !== confirmPassword) {
      console.error("Passwords do not match.");
      return;
    }

    try {
      const user = await registerWithEmail(email, password);
      if (user) {
        // Redirect to login after successful registration
        router.push("/login");
      }
    } catch (err: any) {
      console.error("Registration failed:", err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full">
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Create an Account
        </h2>

        <form onSubmit={handleRegister} className="space-y-6 mt-6">
          {/* Email Field */}
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
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md"
              placeholder="Enter a password"
            />
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md"
              placeholder="Confirm your password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
          >
            Register
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
