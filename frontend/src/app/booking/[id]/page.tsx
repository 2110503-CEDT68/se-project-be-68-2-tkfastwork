"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface BookingData {
  _id: string;
  apptDate: string;
  apptEnd?: string;
  user: {
    name: string;
    email: string;
    tel: string;
  };
  coworkingSpace: {
    name: string;
    address: string;
    opentime?: string;
    closetime?: string;
  };
  qrCode?: string;
}

type PageState = "loading" | "success" | "not_found" | "connection_error";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3.5">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-[0.9rem] font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function BookingVerificationPage() {
  const params = useParams();
  const id = params.id as string;

  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<BookingData | null>(null);

  useEffect(() => {
    if (!id) {
      setState("not_found");
      return;
    }

    async function load() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/reservations/public/${id}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          setState("not_found");
          return;
        }

        setData(json.data);
        setState("success");
      } catch {
        setState("connection_error");
      }
    }

    load();
  }, [id]);

  if (state === "loading") {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-5">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-[420px] overflow-hidden">
          <div className="p-10 text-center text-gray-400 text-sm">
            Loading booking details...
          </div>
        </div>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-5">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-[420px] overflow-hidden">
          <div className="bg-red-600 px-6 pt-7 pb-6 text-center text-white">
            <div className="text-[0.7rem] font-bold uppercase tracking-widest text-white/65 mb-2">
              CoWork
            </div>
            <h1 className="text-[1.2rem] font-bold">Booking Not Found</h1>
            <p className="text-sm text-white/70 mt-1">
              This QR code may be invalid or the booking was cancelled.
            </p>
          </div>
          <div className="p-6 text-center text-sm text-gray-500">
            Please contact the front desk for assistance.
          </div>
        </div>
      </div>
    );
  }

  if (state === "connection_error") {
    return (
      <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-5">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-[420px] overflow-hidden">
          <div className="bg-red-600 px-6 pt-7 pb-6 text-center text-white">
            <div className="text-[0.7rem] font-bold uppercase tracking-widest text-white/65 mb-2">
              CoWork
            </div>
            <h1 className="text-[1.2rem] font-bold">Connection Error</h1>
            <p className="text-sm text-white/70 mt-1">
              Could not reach the server.
            </p>
          </div>
          <div className="p-6 text-center text-sm text-gray-500">
            Please check your connection and try again.
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const space = data.coworkingSpace;
  const user = data.user;

  const dateStr = new Date(data.apptDate).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const startTime = new Date(data.apptDate).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  const endTime = data.apptEnd
    ? new Date(data.apptEnd).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })
    : null;

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-5 font-sans">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-[420px] overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 pt-7 pb-6 text-center text-white">
          <div className="text-[0.7rem] font-bold uppercase tracking-widest text-white/65 mb-2">
            CoWork
          </div>
          <h1 className="text-[1.2rem] font-bold">{space.name}</h1>
          <p className="text-sm text-white/70 mt-1">{space.address}</p>
          <span className="inline-block mt-3 bg-white/20 text-white text-xs font-bold px-3.5 py-1 rounded-full border border-white/25 tracking-wide">
            Confirmed
          </span>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* QR Code */}
          {data.qrCode && (
            <div className="flex justify-center mb-6">
              <div className="border border-gray-200 rounded-lg p-3 bg-white inline-block shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrCode}
                  alt="Booking QR Code"
                  width={160}
                  height={160}
                  className="block"
                />
              </div>
            </div>
          )}

          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-400 mb-3.5">
            Appointment
          </div>
          <InfoRow label="Date" value={dateStr} />
          <InfoRow
            label="Time"
            value={startTime + (endTime ? ` \u2013 ${endTime}` : "")}
          />
          {space.opentime && space.closetime && (
            <InfoRow
              label="Space Hours"
              value={`${space.opentime} \u2013 ${space.closetime}`}
            />
          )}

          <hr className="border-gray-100 my-5" />

          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-400 mb-3.5">
            Guest
          </div>
          <InfoRow label="Name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Tel" value={user.tel} />

          <hr className="border-gray-100 my-5" />

          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Booking ID
          </div>
          <div className="bg-slate-50 border border-gray-200 rounded px-3.5 py-2.5 font-mono text-xs text-gray-500 break-all">
            {data._id}
          </div>
        </div>
      </div>
    </div>
  );
}
