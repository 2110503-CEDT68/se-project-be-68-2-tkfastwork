"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import RecommendCard from "@/components/RecommendCard";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface RecommendData {
  recommended: string;
  reason: string;
  alternativeSpaces: string[];
}

interface RecentBooking {
  _id: string;
  apptDate: string;
  coworkingSpace?: { name: string; _id: string };
}

export default function RecommendPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendData | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [error, setError] = useState("");
  const [hasRequested, setHasRequested] = useState(false);

  if (status === "loading") {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const token = session?.user?.token;

  async function getRecommendation() {
    setError("");
    setLoading(true);
    setHasRequested(true);

    try {
      const [recRes, histRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/recommend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${BACKEND_URL}/api/v1/reservations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const recData = await recRes.json();
      if (!recRes.ok) {
        throw new Error(recData.message || "Recommendation failed");
      }

      let history: RecentBooking[] = [];
      if (histRes.ok) {
        const histData = await histRes.json();
        history = Array.isArray(histData.data)
          ? histData.data
          : Array.isArray(histData)
          ? histData
          : [];
      }

      setResult(recData.data || recData);
      setRecentBookings(history.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-50 text-gray-900 min-h-screen">
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Content */}
      <div className="max-w-[660px] mx-auto px-4 sm:px-6 py-10 flex flex-col gap-5">
        {/* Prompt card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-9 flex flex-col items-center text-center gap-3.5">
          <span className="text-[0.72rem] font-bold text-primary uppercase tracking-widest bg-primary-light px-3 py-1 rounded-full">
            Powered by AI
          </span>
          <div className="text-[1.3rem] font-extrabold text-gray-900 tracking-tight">
            Space Recommender
          </div>
          <p className="text-sm text-gray-500 max-w-[360px] leading-relaxed">
            Get a personalized co-working space recommendation based on your
            booking history.
          </p>
          <button
            onClick={getRecommendation}
            disabled={loading}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-7 py-3 rounded text-base transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                Analyzing...
              </>
            ) : hasRequested ? (
              "Get Another Recommendation"
            ) : (
              "Get My Recommendation"
            )}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-9 flex flex-col items-center gap-3.5 text-center">
            <LoadingSpinner text="Analyzing your booking history..." />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium">
            {error}
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="flex flex-col gap-5">
            <RecommendCard
              spaceName={result.recommended}
              reason={result.reason}
              isMain
            />

            {recentBookings.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6 flex flex-col gap-3">
                <div className="text-[0.72rem] font-bold text-gray-400 uppercase tracking-wide">
                  Based on your recent bookings
                </div>
                <div className="flex flex-col gap-1.5">
                  {recentBookings.map((booking) => {
                    const name =
                      typeof booking.coworkingSpace === "object"
                        ? booking.coworkingSpace?.name
                        : "Unknown Space";
                    const date = new Date(booking.apptDate).toLocaleDateString(
                      "en-GB",
                      {
                        timeZone: "Asia/Bangkok",
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    );
                    return (
                      <div
                        key={booking._id}
                        className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded px-3.5 py-2.5 text-sm"
                      >
                        <span className="font-semibold text-gray-900">
                          {name}
                        </span>
                        <span className="text-gray-400 text-xs">{date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.alternativeSpaces && result.alternativeSpaces.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6 flex flex-col gap-3">
                <div className="text-[0.72rem] font-bold text-gray-400 uppercase tracking-wide">
                  Alternative Spaces
                </div>
                <div className="flex flex-col gap-1.5">
                  {result.alternativeSpaces.map((alt, i) => (
                    <RecommendCard
                      key={i}
                      spaceName={typeof alt === "string" ? alt : String(alt)}
                      isMain={false}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <Link
                href="/"
                className="border border-primary text-primary hover:bg-primary-light font-semibold px-3 py-1.5 rounded text-sm transition-colors"
              >
                Browse All Spaces
              </Link>
            </div>
          </div>
        )}

        {/* No history message */}
        {!loading && hasRequested && !result && !error && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-9 text-center">
            <p className="text-gray-500 text-sm leading-relaxed">
              No booking history found. Make a booking first to get personalized
              recommendations.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2 rounded text-sm transition-colors"
            >
              Browse Spaces
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
