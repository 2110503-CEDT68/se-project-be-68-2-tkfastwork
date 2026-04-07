import Link from "next/link";

interface RecommendCardProps {
  spaceName: string;
  reason?: string;
  spaceId?: string;
  isMain?: boolean;
}

export default function RecommendCard({
  spaceName,
  reason,
  spaceId,
  isMain = false,
}: RecommendCardProps) {
  if (!isMain) {
    return (
      <div className="bg-slate-50 border border-gray-200 rounded px-3.5 py-2.5 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-900 font-medium">{spaceName}</span>
        {spaceId && (
          <Link
            href={`/space/${spaceId}`}
            className="text-xs font-semibold text-primary hover:text-primary-dark border border-primary/30 hover:border-primary px-2.5 py-1 rounded transition-colors shrink-0"
          >
            Book Now
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-primary px-5 py-3.5 flex items-center gap-2.5">
        <span className="text-[0.78rem] font-bold text-white/85 uppercase tracking-wider">
          Recommended for You
        </span>
      </div>
      <div className="p-5 sm:p-6 flex flex-col gap-4">
        <div className="text-[1.25rem] font-extrabold text-gray-900">{spaceName}</div>
        {reason && (
          <div className="text-sm text-gray-500 leading-relaxed bg-slate-50 rounded-lg px-4 py-3.5 border-l-[3px] border-primary">
            {reason}
          </div>
        )}
        {spaceId && (
          <div className="pt-1">
            <Link
              href={`/space/${spaceId}`}
              className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2 rounded text-sm transition-colors"
            >
              Book Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
