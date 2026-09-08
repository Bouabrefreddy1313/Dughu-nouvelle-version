"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { MediaDisplay } from "@/components/common/MediaDisplay"
import { HashtagText } from "@/components/common/HashtagText"

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
 * N'est utilisé QUE pour les médias détectés dans le texte brut (`/uploads/...`),
 * où l'on n'a pas d'autre info que fileType. Pour les champs image/video/file
 * dédiés, le type est passé explicitement — voir pushMedia dans parseCommentContent.
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
 *
 * IMPORTANT : `image`, `video` et `file` sont des champs distincts et typés par construction
 * (ex: `image` peut être la miniature d'une vidéo, mais reste un fichier de type "image").
 * On ne doit donc JAMAIS leur appliquer `fileType` (qui décrit le média "principal" du commentaire,
 * typiquement la vidéo) — sinon la miniature vidéo est elle-même classée "video" et s'affiche
 * en double à côté de la vraie vidéo. `fileType` ne sert qu'à désambiguïser les lignes
 * `/uploads/...` trouvées dans le texte brut, où le type n'est pas connu autrement.
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

  const pushMedia = (src: string, type: "image" | "video" | "file") => {
    // Déduplique les médias par URL : un même fichier peut apparaître à la fois
    // dans les champs image/video et dans le texte (commentaires plus anciens).
    if (!src || seen.has(src)) return
    seen.add(src)
    media.push({ src, type, name: mediaFileName(src) })
  }

  // Types explicites : ces champs sont sans ambiguïté, pas besoin de deviner.
  if (image) pushMedia(image, "image")
  if (video) pushMedia(video, "video")
  if (file) pushMedia(file, detectMediaType(file, fileType))

  const textParts: string[] = []
  const raw = content || ""
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (t.startsWith("/uploads/") || t.startsWith("/media/")) {
      // Ici on ne connaît pas le type autrement, donc on déduit à partir de l'extension
      // (fileType n'est volontairement pas passé : il décrirait le média principal,
      // pas forcément celui de cette ligne).
      pushMedia(t, detectMediaType(t))
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
  // Quand une vidéo est présente, le champ image correspond à son thumbnail :
  // on ne l'affiche pas pour éviter d'avoir deux cadres (image + vidéo).
  const images = videos.length > 0
    ? []
    : media.filter((m) => m.type === "image")
  const files = media.filter((m) => m.type === "file")

  return (
    <div className={cn("space-y-2", className)}>
      {text && (
        <p
          className={cn(
            "text-[#050505] dark:text-[#F3F4F6] whitespace-pre-wrap break-words",
            size === "sm" ? "text-[13px]" : "text-[14px]"
          )}
        >
          <HashtagText text={text} />
        </p>
      )}

      {images.map((img, i) => (
        <MediaDisplay key={`img-${i}`} image={img.src} fileType="image" className="max-w-[180px]" maxHeight="120px" />
      ))}

      {videos.map((v, i) => (
        // `image` est la miniature associée à la vidéo (thumbnail) : on la passe en poster,
        // elle ne s'affiche jamais comme média séparé (cf. filtre `images` ci-dessus).
        <MediaDisplay key={`vid-${i}`} video={v.src} image={image} fileType="video" className="max-w-[180px]" maxHeight="120px" />
      ))}

      {files.map((f, i) => (
        <a
          key={i}
          href={f.src}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F0F2F5] hover:bg-gray-200 dark:bg-[#2A2A2A] dark:hover:bg-[#333333] transition text-[13px] text-[#050505] dark:text-[#F3F4F6]"
        >
          <FileText size={16} className="text-[#A35A2A] shrink-0" />
          <span className="truncate">{f.name || "Fichier joint"}</span>
        </a>
      ))}
    </div>
  )
}