"use client"

// ── CapsuleRail — bloc « Capsules » inséré dans le fil d'actualité ──────────
// Affiche 3 capsules (choisies aléatoirement, tirage stable par page) après
// les 4 premiers posts. Chaque vignette ouvre la visionneuse plein écran.

import { useMemo } from "react"
import { Clapperboard } from "lucide-react"
import Link from "next/link"
import CapsuleCard from "./CapsuleCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { Capsule } from "@/lib/capsule-service"

interface CapsuleRailProps {
  capsules: Capsule[]
  loading: boolean
  onOpen: (capsule: Capsule) => void
  /** Nombre de capsules affichées (3 par défaut). */
  count?: number
}

/** Tirage aléatoire stable : même liste → même sélection (pas de scintillement). */
function pickRandom(capsules: Capsule[], count: number): Capsule[] {
  if (capsules.length <= count) return capsules
  const seeded = [...capsules]
  // simple shuffle déterministe basé sur les ids
  const seed = capsules.reduce((acc, c) => acc + c.id.length * 31 + Number(c.id.replace(/\D/g, "").slice(-2) || 0), 0)
  let s = seed || 1
  for (let i = seeded.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[seeded[i], seeded[j]] = [seeded[j], seeded[i]]
  }
  return seeded.slice(0, count)
}

export default function CapsuleRail({ capsules, loading, onOpen, count = 3 }: CapsuleRailProps) {
  const picks = useMemo(() => pickRandom(capsules, count), [capsules, count])

  if (loading) {
    return (
      <div className="mb-4 rounded-3xl bg-white p-4 shadow-sm border border-gray-100">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (picks.length === 0) return null

  return (
    <section aria-label="Capsules" className="mb-4 rounded-3xl bg-white p-4 shadow-sm border border-gray-100">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#2D2D2D]">
          <Clapperboard size={18} className="text-[#A35A2A]" aria-hidden />
          Capsules
        </h3>
        <Link href="/capsules" className="text-[13px] font-medium text-[#A35A2A] hover:underline">
          Voir tout
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {picks.map((capsule) => (
          <CapsuleCard key={capsule.id} capsule={capsule} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
