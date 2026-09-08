"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight, HelpCircle, Languages, LogOut, Settings2, UserCircle2, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import Avatar from "@/components/common/Avatar"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ProfileMenuProps = {
  user?: {
    name?: string | null
    username?: string | null
    avatar?: string | null
    image?: string | null
    email?: string | null
  } | null
  onLogout?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

type MenuItem = {
  label: string
  description?: string
  href?: string
  icon: React.ReactNode
  onClick?: () => void
  destructive?: boolean
}

export default function ProfileMenu({ user, onLogout, open, onOpenChange }: ProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      onOpenChange(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onOpenChange])

  const items: MenuItem[] = useMemo(
    () => [
      { label: "Mon profil", description: "Accéder à votre page Dughu", href: "/profile", icon: <UserCircle2 size={18} /> },
      { label: "Paramètres et préférences", description: "Compte, affichage et sécurité", href: "/profile/preferences", icon: <Settings2 size={18} /> },
      { label: "Confidentialité", description: "Contrôlez vos informations visibles", href: "#", icon: <Shield size={18} /> },
      { label: "Langue", description: "Changer la langue d'affichage", href: "#", icon: <Languages size={18} /> },
      { label: "Aide et assistance", description: "Trouver des réponses et du support", href: "#", icon: <HelpCircle size={18} /> },
    ],
    []
  )

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Ouvrir le menu du profil"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#1A1A1A]",
          open ? "ring-2 ring-[#A35A2A]/30 ring-offset-2 ring-offset-white dark:ring-offset-[#1A1A1A]" : "hover:opacity-95"
        )}
      >
        <Avatar
          src={user?.avatar || user?.image}
          name={user?.name}
          size="sm"
          bare
          className={cn("w-10 h-10 transition-transform duration-150", open && "scale-[0.98]")}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu du compte"
          className={cn(
            "fixed left-3 right-3 top-[64px] z-[120] origin-top rounded-[24px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#1E1E1E] shadow-[0_22px_60px_rgba(0,0,0,0.14)] dark:shadow-[0_22px_60px_rgba(0,0,0,0.5)]",
            "max-h-[calc(100vh-80px)] overflow-hidden sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-[372px] sm:max-w-[calc(100vw-24px)]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <div className="max-h-[inherit] overflow-y-auto p-2.5 sm:p-3">
            <div className="rounded-[22px] bg-[#FCF8F4] dark:bg-[#262626] border border-transparent dark:border-white/5 px-3 py-3.5 sm:px-4 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar src={user?.avatar || user?.image} name={user?.name} size="lg" bare className="w-12 h-12 sm:w-14 sm:h-14" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#262626] bg-[#34A853]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#050505] dark:text-[#F3F4F6]">{user?.name || "Utilisateur Dughu"}</p>
                  <p className="truncate text-[12px] text-[#65676B] dark:text-[#A1A1AA]">{user?.username ? `@${user.username}` : user?.email || "Compte personnel"}</p>
                </div>
              </div>

              <Link
                href="/profile"
                onClick={() => onOpenChange(false)}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#A35A2A] hover:bg-[#8f4f25] dark:bg-[#B46D1C] dark:hover:bg-[#A35A2A] px-4 py-2.5 text-[13px] font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]/35"
              >
                Voir mon profil
              </Link>
            </div>

              <Separator className="my-2 bg-black/5 dark:bg-white/10" />

            <div className="space-y-1">
              {items.map((item) => {
                const baseClass = cn(
                  "group flex w-full items-start gap-3 rounded-[18px] px-3 py-2.5 text-left outline-none transition",
                  "hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] focus-visible:bg-[#F0F2F5] dark:focus-visible:bg-[#2A2A2A] focus-visible:ring-2 focus-visible:ring-[#A35A2A]/20",
                  item.destructive && "text-[#E4405F]"
                )

                const content = (
                  <>
                    <span className={cn("mt-0.5 flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7] dark:bg-[#2A2A2A] text-[#65676B] dark:text-[#A1A1AA] transition group-hover:bg-white dark:group-hover:bg-[#333333]", item.destructive && "text-[#E4405F]")}>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-[#050505] dark:text-[#F3F4F6]">{item.label}</span>
                      {item.description && <span className="mt-0.5 block text-[11px] leading-4 text-[#65676B] dark:text-[#A1A1AA]">{item.description}</span>}
                    </span>
                    <ChevronRight size={15} className="mt-1 shrink-0 text-[#B0B3B8] dark:text-[#71717A] transition group-hover:translate-x-0.5" />
                  </>
                )

                if (item.href && item.href !== "#") {
                  return (
                    <Link key={item.label} href={item.href} onClick={() => onOpenChange(false)} className={baseClass} role="menuitem">
                      {content}
                    </Link>
                  )
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                    }}
                    className={baseClass}
                    role="menuitem"
                  >
                    {content}
                  </button>
                )
              })}
            </div>

            <Separator className="my-2 bg-black/5 dark:bg-white/10" />

            <div className="space-y-1">
              <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8E8E8E] dark:text-[#A1A1AA]">Compte</div>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  setConfirmLogoutOpen(true)
                }}
                className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left text-[#050505] dark:text-[#F3F4F6] transition hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] focus-visible:bg-[#F0F2F5] dark:focus-visible:bg-[#2A2A2A] focus-visible:ring-2 focus-visible:ring-[#A35A2A]/20"
                role="menuitem"
              >
                <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[#FFF3F4] dark:bg-[#E4405F]/15 text-[#E4405F]"><LogOut size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">Se déconnecter</span>
                  <span className="block text-[12px] text-[#65676B] dark:text-[#A1A1AA]">Fermer votre session Dughu</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de déconnexion */}
      <Dialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <DialogContent showCloseButton className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF3F4] text-[#E4405F]">
                <LogOut size={17} />
              </span>
              Se déconnecter
            </DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment vous déconnecter de Dughu ? Vous devrez vous reconnecter pour accéder à votre compte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmLogoutOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmLogoutOpen(false)
                onLogout?.()
              }}
            >
              Se déconnecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}