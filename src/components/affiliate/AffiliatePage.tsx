"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Copy,
  Check,
  Share2,
  Users,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Gift,
  Sparkles,
  UserCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import Card from "@/components/common/Card"
import Avatar from "@/components/common/Avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  useAffiliateInfo,
  useAffiliateUsers,
} from "@/hooks/queries/use-affiliate"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AffiliatePage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [copied, setCopied] = useState(false)

  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || "")

  const {
    data: affiliateInfoData,
    isLoading: isInfoLoading,
    isError: isInfoError,
    refetch: refetchInfo,
  } = useAffiliateInfo({ userId, enabled: !!userId })

  const {
    data: affiliateUsersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useAffiliateUsers({ userId, page: currentPage, enabled: !!userId })

  const details = affiliateInfoData?.details
  const shareLink = details?.shareLink || ""
  const users = affiliateUsersData?.users || []
  const pagination = affiliateUsersData?.pagination

  // Nom de l'utilisateur affiché dans l'en-tête
  const displayName =
    details?.name ||
    rawUser?.name ||
    (rawUser?.first_name ? `${rawUser.first_name} ${rawUser.last_name || ""}`.trim() : "") ||
    "Utilisateur"

  const displayAvatar =
    details?.avatar ||
    rawUser?.avatar ||
    rawUser?.image ||
    "/images/avatar.png"

  // Copier le lien
  const handleCopyLink = async () => {
    if (!shareLink) {
      toast.error("Lien de promotion indisponible pour le moment.")
      return
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareLink)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = shareLink
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      toast.success("Lien copié dans le presse-papiers !")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Impossible de copier le lien.")
    }
  }

  // URLs de partage sur les réseaux sociaux
  const encodedUrl = encodeURIComponent(shareLink)
  const shareText = encodeURIComponent(
    "Rejoignez-moi sur Dughu, la plateforme sociale nouvelle génération ! Inscrivez-vous via mon lien :"
  )

  const socialShares = [
    {
      name: "Facebook",
      bgColor: "bg-[#1877F2]",
      hoverColor: "hover:bg-[#166fe5]",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      bgColor: "bg-[#000000]",
      hoverColor: "hover:bg-[#1a1a1a]",
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`,
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      bgColor: "bg-[#25D366]",
      hoverColor: "hover:bg-[#20bd5a]",
      url: `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.031 2c-5.508 0-9.984 4.477-9.984 9.984 0 1.761.459 3.477 1.332 4.988L2 22l5.178-1.355c1.465.797 3.117 1.223 4.853 1.223 5.508 0 9.984-4.477 9.984-9.984 0-5.507-4.476-9.984-9.984-9.984zm0 18.277c-1.504 0-2.977-.406-4.266-1.176l-.305-.18-3.168.832.844-3.086-.199-.316c-.848-1.348-1.297-2.91-1.297-4.516 0-4.57 3.723-8.293 8.391-8.293 4.57 0 8.293 3.723 8.293 8.293 0 4.57-3.723 8.446-8.558 8.446zm4.688-6.199c-.258-.129-1.523-.75-1.758-.836-.234-.086-.406-.129-.578.129-.172.258-.668.836-.82 1.012-.152.172-.305.195-.562.066-.258-.129-1.086-.4-2.066-1.277-.766-.684-1.285-1.531-1.438-1.789-.152-.258-.016-.398.113-.527.117-.117.258-.305.387-.457.129-.152.172-.258.258-.43.086-.172.043-.324-.023-.453-.066-.129-.578-1.391-.793-1.906-.211-.5-.426-.434-.578-.441l-.492-.012c-.172 0-.453.066-.691.324-.238.258-.918.898-.918 2.191 0 1.293.941 2.543 1.074 2.719.129.172 1.852 2.828 4.488 3.965.629.27 1.117.434 1.5.555.633.203 1.211.172 1.668.105.508-.078 1.523-.625 1.738-1.227.215-.602.215-1.121.152-1.227-.066-.105-.238-.172-.496-.297z" />
        </svg>
      ),
    },
    {
      name: "Pinterest",
      bgColor: "bg-[#E60023]",
      hoverColor: "hover:bg-[#cc001f]",
      url: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${shareText}`,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      bgColor: "bg-[#0A66C2]",
      hoverColor: "hover:bg-[#095196]",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
  ]

  const openShareWindow = (url: string) => {
    if (!shareLink) {
      toast.error("Lien de parrainage non disponible.")
      return
    }
    window.open(url, "_blank", "width=600,height=500,location=no,menubar=no,toolbar=no")
  }

  return (
    <MainLayout user={rawUser} active="affiliation">
      <div className="mx-auto w-full max-w-2xl px-2 sm:px-0 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* 1. En-tête : Photo de profil + Nom + Lien de promotion */}
        <Card className="p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100/80 bg-white">
          <div className="flex items-center gap-3.5">
            <Avatar
              src={displayAvatar}
              name={displayName}
              size="lg"
              className="ring-2 ring-[#F5C33B]/20 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#1C1E21] truncate">
                {displayName}
              </h1>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#65676B]">
                <Share2 size={14} className="text-[#A35A2A]" />
                <span>Lien de promotion</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Bloc principal (fond jaune doré éclatant) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F5C33B] via-[#F3BC2B] to-[#E5AC18] text-[#332200] p-5 sm:p-7 shadow-md border border-[#E5AC18]/50">
          {/* Motifs géométriques subtils en arrière-plan */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/15 pointer-events-none blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-black/5 pointer-events-none blur-lg" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex-1 w-full space-y-3.5 text-center md:text-left">
              {/* Badge d'opportunité */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-[#4A3200]">
                <Sparkles size={13} className="text-[#4A3200]" />
                <span>Programme de parrainage</span>
              </div>

              {/* Texte d'accroche */}
              <h2 className="text-xl sm:text-2xl md:text-[26px] font-extrabold leading-snug tracking-tight text-[#2B1B00]">
                Gagnez 100 Points pour chaque utilisateur que vous nous référez !
              </h2>

              {/* Label + Champ de lien avec bouton copier */}
              <div className="pt-2 space-y-1.5">
                <label className="block text-xs sm:text-sm font-bold text-[#453000]">
                  Votre lien de promo est
                </label>
                <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-[#D99E10]/40 transition-all focus-within:ring-2 focus-within:ring-[#A35A2A]">
                  <input
                    type="text"
                    readOnly
                    value={isInfoLoading ? "Chargement de votre lien..." : shareLink || "Lien indisponible"}
                    className="flex-1 min-w-0 bg-transparent px-3 py-2 text-xs sm:text-sm text-[#1C1E21] font-medium outline-none select-all truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={isInfoLoading || !shareLink}
                    className={cn(
                      "px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer",
                      copied
                        ? "bg-[#25D366] text-white hover:bg-[#20bd5a]"
                        : "bg-[#2D2D2D] hover:bg-[#1C1E21] text-white"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copier</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Illustration Mégaphone / Parrainage à droite */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white/20 backdrop-blur-xs border border-white/40 flex items-center justify-center shadow-inner group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#985810] to-[#C47830] flex items-center justify-center text-white shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                  <Megaphone className="w-10 h-10 sm:w-12 sm:h-12 -rotate-12 animate-pulse" />
                </div>
                <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-xl bg-white text-[#985810] font-black text-xs shadow-md border border-[#F5C33B]/40 flex items-center gap-1">
                  <Gift size={13} className="text-[#985810]" />
                  <span>+100 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Bloc "Partager sur" */}
        <Card className="p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm font-bold text-[#1C1E21] flex items-center gap-2">
              <Share2 size={16} className="text-[#65676B]" />
              <span>Partager sur :</span>
            </span>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {socialShares.map((social) => (
                <button
                  key={social.name}
                  type="button"
                  onClick={() => openShareWindow(social.url)}
                  title={`Partager sur ${social.name}`}
                  aria-label={`Partager sur ${social.name}`}
                  className={cn(
                    "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white shadow-xs transition-all hover:scale-110 active:scale-95 cursor-pointer",
                    social.bgColor,
                    social.hoverColor
                  )}
                >
                  {social.icon}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* 4. Section "Utilisateurs inscrits via votre lien" */}
        <Card className="p-4 sm:p-6 rounded-2xl shadow-xs border border-gray-100 bg-white">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F5EFE8] text-[#985810] flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1C1E21]">
                  Utilisateurs inscrits via votre lien
                </h3>
                {pagination && pagination.total > 0 && (
                  <p className="text-xs text-[#65676B]">
                    {pagination.total} utilisateur{pagination.total > 1 ? "s" : ""} référé{pagination.total > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* États d'affichage de la liste */}
          <div className="pt-4">
            {isUsersLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#985810]" />
                <p className="text-sm text-[#65676B]">Chargement des utilisateurs inscrits...</p>
              </div>
            ) : isUsersError ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Impossible de charger les utilisateurs
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Une erreur est survenue lors de la récupération des données.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchUsers()}
                  className="rounded-xl mt-2"
                >
                  Réessayer
                </Button>
              </div>
            ) : users.length === 0 ? (
              /* État vide : Icône + Texte + Sous-texte */
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#65676B]">
                  <Users size={30} className="stroke-[1.5]" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-base font-bold text-[#1C1E21]">
                    Aucun utilisateur inscrit pour le moment
                  </h4>
                  <p className="text-sm text-[#65676B]">
                    Partagez votre lien pour commencer à gagner des points.
                  </p>
                </div>
                <Button
                  onClick={handleCopyLink}
                  className="mt-3 rounded-xl bg-[#985810] hover:bg-[#7d480d] text-white font-semibold text-xs px-4 py-2"
                >
                  Copier mon lien de promo
                </Button>
              </div>
            ) : (
              /* Liste des utilisateurs inscrits */
              <div className="space-y-3">
                <div className="divide-y divide-gray-50">
                  {users.map((affiliateUser) => (
                    <div
                      key={affiliateUser.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 rounded-xl px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={affiliateUser.avatar}
                          name={affiliateUser.name}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1C1E21] truncate">
                            {affiliateUser.name}
                          </p>
                          {affiliateUser.username && (
                            <p className="text-xs text-[#65676B] truncate">
                              @{affiliateUser.username}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {affiliateUser.registeredDate ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#65676B]">
                            <UserCheck size={14} className="text-[#42B72A]" />
                            <span>Inscrit le {affiliateUser.registeredDate}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#42B72A]/10 text-[#42B72A]">
                            Inscrit
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.lastPage > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm">
                    <span className="text-xs text-[#65676B]">
                      Page {pagination.currentPage} sur {pagination.lastPage}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || isUsersLoading}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="rounded-xl flex items-center gap-1 text-xs"
                      >
                        <ChevronLeft size={14} />
                        <span>Précédent</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= pagination.lastPage || isUsersLoading}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="rounded-xl flex items-center gap-1 text-xs"
                      >
                        <span>Suivant</span>
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
