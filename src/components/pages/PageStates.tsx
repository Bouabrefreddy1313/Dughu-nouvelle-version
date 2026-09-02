"use client"

/**
 * États partagés des écrans Espaces : squelettes, erreur et vide.
 * Cohérence entre la liste, le détail et les panneaux internes.
 */

import { Button } from "@/components/ui/button"

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Chargement des espaces">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="size-12 shrink-0 rounded-xl bg-gray-200" />
          <span className="flex-1 space-y-2">
            <span className="block h-4 w-1/3 rounded bg-gray-200" />
            <span className="block h-3 w-2/3 rounded bg-gray-100" />
          </span>
        </div>
      ))}
    </div>
  )
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <p className="text-[#65676B]">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-3 rounded-full bg-[#A35A2A] text-white">
          Réessayer
        </Button>
      )}
    </div>
  )
}

export function PageEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
      <h3 className="text-base font-bold text-[#2D2D2D]">{title}</h3>
      <p className="mt-1 text-sm text-[#65676B]">{text}</p>
    </div>
  )
}