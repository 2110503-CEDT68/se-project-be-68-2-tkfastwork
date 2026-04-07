"use client";

import { useState } from "react";
import { Reservation, CoworkingSpace, User } from "@/types";

interface BookingCardProps {
  reservation: Reservation;
  isAdmin: boolean;
  onEdit: (reservation: Reservation) => void;
  onDelete: (id: string) => void;
}

const BANGKOK_TZ = "Asia/Bangkok";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    timeZone: BANGKOK_TZ,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRange(startDateStr: string, endDateStr?: string): string {
  const startText = formatDate(startDateStr);
  if (!endDateStr) return startText;
  const endText = new Date(endDateStr).toLocaleTimeString("en-GB", {
    timeZone: BANGKOK_TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startText} – ${endText}`;
}

function isWithinOneHour(apptDate: string): boolean {
  const oneHourBefore = new Date(new Date(apptDate).getTime() - 60 * 60 * 1000);
  return Date.now() >= oneHourBefore.getTime();
}

export default function BookingCard({
  reservation,
  isAdmin,
  onEdit,
  onDelete,
}: BookingCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const space =
    typeof reservation.coworkingSpace === "object"
      ? (reservation.coworkingSpace as CoworkingSpace)
      : null;
  const user =
    typeof reservation.user === "object" ? (reservation.user as User) : null;

  const spaceName = space?.name ?? "Unknown Space";
  const address = space?.address ?? "";
  const qrCode = reservation.qrCode ?? "";
  const locked = isWithinOneHour(reservation.apptDate);
  const dateRange = formatRange(reservation.apptDate, reservation.apptEnd);

  const btnSm =
    "font-semibold px-3 py-1.5 rounded text-xs transition-colors";

  async function handleDelete() {
    if (!confirm("Cancel this booking?")) return;
    setDeleting(true);
    try {
      onDelete(reservation._id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex gap-4 items-start sm:flex-row flex-col">
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 text-[0.95rem] mb-1">
          {spaceName}
        </div>
        {address && (
          <div className="text-sm text-gray-400 mb-1">{address}</div>
        )}
        {isAdmin && user && (
          <div className="text-xs text-gray-500 mb-2">
            <span className="font-semibold">User:</span> {user.name}{" "}
            <span className="text-gray-400">({user.email})</span>
          </div>
        )}
        <div className="inline-flex items-center bg-primary-light text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
          {dateRange}
        </div>
        <div className="flex gap-2 mt-3.5 flex-wrap">
          <button
            className={`${btnSm} bg-primary hover:bg-primary-dark text-white`}
            onClick={() => setShowDetail(true)}
          >
            View Detail
          </button>
          <button
            className={`${btnSm} border border-primary text-primary hover:bg-primary-light ${
              locked ? "opacity-40 cursor-not-allowed pointer-events-none" : ""
            }`}
            disabled={locked}
            title={locked ? "Cannot edit within 1 hour of booking" : undefined}
            onClick={() => !locked && onEdit(reservation)}
          >
            Edit
          </button>
          <button
            className={`${btnSm} border border-red-200 text-red-600 hover:bg-red-50 ${
              locked ? "opacity-40 cursor-not-allowed pointer-events-none" : ""
            }`}
            disabled={locked || deleting}
            title={locked ? "Cannot cancel within 1 hour of booking" : undefined}
            onClick={handleDelete}
          >
            {deleting ? "Cancelling..." : "Cancel"}
          </button>
        </div>
        {locked && (
          <div className="text-xs text-gray-400 mt-1.5">
            Modifications locked — within 1 hour of booking time.
          </div>
        )}
      </div>

      {qrCode && (
        <div className="flex flex-col items-center gap-1.5 p-3.5 bg-slate-50 rounded-lg border border-gray-200 shrink-0 self-center sm:self-start">
          <img
            src={qrCode}
            alt="QR Code"
            className="w-[110px] h-[110px] rounded"
          />
          <span className="text-[0.72rem] text-gray-400 font-bold uppercase tracking-wide">
            Check-in QR
          </span>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-[200] p-5 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDetail(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] p-7 flex flex-col gap-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[1.1rem] font-bold text-gray-900">
                Booking Detail
              </h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:bg-gray-100 p-1 rounded text-xl leading-none transition-colors"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="bg-primary rounded-lg px-4 py-4 text-white">
              <div className="text-[0.7rem] font-bold uppercase tracking-wide text-white/65 mb-1">
                Space
              </div>
              <div className="font-bold text-base">{spaceName}</div>
              {address && (
                <div className="text-sm text-white/70 mt-0.5">{address}</div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {space?.tel && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Tel</span>
                  <span className="text-right max-w-[60%]">{space.tel}</span>
                </div>
              )}
              {space?.opentime && space?.closetime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Hours</span>
                  <span className="text-right max-w-[60%]">
                    {space.opentime} – {space.closetime}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-semibold">
                  Date &amp; Time
                </span>
                <span className="text-right max-w-[60%]">{dateRange}</span>
              </div>
              {isAdmin && user && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">User</span>
                  <span className="text-right max-w-[60%]">
                    {user.name}{" "}
                    <span className="text-gray-400 text-xs">({user.email})</span>
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-semibold">Booking ID</span>
                <span className="font-mono text-xs text-gray-400 text-right max-w-[60%] break-all">
                  {reservation._id}
                </span>
              </div>
            </div>

            {qrCode ? (
              <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-lg border border-gray-200">
                <img
                  src={qrCode}
                  alt="Booking QR Code"
                  className="w-40 h-40 rounded"
                />
                <span className="text-[0.72rem] text-gray-400 font-bold uppercase tracking-wide">
                  Scan at check-in
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center">
                No QR code available for this booking.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
