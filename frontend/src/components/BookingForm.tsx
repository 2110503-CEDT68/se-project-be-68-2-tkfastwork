"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { Reservation } from "@/types";

interface BookingFormProps {
  spaceId: string;
  spaceName?: string;
  opentime: string;
  closetime: string;
}

const BANGKOK_TIMEZONE = "Asia/Bangkok";

function getBangkokDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

function getBangkokTodayDateValue(): string {
  const { year, month, day } = getBangkokDateParts(new Date());
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function bangkokDateTimeToISO(dateStr: string, timeStr: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeStr || ""));
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  )
    return null;
  const utcMillis = Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0);
  const iso = new Date(utcMillis).toISOString();
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:5000";

export default function BookingForm({
  spaceId,
  spaceName,
  opentime,
  closetime,
}: BookingFormProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    startISO: string;
    endISO: string;
    qrCode?: string;
  } | null>(null);
  const [existingReservations, setExistingReservations] = useState<
    Reservation[]
  >([]);

  const todayValue = getBangkokTodayDateValue();

  // Fetch existing reservations for this space to show booked slots
  useEffect(() => {
    if (!session?.user?.token || !spaceId) return;
    fetch(
      `${BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/reservations`,
      {
        headers: {
          Authorization: `Bearer ${session.user.token}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setExistingReservations(data.data as Reservation[]);
        }
      })
      .catch(() => {
        // non-fatal: existing reservations won't be shown as booked
      });
  }, [session, spaceId]);

  // Reset time selections when date changes
  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedDate(e.target.value);
    setSelectedStart("");
    setSelectedEnd("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!selectedDate || !selectedStart || !selectedEnd) {
      setError("Please select a date, start time, and end time.");
      return;
    }

    // Client-side: date must be today or future (backend enforces strictly future)
    if (selectedDate < todayValue) {
      setError("Please select a future date.");
      return;
    }

    const startISO = bangkokDateTimeToISO(selectedDate, selectedStart);
    const endISO = bangkokDateTimeToISO(selectedDate, selectedEnd);

    if (!startISO || !endISO) {
      setError("Invalid date or time selection.");
      return;
    }

    if (!session?.user?.token) {
      setError("You must be signed in to make a booking.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/reservations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ apptDate: startISO, apptEnd: endISO }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      const reservation = data.data || data;
      setSuccess({
        startISO,
        endISO,
        qrCode: reservation.qrCode,
      });

      // Redirect to bookings after a short delay
      setTimeout(() => {
        router.push("/bookings");
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Booking failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-45 disabled:cursor-not-allowed";

  if (success) {
    const startText = new Date(success.startISO).toLocaleString("en-GB", {
      timeZone: BANGKOK_TIMEZONE,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const endText = new Date(success.endISO).toLocaleTimeString("en-GB", {
      timeZone: BANGKOK_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600 font-bold text-xl">
          &#10003;
        </div>
        <div>
          <div className="font-bold text-green-600 text-[1.05rem]">
            Booking Confirmed
          </div>
          {spaceName && (
            <div className="text-sm text-gray-500 mt-1">{spaceName}</div>
          )}
          <div className="text-sm text-gray-500">
            {startText} – {endText}
          </div>
        </div>
        {success.qrCode && (
          <div className="flex flex-col items-center gap-2 p-3.5 bg-slate-50 rounded border border-gray-200">
            <img
              src={success.qrCode}
              alt="Booking QR Code"
              className="w-28 h-28 rounded"
            />
            <span className="text-[0.72rem] text-gray-400 font-bold uppercase tracking-wide">
              Scan at check-in
            </span>
          </div>
        )}
        <p className="text-sm text-gray-400">Redirecting to My Bookings...</p>
        <div className="flex gap-2.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => router.push("/bookings")}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
          >
            View My Bookings
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-semibold px-4 py-2 rounded text-sm transition-colors"
          >
            Browse More Spaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col gap-4">
      <div className="font-bold text-gray-900">Reserve a Time Slot</div>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Date picker */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-[0.82rem] font-semibold text-gray-900"
            htmlFor="apptDate"
          >
            Date
          </label>
          <input
            type="date"
            id="apptDate"
            value={selectedDate}
            min={todayValue}
            onChange={handleDateChange}
            className={inputCls}
            required
          />
        </div>

        {/* Time slot picker */}
        {selectedDate ? (
          <TimeSlotPicker
            opentime={opentime}
            closetime={closetime}
            selectedDate={selectedDate}
            existingReservations={existingReservations}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            onSelectStart={(t) => {
              setSelectedStart(t);
              setSelectedEnd("");
              setError("");
            }}
            onSelectEnd={(t) => {
              setSelectedEnd(t);
              setError("");
            }}
          />
        ) : (
          <p className="text-sm text-gray-400">
            Select a date to see available time slots.
          </p>
        )}

        {/* Summary row */}
        {selectedStart && selectedEnd && (
          <div className="bg-primary-light border border-primary-light2 rounded px-4 py-2.5 text-sm text-primary font-medium">
            {selectedStart} – {selectedEnd} on{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedDate || !selectedStart || !selectedEnd}
          className="bg-primary hover:bg-primary-dark text-white font-semibold px-7 py-3 rounded text-base transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <span className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </button>
      </form>
    </div>
  );
}
