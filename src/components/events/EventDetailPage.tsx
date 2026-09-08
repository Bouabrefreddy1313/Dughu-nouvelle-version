"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import dynamic from "next/dynamic"
import {
  Calendar,
  MapPin,
  Clock,
  Share2,
  UserPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Heart,
  Users,
  ExternalLink,
  ArrowLeft,
  Check,
  Loader2,
  Info,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  useEventDetail,
  useDeleteEventMutation,
  useToggleEventInscriptionMutation,
  useToggleEventInterestMutation,
  useEventPosts,
} from "@/hooks/queries/use-events"
import EventCountdown from "./EventCountdown"
import EventShareDropdown from "./EventShareDropdown"
import EventInviteModal from "./EventInviteModal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { createPost } from "@/services/posts/posts.service"
import { timeAgo } from "@/lib/helpers"
import type { DughuEvent } from "@/types/events/events.types"

const PostComposer = dynamic(
  () => import("@/components/composer/PostComposer").then((mod) => ({ default: mod.PostComposer })),
  { ssr: false }
)

const PostCard = dynamic(
  () => import("@/components/feed/PostCard").then((mod) => ({ default: mod.PostCard })),
  {
    loading: () => (
      <div className="mb-4 animate-pulse rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
        <div className="mb-3 flex gap-3">
          <div className="size-10 rounded-full bg-gray-200 dark:bg-zinc-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-zinc-700" />
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-zinc-700" />
          </div>
        </div>
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-zinc-700" />
      </div>
    ),
  }
)

interface EventDetailPageProps {
  eventId: string
}

export default function EventDetailPage({ eventId }: EventDetailPageProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [coverError, setCoverError] = useState(false)

  const { data, isLoading, isError, refetch } = useEventDetail(eventId, userId)
  const event: DughuEvent | null = data?.event || null

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useEventPosts(eventId, userId)
  const deleteMutation = useDeleteEventMutation()
  const inscriptionMutation = useToggleEventInscriptionMutation()
  const interestMutation = useToggleEventInterestMutation()

  // Créateur de l'événement
  const isCreator = Boolean(
    userId &&
      event &&
      (String(event.posterId) === userId || String(event.organizer?.id) === userId)
  )

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return
    setIsDeleting(true)
    try {
      const res = await deleteMutation.mutateAsync({ id: eventId, userId })
      if (res.success) {
        toast.success("Événement supprimé avec succès.")
        router.push("/events")
      } else {
        toast.error(res.message || "Impossible de supprimer l'événement.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la suppression.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleInscription = async () => {
    if (!userId) {
      toast.error("Veuillez vous connecter pour adhérer à l'événement.")
      return
    }
    try {
      const res = await inscriptionMutation.mutateAsync({ id: eventId, userId })
      if (res.success) {
        toast.success(res.isGoing ? "Vous participez à cet événement !" : "Participation annulée.")
      } else {
        toast.error(res.message || "Erreur d'inscription.")
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement.")
    }
  }

  const handleToggleInterest = async () => {
    if (!userId) {
      toast.error("Veuillez vous connecter pour marquer votre intérêt.")
      return
    }
    try {
      const res = await interestMutation.mutateAsync({ id: eventId, userId })
      if (res.success) {
        toast.success(res.isInterested ? "Ajouté à vos événements intéressants !" : "Intérêt retiré.")
      } else {
        toast.error(res.message || "Erreur lors de l'enregistrement.")
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement.")
    }
  }

  const handleCreatePost = async (postData: any) => {
    try {
      const payload: any = {
        ...postData,
        event_id: eventId,
        user_id: userId,
      }
      const res = await createPost(payload)
      if (res?.success) {
        toast.success("Publication partagée avec succès !")
        void refetchPosts()
      } else {
        toast.error(res?.message || "Impossible de publier.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la publication.")
    }
  }

  if (isLoading) {
    return (
      <MainLayout user={rawUser} wide noRightSidebar active="events">
        <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-8 px-4 max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-64 sm:h-80 w-full rounded-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-8 space-y-4">
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-60 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (isError || !event) {
    return (
      <MainLayout user={rawUser} wide noRightSidebar active="events">
        <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-16 px-4 max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
            <Info className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Événement introuvable
          </h2>
          <p className="text-sm text-gray-500">
            Cet événement a peut-être été supprimé ou vous n'avez pas l'autorisation d'y accéder.
          </p>
          <button
            type="button"
            onClick={() => router.push("/events")}
            className="px-6 py-2.5 rounded-full bg-[#8B5E34] text-white font-bold text-sm shadow-md transition"
          >
            Retour aux événements
          </button>
        </div>
      </MainLayout>
    )
  }

  const rawCover = event.coverPath || event.cover || ""
  const coverUrl =
    rawCover.startsWith("http") || rawCover.startsWith("/")
      ? rawCover
      : rawCover
      ? `https://dughuprod.s3.amazonaws.com/${rawCover.replace(/^\/+/, "")}`
      : ""
  const googleMapsIframeUrl = `https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
  const googleMapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="events">
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Navigation supérieure */}
          <button
            type="button"
            onClick={() => router.push("/events")}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tous les événements</span>
          </button>

          {/* ══════════════════ ZONE A : BANDEAU DU HAUT ══════════════════ */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xs overflow-hidden">
            {/* Image de couverture pleine largeur */}
            <div className="relative aspect-21/9 sm:aspect-3/1 w-full bg-gray-900 overflow-hidden">
              {coverUrl && !coverError ? (
                <Image
                  src={coverUrl}
                  alt={event.name}
                  fill
                  className="object-cover opacity-90"
                  priority
                  unoptimized
                  onError={() => setCoverError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8B5E34]/30 to-zinc-900">
                  <Calendar className="w-16 h-16 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />

              {/* Badges et Accroche en overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  PARTICIPATION
                </span>
                {event.isPassed && (
                  <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-xs font-bold uppercase">
                    Événement Passé
                  </span>
                )}
              </div>

              {/* Accroche "VENEZ PROFITER 🔥🔥" et nom de l'organisateur */}
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 right-4 flex items-end justify-between gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-orange-500/80 backdrop-blur-xs text-white text-xs sm:text-sm font-black tracking-wide uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Venez Profiter 🔥🔥</span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-black text-white drop-shadow-md line-clamp-2">
                    {event.name}
                  </h1>
                  <div className="flex items-center gap-2 text-white/90 text-xs sm:text-sm drop-shadow-xs">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shrink-0">
                      <Image
                        src={event.organizer?.avatar || "/images/avatar.png"}
                        alt={event.organizer?.name || "Organisateur"}
                        fill
                        className="object-cover"
                        sizes="24px"
                        unoptimized={Boolean(event.organizer?.avatar?.startsWith("http"))}
                      />
                    </div>
                    <span className="font-semibold">
                      Organisé par {event.organizer?.name || "Dughu Event"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sous l'image : Compte à rebours + Boutons actions */}
            <div className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-gray-100 dark:border-zinc-800">
              {/* Compte à rebours (4 pastilles) */}
              <EventCountdown
                startDate={event.startDate}
                startTime={event.startTime}
                isPassed={event.isPassed}
              />

              {/* Actions à droite : Kebab si créateur OU Adhérer/Intéressé si visiteur */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                {isCreator ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-2.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 transition cursor-pointer">
                      <MoreVertical className="w-5 h-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 p-1.5 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800"
                    >
                      <DropdownMenuItem
                        onClick={() => router.push(`/events/${event.id}/edit`)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-semibold"
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                        <span>Modifier</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-sm font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{isDeleting ? "Suppression..." : "Supprimer"}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    {/* Bouton Intéressé */}
                    <button
                      type="button"
                      onClick={handleToggleInterest}
                      disabled={interestMutation.isPending}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                        event.isInterested
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900"
                          : "bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          event.isInterested ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                      <span>{event.isInterested ? "Intéressé(e) ✓" : "Intéressé"}</span>
                    </button>

                    {/* Bouton Adhérer */}
                    <button
                      type="button"
                      onClick={handleToggleInscription}
                      disabled={inscriptionMutation.isPending}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                        event.isGoing
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-[#8B5E34] hover:bg-[#724b28] text-white"
                      }`}
                    >
                      {event.isGoing ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Inscrit ✓</span>
                        </>
                      ) : (
                        <span>Adhérer</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════ COLONNES PRINCIPALES ══════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ══════════════════ ZONE B : COLONNE GAUCHE ══════════════════ */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-5">
              {/* Carte Événement : Titre, Organisateur, Dates en 2 cols, Boutons Partager & Inviter */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-xs space-y-5">
                {/* Organisateur & Statut */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                      <Image
                        src={event.organizer?.avatar || "/images/avatar.png"}
                        alt={event.organizer?.name || "Organisateur"}
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized={Boolean(event.organizer?.avatar?.startsWith("http"))}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-medium">Organisé par</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {event.organizer?.name || "Dughu"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      event.isPassed
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-500"
                        : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {event.isPassed ? "Passé" : "À venir"}
                  </span>
                </div>

                {/* Dates de début et de fin sous forme de 2 colonnes */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-gray-50/80 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                  {/* Début */}
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                      Commence
                    </p>
                    <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100">
                      {event.startDate}
                    </p>
                    <p className="text-xs font-medium text-[#8B5E34] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.startTime || "--:--"}
                    </p>
                  </div>

                  {/* Fin */}
                  <div className="space-y-1 border-l border-gray-200 dark:border-zinc-700 pl-3">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                      Prend fin
                    </p>
                    <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100">
                      {event.endDate || event.startDate}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.endTime || "--:--"}
                    </p>
                  </div>
                </div>

                {/* Boutons verts : PARTAGER (dropdown) et INVITER (modale) */}
                <div className="flex items-center gap-2.5 pt-1">
                  <EventShareDropdown title={event.name} url={event.shareLink} />

                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer text-xs sm:text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>INVITER</span>
                  </button>
                </div>
              </div>

              {/* Carte Intéressé(e) : avatars empilés + nombre de personnes */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>Intéressé(e)s</span>
                  </h3>
                  <span className="text-xs font-bold text-gray-500">
                    {event.interestedCount || 0} personne{(event.interestedCount || 0) > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="inline-block relative size-8 rounded-full ring-2 ring-white dark:ring-zinc-900 overflow-hidden bg-gray-200 dark:bg-zinc-700"
                      >
                        <Image
                          src={`/images/avatar.png`}
                          alt="Intéressé"
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rejoignez les personnes qui suivent cet événement
                  </p>
                </div>
              </div>

              {/* Carte Localisation : Pin, adresse en texte, iframe Google Maps interactive + lien Maps ↗ */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8B5E34]" />
                    <span>Localisation</span>
                  </h3>

                  <a
                    href={googleMapsExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#8B5E34] hover:underline"
                  >
                    <span>Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {event.location}
                </p>

                {/* Iframe Maps interactive */}
                <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700">
                  <iframe
                    title="Carte événement"
                    width="100%"
                    height="100%"
                    src={googleMapsIframeUrl}
                    loading="lazy"
                    className="border-0"
                  />
                </div>
              </div>

              {/* Carte Description */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  À propos de l'événement
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            </div>

            {/* ══════════════════ ZONE C : COLONNE CENTRALE / DROITE ══════════════════ */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-5">
              {/* Zone de publication (PostComposer Dughu) */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-zinc-800 shadow-xs">
                <PostComposer
                  user={{
                    id: userId,
                    name: rawUser?.name || "Moi",
                    avatar: rawUser?.avatar || "/images/avatar.png",
                  }}
                  onSubmit={handleCreatePost}
                  placeholder="Quoi de neuf ? Partagez avec la communauté de cet événement..."
                  className="shadow-none border-0 p-0"
                />
              </div>

              {/* Fil de publications de l'événement */}
              <div className="space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 px-1">
                  Publications de l'événement
                </h2>

                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 space-y-3"
                      >
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (postsData?.posts || []).length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 border border-gray-100 dark:border-zinc-800 text-center space-y-2">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      Aucune publication pour l'instant
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Soyez le premier à poser une question ou à partager une photo concernant cet événement !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(postsData?.posts || []).map((post: any) => (
                      <PostCard
                        key={String(post.id)}
                        postId={String(post.id)}
                        author={{
                          id: String(post.author?.id || ""),
                          name: String(post.author?.name || "Participant"),
                          avatar: post.author?.avatar || "/images/avatar.png",
                          username: post.author?.username || undefined,
                        }}
                        currentUser={
                          rawUser
                            ? {
                                ...rawUser,
                                id: userId,
                                avatar: rawUser.avatar || "/images/avatar.png",
                              }
                            : undefined
                        }
                        timeAgo={
                          post.timeLabel || (post.createdAt ? timeAgo(String(post.createdAt)) : "")
                        }
                        content={post.content ?? undefined}
                        image={post.image || post.images?.[0]?.url || undefined}
                        images={(post.images || []).map((img: any) => ({ url: img.url }))}
                        video={(typeof post.video === "string" ? post.video : post.video?.url) || undefined}
                        shareUrl={post.shareUrl || null}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale d'invitation d'amis */}
      <EventInviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        eventId={eventId}
        userId={userId}
        eventTitle={event.name}
      />
    </MainLayout>
  )
}
