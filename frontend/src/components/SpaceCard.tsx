import Link from "next/link";
import { CoworkingSpace } from "@/types";

interface SpaceCardProps {
  space: CoworkingSpace;
}

export default function SpaceCard({ space }: SpaceCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 flex flex-col gap-3">
      <div className="font-bold text-gray-900">{space.name}</div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2 text-sm text-gray-500">
          <span className="uppercase text-[11px] font-bold tracking-wide text-gray-400 shrink-0 w-[52px] pt-px">
            Address
          </span>
          <span className="break-words min-w-0">{space.address}</span>
        </div>
        <div className="flex gap-2 text-sm text-gray-500">
          <span className="uppercase text-[11px] font-bold tracking-wide text-gray-400 shrink-0 w-[52px] pt-px">
            Tel
          </span>
          <span>{space.tel || "—"}</span>
        </div>
      </div>
      <div>
        <span className="inline-flex items-center bg-primary-light text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
          {space.opentime || "?"} – {space.closetime || "?"}
        </span>
      </div>
      <div className="mt-auto pt-3.5 border-t border-gray-100">
        <Link
          href={`/space/${space._id}`}
          className="block w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded text-sm transition-colors text-center"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
