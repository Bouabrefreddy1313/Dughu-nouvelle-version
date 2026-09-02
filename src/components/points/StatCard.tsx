"use client"

/**
 * Carte de statistique réutilisable (points disponibles, points convertis,
 * gains du jour…). États loading / valeur / sous-libellé.
 */

import type { LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value?: number | null
  /** Format d'affichage de la valeur : « 306.00 » (2 décimales) ou entier. */
  format?: "decimal" | "integer"
  sublabel: string
  loading?: boolean
  /** Accent visuel de l'icône. */
  tone?: "primary" | "success" | "warning"
  className?: string
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-[#F5EFE8] text-[#A35A2A]",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
}

export function formatStatValue(value: number, format: "decimal" | "integer"): string {
  if (format === "decimal") return value.toFixed(2)
  return Math.trunc(value).toLocaleString("fr-FR")
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  format = "decimal",
  sublabel,
  loading = false,
  tone = "primary",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONES[tone])}
          aria-hidden
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#65676B]">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="truncate text-2xl font-bold tracking-tight text-[#2D2D2D]">
              {formatStatValue(Number(value ?? 0), format)}
            </p>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  )
}
