export default function SpaceCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-3 min-h-[180px]">
      <div className="skeleton h-[18px] w-3/5 rounded" />
      <div className="skeleton h-3 w-[90%] rounded" />
      <div className="skeleton h-3 w-[70%] rounded" />
      <div className="skeleton h-8 w-full mt-auto rounded" />
    </div>
  );
}
