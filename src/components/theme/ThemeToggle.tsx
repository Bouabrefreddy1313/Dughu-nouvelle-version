"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sun, Moon, Laptop, Check } from "lucide-react"
import { useTheme, type Theme } from "./ThemeProvider"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: "icon" | "segmented" | "menu"
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({
  variant = "icon",
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  // --- Variante 1 : Segmented Control (Pills pour les Paramètres et Menus) ---
  if (variant === "segmented") {
    const options: { key: Theme; label: string; icon: typeof Sun }[] = [
      { key: "light", label: "Clair", icon: Sun },
      { key: "dark", label: "Sombre", icon: Moon },
      { key: "system", label: "Système", icon: Laptop },
    ]

    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-2xl bg-[#F0F2F5] dark:bg-[#262626] p-1 border border-gray-200/60 dark:border-white/10",
          className
        )}
        role="radiogroup"
        aria-label="Sélection du thème d'affichage"
      >
        {options.map((opt) => {
          const Icon = opt.icon
          const isActive = theme === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 select-none",
                isActive
                  ? "bg-white dark:bg-[#1E1E1E] text-[#050505] dark:text-[#F3F4F6] shadow-sm font-semibold"
                  : "text-[#65676B] dark:text-[#A1A1AA] hover:text-[#050505] dark:hover:text-[#F3F4F6] hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <Icon size={16} className={cn(isActive && "text-[#985810] dark:text-[#B46D1C]")} />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // --- Variante 2 : Menu / Carte compacte (pour intégration dans ProfileMenu) ---
  if (variant === "menu") {
    const options: { key: Theme; label: string; icon: typeof Sun }[] = [
      { key: "light", label: "Clair", icon: Sun },
      { key: "dark", label: "Sombre", icon: Moon },
      { key: "system", label: "Système", icon: Laptop },
    ]

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[#65676B] dark:text-[#A1A1AA] px-1">
          Mode d&apos;affichage
        </span>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#F0F2F5] dark:bg-[#262626] border border-gray-200/50 dark:border-white/10">
          {options.map((opt) => {
            const Icon = opt.icon
            const isActive = theme === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTheme(opt.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all",
                  isActive
                    ? "bg-white dark:bg-[#1E1E1E] text-[#050505] dark:text-[#F3F4F6] shadow-sm font-semibold"
                    : "text-[#65676B] dark:text-[#A1A1AA] hover:text-[#050505] dark:hover:text-[#F3F4F6]"
                )}
              >
                <Icon size={14} className={cn(isActive && "text-[#985810] dark:text-[#B46D1C]")} />
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // --- Variante 3 : Icon Button (pour Header desktop & mobile) ---
  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        onDoubleClick={toggleTheme}
        className={cn(
          "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 text-[#050505] dark:text-[#E4E6EB] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#985810]",
          menuOpen && "bg-[#F0F2F5] dark:bg-[#2A2A2A]",
          className
        )}
        aria-label={
          resolvedTheme === "dark"
            ? "Mode sombre actif (cliquer pour changer de thème)"
            : "Mode clair actif (cliquer pour changer de thème)"
        }
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        {resolvedTheme === "dark" ? (
          <Moon size={19} className="text-[#E4E6EB] transition-transform duration-300 hover:rotate-12" />
        ) : (
          <Sun size={19} className="text-[#050505] transition-transform duration-300 hover:rotate-45" />
        )}
        {showLabel && (
          <span className="ml-2 text-sm font-medium">
            {resolvedTheme === "dark" ? "Sombre" : "Clair"}
          </span>
        )}
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-white dark:bg-[#1E1E1E] p-1.5 shadow-2xl border border-gray-100 dark:border-white/10 z-[130] animate-in fade-in zoom-in-95 duration-150"
          role="menu"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#65676B] dark:text-[#A1A1AA]">
            Thème d&apos;affichage
          </div>
          {(
            [
              { key: "light", label: "Clair", icon: Sun },
              { key: "dark", label: "Sombre", icon: Moon },
              { key: "system", label: "Système", icon: Laptop },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon
            const isSelected = theme === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(opt.key)
                  setMenuOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors text-left",
                  isSelected
                    ? "bg-[#985810]/10 dark:bg-[#985810]/20 text-[#985810] dark:text-[#C07520] font-semibold"
                    : "text-[#050505] dark:text-[#E4E6EB] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A]"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={16} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
