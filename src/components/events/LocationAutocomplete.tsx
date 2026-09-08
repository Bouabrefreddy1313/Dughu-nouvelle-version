"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Loader2, X, Check, Navigation } from "lucide-react"
import type { PlaceSuggestion } from "@/app/api/places/autocomplete/route"

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Ex : Sofitel Hôtel Ivoire, Abidjan",
  required = false,
  className = "",
}: LocationAutocompleteProps) {
  const [inputVal, setInputVal] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Synchronisation avec la valeur externe
  useEffect(() => {
    setInputVal(value)
  }, [value])

  // Fermer le dropdown lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchSuggestions = async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(
        `/api/places/autocomplete?q=${encodeURIComponent(q.trim())}`
      )
      const data = await res.json()
      if (data?.success && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions)
        setIsOpen(data.suggestions.length > 0)
        setHighlightedIndex(-1)
      } else {
        setSuggestions([])
      }
    } catch (err) {
      console.error("Erreur chargement suggestions de lieux:", err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value
    setInputVal(nextVal)
    onChange(nextVal)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!nextVal.trim() || nextVal.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(nextVal)
    }, 300)
  }

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    const chosen = suggestion.description || suggestion.mainText
    setInputVal(chosen)
    onChange(chosen)
    setSuggestions([])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      )
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault()
        handleSelectSuggestion(suggestions[highlightedIndex])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    setInputVal("")
    onChange("")
    setSuggestions([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-[#8B5E34] absolute left-4 pointer-events-none" />

        <input
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full pl-11 pr-10 py-3 text-sm rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 transition"
        />

        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-[#8B5E34] animate-spin" />
          )}

          {inputVal && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Menu déroulant des suggestions Google Maps */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in-50 duration-150 max-h-72 overflow-y-auto">
          <div className="p-1.5 space-y-0.5">
            {suggestions.map((suggestion, idx) => {
              const isHighlighted = idx === highlightedIndex

              return (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                    isHighlighted
                      ? "bg-[#8B5E34]/10 text-gray-900 dark:text-gray-100"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-800/60 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <MapPin className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold truncate">
                      {suggestion.mainText}
                    </p>
                    {suggestion.secondaryText && (
                      <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {suggestion.secondaryText}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Pied du menu avec badge d'attribution */}
          <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-zinc-800/60 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Navigation className="w-3 h-3 text-[#8B5E34]" />
              Suggestions de lieux & adresses
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
              Google Maps
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
