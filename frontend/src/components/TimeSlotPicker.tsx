"use client";

import { useMemo } from "react";
import { Reservation } from "@/types";

interface TimeSlotPickerProps {
  opentime: string;
  closetime: string;
  selectedDate: string;
  existingReservations: Reservation[];
  selectedStart: string;
  selectedEnd: string;
  onSelectStart: (time: string) => void;
  onSelectEnd: (time: string) => void;
}

function parseTimeToMinutes(timeStr: string): number | null {
  const parts = String(timeStr || "").split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function toHHMM(totalMinutes: number): string {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
    totalMinutes % 60
  ).padStart(2, "0")}`;
}

function buildHourlySlots(openTime: string, closeTime: string): string[] {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  if (
    openMinutes === null ||
    closeMinutes === null ||
    openMinutes > closeMinutes
  )
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

/** Bangkok offset is UTC+7 = -420 minutes from UTC */
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

function isSlotBooked(
  dateStr: string,
  slotTime: string,
  reservations: Reservation[]
): boolean {
  if (!dateStr) return false;
  const slotStart = bangkokDateTimeToISO(dateStr, slotTime);
  if (!slotStart) return false;
  const slotStartMs = new Date(slotStart).getTime();
  const slotEndMs = slotStartMs + 60 * 60 * 1000;

  return reservations.some((r) => {
    const rStart = new Date(r.apptDate).getTime();
    const rEnd = new Date(r.apptEnd).getTime();
    return rStart < slotEndMs && rEnd > slotStartMs;
  });
}

export default function TimeSlotPicker({
  opentime,
  closetime,
  selectedDate,
  existingReservations,
  selectedStart,
  selectedEnd,
  onSelectStart,
  onSelectEnd,
}: TimeSlotPickerProps) {
  const allSlots = useMemo(
    () => buildHourlySlots(opentime, closetime),
    [opentime, closetime]
  );

  const startSlots = useMemo(
    () => allSlots.slice(0, Math.max(0, allSlots.length - 1)),
    [allSlots]
  );

  const endSlots = useMemo(() => {
    if (!selectedStart) return [];
    const startMinutes = parseTimeToMinutes(selectedStart);
    return allSlots.filter((slot) => {
      const m = parseTimeToMinutes(slot);
      return m !== null && startMinutes !== null && m > startMinutes;
    });
  }, [allSlots, selectedStart]);

  function handleStartClick(slot: string) {
    onSelectStart(slot);
    // clear end if it's no longer valid
    if (selectedEnd) {
      const endMinutes = parseTimeToMinutes(selectedEnd);
      const startMinutes = parseTimeToMinutes(slot);
      if (
        endMinutes !== null &&
        startMinutes !== null &&
        endMinutes <= startMinutes
      ) {
        onSelectEnd("");
      }
    }
  }

  const slotBase =
    "px-3 py-2 rounded text-sm font-medium border transition-colors text-center";
  const slotSelected =
    "bg-primary text-white border-primary";
  const slotBooked =
    "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through";
  const slotAvailable =
    "bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary cursor-pointer";

  if (allSlots.length === 0) {
    return (
      <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium">
        No hourly slots available for this space.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Start time */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.82rem] font-semibold text-gray-900">
          Start Time
        </span>
        {startSlots.length === 0 ? (
          <p className="text-sm text-gray-400">No start slots available.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {startSlots.map((slot) => {
              const booked = isSlotBooked(selectedDate, slot, existingReservations);
              const selected = slot === selectedStart;
              let cls = slotBase;
              if (selected) cls += " " + slotSelected;
              else if (booked) cls += " " + slotBooked;
              else cls += " " + slotAvailable;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={booked}
                  onClick={() => !booked && handleStartClick(slot)}
                  className={cls}
                  title={booked ? "Already booked" : undefined}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* End time */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.82rem] font-semibold text-gray-900">
          End Time
        </span>
        {!selectedStart ? (
          <p className="text-sm text-gray-400">Select a start time first.</p>
        ) : endSlots.length === 0 ? (
          <p className="text-sm text-gray-400">No end slots available after the selected start.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {endSlots.map((slot) => {
              const selected = slot === selectedEnd;
              let cls = slotBase;
              if (selected) cls += " " + slotSelected;
              else cls += " " + slotAvailable;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onSelectEnd(slot)}
                  className={cls}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
