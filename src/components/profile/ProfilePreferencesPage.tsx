"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Database,
  Gauge,
  Info,
  KeyRound,
  LockKeyhole,
  LogOut,
  MessageSquareWarning,
  MonitorSmartphone,
  Settings,
  Share2,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { ChangePasswordPanel } from "@/components/profile/ChangePasswordPanel"
import { useAuth } from "@/hooks/queries/use-auth"
import { cn } from "@/lib/utils"

type SettingKey =
  | "complete-profile"
  | "account"
  | "internet-speed"
  | "cache-data"
  | "notifications"
  | "blocked-users"
  | "report-problem"
  | "help"
  | "about"
  | "logout"
  | "logout-all"

type SettingGroup = "Profil et compte" | "Application et données" | "Sécurité et assistance" | "Sessions"

interface SettingItem {
  key: SettingKey
  group: SettingGroup
  title: string
  summary: string
  description: string
  points: string[]
  icon: LucideIcon
  sensitive?: boolean
}

interface AccountSettingItem {
  key: string
  title: string
  description: string
  icon: LucideIcon
  destructive?: boolean
}

const SETTINGS_ITEMS: SettingItem[] = [
  {
    key: "complete-profile",
    group: "Profil et compte",
    title: "Compléter mon profil",
    summary: "Enrichissez les informations de votre profil",
    description: "Retrouvez les informations qui permettront de rendre votre profil Dughu plus complet et plus représentatif.",
    points: ["Informations personnelles", "Parcours et centres d’intérêt", "Présence et liens en ligne"],
    icon: UserRoundCheck,
  },
  {
    key: "account",
    group: "Profil et compte",
    title: "Compte",
    summary: "Gérez les informations et la sécurité du compte",
    description: "Cette rubrique accueillera les réglages généraux liés à votre identité, votre accès et la protection de votre compte.",
    points: ["Informations du compte", "Sécurité et accès", "Préférences générales"],
    icon: ShieldCheck,
  },
  {
    key: "internet-speed",
    group: "Application et données",
    title: "Vérification vitesse internet",
    summary: "Consultez les informations du test Fast.com",
    description: "Cet espace présentera les informations du test de connexion Fast.com lorsqu’il sera raccordé.",
    points: ["Débit descendant", "Débit montant", "Latence de la connexion"],
    icon: Gauge,
  },
  {
    key: "cache-data",
    group: "Application et données",
    title: "Cache et données mobiles",
    summary: "Contrôlez le stockage et l’utilisation des données",
    description: "Préparez l’utilisation de Dughu selon votre connexion et l’espace disponible sur votre appareil.",
    points: ["Utilisation du cache", "Qualité des médias", "Économie des données mobiles"],
    icon: Database,
  },
  {
    key: "notifications",
    group: "Application et données",
    title: "Notifications",
    summary: "Choisissez les alertes que vous souhaitez recevoir",
    description: "Cette rubrique regroupera les préférences de notifications liées à votre activité sur Dughu.",
    points: ["Interactions et relations", "Messages", "Actualités et recommandations"],
    icon: Bell,
  },
  {
    key: "blocked-users",
    group: "Sécurité et assistance",
    title: "Bloquer",
    summary: "Gérez les personnes et contenus bloqués",
    description: "Vous pourrez consulter et gérer les restrictions appliquées depuis votre compte.",
    points: ["Utilisateurs bloqués", "Restrictions actives", "Gestion des déblocages"],
    icon: Ban,
  },
  {
    key: "report-problem",
    group: "Sécurité et assistance",
    title: "Signaler un problème",
    summary: "Informez Dughu d’un dysfonctionnement",
    description: "Un formulaire permettra de décrire un problème rencontré et de transmettre les informations utiles au support.",
    points: ["Description du problème", "Catégorie du signalement", "Suivi de la demande"],
    icon: MessageSquareWarning,
  },
  {
    key: "help",
    group: "Sécurité et assistance",
    title: "Aide",
    summary: "Trouvez des réponses et des conseils",
    description: "Le centre d’aide rassemblera les réponses aux questions fréquentes et les guides d’utilisation de Dughu.",
    points: ["Questions fréquentes", "Guides d’utilisation", "Contacter l’assistance"],
    icon: CircleHelp,
  },
  {
    key: "about",
    group: "Sécurité et assistance",
    title: "À propos",
    summary: "Découvrez Dughu et les informations légales",
    description: "Cette rubrique présentera les informations générales sur la plateforme et ses documents de référence.",
    points: ["À propos de Dughu", "Conditions d’utilisation", "Confidentialité et licences"],
    icon: Info,
  },
  {
    key: "logout",
    group: "Sessions",
    title: "Déconnexion",
    summary: "Quittez la session utilisée sur cet appareil",
    description: "Cette action permettra de fermer uniquement la session Dughu active sur cet appareil.",
    points: ["Session actuelle", "Conservation des autres connexions", "Retour à l’écran de connexion"],
    icon: LogOut,
    sensitive: true,
  },
  {
    key: "logout-all",
    group: "Sessions",
    title: "Déconnexion de tous les comptes",
    summary: "Fermez toutes les sessions associées",
    description: "Cette action sensible permettra de fermer les sessions actives sur tous les appareils connectés au compte.",
    points: ["Toutes les sessions actives", "Tous les appareils connectés", "Nouvelle connexion requise"],
    icon: UsersRound,
    sensitive: true,
  },
]

const GROUPS: SettingGroup[] = ["Profil et compte", "Application et données", "Sécurité et assistance", "Sessions"]
const GROUP_IDS: Record<SettingGroup, string> = {
  "Profil et compte": "profile-account-settings",
  "Application et données": "application-data-settings",
  "Sécurité et assistance": "security-help-settings",
  Sessions: "session-settings",
}

const ACCOUNT_SETTINGS: AccountSettingItem[] = [
  {
    key: "change-password",
    title: "Changer le mot de passe",
    description: "Modifiez le mot de passe utilisé pour accéder à votre compte.",
    icon: KeyRound,
  },
  {
    key: "social-links",
    title: "Liens sociaux",
    description: "Gérez les réseaux et les liens associés à votre profil.",
    icon: Share2,
  },
  {
    key: "privacy-settings",
    title: "Paramètres de confidentialité",
    description: "Contrôlez la visibilité de votre compte et de vos contenus.",
    icon: LockKeyhole,
  },
  {
    key: "verification",
    title: "Vérification",
    description: "Consultez les options de vérification et de confiance du compte.",
    icon: BadgeCheck,
  },
  {
    key: "sessions",
    title: "Liste des sessions",
    description: "Consultez les appareils et les connexions liés à votre compte.",
    icon: MonitorSmartphone,
  },
  {
    key: "delete-account",
    title: "Supprimer le compte",
    description: "Préparez la suppression définitive de votre compte et de ses données.",
    icon: Trash2,
    destructive: true,
  },
]

function SettingsNavigation({ activeKey, onSelect }: { activeKey: SettingKey; onSelect: (key: SettingKey) => void }) {
  return (
    <nav aria-label="Liste des paramètres" className="space-y-5 p-3 sm:p-4">
      {GROUPS.map((group) => (
        <section key={group} aria-labelledby={GROUP_IDS[group]}>
          <h2 id={GROUP_IDS[group]} className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A8D91]">
            {group}
          </h2>
          <div className="space-y-1">
            {SETTINGS_ITEMS.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon
              const active = item.key === activeKey

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2",
                    active ? "bg-[#F5EFE8] text-[#6B3F1D]" : item.sensitive ? "text-red-600 hover:bg-red-50" : "text-[#2D2D2D] hover:bg-[#F7F8FA]"
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", active ? "bg-white text-[#A35A2A]" : item.sensitive ? "bg-red-50 text-red-600" : "bg-[#F0F2F5] text-[#65676B]")}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold leading-5">{item.title}</span>
                    <span className={cn("mt-0.5 block line-clamp-1 text-xs font-normal", active ? "text-[#8B5A2B]" : "text-[#8A8D91]")}>{item.summary}</span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 opacity-60" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </nav>
  )
}

function SpeedPreview() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Aperçu des informations de vitesse internet">
      {["Débit descendant", "Débit montant", "Latence"].map((label) => (
        <div key={label} className="rounded-xl border border-gray-200 bg-[#FAFAFA] p-4 text-center">
          <p className="text-2xl font-bold text-[#A35A2A]">—</p>
          <p className="mt-1 text-xs font-medium text-[#65676B]">{label}</p>
        </div>
      ))}
    </div>
  )
}

function AccountSettingsList({ onChangePassword }: { onChangePassword: () => void }) {
  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <h3 className="font-bold text-[#2D2D2D]">Gestion du compte</h3>
        <p className="mt-1 text-xs leading-5 text-[#8A8D91]">Sélectionnez une option pour poursuivre.</p>
      </div>
      <div className="divide-y divide-gray-100 p-2 sm:p-3">
        {ACCOUNT_SETTINGS.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => item.key === "change-password" ? onChangePassword() : toast.info(`${item.title} sera bientôt disponible.`)}
              className={cn(
                "group flex min-h-16 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:px-4",
                item.destructive
                  ? "text-red-700 hover:bg-red-50 focus-visible:ring-red-500"
                  : "text-[#2D2D2D] hover:bg-[#F7F1EB] focus-visible:ring-[#A35A2A]"
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", item.destructive ? "bg-red-50 text-red-600" : "bg-[#F5EFE8] text-[#A35A2A]")}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-semibold">{item.title}</span>
                <span className={cn("mt-1 block text-xs leading-5", item.destructive ? "text-red-600" : "text-[#65676B]")}>{item.description}</span>
              </span>
              <span className={cn("hidden shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold sm:inline-flex", item.destructive ? "bg-red-100 text-red-700" : "bg-[#F0F2F5] text-[#65676B]")}>Bientôt</span>
              <ChevronRight size={18} className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SettingDetails({ setting, onBack, passwordOpen, onPasswordOpenChange }: { setting: SettingItem; onBack: () => void; passwordOpen: boolean; onPasswordOpenChange: (open: boolean) => void }) {
  const Icon = setting.icon

  if (setting.key === "account" && passwordOpen) {
    return <ChangePasswordPanel onBack={() => onPasswordOpenChange(false)} />
  }

  return (
    <article className="min-w-0 p-4 sm:p-6 lg:p-8" aria-labelledby="setting-detail-title">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#A35A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] md:hidden">
        <ArrowLeft size={18} aria-hidden="true" /> Retour aux paramètres
      </button>

      <div className="flex min-w-0 items-start gap-4">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", setting.sensitive ? "bg-red-50 text-red-600" : "bg-[#F5EFE8] text-[#A35A2A]")}>
          <Icon size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
         
          <h2 id="setting-detail-title" className="mt-2 break-words text-xl font-bold text-[#2D2D2D] sm:text-2xl">{setting.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65676B]">{setting.description}</p>
        </div>
      </div>

      {setting.key === "account" ? (
        <AccountSettingsList onChangePassword={() => onPasswordOpenChange(true)} />
      ) : (
        <div className="mt-7 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h3 className="font-bold text-[#2D2D2D]">Ce que vous pourrez gérer</h3>
          <ul className="mt-4 space-y-3">
            {setting.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-[#4A4A4A]">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {setting.key === "internet-speed" && <div className="mt-5"><SpeedPreview /></div>}

     
    </article>
  )
}

export function ProfilePreferencesPage() {
  const router = useRouter()
  const { data: currentUser } = useAuth()
  const [selectedKey, setSelectedKey] = useState<SettingKey | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const activeSetting = SETTINGS_ITEMS.find((item) => item.key === selectedKey) ?? SETTINGS_ITEMS[0]
  const selectSetting = (key: SettingKey) => {
    setPasswordOpen(false)
    setSelectedKey(key)
  }

  return (
    <MainLayout user={currentUser} wide noRightSidebar active="profile" reserveLeftSidebar>
      <div className="min-w-0 max-w-full overflow-x-hidden pb-8">
        <header className="mb-5 flex min-w-0 items-start gap-3 px-1 sm:items-center">
          <button type="button" onClick={() => router.push("/profile")} aria-label="Retour au profil" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#65676B] shadow-sm transition-colors hover:text-[#A35A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight text-[#2D2D2D] sm:text-3xl">Paramètres</h1>
            <p className="mt-1 text-sm text-[#65676B]">Personnalisez votre expérience et gérez votre compte Dughu.</p>
          </div>
        </header>

        <div className="grid min-h-[620px] min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
          <aside className={cn("min-w-0 border-gray-200 md:block md:border-r", selectedKey ? "hidden" : "block")}>
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2 text-[#2D2D2D]"><Settings size={19} className="text-[#A35A2A]" aria-hidden="true" /><h2 className="font-bold">Tous les paramètres</h2></div>
              <p className="mt-1 text-xs text-[#8A8D91]">Sélectionnez une rubrique pour afficher son aperçu.</p>
            </div>
            <SettingsNavigation activeKey={activeSetting.key} onSelect={selectSetting} />
          </aside>

          <section className={cn("min-w-0 bg-[#FCFCFC] md:block", selectedKey ? "block" : "hidden")}>
            <SettingDetails setting={activeSetting} onBack={() => { setPasswordOpen(false); setSelectedKey(null) }} passwordOpen={passwordOpen} onPasswordOpenChange={setPasswordOpen} />
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
