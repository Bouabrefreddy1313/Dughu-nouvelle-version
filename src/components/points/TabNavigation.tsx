"use client"

/**
 * Navigation à onglets réutilisable et accessible (rôle tablist, flèches
 * clavier, aria-selected). Utilisée par la page « Points et activités ».
 */

import { useRef } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TabItem<K extends string = string> {
  key: K
  label: string
  icon?: LucideIcon
}

interface TabNavigationProps<K extends string> {
  tabs: TabItem<K>[]
  active: K
  onChange: (key: K) => void
  ariaLabel: string
  className?: string
}

export default function TabNavigation<K extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  className,
}: TabNavigationProps<K>) {
  const listRef = useRef<HTMLDivElement>(null)

  // Navigation clavier ← → : déplace le focus puis sélectionne l'onglet.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const index = tabs.findIndex((tab) => tab.key === active)
    const delta = event.key === "ArrowRight" ? 1 : -1
    const next = tabs[(index + delta + tabs.length) % tabs.length]
    if (!next) return
    onChange(next.key)
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")
    buttons?.[tabs.indexOf(next)]?.focus()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const selected = key === active
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A]",
              selected ? "bg-[#A35A2A] text-white shadow-sm" : "text-[#65676B] hover:bg-[#F5EFE8]"
            )}
          >
            {Icon && <Icon size={16} aria-hidden />}
            <span className={cn(Icon && "hidden sm:inline")}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
