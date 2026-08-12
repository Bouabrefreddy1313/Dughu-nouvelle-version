"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { MediaDisplay } from "@/components/common/MediaDisplay"

export interface CommentMediaEntry {
  src: string
  type: "image" | "video" | "file"
  name?: string
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|jfif)$/i
const VIDEO_RE = /\.(mp4|webm|ogg|ogv|mov|m4v|avi|mkv|3gp|mpeg|m3u8|wmv)$/i

/**
 * Déduit le type d'un média à partir de son URL/chemin.
 * Le `fileType` renvoyé par l'API (image/video/file) est prioritaire s'il est exploitable.
 */
export function detectMediaType(src: string, fileType?: string | null): "image" | "video" | "file" {
  const ft = (fileType || "").toLowerCase().trim()
  if (ft.startsWith("image")) return "image"
  if (ft.startsWith("video")) return "video"
  if (ft === "file" || ft === "document" || ft === "pdf" || ft === "audio") return "file"
  const lower = src.split("?")[0].toLowerCase()
  if (IMAGE_RE.test(lower)) return "image"
  if (VIDEO_RE.test(lower)) return "video"
  return "file"
}

function mediaFileName(src: string): string {
  try {
    return decodeURIComponent(src.split("?")[0].split("/").pop() || "")
  } catch {
    return ""
  }
}

/**
 * Sépare le texte d'un commentaire de ses pièces jointes.
 * - Les fichiers uploadés localement sont stockés comme lignes `/uploads/...` dans le champ `content`.
 * - Les commentaires Dughu fournissent `image` / `video` / `file` séparément
 *   (champs `file_path` + `file_type` normalisés dans `mapComment`).
 */
export function parseCommentContent(
  content?: string,
  image?: string | null,
  video?: string | null,
  file?: string | null,
  fileType?: string | null
): { text: string; media: CommentMediaEntry[] } {
  const media: CommentMediaEntry[] = []
  const seen = new Set<string>()
  const ft = (fileType || "").toLowerCase()
  const pushMedia = (src: string) => {
    // Déduplique les médias par URL : un même fichier peut apparaître à la fois
    // dans les champs image/video et dans le texte (commentaires plus anciens).
    if (!src || seen.has(src)) return
    seen.add(src)
    media.push({ src, type: detectMediaType(src, ft), name: mediaFileName(src) })
  }

  if (image) pushMedia(image)
  if (video) pushMedia(video)
  if (file) pushMedia(file)

  const textParts: string[] = []
  const raw = content || ""
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (t.startsWith("/uploads/") || t.startsWith("/media/")) {
      pushMedia(t)
    } else {
      textParts.push(line)
    }
  }

  return { text: textParts.join("\n").trim(), media }
}

/**
 * Rendu du corps d'un commentaire : texte + images/vidéos/fichiers joints.
 *
 * @param size  `"md"` pour un commentaire (14px), `"sm"` pour une réponse (13px)
 */
export function CommentBody({
  content,
  image,
  video,
  file,
  fileType,
  size = "md",
  className,
}: {
  content?: string
  image?: string | null
  video?: string | null
  file?: string | null
  fileType?: string | null
  size?: "sm" | "md"
  className?: string
}) {
  const { text, media } = parseCommentContent(content, image, video, file, fileType)
  const videos = media.filter((m) => m.type === "video")
  const images = media.filter((m) => m.type === "image")
  const files = media.filter((m) => m.type === "file")

  return (
    <div className={cn("space-y-2", className)}>
      {text && (
        <p
          className={cn(
            "text-[#050505] whitespace-pre-wrap",
            size === "sm" ? "text-[13px]" : "text-[14px]"
          )}
        >
          {text}
        </p>
      )}

      {images.map((img, i) => (
        <MediaDisplay key={`img-${i}`} image={img.src} fileType="image" className="max-w-[220px]" maxHeight="150px" />
      ))}

      {videos.map((v, i) => (
        <MediaDisplay key={`vid-${i}`} video={v.src} fileType="video" className="max-w-[220px]" maxHeight="150px" />
      ))}

      {files.map((f, i) => (
        <a
          key={i}
          href={f.src}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F0F2F5] hover:bg-gray-200 transition text-[13px] text-[#050505]"
        >
          <FileText size={16} className="text-[#A35A2A] shrink-0" />
          <span className="truncate">{f.name || "Fichier joint"}</span>
        </a>
      ))}
    </div>
  )
}
