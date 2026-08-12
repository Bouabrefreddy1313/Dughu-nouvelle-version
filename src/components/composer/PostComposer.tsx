"use client"

import { useState, useRef } from "react"
import { X, Plus, Send, ImageIcon, BarChart3, PlusCircle, MapPin, Music, Mic, ChevronDown, Video, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_COLORS, BackgroundColor } from "./BackgroundPicker"
import Avatar from "@/components/common/Avatar"
import { Button } from "@/components/ui/button"

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
  }) => void
  className?: string
}

type PostType = "image" | "video" | "ai" | "poll" | null

export function PostComposer({ user, onSubmit, className }: PostComposerProps) {
  const [text, setText] = useState("")
  const [selectedColor, setSelectedColor] = useState<BackgroundColor | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [showMore, setShowMore] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [postType, setPostType] = useState<PostType>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasContent = text.trim().length > 0 || images.length > 0 || videos.length > 0 || selectedColor !== null

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setImages((prev) => [...prev, ...Array.from(files)])
      setPostType("image")
      setShowPostModal(true)
    }
    // Reset input by changing key
    setFileInputKey((prev) => prev + 1)
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setVideos((prev) => [...prev, ...Array.from(files)])
      setPostType("video")
      setShowPostModal(true)
    }
    // Reset input by changing key
    setFileInputKey((prev) => prev + 1)
  }

  const handleSubmit = () => {
    if (!hasContent) return
    onSubmit?.({
      content: text,
      color: selectedColor,
      images: images,
      videos: videos,
    })
    setText("")
    setImages([])
    setVideos([])
    setSelectedColor(null)
    setShowMore(false)
    setShowPostModal(false)
    setPostType(null)
  }

  const openModal = (type: PostType) => {
    setPostType(type)
    setShowPostModal(true)
  }

  return (
    <>
      <div className={cn("bg-white rounded-3xl p-5 shadow-sm border border-gray-100", className)}>
        <input
          key={`image-${fileInputKey}`}
          ref={imageFileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          key={`video-${fileInputKey}`}
          ref={videoFileRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleVideoSelect}
        />

        {selectedColor ? (
          <div
            className="rounded-2xl mb-3 min-h-[160px] p-4 flex flex-col cursor-text transition-all"
            style={{ background: selectedColor.bg, color: selectedColor.text }}
            onClick={() => textareaRef.current?.focus()}
          >
            <div className="flex items-center gap-2 mb-2">
              <Avatar
                src={user?.avatar || user?.image || null}
                name={user?.name || "Utilisateur"}
                size="sm"
              />
              <span className="text-[13px] font-semibold opacity-90">{user?.name || "Utilisateur"}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedColor(null) }}
                className="ml-auto p-1 rounded-full hover:bg-black/10 transition"
                aria-label="Retirer la couleur"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écrivez ici..."
              className="flex-1 bg-transparent resize-none outline-none text-[20px] font-bold placeholder-white/60 min-h-[90px] w-full"
              rows={3}
            />
          </div>
        ) : (
          <div className="flex gap-3 mb-3">
            <Avatar
              src={user?.avatar || user?.image || null}
              name={user?.name || "Utilisateur"}
              size="md"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Exprimez-vous..... #hashtag @Mention.."
              className="flex-1 bg-transparent resize-none outline-none text-[15px] text-[#050505] placeholder-[#65676B] min-h-[40px] max-h-[120px] py-2"
              rows={1}
            />
          </div>
        )}

        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {images.map((img, i) => (
              <div key={i} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden">
                <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {videos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {videos.map((video, i) => (
              <div key={i} className="relative shrink-0 w-40 h-24 rounded-xl overflow-hidden bg-black">
                <video src={URL.createObjectURL(video)} className="w-full h-full object-cover" muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                    <Video size={16} className="text-white" />
                  </div>
                </div>
                <button
                  onClick={() => setVideos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative mb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 items-center">
            <button
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-gray-100 transition",
                (images.length > 0 || videos.length > 0) && "opacity-50 cursor-not-allowed"
              )}
              disabled={images.length > 0 || videos.length > 0}
            >
              <Plus size={20} className="text-gray-700" />
            </button>
            {DEFAULT_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedColor(c)}
                disabled={images.length > 0 || videos.length > 0}
                className={cn(
                  "w-10 h-10 rounded-xl shrink-0 hover:scale-110 transition border-2",
                  selectedColor?.bg === c.bg ? "border-[#A35A2A] scale-110" : "border-transparent",
                  (images.length > 0 || videos.length > 0) && "opacity-50 cursor-not-allowed"
                )}
                style={{ background: c.bg }}
              />
            ))}
          </div>
          {(images.length > 0 || videos.length > 0) && (
            <p className="text-[11px] text-[#65676B] mt-1">Les couleurs ne sont pas disponibles quand il y a des médias</p>
          )}
        </div>

        {showMore && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <button className="flex items-center gap-2 text-[13px] font-medium text-[#2D2D2D] hover:bg-white hover:text-[#A35A2A] px-3 py-2 rounded-xl transition border border-gray-200 bg-white shadow-sm">
              <MapPin size={16} className="text-[#A35A2A]" />
              <span>Localisation</span>
            </button>
            <button className="flex items-center gap-2 text-[13px] font-medium text-[#2D2D2D] hover:bg-white hover:text-[#A35A2A] px-3 py-2 rounded-xl transition border border-gray-200 bg-white shadow-sm">
              <Music size={16} className="text-[#A35A2A]" />
              <span>Musique</span>
            </button>
            <button className="flex items-center gap-2 text-[13px] font-medium text-[#2D2D2D] hover:bg-white hover:text-[#A35A2A] px-3 py-2 rounded-xl transition border border-gray-200 bg-white shadow-sm">
              <Mic size={16} className="text-[#A35A2A]" />
              <span>Enregistrer</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1">
          <button
            onClick={() => imageFileRef.current?.click()}
            className="flex items-center gap-2 text-sm font-semibold text-[#65676B] hover:bg-gray-100 px-3 py-2 rounded-lg transition"
          >
            <ImageIcon size={20} className="text-[#6366F1]" />
            <span>Photo</span>
          </button>
          <button
            onClick={() => videoFileRef.current?.click()}
            className="flex items-center gap-2 text-sm font-semibold text-[#65676B] hover:bg-gray-100 px-3 py-2 rounded-lg transition"
          >
            <Video size={20} className="text-[#EC4899]" />
            <span>Vidéo</span>
          </button>
            <button
              onClick={() => openModal("ai")}
              className="flex items-center gap-2 text-sm font-semibold text-[#65676B] hover:bg-gray-100 px-3 py-2 rounded-lg transition whitespace-nowrap"
            >
              <img src="/images/ia.png" alt="Satrivium IA" className="w-5 h-5 object-contain" />
              <span>Satrivium IA</span>
            </button>
            <button className="flex items-center gap-2 text-sm font-semibold text-[#65676B] hover:bg-gray-100 px-3 py-2 rounded-lg transition">
              <BarChart3 size={20} className="text-[#10B981]" />
              <span>Sondage</span>
            </button>
            <button
              onClick={() => setShowMore((prev) => !prev)}
              className={cn(
                "flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition",
                showMore ? "bg-[#A35A2A]/10 text-[#A35A2A] font-medium" : "text-[#65676B] hover:bg-gray-100"
              )}
            >
              <PlusCircle size={20} />
              <span>Plus</span>
              <ChevronDown size={14} className={cn("transition-transform duration-200", showMore && "rotate-180")} />
            </button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!hasContent}
            className={cn(
              "rounded-full px-5 h-9 font-semibold flex items-center gap-1.5 transition-all duration-300 disabled:opacity-100 disabled:pointer-events-none",
              hasContent
                ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white shadow-md shadow-[#A35A2A]/25"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <span>Poster</span>
            <Send size={16} className={hasContent ? "text-yellow-400" : "text-gray-400"} />
          </Button>
        </div>
      </div>

      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4">
              <h3 className="text-lg font-semibold text-[#050505]">
                {postType === "image" && "Créer une publication avec photo"}
                {postType === "video" && "Créer une publication avec vidéo"}
                {postType === "ai" && "Créer une publication avec Satrivium IA"}
                {postType === "poll" && "Créer un sondage"}
              </h3>
              <button
                onClick={() => {
                  setShowPostModal(false)
                  setPostType(null)
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X size={20} className="text-[#65676B]" />
              </button>
            </div>
            <div className="p-4">
              {selectedColor ? (
                <div
                  className="rounded-2xl mb-3 min-h-[160px] p-4 flex flex-col"
                  style={{ background: selectedColor.bg, color: selectedColor.text }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar
                      src={user?.avatar || user?.image || null}
                      name={user?.name || "Utilisateur"}
                      size="sm"
                    />
                    <span className="text-[13px] font-semibold opacity-90">{user?.name || "Utilisateur"}</span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Écrivez ici..."
                    className="flex-1 bg-transparent resize-none outline-none text-[15px] font-semibold placeholder-white/60 min-h-[90px] w-full"
                    rows={3}
                  />
                </div>
              ) : (
                <div className="flex gap-3 mb-3">
                  <Avatar
                    src={user?.avatar || user?.image || null}
                    name={user?.name || "Utilisateur"}
                    size="md"
                  />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Exprimez-vous..... #hashtag @Mention.."
                    className="flex-1 bg-transparent resize-none outline-none text-[15px] text-[#050505] placeholder-[#65676B] min-h-[40px] max-h-[200px] py-2"
                    rows={3}
                  />
                </div>
              )}

              {images.length > 0 && (
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="relative inline-block rounded-2xl overflow-hidden shadow-lg border-4 border-gray-100">
                    <img 
                      src={URL.createObjectURL(images[0])} 
                      alt="Aperçu" 
                      className="max-w-full max-h-[400px] object-contain"
                    />
                    <button
                      onClick={() => setImages([])}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {images.slice(1).map((img, i) => (
                        <div key={i+1} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                          <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i+1))}
                            className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {videos.length > 0 && (
                <div className="flex flex-col items-center gap-3 mb-4">
                  <div className="relative inline-block rounded-2xl overflow-hidden shadow-lg border-4 border-gray-100 bg-black">
                    <video 
                      src={URL.createObjectURL(videos[0])} 
                      controls 
                      className="max-w-full max-h-[400px]"
                    />
                    <button
                      onClick={() => setVideos([])}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {videos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {videos.slice(1).map((video, i) => (
                        <div key={i+1} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-black">
                          <video src={URL.createObjectURL(video)} className="w-full h-full object-cover" muted />
                          <button
                            onClick={() => setVideos((prev) => prev.filter((_, idx) => idx !== i+1))}
                            className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative mb-3">
                <div className="flex gap-2 overflow-x-auto pb-1 items-center">
                  <button
                    onClick={() => setSelectedColor(null)}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-gray-100 transition border-2",
                      !selectedColor ? "border-[#A35A2A]" : "border-transparent",
                      (images.length > 0 || videos.length > 0) && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={images.length > 0 || videos.length > 0}
                  >
                    <X size={20} className="text-gray-700" />
                  </button>
                  {DEFAULT_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(c)}
                      disabled={images.length > 0 || videos.length > 0}
                      className={cn(
                        "w-10 h-10 rounded-xl shrink-0 hover:scale-110 transition border-2",
                        selectedColor?.bg === c.bg ? "border-[#A35A2A] scale-110" : "border-transparent",
                        (images.length > 0 || videos.length > 0) && "opacity-50 cursor-not-allowed"
                      )}
                      style={{ background: c.bg }}
                    />
                  ))}
                </div>
                {(images.length > 0 || videos.length > 0) && (
                  <p className="text-[11px] text-[#65676B] mt-1">Les couleurs ne sont pas disponibles quand il y a des médias</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => imageFileRef.current?.click()}
                    className="flex items-center gap-2 text-sm font-semibold text-[#6366F1] hover:bg-[#6366F1]/10 px-3 py-2 rounded-lg transition"
                  >
                    <ImageIcon size={20} className="text-[#6366F1]" />
                    <span>Ajouter photo</span>
                  </button>
                  <button
                    onClick={() => videoFileRef.current?.click()}
                    className="flex items-center gap-2 text-sm font-semibold text-[#EC4899] hover:bg-[#EC4899]/10 px-3 py-2 rounded-lg transition"
                  >
                    <Video size={20} className="text-[#EC4899]" />
                    <span>Ajouter vidéo</span>
                  </button>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!hasContent}
                  className={cn(
                    "rounded-full px-5 h-9 font-semibold flex items-center gap-1.5 transition-all duration-300 disabled:opacity-100 disabled:pointer-events-none",
                    hasContent
                      ? "bg-[#A35A2A] hover:bg-[#8B4A1F] text-white shadow-md shadow-[#A35A2A]/25"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <span>Poster</span>
                  <Send size={16} className={hasContent ? "text-yellow-400" : "text-gray-400"} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}