"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Reservation, CoworkingSpace } from "@/types";

interface EditBookingModalProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const BANGKOK_TZ = "Asia/Bangkok";

function parseTimeToMinutes(timeStr: string): number | null {
  const [hourStr, minuteStr] = String(timeStr || "").split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function toHHMM(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

function buildHourlySlots(openTime: string, closeTime: string): string[] {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  if (openMinutes === null || closeMinutes === null || openMinutes > closeMinutes)
    return [];
  const slots: string[] = [];
  for (
    let m = Math.ceil(openMinutes / 60) * 60;
    m <= Math.floor(closeMinutes / 60) * 60;
    m += 60
  ) {
    slots.push(toHHMM(m));
  }
  return slots;
}

function getBangkokDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
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

function getBangkokTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value),
    minute: Number(parts.find((p) => p.type === "minute")?.value),
  };
}

function toBangkokDateValue(date: Date): string {
  const { year, month, day } = getBangkokDateParts(date);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getBangkokTodayDateValue(): string {
  return toBangkokDateValue(new Date());
}

function toBangkokTimeValue(date: Date): string {
  const { hour, minute } = getBangkokTimeParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function bangkokDateTimeToISO(dateStr: string, timeStr: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeStr || ""));
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]),
    month = Number(dateMatch[2]),
    day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]),
    minute = Number(timeMatch[2]);
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

export default function EditBookingModal({
  reservation,
  isOpen,
  onClose,
  onUpdated,
}: EditBookingModalProps) {
  const { data: session } = useSession();
  const [apptDate, setApptDate] = useState("");
  const [startSlot, setStartSlot] = useState("");
  const [endSlot, setEndSlot] = useState("");
  const [allSlots, setAllSlots] = useState<string[]>([]);
  const [startSlots, setStartSlots] = useState<string[]>([]);
  const [endSlots, setEndSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !reservation) return;
    setError("");

    const space =
      typeof reservation.coworkingSpace === "object"
        ? (reservation.coworkingSpace as CoworkingSpace)
        : null;
    const openTime = space?.opentime || "00:00";
    const closeTime = space?.closetime || "23:00";
    const slots = buildHourlySlots(openTime, closeTime);
    const sSlots = slots.slice(0, Math.max(0, slots.length - 1));
    setAllSlots(slots);
    setStartSlots(sSlots);

    const start = new Date(reservation.apptDate);
    const end = reservation.apptEnd ? new Date(reservation.apptEnd) : null;
    const dateVal = toBangkokDateValue(start);
    const currentStart = toBangkokTimeValue(start);
    const currentEnd = end ? toBangkokTimeValue(end) : "";

    setApptDate(dateVal);

    const matchedStart = sSlots.includes(currentStart) ? currentStart : "";
    setStartSlot(matchedStart);

    if (matchedStart) {
      const eSlots = slots.filter(
        (s) => (parseTimeToMinutes(s) ?? 0) > (parseTimeToMinutes(matchedStart) ?? 0)
      );
      setEndSlots(eSlots);
      setEndSlot(eSlots.includes(currentEnd) ? currentEnd : "");
    } else {
      setEndSlots([]);
      setEndSlot("");
    }
  }, [isOpen, reservation]);

  function handleStartChange(val: string) {
    setStartSlot(val);
    if (!val) {
      setEndSlots([]);
      setEndSlot("");
      return;
    }
    const eSlots = allSlots.filter(
      (s) => (parseTimeToMinutes(s) ?? 0) > (parseTimeToMinutes(val) ?? 0)
    );
    setEndSlots(eSlots);
    setEndSlot("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!apptDate || !startSlot || !endSlot) {
      setError("Please select date, start time, and end time.");
      return;
    }
    if (apptDate < getBangkokTodayDateValue()) {
      setError("Cannot book a past date.");
      return;
    }
    const apptStartISO = bangkokDateTimeToISO(apptDate, startSlot);
    const apptEndISO = bangkokDateTimeToISO(apptDate, endSlot);
    if (!apptStartISO || !apptEndISO) {
      setError("Invalid date/time selection.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reservations/${reservation!._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.token}`,
          },
          body: JSON.stringify({ apptDate: apptStartISO, apptEnd: apptEndISO }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 z-[200] p-5 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] p-7 flex flex-col gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editModalTitle"
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-[1.1rem] font-bold text-gray-900"
            id="editModalTitle"
          >
            Edit Booking
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:bg-gray-100 p-1 rounded text-xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="editApptDate"
            >
              New Date
            </label>
            <input
              type="date"
              id="editApptDate"
              value={apptDate}
              min={getBangkokTodayDateValue()}
              onChange={(e) => setApptDate(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-45 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="editApptStartSlot"
            >
              Start Time
            </label>
            <select
              id="editApptStartSlot"
              value={startSlot}
              onChange={(e) => handleStartChange(e.target.value)}
              disabled={startSlots.length === 0}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-45 disabled:cursor-not-allowed"
              required
            >
              <option value="">Select start time</option>
              {startSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[0.82rem] font-semibold text-gray-900"
              htmlFor="editApptEndSlot"
            >
              End Time
            </label>
            <select
              id="editApptEndSlot"
              value={endSlot}
              onChange={(e) => setEndSlot(e.target.value)}
              disabled={endSlots.length === 0}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded text-sm text-gray-900 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-45 disabled:cursor-not-allowed"
              required
            >
              <option value="">Select end time</option>
              {endSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded text-sm transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
