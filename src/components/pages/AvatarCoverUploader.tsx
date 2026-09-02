"use client"

/**
 * Uploader avatar / cover d'un espace (POST /page/uploadImage, multipart :
 * page_id, image, element = avatar|cover). Réservé aux admins (affiché par
 * SpaceDetailPage uniquement si isAdmin).
 */

import { useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Camera, Loader2 } from "lucide-react"
import { useUploadPageImage } from "@/hooks/pages/use-pages"

interface AvatarCoverUploaderProps {
  pageId: string
  currentAvatar: string
  currentCover: string
}

export default function AvatarCoverUploader({ pageId, currentAvatar, currentCover }: AvatarCoverUploaderProps) {
  const uploadMutation = useUploadPageImage(pageId)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const pickAndUpload = (element: "avatar" | "cover", file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image.")
      return
    }
    uploadMutation.mutate(
      { file, element },
      {
        onError: () => toast.error(`Impossible de mettre à jour ${element === "avatar" ? "l'avatar" : "la couverture"}.`),
        onSuccess: (result) => {
          if (result.success === false) toast.error(result.message || "Impossible d'envoyer l'image.")
          else toast.success(element === "avatar" ? "Avatar mis à jour !" : "Couverture mise à jour !")
        },
      }
    )
  }

  return (
    <>
      {/* Avatar */}
      <span className="absolute -bottom-4 left-4 z-10">
        <span className="relative block size-20 overflow-hidden rounded-2xl border-4 border-white bg-[#F0F2F5] shadow-md">
          <Image
            src={currentAvatar || "/images/avatar.png"}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={currentAvatar?.startsWith("http")}
          />
          {uploadMutation.isPending && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Loader2 size={18} className="animate-spin text-white" />
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="absolute -right-2 -bottom-1 flex size-7 items-center justify-center rounded-full bg-[#A35A2A] text-white shadow transition hover:bg-[#8B4A1F]"
          aria-label="Changer l'avatar"
        >
          <Camera size={13} />
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickAndUpload("avatar", e.target.files?.[0])}
        />
      </span>

      {/* Cover */}
      <button
        type="button"
        onClick={() => coverInputRef.current?.click()}
        className="absolute right-4 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60"
        aria-label="Changer la couverture"
      >
        <Camera size={13} />
        {uploadMutation.isPending ? "Envoi…" : "Couverture"}
      </button>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickAndUpload("cover", e.target.files?.[0])}
      />
    </>
  )
}