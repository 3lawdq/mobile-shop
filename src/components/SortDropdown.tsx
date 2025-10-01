"use client";

import { useMemo } from "react";

interface SortDropdownProps {
  selected: string;
  onChange: (sort: string) => void;
}

const options = [
  { v: "latest", label: "الأحدث" },             // created_at DESC
  { v: "price_asc", label: "السعر: من الأقل للأعلى" },  // price ASC
  { v: "price_desc", label: "السعر: من الأعلى للأقل" }, // price DESC
  { v: "rating_desc", label: "التقييم" },        // rating DESC
];

export default function SortDropdown({ selected, onChange }: SortDropdownProps) {
  const value = useMemo(
    () => (options.some((o) => o.v === selected) ? selected : "latest"),
    [selected]
  );

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border p-2 rounded focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] transition-all duration-300 bg-white"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <svg
          className="h-5 w-5 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
