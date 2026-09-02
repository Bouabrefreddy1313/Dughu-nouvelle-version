"use client"

/** États partagés (chargement / vide / erreur) de la page Retrouvailles. */

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Squelettes pendant le chargement. */
export function RetrouvaillesSkeletons() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Chargement des retrouvailles">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3">
          <div className="size-14 shrink-0 rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-36 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-9 w-24 rounded-2xl bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

/** État « liste vide » adapté au contexte. */
export function RetrouvaillesEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#F5EFE8] text-[#A35A2A]">
        <Inbox size={22} aria-hidden />
      </span>
      <p className="max-w-sm text-sm text-[#65676B]">{label}</p>
    </div>
  )
}

/** État d'erreur avec bouton « Réessayer ». */
export function RetrouvaillesError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50/40 py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle size={22} aria-hidden />
      </span>
      <p className="max-w-sm text-sm text-red-700">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5 text-[#A35A2A]">
        <RefreshCw size={15} aria-hidden />
        Réessayer
      </Button>
    </div>
  )
}

/**
 * Loader circulaire « en anneau » (cercle qui tourne), bien visible.
 * Utilisé pour le chargement progressif de la synchronisation des contacts.
 */
export function RetrouvaillesCircleLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10" aria-busy="true" aria-label={label || "Chargement"}>
      <span className="relative flex size-12 items-center justify-center" aria-hidden>
        <span className="absolute inline-flex size-12 rounded-full border-4 border-[#F0E2D4]" />
        <span className="absolute inline-flex size-12 animate-spin rounded-full border-4 border-transparent border-t-[#A35A2A] border-r-[#A35A2A]/40" />
        <span className="flex size-6 items-center justify-center rounded-full bg-[#A35A2A]/10">
          <RefreshCw size={14} className="text-[#A35A2A]" />
        </span>
      </span>
      {label && <span className="text-sm font-medium text-[#65676B]">{label}</span>}
    </div>
  )
}

/** Spinner centré (petit chargement inline). */
export function RetrouvaillesInlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10" aria-busy="true" aria-label={label}>
      <span className="relative flex size-10 shrink-0 items-center justify-center" aria-hidden>
        <span className="absolute inline-flex size-10 rounded-full border-4 border-[#F0E2D4]" />
        <span className="absolute inline-flex size-10 animate-spin rounded-full border-4 border-transparent border-t-[#A35A2A] border-r-[#A35A2A]/40" />
      </span>
      <span className="text-sm font-medium text-[#65676B]">{label}</span>
    </div>
  )
}