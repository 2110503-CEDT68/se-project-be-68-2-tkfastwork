"use client";

interface SearchBarProps {
  value: string;
  onChange: (term: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search by name or address...",
}: SearchBarProps) {
  return (
    <div className="mt-7 max-w-md mx-auto relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border-transparent bg-white/95 shadow-md text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
