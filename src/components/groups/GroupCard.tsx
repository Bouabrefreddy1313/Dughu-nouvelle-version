import Image from "next/image"
import Link from "next/link"
import { Globe, Lock, Plus, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GroupSummary {
  id: string
  name: string
  category: string
  membersCount: number
  cover?: string | null
  avatar?: string | null
  privacy?: "public" | "private"
}

interface GroupCardProps {
  group: GroupSummary
  variant?: "grid" | "suggested"
  href?: string
  onJoin?: (group: GroupSummary) => void
  joined?: boolean
}

function memberLabel(count: number) {
  return `${count} membre${count > 1 ? "s" : ""}`
}

export function GroupCard({
  group,
  variant = "grid",
  href,
  onJoin,
  joined = false,
}: GroupCardProps) {
  const content = (
    <article
      className={cn(
        "overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
        "transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)]"
      )}
    >
      <div
        className={cn(
          "relative h-30 w-full overflow-hidden bg-[#F4F1EE]",
          variant === "suggested" && "h-25"
        )}
      >
        <Image
          src={group.cover || "/images/group/default-cover.jpg"}
          alt={`Bannière du groupe ${group.name}`}
          fill
          className="object-cover"
          sizes={variant === "suggested" ? "(max-width: 767px) 100vw, 820px" : "(max-width: 767px) 100vw, 320px"}
        />
      </div>

      <div className="flex min-w-0 items-center gap-3 p-4">
        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FAD0C4] text-[#E05A3A]">
          {group.avatar ? (
            <Image
              src={group.avatar}
              alt={`Avatar du groupe ${group.name}`}
              fill
              className="object-cover"
              sizes="44px"
            />
          ) : (
            <Users size={22} aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-[#2D2D2D]">{group.name}</h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-[#65676B]">
            {group.privacy === "private" ? (
              <Lock size={12} className="shrink-0" aria-label="Groupe privé" />
            ) : group.privacy === "public" ? (
              <Globe size={12} className="shrink-0" aria-label="Groupe public" />
            ) : null}
            <p className="truncate">{group.category} · {memberLabel(group.membersCount)}</p>
          </div>
        </div>

        {variant === "suggested" && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onJoin?.(group)
            }}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#C47830] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A35A2A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3F1D] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={joined || !onJoin}
            aria-label={joined ? `Adhésion au groupe ${group.name} confirmée` : `Adhérer au groupe ${group.name}`}
          >
            {!joined && <Plus size={17} aria-hidden="true" />}
            <span>{joined ? "Adhéré" : "Adhérer"}</span>
          </button>
        )}
      </div>
    </article>
  )

  return href ? (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B3F1D]"
      aria-label={`Ouvrir le groupe ${group.name}`}
    >
      {content}
    </Link>
  ) : content
}