"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  function handleSignOut() {
    signOut({ callbackUrl: "/" });
  }

  const ghostBtn =
    "text-white/75 border border-white/30 hover:bg-white/10 hover:text-white font-semibold px-3 py-1.5 rounded text-sm transition-colors";

  return (
    <nav className="bg-primary sticky top-0 z-50 shadow-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-white font-bold text-lg shrink-0 hover:opacity-90"
        >
          CoWork
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1">
          <Link
            href="/"
            className="text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-1.5 rounded transition-colors"
          >
            Browse
          </Link>
          {session && (
            <>
              <Link
                href="/bookings"
                className="text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-1.5 rounded transition-colors"
              >
                My Bookings
              </Link>
              <Link
                href="/recommend"
                className="text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-1.5 rounded transition-colors"
              >
                AI Suggest
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/bookings"
                  className="text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium px-3 py-1.5 rounded transition-colors"
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </div>

        {/* Desktop auth area */}
        <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
          {session ? (
            <>
              <span className="text-sm text-white/70 font-medium flex items-center gap-2">
                Hi, {session.user?.name ?? session.user?.email}
                {isAdmin && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </span>
              <button onClick={handleSignOut} className={ghostBtn}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/register" className={ghostBtn}>
                Register
              </Link>
              <Link
                href="/login"
                className="bg-white text-primary font-semibold px-3 py-1.5 rounded text-sm hover:bg-gray-100 transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden ml-auto flex flex-col justify-center gap-[5px] p-1.5 rounded hover:bg-white/10"
          aria-label="Open menu"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="block w-[22px] h-0.5 bg-white rounded" />
          <span className="block w-[22px] h-0.5 bg-white rounded" />
          <span className="block w-[22px] h-0.5 bg-white rounded" />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden">
          <div className="bg-primary-dark flex flex-col gap-1 px-4 pt-2 pb-4">
            <Link
              href="/"
              className="text-white/85 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded text-sm font-medium transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Browse
            </Link>
            {session && (
              <>
                <Link
                  href="/bookings"
                  className="text-white/85 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded text-sm font-medium transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  My Bookings
                </Link>
                <Link
                  href="/recommend"
                  className="text-white/85 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded text-sm font-medium transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  AI Suggest
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/bookings"
                    className="text-white/85 hover:bg-white/10 hover:text-white px-3 py-2.5 rounded text-sm font-medium transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-2 pt-2 px-3">
              {session ? (
                <>
                  <span className="text-white/70 text-sm self-center flex items-center gap-2">
                    Hi, {session.user?.name ?? session.user?.email}
                    {isAdmin && (
                      <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </span>
                  <button onClick={handleSignOut} className={ghostBtn}>
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className={ghostBtn}
                    onClick={() => setMobileOpen(false)}
                  >
                    Register
                  </Link>
                  <Link
                    href="/login"
                    className="bg-white text-primary font-semibold px-3 py-1.5 rounded text-sm hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
