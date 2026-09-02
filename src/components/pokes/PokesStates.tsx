"use client"

/**
 * États partagés des onglets Pokes : squelettes de chargement, erreur avec
 * relance et état vide. Garantit une expérience cohérente entre les onglets
 * « Pokes reçus », « Suggestions » et « Pokes envoyés ».
 */

import { Button } from "@/components/ui/button"

export function PokesSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3" role="status" aria-label="Chargement des pokes">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 animate-pulse">
          <span className="size-11 shrink-0 rounded-full bg-gray-200" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-1/3 rounded bg-gray-200" />
            <span className="block h-3 w-1/4 rounded bg-gray-200" />
          </span>
          <span className="h-9 w-20 shrink-0 rounded-full bg-gray-200" />
        </li>
      ))}
    </ul>
  )
}

export function PokesError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
      <p className="text-[#65676B]">{message}</p>
      <Button
        onClick={onRetry}
        className="mt-3 bg-[#A35A2A] text-white rounded-full"
      >
        Réessayer
      </Button>
    </div>
  )
}

export function PokesEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
      <h3 className="text-base font-bold text-[#2D2D2D]">{title}</h3>
      <p className="mt-1 text-sm text-[#65676B]">{text}</p>
    </div>
  )
}
