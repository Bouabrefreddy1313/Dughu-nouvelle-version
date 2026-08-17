"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BackgroundColor {
  id?: number
  bg: string
  text: string
  color_1?: string
  color_2?: string
  isImage?: boolean
}

// Fallback si l'API n'est pas disponible
export const DEFAULT_COLORS: BackgroundColor[] = [
  { id: 0, bg: "linear-gradient(135deg, #ff9a9e, #fecfef)", text: "#ffffff", color_1: "#ff9a9e", color_2: "#fecfef", isImage: false },
  { id: 1, bg: "linear-gradient(135deg, #a18cd1, #fbc2eb)", text: "#ffffff", color_1: "#a18cd1", color_2: "#fbc2eb", isImage: false },
  { id: 2, bg: "linear-gradient(135deg, #84fab0, #8fd3f4)", text: "#ffffff", color_1: "#84fab0", color_2: "#8fd3f4", isImage: false },
  { id: 3, bg: "#B87333", text: "#ffffff", color_1: "#B87333", color_2: "", isImage: false },
  { id: 4, bg: "#f5f5dc", text: "#333333", color_1: "#f5f5dc", color_2: "", isImage: false },
  { id: 5, bg: "#2c3e50", text: "#ffffff", color_1: "#2c3e50", color_2: "", isImage: false },
]

interface BackgroundPickerProps {
  onClose: () => void
  onSelect: (color: BackgroundColor) => void
  currentColor?: BackgroundColor | null
}

export function BackgroundPicker({ onClose, onSelect, currentColor }: BackgroundPickerProps) {
  const [colors, setColors] = useState<BackgroundColor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchColors = async () => {
      try {
        const res = await fetch("/api/colors")
        const data = await res.json()
        if (!cancelled && data.success && data.colors?.length) {
          setColors(data.colors)
        } else if (!cancelled) {
          setColors(DEFAULT_COLORS)
        }
      } catch {
        if (!cancelled) setColors(DEFAULT_COLORS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchColors()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 min-w-[280px] flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 text-[#A35A2A] animate-spin" />
      </div>
    )
  }

  return (
    <div className="absolute top-full left-0 mt-2 p-4 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 min-w-[300px] max-w-[360px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Couleur de fond</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Grille des couleurs */}
      <div className="grid grid-cols-5 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
        {colors.map((color) => (
          <button
            key={color.id ?? color.bg}
            onClick={() => {
              onSelect(color)
              onClose()
            }}
            className={cn(
              "w-12 h-12 rounded-xl transition-all hover:scale-110 shadow-sm border-2",
              currentColor?.id != null
                ? currentColor.id === color.id
                  ? "border-[#A35A2A] ring-2 ring-[#A35A2A]/30"
                  : "border-transparent"
                : currentColor?.bg === color.bg
                  ? "border-[#A35A2A] ring-2 ring-[#A35A2A]/30"
                  : "border-transparent"
            )}
            style={
              color.isImage
                ? {
                    backgroundImage: `url(${color.bg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { background: color.bg }
            }
            title={color.isImage ? "Photo de fond" : undefined}
          />
        ))}
      </div>
    </div>
  )
}
