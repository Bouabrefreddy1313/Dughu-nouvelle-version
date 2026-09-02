"use client"

/**
 * Élément « personne » réutilisé dans les 3 onglets Retrouvailles.
 * Affiche l'avatar, le nom, les infos disponibles (école / ville), l'affinité
 * et le bouton « Fraterniser ».
 */

import Avatar from "@/components/common/Avatar"
import FraterniserButton from "./FraterniserButton"
import type { RetrouvaillePerson } from "@/types/retrouvailles/retrouvailles.types"

interface RetrouvaillePersonCardProps {
  person: RetrouvaillePerson
  authUserId: string
  /** Ids des personnes pour lesquelles une demande a déjà été envoyée. */
  sentIds?: Set<string>
}

function infoItems(person: RetrouvaillePerson): string[] {
  const items: string[] = []
  if (person.school) items.push(person.school)
  if (person.city) items.push(person.city)
  return items
}

export default function RetrouvaillePersonCard({ person, authUserId, sentIds }: RetrouvaillePersonCardProps) {
  const extras = infoItems(person)
  const affinity = person.affinity

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:border-[#E7CAB0]">
      <Avatar src={person.avatar} name={person.name} size="lg" className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[#2D2D2D]">{person.name}</p>
        {extras.length > 0 && (
          <p className="mt-0.5 truncate text-[12px] text-[#65676B]">
            {extras.join(" • ")}
          </p>
        )}
        {affinity && (
          <p className="mt-0.5 truncate text-[12px] text-[#A35A2A]">
            {affinity.label}
            {affinity.reasons.length > 0 && ` (${affinity.reasons.join(", ")})`}
          </p>
        )}
      </div>

      <FraterniserButton
        targetUserId={person.id}
        authUserId={authUserId}
        alreadySent={sentIds?.has(person.id)}
        className="shrink-0"
      />
    </li>
  )
}