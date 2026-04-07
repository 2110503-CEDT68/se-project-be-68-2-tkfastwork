"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Reservation } from "@/types";
import BookingCard from "@/components/BookingCard";
import EditBookingModal from "@/components/EditBookingModal";

function BookingCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <div className="skeleton h-4 w-[45%] mb-2 rounded" />
      <div className="skeleton h-3 w-[70%] mb-2.5 rounded" />
      <div className="skeleton h-6 w-[35%] rounded-full" />
    </div>
  );
}

export default function AdminBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/bookings");
    }
  }, [status, session, router]);

  const loadBookings = useCallback(async () => {
    if (!session?.user?.token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reservations`,
        {
          headers: {
            Authorization: `Bearer ${session.user.token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load bookings");
      const all: Reservation[] = Array.isArray(data)
        ? data
        : data.data ?? [];
      setReservations(all);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      loadBookings();
    }
  }, [status, session, loadBookings]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reservations/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session?.user?.token}`,
          },
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      await loadBookings();
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Delete failed"));
    }
  }

  const filteredReservations = reservations.filter((r) => {
    if (filterDate) {
      const apptDay = new Date(r.apptDate).toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      });
      if (apptDay !== filterDate) return false;
    }
    if (filterUser) {
      const user = typeof r.user === "object" ? r.user : null;
      const nameMatch = user?.name
        ?.toLowerCase()
        .includes(filterUser.toLowerCase());
      const emailMatch = user?.email
        ?.toLowerCase()
        .includes(filterUser.toLowerCase());
      if (!nameMatch && !emailMatch) return false;
    }
    return true;
  });

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  if (session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="bg-slate-50 text-gray-900 min-h-screen">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Admin — All Bookings
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all user reservations
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full self-start sm:self-auto">
            Admin View
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[0.78rem] font-semibold text-gray-500 uppercase tracking-wide">
              Filter by Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-[0.78rem] font-semibold text-gray-500 uppercase tracking-wide">
              Filter by User
            </label>
            <input
              type="text"
              placeholder="Name or email..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder:text-gray-400"
            />
          </div>
          {(filterDate || filterUser) && (
            <button
              onClick={() => {
                setFilterDate("");
                setFilterUser("");
              }}
              className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {!loading && !error && (
          <div className="text-sm text-gray-500 mb-3">
            {filteredReservations.length} booking
            {filteredReservations.length !== 1 ? "s" : ""}
            {(filterDate || filterUser) ? " (filtered)" : ""}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3.5">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="font-semibold text-gray-900 mb-1.5">
              {filterDate || filterUser ? "No bookings match your filters" : "No bookings yet"}
            </div>
            {(filterDate || filterUser) && (
              <button
                onClick={() => {
                  setFilterDate("");
                  setFilterUser("");
                }}
                className="mt-3 text-primary hover:underline text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredReservations.map((r) => (
              <BookingCard
                key={r._id}
                reservation={r}
                isAdmin={true}
                onEdit={(res) => setEditingReservation(res)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <EditBookingModal
        reservation={editingReservation}
        isOpen={editingReservation !== null}
        onClose={() => setEditingReservation(null)}
        onUpdated={loadBookings}
      />
    </div>
  );
}
