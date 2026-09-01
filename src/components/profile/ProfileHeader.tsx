"use client"

import {
  Camera,
  MapPin,
  Pencil,
  UserPlus,
  UserCheck,
  MessageCircle,
  MoreHorizontal,
  BadgeCheck,
  ShieldCheck,
  X,
  ChevronLeft,
  Loader2,
  Sparkles,
  Check,
  Users,
  Rocket,
  Lock,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"
import { fetchVerificationRequests, submitVerification } from "@/services/profile/profile.service"
import { resolveMediaUrl } from "@/lib/dughu"
import { cn } from "@/lib/utils"
import { ProfileMenuDialog } from "./ProfileMenuDialog"
import type { ProfileRelations, RelationAction, RelationType } from "@/types/relations/relation.types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
// import type { ProfileRelations, RelationType } from "@/lib/profile-relations"

export interface ProfileUser {
  id: string
  firstName?: string | null
  lastName?: string | null
  name?: string | null
  username?: string | null
  email?: string
  avatar?: string | null
  cover?: string | null
  bio?: string | null
  gender?: string | null
  countryCode?: string | null
  location?: string | null
  verified?: boolean
  online?: boolean
  dughu?: { userId?: string | number | null } | null
  dughuUserId?: string | number | null
  points?: number
}

export interface ProfileStats {
  posts: number
  followers: number
  following: number
  friends: number
}

interface ProfileHeaderProps {
  user: ProfileUser
  stats: ProfileStats
  isOwn: boolean
  isFollowing?: boolean
  relations?: ProfileRelations
  relationLoadingType?: RelationType | null
  onToggleFollow?: () => void
  onRelationAction?: (type: RelationType, action: RelationAction) => void
  onMessage?: () => void
  onEditCover?: () => void
  onEditAvatar?: () => void
  onEditProfile?: () => void
  onSubmitVerification?: (data: {
    userId: string
    name: string
    points: number
    text: string
    passportFile: File
    photoFile: File
  }) => void
  isVerifying?: boolean
}

function displayName(user: ProfileUser) {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  return user.name || user.username || "Utilisateur"
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
  return String(n)
}

// ═══════ Contenu des catégories premium ═══════
const PREMIUM_CATEGORIES = [
  {
    key: "creation",
    title: "Création & visibilité",
    icon: Sparkles,
    color: "#A35A2A",
    bg: "#F5EFE8",
    items: [
      "Outils créateurs",
      "Mise en avant",
      "Éditer une publication",
      "Publications plus longues",
      "Programmation des publications",
      "Statistiques avancées",
      "Mise en avant dans les recommandations",
      "Bibliothèque média premium",
      "Outils de modération",
    ],
  },
  {
    key: "securite",
    title: "Sécurité & confiance",
    icon: ShieldCheck,
    color: "#2563EB",
    bg: "#EBF1FE",
    items: [
      "Certification prioritaire",
      "Support — assistance prioritaire",
      "Protection renforcée du compte",
      "Signalements traités plus vite",
      "Alertes de connexion avancées",
      "Récupération de compte accélérée",
      "Double authentification renforcée",
      "Historique de sessions détaillé",
    ],
  },
  {
    key: "communaute",
    title: "Communauté & interactions",
    icon: Users,
    color: "#059669",
    bg: "#E9F7F1",
    items: [
      "Publicités réduites de moitié",
      "Boostage des réponses",
      "Radar débloqué",
      "Priorité dans les commentaires",
      "Accès à des salons exclusifs",
      "Réactions enrichies",
      "Discussions mises en avant",
      "Badges de profil exclusifs",
      "Priorité dans les messages",
      "Recommandations personnalisées",
    ],
  },
] as const

export function ProfileHeader({
  user,
  stats,
  isOwn,
  isFollowing,
  relations,
  relationLoadingType,
  onToggleFollow,
  onRelationAction,
  onMessage,
  onEditCover,
  onEditAvatar,
  onEditProfile,
  onSubmitVerification,
  isVerifying,
}: ProfileHeaderProps) {
  const [step1Open, setStep1Open] = useState(false)
  const [step2Open, setStep2Open] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [relationDialog, setRelationDialog] = useState<{
    type: RelationType
    state: "outgoing_pending" | "incoming_pending" | "accepted"
  } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [step1Data, setStep1Data] = useState<{
    name: string
    points: number
    text: string
    passportFile: File | null
    photoFile: File | null
  }>({ name: "", points: 0, text: "", passportFile: null, photoFile: null })

  const coverSrc = user.cover ? resolveMediaUrl(user.cover) : "/images/group/default-cover.jpg"
  const avatarSrc = user.avatar ? resolveMediaUrl(user.avatar) : "/images/avatar.png"
  const name = displayName(user)
  const metaLine = [user.username ? `@${user.username}` : null, user.location || user.countryCode]
    .filter(Boolean)
    .join(" · ")

  // Extraire le solde de points depuis l'utilisateur connecté
  const userPoints = user?.points ?? 0
  const progressPct = Math.min(100, Math.round((userPoints / 1000) * 100))
  const pointsMissing = Math.max(0, 1000 - userPoints)

  const handleStep1Close = () => setStep1Open(false)
  const handleStep2Close = () => setStep2Open(false)

  const handleStep1Submit = async () => {
    const { name: userName, points, text, passportFile, photoFile } = step1Data
    if (!passportFile || !photoFile) {
      toast.error("Veuillez télécharger les deux documents (passeport et photo)")
      return
    }
    setStep2Open(true)
  }

  const handleStep2Submit = async () => {
    const { name: userName, points: userPointsVal, text } = step1Data
    if (!userName.trim() || !text.trim() || !step1Data.passportFile || !step1Data.photoFile) {
      toast.error("Tous les champs sont requis")
      return
    }
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("user_id", user.id)
      formData.append("name", userName)
      formData.append("points", String(userPointsVal))
      formData.append("text", text)
      formData.append("passport", step1Data.passportFile)
      formData.append("photo", step1Data.photoFile)

      const data = await submitVerification(formData)
      if (data.success) {
        toast.success("Votre demande a été envoyée, elle est en cours de traitement")
        setStep2Open(false)
        setStep1Open(false)
        // Mise à jour de l'état utilisateur avec les données du serveur
        if (data.user) {
          const updatedUser = { ...user, ...data.user }
        }
      } else {
        toast.error(String(data.message || "Échec de la soumission"))
      }
    } catch (error) {
      console.error("VERIFICATION SUBMIT ERROR:", error)
      toast.error("Erreur réseau lors de la soumission")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* ═══════ COUVERTURE ═══════ */}
      <div className="relative h-48 sm:h-64 lg:h-80 w-full bg-gradient-to-br from-[#A35A2A] to-[#B87333]">
        <Image src={coverSrc} alt="Photo de couverture" fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw" priority />

        {isOwn && (
          <button
            onClick={onEditCover}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 bg-white/90 backdrop-blur px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#050505] hover:bg-white transition shadow-md"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Modifier la couverture</span>
            <span className="sm:hidden">Couverture</span>
          </button>
        )}

        {/* Avatar en chevauchement bas-gauche de la couverture */}
        <div className="absolute -bottom-14 sm:-bottom-[72px] left-4 sm:left-6">
          <div className="relative">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#F0F2F5] relative">
              <Image src={avatarSrc} alt={name} fill className="object-cover" sizes="(max-width: 640px) 112px, 144px" />
            </div>
            {user.online && (
              <span className="absolute bottom-1.5 right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#31A24C] border-[3px] border-white" />
            )}
            {isOwn && (
              <button
                onClick={onEditAvatar}
                aria-label="Modifier la photo de profil"
                className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:bg-[#F0F2F5] transition"
              >
                <Camera size={15} className="text-[#050505]" />
              </button>
            )}
            {!isOwn && !user.verified && (
              <div className="absolute -bottom-32 sm:-bottom-[80px] left-4 sm:left-6 flex items-center gap-2">
                <button
                  className="flex items-center gap-1 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] px-3 py-1 rounded text-[11px] font-semibold transition"
                  onClick={() => { fetchVerificationRequests(user.id).catch(() => {}) }}
                >
                  <ShieldCheck size={14} />
                  Voir demandes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ IDENTITÉ + STATS ═══════ */}
      <div className="px-4 sm:px-6 pt-16 sm:pt-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Colonne identité */}
          <div className="sm:ml-[164px] min-w-0">
            {/* Ligne 1 : nom + badge + bouton certification */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#050505] truncate">{name}</h1>
              {user.verified && <BadgeCheck size={20} className="text-[#A35A2A] shrink-0" />}

              {isOwn && !user.verified && (
                <button
                  onClick={() => setStep1Open(true)}
                  className="flex items-center gap-1.5 bg-[#1877F2] hover:bg-[#166FE5] text-white px-3 py-1 rounded-full text-[12px] font-semibold transition shrink-0 disabled:opacity-70"
                  disabled={isVerifying}
                >
                  <ShieldCheck size={14} className="text-white" />
                  {isVerifying ? (
                    <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    "Obtenir la certification"
                  )}
                </button>
              )}
            </div>

            {/* Ligne 2 : username + localisation, sous le nom */}
            {metaLine && <p className="text-[13px] text-[#65676B] mt-0.5">{metaLine}</p>}

            {/* Ligne 3 : bio, sous le username */}
            {user.bio && (
              <p className="mt-1.5 text-[14px] text-[#4A4A4A] max-w-[420px] line-clamp-2 whitespace-pre-wrap break-words">{user.bio}</p>
            )}
          </div>

          {/* Colonne stats + actions — à droite */}
          <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.posts)}</p>
                <p className="text-[12px] text-[#65676B]">Interactions</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.followers)}</p>
                <p className="text-[12px] text-[#65676B]">Abonnés</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-bold text-[15px] text-[#050505] leading-tight">{formatCount(stats.following)}</p>
                <p className="text-[12px] text-[#65676B]">Suivis</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
              {isOwn ? (
                <>
                  <button
                    onClick={onEditProfile}
                    className="flex items-center gap-2 bg-[#A35A2A] hover:bg-[#8B4A1F] text-white px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                  >
                    <UserPlus size={16} />
                    Modifier le profil
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen(true)}
                    aria-label="Plus d'options"
                    aria-haspopup="dialog"
                    aria-expanded={profileMenuOpen}
                    className="flex items-center justify-center bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] w-[38px] h-[38px] rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </>
              ) : (
                <>
                  {(["friend", "network"] as const).map((type) => {
                    const state = relations?.[type] ?? "none"
                    const loading = relationLoadingType === type
                    const label = state === "accepted"
                      ? type === "friend" ? "Fraternisé" : "Réseauté"
                      : state === "unknown"
                        ? "Vérification…"
                      : state === "incoming_pending"
                        ? type === "friend" ? "Accepter fraterniser" : "Accepter réseauter"
                        : state === "outgoing_pending"
                          ? "Demande envoyée"
                          : type === "friend" ? "Fraterniser" : "Réseauter"
                    const Icon = type === "friend" ? (state === "accepted" ? UserCheck : UserPlus) : Users

                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={state === "unknown" || loading || (!!relationLoadingType && !loading)}
                        title={state === "unknown" ? "Impossible de vérifier cette relation pour le moment" : undefined}
                        onClick={() => {
                          if (state === "none") onRelationAction?.(type, "request")
                          else if (state !== "unknown") setRelationDialog({ type, state })
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed",
                          state === "none"
                            ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white"
                            : state === "incoming_pending"
                              ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white"
                              : "bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505]"
                        )}
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                        {loading ? "Chargement…" : label}
                      </button>
                    )
                  })}
                  <button
                    onClick={onToggleFollow}
                    className={
                      isFollowing
                        ? "flex items-center gap-2 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                        : "flex items-center gap-2 bg-[#A35A2A] hover:bg-[#8B4A1F] text-white px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                    }
                  >
                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                    {isFollowing ? "Abonné" : "S'abonner"}
                  </button>
                  <button
                    onClick={onMessage}
                    className="flex items-center gap-2 bg-[#F0F2F5] hover:bg-[#E4E6EB] text-[#050505] px-4 sm:px-5 py-2 rounded-lg text-[14px] font-semibold transition"
                  >
                    <MessageCircle size={16} />
                    Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProfileMenuDialog open={profileMenuOpen} onOpenChange={setProfileMenuOpen} />

      <Dialog open={relationDialog !== null} onOpenChange={(open) => { if (!open) setRelationDialog(null) }}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-6" showCloseButton>
          {relationDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-[#050505]">
                  {relationDialog.state === "incoming_pending"
                    ? relationDialog.type === "friend" ? "Demande de fraternisation" : "Demande de réseautage"
                    : relationDialog.state === "outgoing_pending"
                      ? "Annuler la demande envoyée ?"
                      : relationDialog.type === "friend" ? "Supprimer la fraternisation ?" : "Supprimer le réseautage ?"}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#65676B]">
                  {relationDialog.state === "incoming_pending"
                    ? "Souhaitez-vous accepter ou refuser cette demande ?"
                    : relationDialog.state === "outgoing_pending"
                      ? "Cette action annulera la demande que vous avez envoyée."
                      : "Cette relation sera supprimée après votre confirmation."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-2 bg-white px-0 pb-0">
                {relationDialog.state === "incoming_pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onRelationAction?.(relationDialog.type, "decline")
                        setRelationDialog(null)
                      }}
                      className="min-h-11 rounded-lg border border-[#A35A2A] bg-transparent px-4 py-2 text-sm font-semibold text-[#A35A2A] hover:bg-[#F5EFE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2"
                    >
                      Refuser
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRelationAction?.(relationDialog.type, "accept")
                        setRelationDialog(null)
                      }}
                      className="min-h-11 rounded-lg bg-[#A35A2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8B4A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2"
                    >
                      Accepter
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setRelationDialog(null)}
                      className="min-h-11 rounded-lg bg-[#F0F2F5] px-4 py-2 text-sm font-semibold text-[#050505] hover:bg-[#E4E6EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2"
                    >
                      Conserver
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRelationAction?.(
                          relationDialog.type,
                          relationDialog.state === "outgoing_pending" ? "request" : "remove"
                        )
                        setRelationDialog(null)
                      }}
                      className="min-h-11 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      {relationDialog.state === "outgoing_pending" ? "Annuler la demande" : "Supprimer"}
                    </button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* Modal Étape 1 : Passez au statut Certifié — REDESIGN */}
      {/* ═══════════════════════════════════════════════ */}
      {step1Open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setStep1Open(false) }}
        >
          <div className="bg-white rounded-[28px] shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Header dégradé */}
            <div className="relative shrink-0 bg-gradient-to-br from-[#A35A2A] via-[#B8703F] to-[#C98A56] px-6 pt-7 pb-8 text-white overflow-hidden">
              {/* décor */}
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10" />

              <button
                onClick={() => setStep1Open(false)}
                className="absolute right-4 top-4 p-2 rounded-full bg-white/15 hover:bg-white/25 transition"
                aria-label="Fermer"
              >
                <X size={16} className="text-white" />
              </button>

              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={26} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[19px] font-bold leading-tight">Passez au statut Certifié</h3>
                  <p className="text-[13px] text-white/85 mt-0.5">Débloquez tous les avantages Premium</p>
                </div>
              </div>
            </div>

            {/* Corps scrollable */}
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {PREMIUM_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <div key={cat.key} className="rounded-2xl border border-gray-100 overflow-hidden">
                    <div
                      className="flex items-center gap-2.5 px-4 py-3"
                      style={{ backgroundColor: cat.bg }}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Icon size={16} className="text-white" />
                      </div>
                      <p className="text-[13.5px] font-bold text-[#1a1a1a]">{cat.title}</p>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 bg-white">
                      {cat.items.map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <Check size={14} className="mt-[3px] shrink-0" style={{ color: cat.color }} />
                          <span className="text-[12.5px] text-[#3F3F46] leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer collant : progression + CTA */}
            <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#050505]">
                  <Rocket size={14} className="text-[#A35A2A]" />
                  {userPoints} / 1000 points
                </span>
                {userPoints < 1000 && (
                  <span className="text-[11.5px] text-[#65676B]">
                    Il vous manque {pointsMissing} points
                  </span>
                )}
              </div>

              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#A35A2A] to-[#C98A56] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <button
                onClick={handleStep1Submit}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-full h-12 font-semibold text-[14.5px] transition-all duration-300",
                  userPoints < 1000
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white shadow-md shadow-[#A35A2A]/25"
                )}
                disabled={userPoints < 1000 || isVerifying}
              >
                {userPoints < 1000 ? (
                  <>
                    <Lock size={15} />
                    Dès 1000 points
                  </>
                ) : isVerifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Soumettre la demande
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Étape 2 : Formulaire de vérification de compte */}
      {step2Open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setStep2Open(false) }}
        >
          <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 flex items-center justify-center relative p-4 z-20">
              <button
                onClick={() => setStep2Open(false)}
                className="absolute left-4 p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Retour"
              >
                <ChevronLeft size={18} className="text-[#65676B]" />
              </button>
              <h3 className="text-[17px] font-semibold text-[#050505]">Vérification de compte</h3>
              <button
                onClick={() => setStep2Open(false)}
                className="absolute right-4 p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Fermer"
              >
                <X size={18} className="text-[#65676B]" />
              </button>
            </div>

            <div className="p-6">
              {/* Bandeau d'info */}
              <div className="bg-[#F5F0EB] rounded-2xl p-4 mb-6 border border-[#D9D1C5]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#A35A2A] flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-[#050505] leading-snug">
                      Complétez les étapes pour obtenir votre badge de vérification
                    </p>
                    <p className="text-[12px] text-[#6B6258] mt-0.5">Veuillez fournir toutes les informations demandées.</p>
                  </div>
                </div>
              </div>

              {/* Section Informations personnelles */}
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[11px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Informations personnelles</p>
                  <label className="block text-[13px] font-medium text-[#050505] mb-1">
                    Nom et Prénom(s)
                    <span className="text-[#E4405F]">*</span>
                  </label>
                  <input
                    type="text"
                    value={step1Data.name}
                    onChange={(e) => setStep1Data((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Entrez votre nom complet"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-[#050505] placeholder-[#9CA3AF] focus:border-[#A35A2A] focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Message</p>
                  <label className="block text-[13px] font-medium text-[#050505] mb-1">
                    Message
                    <span className="text-[#E4405F]">*</span>
                  </label>
                  <textarea
                    value={step1Data.text}
                    onChange={(e) => setStep1Data((prev) => ({ ...prev, text: e.target.value }))}
                    placeholder="Votre message ici..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-[#050505] placeholder-[#9CA3AF] resize-none min-h-[80px] focus:border-[#A35A2A] focus:outline-none transition"
                    required
                  ></textarea>
                </div>
              </div>

              {/* Section Télécharger des documents */}
              <div className="space-y-4">
                <p className="text-[11px] font-semibold text-[#65676B] uppercase tracking-wide mb-3">Télécharger des documents</p>
                <p className="text-[12px] text-[#6B6258] mb-3">
                  Veuillez télécharger une photo avec votre identité (passeport, cartes...) et votre photo personnelle
                  <span className="ml-2 cursor-pointer text-[#A35A2A] underline underline-offset-2" onClick={() => document.getElementById('passport-input')?.click()}>
                    (tooltip: cliquez pour sélectionner)
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Zone Passeport / CNI / Cartes */}
                  <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[#A35A2A]">
                    <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <Image
                        src="/images/cloud-upload.svg"
                        alt="Document"
                        width={24}
                        height={24}
                      />
                    </div>
                    <p className="text-[12px] text-[#6B5B5B] mb-2">Passeport / CNI / Cartes / Documents</p>
                    <input
                      type="file"
                      id="passport-input"
                      accept="image/pdf, image/jpeg, image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target?.files?.[0]
                        if (file) {
                          setStep1Data((prev) => ({ ...prev, passportFile: file }))
                        }
                      }}
                    />
                    {/* Aperçu ou nom du fichier sélectionné */}
                    {step1Data.passportFile && (
                      <div className="mt-2 text-xs text-[#6B5B5B]">
                        <span className="font-medium">{step1Data.passportFile.name}</span>
                        <button
                          type="button"
                          className="ml-2 text-[10px] text-[#A35A2A] hover:underline"
                          onClick={() => setStep1Data((prev) => ({ ...prev, passportFile: null }))}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Zone Photo personnelle */}
                  <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-[#A35A2A]">
                    <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <Image
                        src="/images/cloud-upload.svg"
                        alt="Photo"
                        width={24}
                        height={24}
                      />
                    </div>
                    <p className="text-[12px] text-[#6B5B5B] mb-2">Photo personnelle</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target?.files?.[0]
                        if (file) {
                          setStep1Data((prev) => ({ ...prev, photoFile: file }))
                        }
                      }}
                    />
                    {/* Aperçu ou nom du fichier sélectionné */}
                    {step1Data.photoFile && (
                      <div className="mt-2 text-xs text-[#6B5B5B]">
                        <span className="font-medium">{step1Data.photoFile.name}</span>
                        <button
                          type="button"
                          className="ml-2 text-[10px] text-[#A35A2A] hover:underline"
                          onClick={ () => setStep1Data((prev) => ({ ...prev, photoFile: null })) }
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton soumettre */}
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              <button
                onClick={handleStep2Submit}
                className={cn(
                  "w-full rounded-full h-12 font-semibold transition-all duration-300 disabled:opacity-100 disabled:pointer-events-none",
                  step1Data.name.trim() && step1Data.text.trim() && step1Data.passportFile && step1Data.photoFile
                    ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white shadow-md shadow-[#A35A2A]/25"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
                disabled={!(
                  step1Data.name?.trim() &&
                  step1Data.text?.trim() &&
                  step1Data.passportFile &&
                  step1Data.photoFile
                )}
              >
                {isProcessing || isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours...
                  </span>
                ) : (
                  "Soumettre la demande"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
