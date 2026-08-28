"use client"

import { useRouter } from "next/navigation"
import { Activity, ChevronRight, CircleEllipsis, Orbit, QrCode, Settings, UsersRound, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ProfileMenuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProfileMenuItem {
  title: string
  description: string
  icon: LucideIcon
  href?: string
}

const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  { title: "Paramètres", description: "Compte, confidentialité, notifications", icon: Settings },
  { title: "Mon univers", description: "Ce qui vous représente", icon: Orbit },
  { title: "Mes activités", description: "Historique de vos actions", icon: Activity },
  { title: "Code QR", description: "Partager votre profil rapidement", icon: QrCode },
  { title: "Gestion des relations", description: "Demandes de fraternisation et réseau", icon: UsersRound, href: "/profile/relations" },
  { title: "Autre", description: "Autres options", icon: CircleEllipsis },
]

export function ProfileMenuDialog({ open, onOpenChange }: ProfileMenuDialogProps) {
  const router = useRouter()

  const handleSelect = (item: ProfileMenuItem) => {
    onOpenChange(false)
    if (item.href) {
      router.push(item.href)
      return
    }
    toast.info(`${item.title} sera bientôt disponible.`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg gap-0 overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl"
        showCloseButton
      >
        <DialogHeader className="border-b border-[#E4E6EB] px-5 py-5 pr-14 sm:px-6">
          <DialogTitle className="text-xl font-bold text-[#050505]">Menu du profil</DialogTitle>
          <DialogDescription className="text-sm text-[#65676B]">
            Gérez votre compte et votre expérience Dughu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 p-3 sm:p-4">
          {PROFILE_MENU_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.title}
                type="button"
                onClick={() => handleSelect(item)}
                className="group flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#F5EFE8] active:bg-[#EDE4DA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2 sm:px-4"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F5EFE8] text-[#A35A2A] transition group-hover:bg-white">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[#050505]">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-[#65676B]">{item.description}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-[#8A8D91]" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
