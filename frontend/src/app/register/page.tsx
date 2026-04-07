"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function validate(): string | null {
    if (!name.trim()) return "Full name is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    if (telephone && !/^\d{10}$/.test(telephone))
      return "Telephone must be exactly 10 digits.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = { name, email, password };
      if (telephone) body.tel = telephone;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login?registered=1");
      }, 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-50 text-gray-900 min-h-screen flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-md w-full max-w-[420px] p-8 sm:p-9">
        <Link
          href="/"
          className="text-primary font-bold text-base hover:opacity-80 inline-block mb-7"
        >
          CoWork
        </Link>
        <h1 className="text-[1.4rem] font-extrabold text-gray-900 tracking-tight mb-1">
          Create Account
        </h1>
        <p className="text-sm text-gray-500 mb-7">
          Join CoWork to start booking spaces
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded text-sm font-medium mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="regName"
            >
              Full Name
            </label>
            <input
              type="text"
              id="regName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
              placeholder="Your full name"
              required
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="regTel"
            >
              Telephone
            </label>
            <input
              type="tel"
              id="regTel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
              placeholder="e.g. 0812345678"
              autoComplete="tel"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="regEmail"
            >
              Email
            </label>
            <input
              type="email"
              id="regEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="regPassword"
            >
              Password
            </label>
            <input
              type="password"
              id="regPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="regConfirmPassword"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="regConfirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
              placeholder="Repeat your password"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded text-base transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mt-1"
          >
            {loading ? (
              <>
                <span className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <hr className="border-gray-200 my-6" />
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
