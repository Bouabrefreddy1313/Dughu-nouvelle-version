"use client"

import { Pencil, Info, Mail, Phone, Cake, Users as GenderIcon, MapPin, CalendarDays } from "lucide-react"
import Card from "@/components/common/Card"

export interface ProfileInfo {
  email?: string | null
  phone?: string | null
  phoneNumber?: string | null
  gender?: string | null
  birthdate?: string | null
  joined?: string | null
  country?: { name?: string | null } | null
  registered?: string | null
}

interface ProfileAboutProps {
  user: {
    id: string
    firstName?: string | null
    lastName?: string | null
    username?: string | null
    bio?: string | null
    birthdate?: string | null
  }
  info?: ProfileInfo
  isOwn: boolean
  onEdit?: () => void
}

export function ProfileAbout({ user, info, isOwn, onEdit }: ProfileAboutProps) {
  const items: { icon: React.ReactNode; label: string; value?: string | null }[] = [
    { icon: <Mail size={16} />, label: "Email", value: info?.email },
    { icon: <Phone size={16} />, label: "Téléphone", value: info?.phoneNumber || info?.phone },
    { icon: <GenderIcon size={16} />, label: "Genre", value: info?.gender },
    {
      icon: <Cake size={16} />,
      label: "Naissance",
      value: info?.birthdate
        ? new Date(info.birthdate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
        : null,
    },
    { icon: <MapPin size={16} />, label: "Pays", value: info?.country?.name },
    {
      icon: <CalendarDays size={16} />,
      label: "Membre depuis",
      value: info?.joined
        ? new Date(info.joined).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        : info?.registered,
    },
  ].filter((i) => i.value)

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[16px] font-bold text-[#2D2D2D] flex items-center gap-2">
          <Info size={16} className="text-[#A35A2A]" />
          À propos
        </h3>
        {isOwn && onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A35A2A] hover:bg-[#A35A2A]/10 px-2.5 py-1.5 rounded-lg transition"
          >
            <Pencil size={13} />
            Modifier
          </button>
        )}
      </div>

      {/* Biographie / signature */}
      <div className="mb-3">
        <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-1">Biographie</p>
        <p className="text-[14px] text-[#4A4A4A] leading-relaxed whitespace-pre-wrap break-words">
          {user.bio || (isOwn ? "Ajoutez une biographie pour vous présenter." : "Aucune biographie.")}
        </p>
      </div>

      {/* Informations personnelles */}
      {items.length > 0 && (
        <>
          <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">
            Informations personnelles
          </p>
          <ul className="space-y-2.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px] text-[#2D2D2D]">
                <span className="text-[#65676B] shrink-0">{item.icon}</span>
                <span className="min-w-0 truncate">{item.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}