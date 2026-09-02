"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchComposerColors } from "@/services/posts/composer.service"

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
  { id: 17, bg: "linear-gradient(135deg, #98b262, #66a399)", text: "#000000", color_1: "#98b262", color_2: "#66a399", isImage: false },
  { id: 18, bg: "#000000", text: "#ffffff", color_1: "#000000", color_2: "#000000", isImage: false },
  { id: 19, bg: "linear-gradient(135deg, #ffb0ff, #8080c0)", text: "#000000", color_1: "#ffb0ff", color_2: "#8080c0", isImage: false },
  { id: 24, bg: "linear-gradient(135deg, #0000ff, #00ff00)", text: "#ffffff", color_1: "#0000ff", color_2: "#00ff00", isImage: false },
  { id: 25, bg: "linear-gradient(135deg, #4e26ff, #ff0000)", text: "#000000", color_1: "#4e26ff", color_2: "#ff0000", isImage: false },
  { id: 27, bg: "linear-gradient(135deg, #ff0fff, #8080c0)", text: "#000000", color_1: "#ff0fff", color_2: "#8080c0", isImage: false },
  { id: 30, bg: "linear-gradient(135deg, #ffff00, #8080c0)", text: "#000000", color_1: "#ffff00", color_2: "#8080c0", isImage: false },
  { id: 31, bg: "linear-gradient(135deg, #e8670c, #ffffff)", text: "#000000", color_1: "#e8670c", color_2: "#ffffff", isImage: false },
  { id: 32, bg: "linear-gradient(135deg, #ff3dff, #ffffff)", text: "#000000", color_1: "#ff3dff", color_2: "#ffffff", isImage: false },
  { id: 33, bg: "linear-gradient(135deg, #91ff3d, #ff00ff)", text: "#000000", color_1: "#91ff3d", color_2: "#ff00ff", isImage: false },
]

interface BackgroundPickerProps {
  onClose: () => void
  onSelect: (color: BackgroundColor) => void
  currentColor?: BackgroundColor | null
}

export function BackgroundPicker({ onClose, onSelect, currentColor }: BackgroundPickerProps) {
  const [colors, setColors] = useState<BackgroundColor[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    let cancelled = false
    fetchComposerColors()
      .then((data) => {
        if (!cancelled && data.success && data.colors?.length) {
          setColors(data.colors as BackgroundColor[])
        } else if (!cancelled) {
          setColors(DEFAULT_COLORS)
        }
      })
      .catch(() => {
        if (!cancelled) setColors(DEFAULT_COLORS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (!mounted) return null

  const content = loading ? (
    <div className="mx-auto max-w-[360px] bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex items-center justify-center h-40">
      <Loader2 className="w-5 h-5 text-[#A35A2A] animate-spin" />
    </div>
  ) : (
    <div className="mx-auto max-w-[360px] bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
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

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {content}
    </div>,
    document.body
  )
}