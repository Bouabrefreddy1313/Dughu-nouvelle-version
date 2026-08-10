"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  className?: string
  rounded?: "full" | "2xl"
}

export default function SearchBar({
  placeholder = "Recherche...",
  value,
  onChange,
  onSearch,
  className,
  rounded = "full",
}: SearchBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 bg-[#F0F2F5] px-4 transition focus-within:ring-2 focus-within:ring-[#A35A2A]/20",
        rounded === "full" ? "rounded-full" : "rounded-2xl",
        className
      )}
    >
      <Search size={18} className="text-[#65676B] shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch?.(e.currentTarget.value)
        }}
        className="bg-transparent outline-none text-sm w-full text-[#050505] placeholder-[#65676B] py-2.5"
      />
    </div>
  )
}