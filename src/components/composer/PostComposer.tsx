"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  X,
  Image as ImageIcon,
  BarChart3,
  MapPin,
  Music,
  Smile,
  Video,
  Type,
  Globe,
  Users,
  Lock,
  ChevronDown,
  ChevronLeft,
  Check,
  Loader2,
  UploadCloud,
  PlusCircle,
  Mic,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_COLORS, BackgroundColor } from "./BackgroundPicker"
import Avatar from "@/components/common/Avatar"
import { Button } from "@/components/ui/button"

// Decorative canvases: gradient base + a light pattern layer, composed as
// stacked CSS background layers so they still work with a single `bg` string.
const DECORATIVE_COLORS: BackgroundColor[] = [
  {
    bg: "radial-gradient(rgba(255,255,255,.4) 1.5px, transparent 1.5px) 0 0/16px 16px, linear-gradient(135deg,#7C3AED,#C026D3)",
    text: "#FFFFFF",
  },
  {
    bg: "repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 6px, transparent 6px 16px), linear-gradient(135deg,#F97316,#DB2777)",
    text: "#FFFFFF",
  },
  {
    bg: "radial-gradient(rgba(255,255,255,.35) 2px, transparent 2px) 0 0/22px 22px, linear-gradient(160deg,#0F766E,#0EA5E9)",
    text: "#FFFFFF",
  },
  {
    bg: "repeating-linear-gradient(-45deg, rgba(255,255,255,.15) 0 4px, transparent 4px 14px), linear-gradient(135deg,#A35A2A,#7C2D12)",
    text: "#FFFDF7",
  },
]

const isGradient = (bg: string) => bg.includes("gradient")

interface PostComposerProps {
  user?: {
    id: string
    name: string | null
    avatar: string | null
    image?: string | null
  }
  onSubmit?: (data: {
    content: string
    color?: BackgroundColor | null
    images?: File[]
    videos?: File[]
    privacy?: Privacy
    location?: string | null
  }) => void | Promise<void>
  className?: string
}

type Privacy = "public" | "friends" | "private"

const PRIVACY_OPTIONS: { id: Privacy; label: string; hint: string; icon: typeof Globe }[] = [
  { id: "public", label: "Public", hint: "Tout le monde peut voir", icon: Globe },
  { id: "friends", label: "Amis", hint: "Seuls vos amis peuvent voir", icon: Users },
  { id: "private", label: "Vous seul", hint: "Visible uniquement par vous", icon: Lock },
]

const QUICK_EMOJIS = ["😀", "😍", "😂", "🔥", "🙏", "🎉", "❤️", "😮", "😢", "👏"]

const MAX_CHARS = 2000
const BG_CHAR_LIMIT = 240 // background posts stay punchy, like a headline

export function PostComposer({ user, onSubmit, className }: PostComposerProps) {
  const [text, setText] = useState("")
  const [selectedColor, setSelectedColor] = useState<BackgroundColor | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [location, setLocation] = useState("")
  const [mounted, setMounted] = useState(false)

  const [privacy, setPrivacy] = useState<Privacy>("public")
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  // Couleurs dynamiques depuis l'API Dughu
  const [apiColors, setApiColors] = useState<BackgroundColor[]>([])

  const imageFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const privacyRef = useRef<HTMLDivElement>(null)

  const hasMedia = images.length > 0 || videos.length > 0
  const charLimit = selectedColor ? BG_CHAR_LIMIT : MAX_CHARS
  const hasContent = text.trim().length > 0 || hasMedia
  const overLimit = text.length > charLimit

  const displayName = user?.name || "Utilisateur"

  useEffect(() => setMounted(true), [])

  // ---------- helpers ----------

  // Récupérer les couleurs dynamiques depuis l'API Dughu
  useEffect(() => {
    let cancelled = false
    const fetchColors = async () => {
      try {
        const res = await fetch("/api/colors")
        const data = await res.json()
        if (!cancelled && data.success && data.colors?.length) {
          setApiColors(data.colors)
        }
      } catch {
        // fallback silencieux, on utilisera DEFAULT_COLORS
      }
    }
    fetchColors()
    return () => { cancelled = true }
  }, [])

  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }

  useEffect(() => {
    if (isModalOpen) autosize(modalTextareaRef.current)
  }, [isModalOpen, text, selectedColor])

  useEffect(() => {
    if (!isModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showBgPicker) setShowBgPicker(false)
        else closeModal()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isModalOpen, showBgPicker])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) {
        setPrivacyOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden"
      const t = setTimeout(() => modalTextareaRef.current?.focus(), 150)
      return () => {
        document.body.style.overflow = ""
        clearTimeout(t)
      }
    }
  }, [isModalOpen])

  const openModal = () => setIsModalOpen(true)

  const closeModal = () => {
    setIsModalOpen(false)
    setShowBgPicker(false)
  }

  const resetAll = () => {
    setText("")
    setImages([])
    setVideos([])
    setSelectedColor(null)
    setLocation("")
    setShowLocationInput(false)
    setShowEmoji(false)
    setPrivacy("public")
  }

  const handleImageFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (arr.length === 0) return
    setImages((prev) => [...prev, ...arr])
    setVideos([])
    setSelectedColor(null)
    setIsModalOpen(true)
  }

  const handleVideoFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("video/"))
    if (arr.length === 0) return
    setVideos((prev) => [...prev, ...arr])
    setImages([])
    setSelectedColor(null)
    setIsModalOpen(true)
  }

  const onImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleImageFiles(e.target.files)
    setFileInputKey((k) => k + 1)
  }

  const onVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleVideoFiles(e.target.files)
    setFileInputKey((k) => k + 1)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    if (files[0].type.startsWith("video/")) handleVideoFiles(files)
    else handleImageFiles(files)
  }, [])

  const handleSubmit = async () => {
    if (!hasContent || overLimit || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit?.({
        content: text,
        color: selectedColor,
        images,
        videos,
        privacy,
        location: location || null,
      })
      resetAll()
      closeModal()
    } finally {
      setIsSubmitting(false)
    }
  }

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji)
    modalTextareaRef.current?.focus()
  }

  const PrivacyIcon = PRIVACY_OPTIONS.find((p) => p.id === privacy)!.icon

  // ---------- shared bits ----------

  const MediaPreview = ({ compact = false }: { compact?: boolean }) => {
    if (!hasMedia) return null
    return (
      <div className="mb-4">
        {images.length > 0 && (
          <div
            className={cn(
              "relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50",
              images.length === 1 ? "" : "grid grid-cols-2 gap-1"
            )}
          >
            {images.slice(0, 4).map((img, i) => (
              <div
                key={i}
                className={cn(
                  "relative group",
                  images.length === 1 && "max-h-[420px]",
                  images.length > 1 && "aspect-square overflow-hidden"
                )}
              >
                <img
                  src={URL.createObjectURL(img)}
                  alt=""
                  className={cn(
                    "w-full h-full",
                    images.length === 1 ? "object-contain max-h-[420px] mx-auto" : "object-cover"
                  )}
                />
                {i === 3 && images.length > 4 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-xl font-semibold">
                    +{images.length - 4}
                  </div>
                )}
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Retirer la photo"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {videos.length > 0 && (
          <div className="flex flex-col gap-2">
            {videos.map((video, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden bg-black border border-gray-100">
                <video src={URL.createObjectURL(video)} controls={!compact} muted className="w-full max-h-[420px]" />
                <button
                  onClick={() => setVideos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition"
                  aria-label="Retirer la vidéo"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => imageFileRef.current?.click()}
          className="mt-2 text-[13px] font-medium text-[#A35A2A] hover:underline"
        >
          + Ajouter d'autres médias
        </button>
      </div>
    )
  }

  const allColors = apiColors.length > 0 ? apiColors : DEFAULT_COLORS
  const solidColors = allColors.filter((c) => !isGradient(c.bg) && !c.isImage)
  const gradientColors = allColors.filter((c) => isGradient(c.bg) && !c.isImage)
  const imageColors = allColors.filter((c) => c.isImage)

  const isSameColor = (a: BackgroundColor | null, b: BackgroundColor) => {
    if (!a) return false
    if (a.id != null && b.id != null) return a.id === b.id
    return a.bg === b.bg
  }

  const Swatch = ({ c, label }: { c: BackgroundColor; label: string }) => (
    <button
      onClick={() => {
        setSelectedColor(c)
        setShowBgPicker(false)
      }}
      className={cn(
        "relative aspect-square rounded-xl border-2 hover:scale-105 transition shadow-sm",
        isSameColor(selectedColor, c) ? "border-[#A35A2A] ring-2 ring-[#A35A2A]/30" : "border-transparent"
      )}
      style={
        c.isImage
          ? { backgroundImage: `url(${c.bg})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: c.bg }
      }
      aria-label={label}
      title={label}
    >
      {isSameColor(selectedColor, c) && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="bg-white/90 rounded-full p-1">
            <Check size={14} style={{ color: c.text }} />
          </span>
        </span>
      )}
    </button>
  )

  const BackgroundPickerOverlay = () => (
    <div className="absolute inset-0 z-10 bg-white rounded-2xl flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200 min-h-[380px]">
      <div className="flex items-center gap-2 p-3 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setShowBgPicker(false)}
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Retour"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <span className="font-semibold text-[#050505] text-sm">Choisir un arrière-plan</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Texte simple</p>
          <button
            onClick={() => {
              setSelectedColor(null)
              setShowBgPicker(false)
            }}
            className={cn(
              "w-14 aspect-square rounded-xl flex items-center justify-center border-2 bg-gray-50 hover:scale-105 transition",
              !selectedColor ? "border-[#A35A2A]" : "border-transparent"
            )}
            aria-label="Aucun arrière-plan"
          >
            <ColorfulTextIcon size={28} />
          </button>
        </div>

        {solidColors.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Uni</p>
            <div className="grid grid-cols-5 gap-2.5">
              {solidColors.map((c, i) => (
                <Swatch key={`solid-${i}`} c={c} label={`Fond uni ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        {gradientColors.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Dégradé</p>
            <div className="grid grid-cols-5 gap-2.5">
              {gradientColors.map((c, i) => (
                <Swatch key={`gradient-${i}`} c={c} label={`Dégradé ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        {imageColors.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Photos</p>
            <div className="grid grid-cols-5 gap-2.5">
              {imageColors.map((c, i) => (
                <Swatch key={`image-${i}`} c={c} label={`Photo ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[12px] font-semibold text-[#65676B] uppercase tracking-wide mb-2">Décoratif</p>
          <div className="grid grid-cols-5 gap-2.5">
            {DECORATIVE_COLORS.map((c, i) => (
              <Swatch key={`deco-${i}`} c={c} label={`Décoratif ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const composerBody = () => (
    <>
      {/* identity + privacy row */}
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar src={user?.avatar || user?.image || null} name={displayName} size="md" />
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-[#050505] leading-tight">{displayName}</span>
          <div className="relative" ref={privacyRef}>
            <button
              onClick={() => setPrivacyOpen((v) => !v)}
              className="flex items-center gap-1 text-[12px] font-medium text-[#65676B] bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-0.5 transition"
            >
              <PrivacyIcon size={12} />
              <span>{PRIVACY_OPTIONS.find((p) => p.id === privacy)!.label}</span>
              <ChevronDown size={12} />
            </button>
            {privacyOpen && (
              <div className="absolute z-20 top-full mt-1 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {PRIVACY_OPTIONS.map((p) => {
                  const Icon = p.icon
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPrivacy(p.id)
                        setPrivacyOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 px-2.5 py-2 rounded-lg text-left hover:bg-gray-50 transition",
                        privacy === p.id && "bg-[#A35A2A]/5"
                      )}
                    >
                      <div className="mt-0.5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-[#65676B]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-[#050505]">{p.label}</p>
                        <p className="text-[11.5px] text-[#65676B]">{p.hint}</p>
                      </div>
                      {privacy === p.id && <Check size={16} className="text-[#A35A2A] mt-1" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowBgPicker(true)}
          disabled={hasMedia}
          className={cn(
            "ml-auto w-9 h-9 rounded-full flex items-center justify-center border transition shrink-0",
            hasMedia
              ? "opacity-40 cursor-not-allowed border-gray-100"
              : "border-gray-200 hover:bg-gray-50",
            selectedColor && "ring-2 ring-[#A35A2A]"
          )}
          aria-label="Ajouter une couleur d'arrière-plan"
          title={hasMedia ? "Indisponible avec des médias" : "Arrière-plan coloré"}
        >
          <ColorfulTextIcon size={20} />
        </button>
      </div>

      {/* text / background canvas */}
      <div className="relative">
        {selectedColor ? (
          <div
            className="rounded-2xl min-h-[220px] p-6 flex items-center justify-center text-center transition-colors relative overflow-hidden"
            style={
              selectedColor.isImage
                ? {
                    backgroundImage: `url(${selectedColor.bg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    color: selectedColor.text,
                  }
                : { background: selectedColor.bg, color: selectedColor.text }
            }
          >
            {/* Voile semi-transparent pour la lisibilité du texte sur les fonds image */}
            {selectedColor.isImage && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: selectedColor.color_1 || "rgba(0,0,0,0.3)", opacity: 0.35 }}
              />
            )}
            <textarea
              ref={modalTextareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                autosize(e.target)
              }}
              placeholder="Écrivez ici..."
              maxLength={charLimit}
              className="relative z-10 w-full bg-transparent resize-none outline-none text-center text-[26px] leading-snug font-bold placeholder-white/70"
              rows={3}
            />
          </div>
        ) : (
          <textarea
            ref={modalTextareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autosize(e.target)
            }}
            placeholder={`Quoi de neuf, ${displayName.split(" ")[0]} ?`}
            className="w-full bg-transparent resize-none outline-none text-[19px] text-[#050505] placeholder-[#65676B] min-h-[64px] py-1"
            rows={2}
          />
        )}

        {showBgPicker && <BackgroundPickerOverlay />}
      </div>

      {/* char counter, shown when close to the limit */}
      {text.length > charLimit * 0.8 && (
        <p className={cn("text-right text-[11px] mt-1", overLimit ? "text-red-500 font-medium" : "text-[#65676B]")}>
          {text.length}/{charLimit}
        </p>
      )}

      {location && (
        <div className="mt-2 inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-[13px] text-[#050505]">
          <MapPin size={13} className="text-[#A35A2A]" />
          <span>{location}</span>
          <button onClick={() => setLocation("")} className="ml-1 hover:text-[#A35A2A]">
            <X size={12} />
          </button>
        </div>
      )}

      {showLocationInput && !location && (
        <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <MapPin size={15} className="text-[#A35A2A] shrink-0" />
          <input
            autoFocus
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setShowLocationInput(false)}
            placeholder="Ajouter une localisation"
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
          <button onClick={() => setShowLocationInput(false)} className="text-[#65676B] hover:text-[#050505]">
            <X size={14} />
          </button>
        </div>
      )}

      <MediaPreview />

      {!hasMedia && !selectedColor && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={cn(
            "mt-1 mb-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-6 text-center transition-colors cursor-pointer",
            dragActive ? "border-[#A35A2A] bg-[#A35A2A]/5" : "border-gray-200 hover:border-gray-300"
          )}
          onClick={() => imageFileRef.current?.click()}
        >
          <UploadCloud size={22} className={dragActive ? "text-[#A35A2A]" : "text-gray-400"} />
          <p className="text-[13px] text-[#65676B]">
            Glissez des photos ou vidéos ici, ou{" "}
            <span className="text-[#A35A2A] font-medium">parcourez vos fichiers</span>
          </p>
        </div>
      )}

      {showEmoji && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2.5 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className="text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:scale-110 transition"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* action toolbar */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-3 py-2.5 mb-4">
        <span className="text-[13px] font-medium text-[#65676B] hidden sm:block">Ajouter à la publication</span>
        <div className="flex items-center gap-1 ml-auto">
          <ToolbarIcon
            icon={ImageIcon}
            color="#45BD62"
            label="Photo"
            onClick={() => imageFileRef.current?.click()}
            disabled={videos.length > 0}
          />
          <ToolbarIcon
            icon={Video}
            color="#EC4899"
            label="Vidéo"
            onClick={() => videoFileRef.current?.click()}
            disabled={images.length > 0}
          />
          <ToolbarIcon icon={BarChart3} color="#10B981" label="Sondage" onClick={() => {}} />
          <ToolbarIcon
            icon={MapPin}
            color="#F5533D"
            label="Localisation"
            onClick={() => setShowLocationInput((v) => !v)}
            active={showLocationInput || !!location}
          />
          <ToolbarIcon icon={Music} color="#8B5CF6" label="Musique" onClick={() => {}} />
          <ToolbarIcon
            icon={Smile}
            color="#F5C518"
            label="Émoji"
            onClick={() => setShowEmoji((v) => !v)}
            active={showEmoji}
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!hasContent || overLimit || isSubmitting}
        className={cn(
          "w-full rounded-full h-11 font-semibold transition-all duration-300 disabled:opacity-100 disabled:pointer-events-none",
          hasContent && !overLimit
            ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white shadow-md shadow-[#A35A2A]/25"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Publication...
          </span>
        ) : (
          "Publier"
        )}
      </Button>
    </>
  )

  return (
    <>
      <input
        key={`image-${fileInputKey}`}
        ref={imageFileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onImageInputChange}
      />
      <input
        key={`video-${fileInputKey}`}
        ref={videoFileRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={onVideoInputChange}
      />

      {/* collapsed trigger card */}
      <div className={cn("bg-white rounded-3xl p-4 shadow-sm border border-gray-100", className)}>
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={user?.avatar || user?.image || null} name={displayName} size="md" />
          <button
            onClick={openModal}
            className="flex-1 text-left bg-gray-100 hover:bg-gray-200 transition rounded-full px-4 py-2.5 text-[15px] text-[#65676B]"
          >
            Quoi de neuf, {displayName.split(" ")[0]} ?
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 -mx-1">
          <TriggerAction icon={ImageIcon} color="#45BD62" label="Photo" onClick={() => imageFileRef.current?.click()} />
          <TriggerAction icon={Video} color="#EC4899" label="Vidéo" onClick={() => videoFileRef.current?.click()} />
          <TriggerAction icon={BarChart3} color="#10B981" label="Sondage" onClick={openModal} />
          <button
            onClick={openModal}
            className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#65676B] hover:bg-gray-100 px-2 py-2 rounded-xl transition mx-1"
          >
            <ColorfulTextIcon size={18} />
            <span className="hidden xs:inline sm:inline">Texte coloré</span>
          </button>
        </div>
      </div>

      {/* modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 flex items-center justify-center relative p-4 z-20">
              <h3 className="text-[17px] font-semibold text-[#050505]">Créer une publication</h3>
              <button
                onClick={closeModal}
                className="absolute right-4 p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Fermer"
              >
                <X size={18} className="text-[#65676B]" />
              </button>
            </div>
            <div className="p-4">
              {composerBody()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TriggerAction({
  icon: Icon,
  color,
  label,
  onClick,
}: {
  icon: typeof ImageIcon
  color: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#65676B] hover:bg-gray-100 px-2 py-2 rounded-xl transition mx-1"
    >
      <Icon size={18} style={{ color }} />
      <span className="hidden xs:inline sm:inline">{label}</span>
    </button>
  )
}

function ToolbarIcon({
  icon: Icon,
  color,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: typeof ImageIcon
  color: string
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center transition",
        disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 hover:scale-105",
        active && "bg-gray-100 ring-1 ring-gray-200"
      )}
    >
      <Icon size={19} style={{ color }} />
    </button>
  )
}

// Icône "Aa" carrée multicolore, façon sélecteur d'arrière-plan texte
// (comme le picto de composition de post coloré type Facebook)
function ColorfulTextIcon({ size = 20 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-[7px] font-extrabold select-none shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        lineHeight: 1,
        letterSpacing: "-0.5px",
        color: "#fff",
        background:
          "linear-gradient(135deg, #F59E0B 0%, #F5533D 25%, #EC4899 50%, #A855F7 75%, #3B82F6 100%)",
        textShadow: "0 1px 1px rgba(0,0,0,0.15)",
      }}
    >
      Aa
    </span>
  )
}