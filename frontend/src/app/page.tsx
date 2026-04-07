import { Suspense } from "react";
import { CoworkingSpace, ApiResponse } from "@/types";
import SpacesBrowser from "@/components/SpacesBrowser";
import SpaceCardSkeleton from "@/components/SpaceCardSkeleton";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

async function getSpaces(): Promise<CoworkingSpace[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/coworkingSpaces`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json: ApiResponse<CoworkingSpace[]> = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

function SpacesGridSkeleton() {
  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-14 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Find Your Perfect Workspace
          </h1>
          <p className="text-white/70 mt-3 text-base">
            Browse and book co-working spaces near you
          </p>
          <div className="mt-7 max-w-md mx-auto">
            <div className="skeleton h-12 w-full rounded-lg" />
          </div>
        </div>
      </section>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SpaceCardSkeleton />
          <SpaceCardSkeleton />
          <SpaceCardSkeleton />
        </div>
      </main>
    </>
  );
}

async function SpacesContent() {
  const spaces = await getSpaces();
  return <SpacesBrowser spaces={spaces} />;
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <Suspense fallback={<SpacesGridSkeleton />}>
        <SpacesContent />
      </Suspense>
    </div>
  );
}
