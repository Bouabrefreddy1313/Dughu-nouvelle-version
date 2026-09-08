"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Home, MessageCircle, Users, Heart, Image as ImageIcon, Bookmark,
  Zap, Globe, X,
  BarChart3, ShieldAlert, Gift, UserPlus,
  Videotape,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Card from "@/components/common/Card"
import Badge from "@/components/common/Badge"
import RetrouvaillesModal, { RETROUVAILLES_SEEN_KEY } from "@/components/retrouvailles/RetrouvaillesModal"
import { useState } from "react"

interface LeftSidebarProps {
  user?: any
  active?: string
  filter?: "all" | "following"
  onFilterChange?: (f: "all" | "following") => void
  mobile?: boolean
  onCloseMobile?: () => void
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: string | number
  onClick?: () => void
  iconBg?: string
  iconColor?: string
}

function SidebarItem({ icon, label, active, badge, onClick, iconBg, iconColor }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-2xl cursor-pointer transition-all duration-200 select-none text-left px-3 py-2.5",
        active ? "bg-[#A35A2A]/8 dark:bg-[#B46D1C]/20 text-[#2D2D2D] dark:text-[#F3F4F6]" : "hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] text-[#4A4A4A] dark:text-[#D1D5DB]"
      )}
    >
      <span className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        iconBg || "bg-[#F0F2F5] dark:bg-[#2A2A2A]"
      )}>
        <span className={cn("flex items-center justify-center", iconColor || "text-[#65676B] dark:text-[#A1A1AA]")}>
          {icon}
        </span>
      </span>
      <span className={cn(
        "font-medium flex-1 truncate text-[15px]",
        active ? "text-[#2D2D2D] dark:text-[#F3F4F6] font-semibold" : "text-[#4A4A4A] dark:text-[#D1D5DB]"
      )}>
        {label}
      </span>
      {badge && <Badge variant="red">{badge}</Badge>}
    </button>
  )
}

export default function LeftSidebar({
  user,
  active = "feed",
  mobile,
  onCloseMobile,
}: LeftSidebarProps) {
  const router = useRouter()
  const [retrouvaillesOpen, setRetrouvaillesOpen] = useState(false)

  const openRetrouvailles = () => {
    onCloseMobile?.()
    // Si l'utilisateur a déjà vu le modal de présentation, on l'envoie
    // directement sur la page /retrouvailles (le modal n'apparaît qu'une fois).
    let seen = false
    try {
      seen = window.localStorage.getItem(RETROUVAILLES_SEEN_KEY) === "1"
    } catch {
      seen = false
    }
    if (seen) {
      router.push("/retrouvailles")
    } else {
      setRetrouvaillesOpen(true)
    }
  }

  return (
    <aside className={cn(
      "flex flex-col overflow-y-auto scrollbar-hide z-30",
      "w-full h-full bg-[#f7f8fa] dark:bg-[#121212] py-4 px-3",
      mobile && "bg-white dark:bg-[#1E1E1E] shadow-2xl"
    )}>
      {mobile && (
        <div className="flex items-center justify-between mb-3 px-2">
          <p className="font-bold text-lg text-[#2D2D2D] dark:text-[#F3F4F6]">Menu</p>
          <button
            onClick={onCloseMobile}
            className="w-9 h-9 rounded-full bg-[#F0F2F5] dark:bg-[#2A2A2A] flex items-center justify-center text-[#65676B] dark:text-[#A1A1AA] hover:bg-[#E4E6EB] dark:hover:bg-[#333333]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ═══════════════════ PREMIER PANNEAU ═══════════════════ */}
      <Card className="p-2 rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
        <nav className="space-y-0.5">
          <SidebarItem
            icon={<Globe size={20} />}
            label="Fil d'actualité"
            active={active === "feed"}
            iconBg="bg-[#A35A2A]"
            iconColor="text-white"
            onClick={() => {
              router.push("/home")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<MessageCircle size={20} />}
            label="Messages"
            active={active === "messages"}
            iconBg="bg-[#1877F2]"
            iconColor="text-white"
            onClick={() => {
              router.push("/messages")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Users size={20} />}
            label="Retrouvailles"
            badge="NEW"
            active={active === "retrouvailles"}
            iconBg="bg-[#F5A33B]"
            iconColor="text-white"
            onClick={openRetrouvailles}
          />

          <SidebarItem
            icon={<Gift size={20} />}
            label="Points et badges"
            badge="NEW"
            active={active === "points"}
            iconBg="bg-[#E4405F]"
            iconColor="text-white"
            onClick={() => {
              router.push("/points")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<ImageIcon size={20} />}
            label="Album"
            active={active === "album"}
            iconBg="bg-[#8B5CF6]"
            iconColor="text-white"
            onClick={() => {
              router.push("/album")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Bookmark size={20} />}
            label="Mes sauvegardes"
            active={active === "saves"}
            iconBg="bg-[#06B6D4]"
            iconColor="text-white"
            onClick={() => {
              router.push("/sauvegardes")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<UserPlus size={20} />}
            label="Affiliation"
            active={active === "affiliation"}
            iconBg="bg-[#42B72A]"
            iconColor="text-white"
            onClick={() => {
              router.push("/affiliation")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<BarChart3 size={20} />}
            label="Tendances"
            active={active === "tendances"}
            iconBg="bg-[#F5C33B]"
            iconColor="text-[#5C3D00]"
            onClick={() => {
              router.push("/tendances")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<ShieldAlert size={20} />}
            label="Stop aux arnaques"
            active={active === "scam"}
            iconBg="bg-[#FF4444]"
            iconColor="text-white"
            onClick={() => {
              router.push("/stop-arnaques")
              onCloseMobile?.()
            }}
          />
        </nav>
      </Card>

      {/* ═══════════════════ DEUXIÈME PANNEAU ═══════════════════ */}
      <Card className="p-2 mt-4 rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
        <nav className="space-y-0.5">
          <SidebarItem
            icon={<Image src="/images/ia.png" alt="Satrivium IA" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Satrivium IA"
            iconBg="bg-transparent"
          />

          <SidebarItem
            icon={<Image src="/images/poke.png" alt="Pokes" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Pokes"
            active={active === "pokes"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/pokes")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/groupe.png" alt="Groupes" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Groupes"
            active={active === "groups"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/groups")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/page.png" alt="Espaces" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Espaces"
            active={active === "espaces"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/espaces")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/canal.png" alt="Canal" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Canal"
            active={active === "canal"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/canal")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/akp.png" alt="Akwaplay" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Akwaplay"
            active={active === "akwaplay"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/akwaplay")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/notif.png" alt="Événements" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Événements"
            active={active === "events"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/events")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/capsule.png" alt="Capsule" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Capsule"
            active={active === "capsules"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/capsules")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/finance.png" alt="Finance" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Finance"
            active={active === "finance"}
            iconBg="bg-transparent"
            onClick={() => {
              router.push("/finance")
              onCloseMobile?.()
            }}
          />

          <SidebarItem
            icon={<Image src="/images/icon-dealtoo.png" alt="Dealtoo" width={28} height={28} className="w-7 h-7 object-contain" />}
            label="Dealtoo"
            iconBg="bg-transparent"
            onClick={() => {
              window.open("https://dealtoo.co/", "_blank", "noopener,noreferrer")
              onCloseMobile?.()
            }}
          />
        </nav>
      </Card>

      {/* Modal de présentation du module Retrouvailles */}
      <RetrouvaillesModal open={retrouvaillesOpen} onOpenChange={setRetrouvaillesOpen} />
    </aside>
  )
}
