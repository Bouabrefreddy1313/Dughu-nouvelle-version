"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Volume2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useUserStories,
  toggleStoryLikeClient,
  deleteStoryClient,
  logStoryViewClient,
  fetchStoryViewers,
} from "@/hooks/queries/use-flash"
import { timeAgo } from "@/lib/helpers"
import { resolveStoryMediaUrl } from "@/lib/dughu"
import { toast } from "sonner"

const BRAND = {
  orange: "#E08543",
  orangeDeep: "#C96A2A",
  peach: "#F2B183",
  brown: "#A35A2A",
  brownDeep: "#3B2010",
  brownMuted: "#8A6A4E",
  cream: "#FBF1E7",
  creamLine: "#EAD9C4",
  creamActive: "#F3DDBE",
  stage: "#0D0705",
}

const COLOR_ID_TO_CSS: Record<string, string> = {
  "17": "linear-gradient(135deg, #98b262, #66a399)",
  "18": "#000000",
  "19": "linear-gradient(135deg, #ffb0ff, #8080c0)",
  "24": "linear-gradient(135deg, #0000ff, #00ff00)",
  "25": "linear-gradient(135deg, #4e26ff, #ff0000)",
  "27": "linear-gradient(135deg, #ff0fff, #8080c0)",
  "30": "linear-gradient(135deg, #ffff00, #8080c0)",
  "31": "linear-gradient(135deg, #e8670c, #ffffff)",
  "32": "linear-gradient(135deg, #ff3dff, #ffffff)",
  "33": "linear-gradient(135deg, #91ff3d, #ff00ff)",
  "34": "linear-gradient(135deg, #ccb38d, #ffffff)",
}

function resolveStoryBg(raw: string | null | undefined): string {
  if (!raw) return "linear-gradient(135deg, #7d3f20, #e08543)"
  const value = String(raw).trim()
  if (/^\d+$/.test(value)) return COLOR_ID_TO_CSS[value] || BRAND.brownDeep
  if (value.startsWith("#") || value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) return value
  return value
}

export interface FlashStoryGroup {
  userId: string
  name: string
  avatar?: string | null
  lastCreatedAt?: string | null
  storyCount?: number
  hasUnseen?: boolean
  isOwn?: boolean
}

interface FlashViewerProps {
  targetUserId: string
  userId?: string
  initialIndex?: number
  onClose?: () => void
  userName?: string | null
  userAvatar?: string | null
  onStoryDeleted?: () => void
  storyGroups?: FlashStoryGroup[]
  onSelectUser?: (userId: string) => void
  onCreateFlash?: () => void
}

const STORY_INTERVAL_MS = 5000

export default function FlashViewer({
  targetUserId,
  userId,
  initialIndex = 0,
  onClose,
  userName,
  userAvatar,
  onStoryDeleted,
  storyGroups,
  onSelectUser,
  onCreateFlash,
}: FlashViewerProps) {
  const { data, isLoading, isError, refetch } = useUserStories(targetUserId, userId)
  const stories = data?.stories || []
  const [index, setIndex] = useState(initialIndex)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [mediaError, setMediaError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [liking, setLiking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reply, setReply] = useState("")
  const [showReply, setShowReply] = useState(false)
  const [viewers, setViewers] = useState<any[]>([])
  const [loadingViewers, setLoadingViewers] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const viewersCache = useRef<Map<string, any[]>>(new Map())
  const loggedViews = useRef<Set<string>>(new Set())

  const total = stories.length
  const currentIndex = total > 0 ? Math.min(index, total - 1) : 0
  const currentStory = stories[currentIndex] || null
  const isVideo = !!currentStory?.video && !currentStory?.image
  const currentLiked = !!currentStory?.id && likedIds.has(currentStory.id)
  const ownGroup = storyGroups?.find((group) => group.isOwn) || null
  const otherGroups = storyGroups?.filter((group) => !group.isOwn) || []
  const showSidebar = !!storyGroups?.length
  const isOwnStory = !!userId && !!currentStory && String(currentStory.userId) === String(userId)

  const loadViewers = useCallback(async (storyId: string) => {
    if (viewersCache.current.has(storyId)) {
      setViewers(viewersCache.current.get(storyId) || [])
      return
    }
    setLoadingViewers(true)
    try {
      const list = await fetchStoryViewers({ storyId, userId })
      viewersCache.current.set(storyId, list)
      setViewers(list)
    } catch {
      setViewers([])
    } finally {
      setLoadingViewers(false)
    }
  }, [userId])

  useEffect(() => {
    setIndex(initialIndex)
    setProgress(0)
    setMediaError(false)
    setImageLoaded(false)
    setPaused(false)
    setReply("")
    setViewers([])
    viewersCache.current.clear()
  }, [targetUserId, initialIndex])

  const goNext = useCallback(() => {
    setIndex((value) => {
      if (value + 1 >= total) {
        onClose?.()
        return value
      }
      return value + 1
    })
    setProgress(0)
    setMediaError(false)
    setImageLoaded(false)
  }, [onClose, total])

  const goPrev = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1))
    setProgress(0)
    setMediaError(false)
    setImageLoaded(false)
  }, [])

  useEffect(() => {
    if (paused || isError || isLoading || !currentStory || isVideo) return
    const step = 50
    const interval = window.setInterval(() => {
      // Incrémente seulement la barre de progression. On ne déclenche PAS
      // goNext() ici : appeler un setState dans l'updater d'un autre setState
      // est impur et, en StrictMode, l'updater est invoqué deux fois → la story
      // sautait (flash 1 → flash 3). L'avancement est géré par l'effet ci-dessous.
      setProgress((value) => Math.min(100, value + (step / STORY_INTERVAL_MS) * 100))
    }, step)
    return () => window.clearInterval(interval)
  }, [currentStory, isError, isLoading, paused, isVideo])

  useEffect(() => {
    if (!isVideo && progress >= 100) goNext()
  }, [progress, goNext, isVideo])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); goNext() }
      if (event.key === "ArrowLeft") { event.preventDefault(); goPrev() }
      if (event.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goNext, goPrev, onClose])

  useEffect(() => {
    if (isOwnStory && currentStory?.id) void loadViewers(currentStory.id)
  }, [currentStory?.id, isOwnStory, loadViewers])

  useEffect(() => {
    if (!currentStory?.id || !userId || isOwnStory) return
    const storyKey = String(currentStory.id)
    if (loggedViews.current.has(storyKey)) return
    loggedViews.current.add(storyKey)
    void logStoryViewClient({ storyId: currentStory.id, userId }).catch(() => loggedViews.current.delete(storyKey))
  }, [currentStory?.id, isOwnStory, userId])

  const handleToggleLike = async () => {
    if (!currentStory?.id || !userId || liking) return
    const storyId = currentStory.id
    const wasLiked = currentLiked
    setLiking(true)
    setLikedIds((previous) => {
      const next = new Set(previous)
      wasLiked ? next.delete(storyId) : next.add(storyId)
      return next
    })
    try {
      const result = await toggleStoryLikeClient({ storyId, userId })
      setLikedIds((previous) => {
        const next = new Set(previous)
        result.liked ? next.add(storyId) : next.delete(storyId)
        return next
      })
    } catch (error: any) {
      setLikedIds((previous) => {
        const next = new Set(previous)
        wasLiked ? next.add(storyId) : next.delete(storyId)
        return next
      })
      toast.error(error?.message || "Erreur de réaction")
    } finally {
      setLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!currentStory?.id || deleting || !window.confirm("Supprimer ce Flash ?")) return
    setDeleting(true)
    try {
      await deleteStoryClient(currentStory.id)
      toast.success("Flash supprimé")
      onStoryDeleted?.()
      total <= 1 ? onClose?.() : goNext()
    } catch (error: any) {
      toast.error(error?.message || "Erreur suppression")
    } finally {
      setDeleting(false)
    }
  }

  const Sidebar = showSidebar ? (
    <aside className="hidden md:flex md:w-[286px] lg:w-[310px] shrink-0 flex-col overflow-hidden border-r" style={{ background: BRAND.cream, borderColor: BRAND.creamLine }}>
      <div className="px-5 pt-7 pb-2">
        <h1 className="text-[23px] font-extrabold tracking-tight" style={{ color: BRAND.brownDeep }}>Stories</h1>
        <div className="flex items-center gap-1.5 mt-2 text-xs">
          <button type="button" className="font-medium" style={{ color: BRAND.orangeDeep }}>Archive</button>
          <span style={{ color: BRAND.brownMuted }}>·</span>
          <button type="button" className="font-medium" style={{ color: BRAND.orangeDeep }}>Paramètres</button>
        </div>
      </div>

      <div className="px-3 pt-4 pb-1"><span className="px-2 text-xs font-bold" style={{ color: BRAND.brownDeep }}>Votre story</span></div>
      <div className="px-2 pb-3">
        {ownGroup ? (
          <button type="button" onClick={() => onSelectUser?.(ownGroup.userId)} className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition" style={{ background: ownGroup.userId === targetUserId ? BRAND.creamActive : "transparent" }}>
            <div className="relative w-12 h-12 rounded-full shrink-0 p-[2px]" style={{ background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.peach})` }}>
              <div className="w-full h-full rounded-full overflow-hidden bg-white" style={{ border: `2px solid ${BRAND.cream}` }}>
                {ownGroup.avatar ? <Image src={ownGroup.avatar} alt={ownGroup.name} width={44} height={44} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ background: BRAND.brown }}>{ownGroup.name.charAt(0).toUpperCase()}</div>}
              </div>
              {onCreateFlash && <span onClick={(event) => { event.stopPropagation(); onCreateFlash() }} className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white ring-2" style={{ background: BRAND.orange, ringColor: BRAND.cream }}><Plus size={13} strokeWidth={3} /></span>}
            </div>
            <div className="flex flex-col min-w-0"><span className="text-sm font-semibold truncate" style={{ color: BRAND.brownDeep }}>{ownGroup.name}</span><span className="text-xs truncate" style={{ color: BRAND.brownMuted }}>{ownGroup.lastCreatedAt ? timeAgo(ownGroup.lastCreatedAt) : "Voir votre story"}</span></div>
          </button>
        ) : onCreateFlash ? (
          <button type="button" onClick={onCreateFlash} className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/60">
            <span className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center" style={{ borderColor: BRAND.orange, color: BRAND.orange }}><Plus size={20} /></span>
            <div className="flex flex-col"><span className="text-sm font-semibold" style={{ color: BRAND.brownDeep }}>Créer une story</span><span className="text-xs" style={{ color: BRAND.brownMuted }}>Partagez une photo, une vidéo ou un message</span></div>
          </button>
        ) : null}
      </div>

      <div className="px-3 pt-2 pb-1"><span className="px-2 text-xs font-bold" style={{ color: BRAND.brownDeep }}>Toutes les stories</span></div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 pt-1">
        {otherGroups.map((group) => {
          const active = group.userId === targetUserId
          return (
            <button key={group.userId} type="button" onClick={() => onSelectUser?.(group.userId)} className={cn("w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition", active ? "bg-white/70" : "hover:bg-white/50")}>
              <div className="w-12 h-12 rounded-full shrink-0 p-[2px]" style={{ background: group.hasUnseen ? `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.peach}, ${BRAND.brown})` : BRAND.creamLine }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white" style={{ border: `2px solid ${BRAND.cream}` }}>{group.avatar ? <Image src={group.avatar} alt={group.name} width={44} height={44} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ background: BRAND.brown }}>{group.name.charAt(0).toUpperCase()}</div>}</div>
              </div>
              <div className="flex flex-col min-w-0"><span className="text-sm font-semibold truncate" style={{ color: BRAND.brownDeep }}>{group.name}</span><span className="text-xs truncate" style={{ color: group.hasUnseen ? BRAND.orangeDeep : BRAND.brownMuted }}>{group.storyCount && group.storyCount > 1 ? `${group.storyCount} nouvelles stories` : group.hasUnseen ? "1 nouvelle story" : ""}{group.storyCount || group.hasUnseen ? " · " : ""}{group.lastCreatedAt ? timeAgo(group.lastCreatedAt) : ""}</span></div>
              {active && <span className="ml-auto w-2 h-2 rounded-full" style={{ background: BRAND.orange }} />}
            </button>
          )
        })}
      </div>
    </aside>
  ) : null

  if (isLoading) return <div className="fixed inset-0 z-[60] flex" style={{ background: BRAND.stage }}>{Sidebar}<div className="flex-1 flex items-center justify-center"><div className="relative flex h-[min(704px,calc(100vh-86px))] w-[min(386px,calc(100vw-360px))] min-w-[300px] flex-col overflow-hidden rounded-lg" style={{ background: "#180f0a" }}><div className="absolute left-2 right-2 top-2 z-10 flex gap-1.5">{[0, 1, 2].map((bar) => (<span key={bar} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10"><Skeleton className="h-full w-full rounded-full bg-white/20" /></span>))}</div><div className="absolute left-3 right-3 top-5 z-10 flex items-center gap-2.5"><Skeleton className="h-9 w-9 shrink-0 rounded-full bg-white/20" /><div className="flex flex-col gap-1.5"><Skeleton className="h-3 w-28 rounded bg-white/20" /><Skeleton className="h-2.5 w-16 rounded bg-white/10" /></div></div><div className="flex flex-1 items-center justify-center"><Skeleton className="h-2/3 w-2/3 rounded-xl bg-white/10" /></div></div></div></div>
  if (isError) return <div className="fixed inset-0 z-[60] flex" style={{ background: BRAND.stage }}>{Sidebar}<div className="relative flex-1 flex flex-col items-center justify-center gap-3"><AlertTriangle className="text-red-400" /><p className="text-white/80 text-sm">Impossible de charger les Flash.</p><button type="button" onClick={() => refetch()} className="text-sm font-semibold" style={{ color: BRAND.peach }}>Réessayer</button><button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/80"><X /></button></div></div>
  if (!currentStory || total === 0) return <div className="fixed inset-0 z-[60] flex" style={{ background: BRAND.stage }}>{Sidebar}<div className="relative flex-1 flex flex-col items-center justify-center gap-3"><p className="text-white/80 text-sm">Aucun Flash à afficher pour le moment.</p><button type="button" onClick={onClose} className="absolute top-4 right-4 text-white/80"><X /></button><button type="button" onClick={onClose} className="text-sm font-semibold" style={{ color: BRAND.peach }}>Fermer</button></div></div>

  const mediaUrl = currentStory.image || currentStory.video || ""
  const safeMediaUrl = mediaError ? "" : mediaUrl ? resolveStoryMediaUrl(mediaUrl) : ""
  const authorName = currentStory.user?.name || userName || "Flash"
  const authorAvatar = currentStory.user?.avatar || userAvatar

  return (
    <div className="fixed inset-0 z-[60] flex" style={{ background: BRAND.stage }}>
      {Sidebar}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ background: `radial-gradient(ellipse at center, #24140c 0%, ${BRAND.stage} 66%)` }}>
        <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
          <button type="button" className="p-2 text-white/80 hover:text-white transition" aria-label="Messages"><MessageCircle size={20} /></button>
          <button type="button" className="p-2 text-white/80 hover:text-white transition" aria-label="Fermer" onClick={onClose}><X size={25} /></button>
        </div>

        <button type="button" onClick={goPrev} disabled={currentIndex === 0} aria-label="Précédent" className="absolute left-5 top-1/2 z-10 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white/80 transition disabled:opacity-30" style={{ background: "rgba(255,255,255,0.13)" }}><ChevronLeft size={25} /></button>
        <button type="button" onClick={goNext} disabled={currentIndex === total - 1} aria-label="Suivant" className="absolute right-5 top-1/2 z-10 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white/80 transition disabled:opacity-30" style={{ background: "rgba(255,255,255,0.13)" }}><ChevronRight size={25} /></button>

        <div className="relative flex h-[min(704px,calc(100vh-86px))] w-[min(386px,calc(100vw-360px))] min-w-[300px] flex-col overflow-hidden rounded-lg" style={{ background: BRAND.stage, boxShadow: "0 24px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(224,133,67,.18)" }} onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; setPaused(true) }} onTouchEnd={(event) => { if (touchStartX.current !== null) { const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current; if (Math.abs(delta) > 50) delta < 0 ? goNext() : goPrev() }; touchStartX.current = null; setPaused(false) }}>
          <div className="absolute left-2 right-2 top-2 z-10 flex gap-1.5"><span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"><i className="block h-full rounded-full" style={{ width: `${currentIndex > 0 ? 100 : progress}%`, background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.peach})` }} /></span>{stories.slice(1).map((story: any, storyIndex: number) => <span key={story.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"><i className="block h-full rounded-full" style={{ width: storyIndex + 1 < currentIndex ? "100%" : storyIndex + 1 === currentIndex ? `${progress}%` : "0%", background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.peach})` }} /></span>)}</div>

          <div className="absolute left-3 right-3 top-5 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 overflow-hidden rounded-full" style={{ border: `2px solid ${BRAND.peach}` }}>{authorAvatar ? <Image src={authorAvatar} alt={authorName} width={36} height={36} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-white" style={{ background: BRAND.brown }}>{authorName.charAt(0).toUpperCase()}</div>}</div>
              <div><p className="m-0 text-[13px] font-semibold leading-tight text-white">{authorName}</p><p className="m-0 text-[11px] text-white/65">{timeAgo(currentStory.createdAt || "")} · <span style={{ color: BRAND.peach }}>●</span></p></div>
            </div>
            <div className="flex items-center gap-1 text-white/85"><Volume2 size={19} /><button type="button" aria-label="Options" className="p-1"><MoreHorizontal size={21} /></button></div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {isVideo ? <video src={safeMediaUrl} className="h-full w-full object-cover" controls autoPlay muted playsInline onEnded={goNext} onError={() => setMediaError(true)} /> : safeMediaUrl ? <><img src={safeMediaUrl} alt="" className={cn("h-full w-full object-cover transition-opacity duration-300", imageLoaded ? "opacity-100" : "opacity-0")} onLoad={() => setImageLoaded(true)} onError={() => { setMediaError(true); setImageLoaded(false) }} />{!imageLoaded && !mediaError && <Skeleton className="absolute inset-0 rounded-none bg-white/10" />}</> : currentStory.text ? <div className="flex h-full w-full items-center justify-center p-8 text-center" style={{ background: resolveStoryBg(currentStory.bg) }}><p className="text-2xl font-bold text-white whitespace-pre-wrap">{currentStory.text}</p></div> : <p className="flex h-full items-center justify-center text-sm text-white/60">Flash sans contenu visible.</p>}
            <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(13,7,5,.18) 0%, transparent 45%, rgba(13,7,5,.36) 100%)" }} />
          </div>

          <div className="relative z-10 px-3 pb-3 pt-2" style={{ background: BRAND.stage }}>
            {!isOwnStory && (<div className="mb-2 flex items-center gap-2"><div className="flex h-9 flex-1 items-center rounded-full border px-4" style={{ borderColor: "rgba(255,255,255,.7)" }}><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Envoyer un message..." className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/65" /><button type="button" onClick={() => setReply("")} aria-label="Envoyer" className="text-white/80"><Send size={16} /></button></div><button type="button" onClick={() => setShowReply(!showReply)} aria-label="Répondre" className="rounded-full p-2 text-white/80"><MessageCircle size={20} /></button></div>)}
            <div className="flex items-center justify-center gap-1.5"><button type="button" onClick={handleToggleLike} disabled={!userId || liking} className="flex h-8 min-w-8 items-center justify-center rounded-full text-white transition disabled:opacity-50" style={{ background: currentLiked ? BRAND.orange : "#287be0" }}>{liking ? <Loader2 size={16} className="animate-spin" /> : <Heart size={17} fill="currentColor" />}</button><button type="button" onClick={handleToggleLike} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#ee4d64] text-white"><Heart size={17} fill="currentColor" /></button>{!isOwnStory && (<><button type="button" onClick={() => setShowReply(true)} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f6b83f] text-lg">&#128525;</button><button type="button" onClick={() => setShowReply(true)} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f6a45a] text-lg">&#128516;</button><button type="button" onClick={() => setShowReply(true)} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f49c50] text-lg">&#128558;</button><button type="button" onClick={() => setShowReply(true)} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#eb7062] text-lg">&#128546;</button><button type="button" onClick={() => setShowReply(true)} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#dd4d4a] text-lg">&#128545;</button></>)}</div>
          </div>
        </div>

        {isOwnStory && <div className="absolute right-4 top-20 bottom-20 hidden w-56 overflow-hidden rounded-2xl border md:flex md:flex-col" style={{ background: "rgba(13,7,5,.72)", borderColor: `${BRAND.orange}44` }}><div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: `${BRAND.orange}33` }}><span className="text-xs font-semibold uppercase tracking-wide" style={{ color: BRAND.peach }}>Vues ({viewers.length})</span><button type="button" onClick={() => currentStory.id && loadViewers(currentStory.id)} disabled={loadingViewers} className="text-white/70"><RefreshCw size={14} className={loadingViewers ? "animate-spin" : ""} /></button></div><div className="flex-1 overflow-y-auto p-2">{viewers.length === 0 ? <p className="py-6 text-center text-xs text-white/60">Aucune vue pour le moment.</p> : viewers.map((viewer) => <div key={viewer.id} className="flex items-center gap-2 py-1.5"><div className="h-8 w-8 overflow-hidden rounded-full bg-white/10">{viewer.avatar ? <Image src={viewer.avatar} alt={viewer.name || ""} width={32} height={32} className="h-full w-full object-cover" /> : null}</div><span className="truncate text-xs text-white">{viewer.name || "Utilisateur"}</span></div>)}</div></div>}

        {isOwnStory && <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2"><button type="button" onClick={() => currentStory.id && loadViewers(currentStory.id)} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"><Eye size={14} />{viewers.length}</button><button type="button" onClick={handleDelete} disabled={deleting} className="rounded-full bg-white/10 p-2 text-white/75 hover:text-red-400">{deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}</button></div>}
      </section>
    </div>
  )
}
