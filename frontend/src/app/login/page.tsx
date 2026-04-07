"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccessMsg("Account created successfully! Please sign in.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
      }
    } catch {
      setError("Invalid email or password");
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
          Sign In
        </h1>
        <p className="text-sm text-gray-500 mb-7">Welcome back to CoWork</p>

        {successMsg && (
          <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded text-sm font-medium mb-4">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="loginEmail"
            >
              Email
            </label>
            <input
              type="email"
              id="loginEmail"
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
              htmlFor="loginPassword"
            >
              Password
            </label>
            <input
              type="password"
              id="loginPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
              placeholder="••••••••"
              required
              autoComplete="current-password"
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <hr className="border-gray-200 my-6" />
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-slate-50 min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
