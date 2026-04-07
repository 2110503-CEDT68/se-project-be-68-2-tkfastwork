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

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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
    if (status === "authenticated") {
      loadBookings();
    }
  }, [status, loadBookings]);

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

  if (status === "loading" || (status === "unauthenticated")) {
    return null;
  }

  return (
    <div className="bg-slate-50 text-gray-900 min-h-screen">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {isAdmin ? "All Bookings" : "My Bookings"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Manage all user reservations"
              : "Manage your upcoming reservations"}
          </p>
        </div>

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
        ) : reservations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="font-semibold text-gray-900 mb-1.5">
              No bookings yet
            </div>
            <div className="text-sm mb-5">
              Browse available spaces to make your first reservation.
            </div>
            <Link
              href="/"
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
            >
              Browse Spaces
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {reservations.map((r) => (
              <BookingCard
                key={r._id}
                reservation={r}
                isAdmin={isAdmin}
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
