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
    <div>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
