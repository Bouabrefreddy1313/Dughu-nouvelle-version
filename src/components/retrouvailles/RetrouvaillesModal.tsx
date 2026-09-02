"use client"

/**
 * Modal « Retrouvailles » — présentation du module, ouvert depuis la sidebar
 * gauche. Icone dédiée, sous-titre, rangée d'avatars, texte communautaire,
 * 4 avantages et bouton « Commencer » qui redirige vers /retrouvailles.
 *
 * Comportements :
 *  - n'apparaît qu'UNE SEULE FOIS : dès que le modal est affiché, la clé
 *    `RETROUVAILLES_SEEN_KEY` est posée en localStorage — les clics suivants
 *    sur « Retrouvailles » mènent directement à la page /retrouvailles ;
 *  - les avatars affichés sont de vrais profils Dughu (suggestions de l'API),
 *    chargés via le hook TanStack Query dédié.
 */

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { HandHeart, Sparkles, UsersRound, TrendingUp, Handshake } from "lucide-react"
import Avatar from "@/components/common/Avatar"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/queries/use-auth"
import { useRetrouvailles } from "@/hooks/retrouvailles/use-retrouvailles"

/** Clé localStorage indiquant que l'utilisateur a déjà vu le modal. */
export const RETROUVAILLES_SEEN_KEY = "dughu:retrouvailles-seen"

/** Nombre d'avatars affichés dans le modal. */
const AVATAR_COUNT = 5

interface RetrouvaillesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ADVANTAGES = [
  { icon: Handshake, label: "Reconnectez-vous", description: "avec vos anciens contacts" },
  { icon: UsersRound, label: "Rapprochez-vous", description: "de vos proches" },
  { icon: TrendingUp, label: "Élargissez votre réseau", description: "facilement" },
  { icon: Sparkles, label: "Gagnez des points", description: "à chaque retrouvaille" },
]

export default function RetrouvaillesModal({ open, onOpenChange }: RetrouvaillesModalProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "")

  // Suggestions réelles de l'API Dughu pour afficher de vrais profils.
  const suggestionsQuery = useRetrouvailles("suggestions", {
    userId,
    enabled: open && !!userId,
  })

  const demoUsers = useMemo(() => {
    const all = (suggestionsQuery.data?.groups ?? []).flatMap((group) => group.persons)
    return all.slice(0, AVATAR_COUNT)
  }, [suggestionsQuery.data])

  // Dès que le modal est affiché, on marque « vu » (n'apparaît qu'une fois).
  useEffect(() => {
    if (!open) return
    try {
      window.localStorage.setItem(RETROUVAILLES_SEEN_KEY, "1")
    } catch {
      // stockage indisponible (navigation privée) : on ne bloque pas l'usage.
    }
  }, [open])

  const start = () => {
    onOpenChange(false)
    router.push("/retrouvailles")
  }

  const displayUsers =
    demoUsers.length > 0
      ? demoUsers
      : Array.from({ length: AVATAR_COUNT }, (_, i) => ({
          id: `fallback-${i}`,
          name: "",
          avatar: null as string | null,
          username: null,
          cover: null,
          school: null,
          city: null,
          affinity: null,
        }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl bg-white p-0 sm:rounded-3xl">
        <div className="bg-gradient-to-br from-[#A35A2A] to-[#E08543] px-6 pt-7 pb-5 text-white">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white/15 shadow-sm">
            <HandHeart size={26} aria-hidden />
          </div>
          <DialogTitle className="text-2xl font-bold text-white">Retrouvailles</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/90">
            Retrouvez ceux qui ont marqué votre vie.
          </DialogDescription>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {displayUsers.map((user) => (
                <Avatar
                  key={user.id}
                  src={user.avatar}
                  name={user.name}
                  size="md"
                  bare
                  className="ring-2 ring-white"
                />
              ))}
            </div>
            <p className="text-[13px] font-medium text-[#65676B]">
              +12 568 personnes retrouvées sur Dughu
            </p>
          </div>

          <ul className="space-y-2.5">
            {ADVANTAGES.map(({ icon: Icon, label, description }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5EFE8] text-[#A35A2A]">
                  <Icon size={18} aria-hidden />
                </span>
                <p className="text-[14px] text-[#2D2D2D]">
                  <span className="font-semibold">{label}</span> <span className="text-[#65676B]">{description}</span>
                </p>
              </li>
            ))}
          </ul>

          <Button onClick={start} className="mt-6 h-11 w-full rounded-2xl bg-[#A35A2A] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#8a4d23]">
            Commencer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}