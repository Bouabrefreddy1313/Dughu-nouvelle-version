"use client"

/**
 * Page détail d'un espace — bandeau, actions (like optimiste, boost,
 * modifier, supprimer avec mot de passe, vérification) et onglets internes.
 *
 * Layout : sidebar gauche (infos de l'espace, inspirée de la page profil)
 * + contenu principal (onglets). L'onglet « Actualité » a été retiré du
 * détail : les publications des espaces sont accessibles depuis l'onglet
 * « Actualité » de la page `/espaces`.
 */

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Coins,
  Globe,
  Heart,
  Images,
  Info,
  LayoutGrid,
  LineChart,
  MapPin,
  Newspaper,
  Pencil,
  Phone,
  Rocket,
  Shield,
  Tag,
  Trash2,
  Users,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import Card from "@/components/common/Card"
import { useAuth } from "@/hooks/auth/use-auth"
import { useLikePage, usePageDetail, usePageImages, usePagePosts, useRemoveVerification, useRequestVerification } from "@/hooks/pages/use-pages"
import TabNavigation, { type TabItem } from "@/components/points/TabNavigation"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/helpers"
import DeleteSpaceModal from "./DeleteSpaceModal"
import BoostSpaceModal from "./BoostSpaceModal"
import AvatarCoverUploader from "./AvatarCoverUploader"
import AdminsPanel from "./AdminsPanel"
import OffersPanel from "./OffersPanel"
import AboutPanel from "./AboutPanel"
import { InvitePanel, StatsPanel } from "./InviteAndStatsPanels"
import { PageEmpty, PageError, PageSkeleton } from "./PageStates"

import { createPost } from "@/services/posts/posts.service"
import { userMessage } from "@/lib/api/api-error"

const PostComposer = dynamic(
  () => import("@/components/composer/PostComposer").then((mod) => ({ default: mod.PostComposer })),
  { ssr: false }
)

const PostCard = dynamic(
  () => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })),
  {
    loading: () => (
      <div className="mb-4 animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex gap-3">
          <div className="size-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-3 w-1/4 rounded bg-gray-200" />
          </div>
        </div>
        <div className="h-32 rounded-2xl bg-gray-200" />
      </div>
    ),
  }
)

type DetailTab = "posts" | "about" | "gallery" | "offers" | "admins" | "stats" | "invite"

const TABS: TabItem<DetailTab>[] = [
  { key: "posts", label: "Posts", icon: Newspaper },
  { key: "about", label: "À propos", icon: Info },
  { key: "gallery", label: "Galerie", icon: Images },
  { key: "offers", label: "Offres", icon: LayoutGrid },
  { key: "admins", label: "Admins", icon: Users },
  { key: "stats", label: "Stats", icon: LineChart },
  { key: "invite", label: "Inviter", icon: Shield },
]

export default function SpaceDetailPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const pageId = String(params?.id || "")

  const { data: rawUser } = useAuth()
  const dughuUserId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || rawUser?.id || "") || undefined

  const detailQuery = usePageDetail(pageId, dughuUserId)
  const imagesQuery = usePageImages(pageId)
  const postsQuery = usePagePosts(pageId)
  const likeMutation = useLikePage(pageId)
  const requestVerifyMutation = useRequestVerification(pageId)
  const removeVerifyMutation = useRemoveVerification(pageId)

  const [tab, setTab] = useState<DetailTab>("posts")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [boostOpen, setBoostOpen] = useState(false)

  const page = detailQuery.data?.page
  const isAdmin = !!page?.isAdmin

  // Les onglets de gestion ne concernent que les administrateurs de l'espace.
  const tabs = isAdmin ? TABS : TABS.filter((item) => !["admins", "stats", "invite"].includes(item.key))

  const handleCreatePost = async (data: {
    content: string
    color?: any
    images?: File[]
    videos?: File[]
    audios?: File[]
    privacy?: number
  }) => {
    const formData = new FormData()
    formData.append("content", data.content)
    formData.append("userId", String(rawUser?.id || ""))
    formData.append("dughuUserId", String(rawUser?.dughu?.userId || dughuUserId || ""))
    formData.append("page_id", String(pageId))
    formData.append("pageId", String(pageId))

    if (data.privacy != null) formData.append("privacy", String(data.privacy))
    if (data.color) {
      formData.append("color", JSON.stringify(data.color))
      if (data.color.id != null) formData.append("color_id", String(data.color.id))
      if (data.color.color_1) formData.append("color_1", data.color.color_1)
      if (data.color.color_2) formData.append("color_2", data.color.color_2)
      if (data.color.text) formData.append("text_color", data.color.text)
    }
    if (data.images) data.images.forEach((img) => formData.append("images", img))
    if (data.videos) data.videos.forEach((vid) => formData.append("videos", vid))
    if (data.audios) data.audios.forEach((aud) => formData.append("audios", aud))

    try {
      const res = await createPost(formData)
      if (res?.success) {
        toast.success("Publication créée avec succès !")
        void postsQuery.refetch()
      } else {
        toast.error(res?.message || "Impossible de publier.")
      }
    } catch (error) {
      toast.error(userMessage(error, "Erreur lors de la publication."))
    }
  }

  const handleLike = async () => {
    try {
      const result = await likeMutation.mutateAsync()
      if (result.success === false && result.isLike === undefined) {
        toast.error(result.message || "Impossible de liker cet espace.")
      } else {
        const isNowLiked = result.isLike !== undefined ? result.isLike : !page?.isLiked
        toast.success(isNowLiked ? "Espace aimé ! ❤️" : "Like retiré.")
      }
    } catch {
      toast.error("Impossible de liker cet espace.")
    }
  }

  const handleVerify = async (remove: boolean) => {
    try {
      const result = remove ? await removeVerifyMutation.mutateAsync() : await requestVerifyMutation.mutateAsync()
      if (result.success === false) toast.error(result.message || (remove ? "Impossible de retirer la vérification." : "Impossible de demander la vérification."))
      else toast.success(remove ? "Vérification retirée." : "Demande de vérification envoyée !")
    } catch {
      toast.error(remove ? "Impossible de retirer la vérification." : "Impossible de demander la vérification.")
    }
  }

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="espaces" reserveLeftSidebar>
      <div className="mx-auto w-full px-2 pb-8 pt-2 sm:px-4 sm:pt-4">
        {detailQuery.isLoading || !page ? (
          <PageSkeleton rows={4} />
        ) : detailQuery.error ? (
          <PageError message={detailQuery.error instanceof Error && detailQuery.error.message ? detailQuery.error.message : "Impossible de charger l'espace."} onRetry={() => void detailQuery.refetch()} />
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="relative h-44 w-full bg-gradient-to-br from-[#6B3F1D] to-[#8B5A2B] sm:h-56">
                {page.cover && !page.cover.startsWith("/images/avatar") && (
                  <Image src={page.cover} alt="" fill sizes="768px" className="object-cover" unoptimized={page.cover.startsWith("http")} />
                )}

                {isAdmin ? (
                  <AvatarCoverUploader pageId={page.pageId} currentAvatar={page.avatar} currentCover={page.cover} />
                ) : (
                  /* Avatar visible en lecture seule pour les visiteurs */
                  <span className="absolute -bottom-4 left-4 z-10">
                    <span className="relative block size-20 overflow-hidden rounded-2xl border-4 border-white bg-[#F0F2F5] shadow-md">
                      <Image
                        src={page.avatar || "/images/avatar.png"}
                        alt={page.pageTitle || page.pageName || "Avatar"}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized={page.avatar?.startsWith("http")}
                      />
                    </span>
                  </span>
                )}
              </div>

              <div className="bg-white px-4 pb-4 pt-14">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="flex items-center gap-1.5 truncate text-xl font-extrabold tracking-tight text-[#2D2D2D] sm:text-2xl">
                      {page.pageTitle || page.pageName}
                      {page.verified && <BadgeCheck size={20} className="shrink-0 text-[#06B6D4]" aria-label="Espace vérifié" />}
                    </h1>
                    <p className="mt-0.5 truncate text-sm text-[#65676B]">@{page.pageName} · {page.categoryName || "Espace Dughu"}</p>
                    {page.pageDescription && <p className="mt-2 text-sm leading-relaxed text-[#2D2D2D]">{page.pageDescription}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleLike()}
                      disabled={likeMutation.isPending}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A35A2A] disabled:opacity-60",
                        page.isLiked ? "bg-[#F5EFE8] text-[#A35A2A]" : "bg-[#A35A2A] text-white hover:bg-[#8B4A1F]"
                      )}
                    >
                      <Heart size={16} aria-hidden className={page.isLiked ? "fill-current" : ""} />
                      {page.isLiked ? "Aimé" : "Aimer"} ({page.likeCount})
                    </button>
                    {isAdmin && (
                      <>
                        <button type="button" onClick={() => setBoostOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-[#A35A2A]/40 bg-white px-4 py-2 text-sm font-semibold text-[#A35A2A] transition hover:bg-[#F5EFE8]">
                          <Rocket size={16} aria-hidden /> Booster
                        </button>
                        <button type="button" onClick={() => router.push(`/espaces/${page.pageId}/edit`)} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#65676B] transition hover:bg-gray-50">
                          <Pencil size={15} aria-hidden /> Modifier
                        </button>
                        <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                          <Trash2 size={15} aria-hidden /> Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8A8D91]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F2F5] px-2.5 py-1 font-medium text-[#2D2D2D]">
                    <Heart size={12} aria-hidden /> {page.likeCount} {page.likeCount > 1 ? "likes" : "like"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F2F5] px-2.5 py-1 font-medium text-[#2D2D2D]">
                    <BookOpen size={12} aria-hidden /> {page.nbrPost} posts
                  </span>
                  {page.boosted && <span className="rounded-full bg-[#06B6D4]/10 px-2.5 py-1 font-semibold text-[#0E7490]">🚀 Boosté</span>}
                  <span className="ml-auto">{page.createdAt ? `Créé ${timeAgo(page.createdAt)}` : ""}</span>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    <button type="button" onClick={() => void handleVerify(false)} className="rounded-full bg-[#06B6D4]/10 px-3 py-1.5 text-xs font-semibold text-[#0E7490] transition hover:bg-[#06B6D4]/20">
                      Demander la vérification
                    </button>
                    <button type="button" onClick={() => void handleVerify(true)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#65676B] transition hover:bg-gray-50">
                      Retirer la vérification
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Layout deux colonnes : sidebar info (gauche) + onglets (principale) */}
            <div className="mt-6 flex flex-col md:flex-row gap-6 items-start">
              {/* Sidebar info de l'espace — inspirée de la page profil (ProfileAbout) */}
              <aside className="w-full md:w-[280px] lg:w-[320px] shrink-0 space-y-4" role="complementary" aria-label="Informations de l'espace">
                {/* Carte À propos / Coordonnées (comme ProfileAbout sur la page profil) */}
                <Card className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
                    <h3 className="text-[16px] font-bold text-[#2D2D2D] flex items-center gap-2">
                      <Info size={18} className="text-[#A35A2A]" />
                      À propos
                    </h3>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => router.push(`/espaces/${page.pageId}/edit`)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A35A2A] hover:bg-[#A35A2A]/10 px-2.5 py-1.5 rounded-lg transition"
                      >
                        <Pencil size={13} aria-hidden />
                        Modifier
                      </button>
                    )}
                  </div>

                  {/* Description de l'espace */}
                  {page.pageDescription && (
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8D91] mb-1">Description</p>
                      <p className="text-[13px] text-[#4A4A4A] leading-relaxed whitespace-pre-wrap break-words">
                        {page.pageDescription}
                      </p>
                    </div>
                  )}

                  {/* Informations et coordonnées avec icônes */}
                  <div className="space-y-3 pt-1">
                    {page.categoryName && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <Tag size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Catégorie</p>
                          <p className="font-medium text-[#2D2D2D]">{page.categoryName}</p>
                        </div>
                      </div>
                    )}

                    {page.website && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <Globe size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Site web</p>
                          <a
                            href={page.website.startsWith("http") ? page.website : `https://${page.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate font-medium text-[#A35A2A] hover:underline"
                          >
                            {page.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      </div>
                    )}

                    {page.phone && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <Phone size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Téléphone</p>
                          <a href={`tel:${page.phone}`} className="font-medium text-[#2D2D2D] hover:text-[#A35A2A]">
                            {page.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {page.address && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Adresse</p>
                          <p className="font-medium text-[#2D2D2D]">{page.address}</p>
                        </div>
                      </div>
                    )}

                    {page.company && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <Building2 size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Entreprise</p>
                          <p className="font-medium text-[#2D2D2D]">{page.company}</p>
                        </div>
                      </div>
                    )}

                    {(page.registered || page.createdAt) && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Créé depuis</p>
                          <p className="font-medium text-[#2D2D2D]">
                            {page.registered || (page.createdAt ? timeAgo(page.createdAt) : "—")}
                          </p>
                        </div>
                      </div>
                    )}

                    {page.pointsRecipient && (
                      <div className="flex items-start gap-2.5 text-[13px]">
                        <Coins size={16} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#8A8D91]">Destinataire des points</p>
                          <p className="font-medium text-[#2D2D2D]">
                            {page.pointsRecipient === "subscriber"
                              ? "Abonnés"
                              : page.pointsRecipient === "owner"
                              ? "Propriétaire"
                              : page.pointsRecipient}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Réseaux sociaux sous forme de badges */}
                  {(page.facebook || page.instagram || page.twitter || page.linkedin || page.youtube || page.vk) && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8D91] mb-2">Réseaux sociaux</p>
                      <div className="flex flex-wrap gap-1.5">
                        {page.facebook && (
                          <a href={page.facebook} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#A35A2A] hover:text-white">
                            Facebook
                          </a>
                        )}
                        {page.instagram && (
                          <a href={page.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#A35A2A] hover:text-white">
                            Instagram
                          </a>
                        )}
                        {page.twitter && (
                          <a href={page.twitter} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#A35A2A] hover:text-white">
                            Twitter
                          </a>
                        )}
                        {page.linkedin && (
                          <a href={page.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#A35A2A] hover:text-white">
                            LinkedIn
                          </a>
                        )}
                        {page.youtube && (
                          <a href={page.youtube} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#A35A2A] hover:text-white">
                            YouTube
                          </a>
                        )}
                        {page.vk && (
                          <a href={page.vk} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#F0F2F5] px-3 py-1 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#A35A2A] hover:text-white">
                            VK
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Stats rapides */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#8A8D91]">Statistiques</h3>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center"><span className="text-[#65676B]">Catégorie</span><span className="text-[#2D2D2D] font-semibold">{page.categoryName || "—"}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#65676B]">Publications</span><span className="text-[#2D2D2D] font-semibold">{page.nbrPost}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#65676B]">Likes</span><span className="text-[#2D2D2D] font-semibold">{page.likeCount}</span></div>
                    {page.boosted !== undefined && <div className="flex justify-between items-center"><span className="text-[#65676B]">Boosté</span><span className="text-[#2D2D2D] font-semibold">{page.boosted ? "Oui 🚀" : "Non"}</span></div>}
                    {page.verified !== undefined && <div className="flex justify-between items-center"><span className="text-[#65676B]">Vérifié</span><span className="text-[#2D2D2D] font-semibold">{page.verified ? "Oui ✓" : "Non"}</span></div>}
                  </div>
                </div>
              </aside>

              {/* Contenu principal : onglets */}
              <div className="flex-1 min-w-0 w-full">
                <div className="overflow-x-auto">
                  <TabNavigation tabs={tabs} active={tab} onChange={setTab} ariaLabel="Sections de l'espace" className="mb-5 min-w-max" />
                </div>

                {tab === "posts" && (
                  <div role="tabpanel" aria-label="Publications de l'espace">
                    {isAdmin && (
                      <div className="mb-6">
                        <PostComposer
                          user={{
                            id: String(page?.pageId || pageId),
                            name: page?.pageTitle || page?.pageName || "Espace",
                            avatar: page?.avatar || null,
                          }}
                          onSubmit={handleCreatePost}
                          placeholder={`Publier pour ${page?.pageTitle || page?.pageName || "cet espace"}...`}
                          className="shadow-sm"
                        />
                      </div>
                    )}
                    {postsQuery.isLoading ? (
                      <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex gap-3">
                              <div className="size-10 rounded-full bg-gray-200" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 w-1/3 rounded bg-gray-200" />
                                <div className="h-3 w-1/4 rounded bg-gray-200" />
                              </div>
                            </div>
                            <div className="h-32 rounded-2xl bg-gray-200" />
                          </div>
                        ))}
                      </div>
                    ) : postsQuery.error ? (
                      <PageError message="Impossible de charger les publications." onRetry={() => void postsQuery.refetch()} />
                    ) : (postsQuery.data?.posts ?? []).length === 0 ? (
                      <PageEmpty title="Aucune publication" text="Les publications de cet espace apparaîtront ici." />
                    ) : (
                      <div className="space-y-6">
                        {(postsQuery.data?.posts ?? []).map((post: Record<string, unknown>) => {
                          const p = post as any
                          return (
                            <div key={String(p.id)} className="mb-6">
                              <PostCard
                                key={String(p.id)}
                                postId={String(p.id)}
                                author={{
                                  id: String(p.author?.id || ""),
                                  name: String(p.author?.name || "Page"),
                                  avatar: p.author?.avatar || "/images/avatar.png",
                                  username: p.author?.username || undefined,
                                  verified: !!p.author?.verified,
                                  pageId: p.author?.pageId || String(pageId),
                                }}
                                currentUser={rawUser ? { ...rawUser, id: dughuUserId || "", avatar: rawUser.avatar || "/images/avatar.png" } : undefined}
                                timeAgo={p.timeLabel || (p.createdAt ? timeAgo(String(p.createdAt)) : "")}
                                content={p.content ?? undefined}
                                image={p.image || p.images?.[0]?.url || undefined}
                                images={(p.images || []).map((img: any) => ({ url: img.url }))}
                                video={(typeof p.video === "string" ? p.video : p.video?.url) || undefined}
                                audio={p.audio || undefined}
                                shareUrl={(p.shareUrl as string) || null}
                                color={p.color ? (typeof p.color === "string" ? p.color : JSON.stringify(p.color)) : null}
                                likesCount={p._count?.likes ?? 0}
                                commentsCount={p._count?.comments ?? 0}
                                sharesCount={p._count?.reposts ?? 0}
                                viewsCount={p.viewsCount ?? p.views_count ?? p._count?.views ?? 0}
                                reacted={p.reacted}
                                reactions={p.reactions}
                                users={p.reactionUsers}
                                parentPost={p.parentPost}
                                postPrivacy={p.postPrivacy}
                                isPageLiked={!!page?.isLiked}
                                isPageLikeLoading={likeMutation.isPending}
                                onTogglePageLike={() => void handleLike()}
                                className="shadow-sm"
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {tab === "about" && (
                  <div role="tabpanel" aria-label="À propos">
                    <AboutPanel
                      pageId={page.pageId}
                      website={page.website}
                      phone={page.phone}
                      address={page.address}
                      company={page.company}
                      categoryName={page.categoryName}
                      registered={page.registered}
                      pointsRecipient={page.pointsRecipient}
                      social={{
                        facebook: page.facebook,
                        instagram: page.instagram,
                        twitter: page.twitter,
                        linkedin: page.linkedin,
                        youtube: page.youtube,
                        vk: page.vk,
                      }}
                      canManage={isAdmin}
                    />
                  </div>
                )}

                                {tab === "gallery" && (
                  <div role="tabpanel" aria-label="Galerie">
                    {imagesQuery.isLoading ? (
                      <PageSkeleton rows={3} />
                    ) : imagesQuery.error ? (
                      <PageError message="Impossible de charger la galerie." onRetry={() => void imagesQuery.refetch()} />
                    ) : (imagesQuery.data?.images ?? []).length === 0 ? (
                      <PageEmpty title="Aucune image" text="Les images de cet espace apparaîtront ici." />
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {imagesQuery.data?.images.map((image) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={image.id} src={image.url} alt="" className="aspect-square w-full rounded-2xl object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "offers" && (
                  <div role="tabpanel" aria-label="Offres">
                    <OffersPanel pageId={page.pageId} canManage={isAdmin} />
                  </div>
                )}

                {tab === "admins" && isAdmin && (
                  <div role="tabpanel" aria-label="Admins">
                    <AdminsPanel pageId={page.pageId} admins={page.admins ?? []} loading={detailQuery.isLoading} error={null} />
                  </div>
                )}

                {tab === "stats" && isAdmin && dughuUserId && (
                  <div role="tabpanel" aria-label="Statistiques">
                    <StatsPanel pageId={page.pageId} userId={dughuUserId} />
                  </div>
                )}

                {tab === "invite" && isAdmin && (
                  <div role="tabpanel" aria-label="Inviter">
                    <InvitePanel pageId={page.pageId} />
                  </div>
                )}
              </div> {/* /.min-w-0 main content */}
            </div> {/* /.grid deux colonnes */}
          </>
        )}

        <DeleteSpaceModal open={deleteOpen} pageId={pageId} pageName={page?.pageTitle || page?.pageName || "cet espace"} onClose={() => setDeleteOpen(false)} onDeleted={() => router.push("/espaces")} />
        <BoostSpaceModal open={boostOpen} pageId={pageId} onClose={() => setBoostOpen(false)} />
      </div>
    </MainLayout>
  )
}