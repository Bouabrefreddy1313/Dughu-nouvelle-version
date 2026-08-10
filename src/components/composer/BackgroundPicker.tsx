"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BackgroundColor {
  bg: string
  text: string
}

export const DEFAULT_COLORS: BackgroundColor[] = [
  { bg: "linear-gradient(45deg, #ff9a9e 0%, #fecfef 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #a18cd1 0%, #fbc2eb 100%)", text: "#fff" },
  { bg: "linear-gradient(45deg, #84fab0 0%, #8fd3f4 100%)", text: "#fff" },
  { bg: "#B87333", text: "#fff" },
  { bg: "#f5f5dc", text: "#333" },
  { bg: "#2c3e50", text: "#fff" },
]

interface BackgroundPickerProps {
  onClose: () => void
  onSelect: (color: BackgroundColor) => void
  currentColor?: BackgroundColor
}

export function BackgroundPicker({ onClose, onSelect, currentColor }: BackgroundPickerProps) {
  return (
    <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 min-w-[280px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Couleur de fond</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {DEFAULT_COLORS.map((color, index) => (
          <button
            key={index}
            onClick={() => {
              onSelect(color)
              onClose()
            }}
            className={cn(
              "w-10 h-10 rounded-lg transition-transform hover:scale-110",
              currentColor?.bg === color.bg && "ring-2 ring-offset-2 ring-[#A35A2A]"
            )}
            style={{ background: color.bg }}
          />
        ))}
      </div>
    </div>
  )
}
