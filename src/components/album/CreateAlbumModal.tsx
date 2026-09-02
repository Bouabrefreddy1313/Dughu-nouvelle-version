"use client"

/**
 * Modale de création d'un album : nom (obligatoire), visibilité (radio
 * Public/Privé), upload multiple de fichiers avec prévisualisation et
 * indicateur de progression. Validation avant envoi.
 */

import { useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { AlbumVisibility } from "@/types/album/album.types"
import { cn } from "@/lib/utils"

interface CreateAlbumModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: { albumName: string; type: AlbumVisibility; files: File[] }) => void
  /** Progression d'upload (0–100) ; undefined quand inactif. */
  progress?: number
  pending?: boolean
  /** Message d'erreur renvoyé par la mutation. */
  error?: string | null
}

/** Formats acceptés et taille max (20 Mo par fichier). */
const ACCEPTED_TYPES = "image/*,video/*"
const MAX_FILE_SIZE = 20 * 1024 * 1024

const VISIBILITY_OPTIONS: { value: AlbumVisibility; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Visible par toute la communauté" },
  { value: "private", label: "Privé", hint: "Visible uniquement par vous" },
]

export default function CreateAlbumModal({
  open,
  onOpenChange,
  onSubmit,
  progress,
  pending = false,
  error,
}: CreateAlbumModalProps) {
  const [albumName, setAlbumName] = useState("")
  const [type, setType] = useState<AlbumVisibility>("public")
  const [files, setFiles] = useState<File[]>([])
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const nameError = touched && albumName.trim() === "" ? "Le nom de l'album est obligatoire." : ""
  const filesError = touched && files.length === 0 ? "Ajoutez au moins une photo ou vidéo." : ""
  const tooLarge = files.some((file) => file.size > MAX_FILE_SIZE)

  const reset = () => {
    setAlbumName("")
    setType("public")
    setFiles([])
    setTouched(false)
  }

  const close = (next: boolean) => {
    if (pending) return
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (albumName.trim() === "" || files.length === 0 || tooLarge) return
    onSubmit({ albumName: albumName.trim(), type, files })
  }

  const removeFile = (target: File) => {
    setFiles((current) => current.filter((file) => file !== target))
  }

  const previews = files.map((file) => ({
    file,
    url: URL.createObjectURL(file),
    isVideo: file.type.startsWith("video/"),
  }))

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#2D2D2D]">Créer un album</DialogTitle>
          <DialogDescription className="text-sm text-[#65676B]">
            Rassemblez vos photos et vidéos dans un nouvel album.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom de l'album */}
          <div>
            <label htmlFor="album-name" className="mb-1 block text-sm font-semibold text-[#2D2D2D]">
              Nom de l&apos;album <span className="text-red-500">*</span>
            </label>
            <input
              id="album-name"
              type="text"
              value={albumName}
              onChange={(event) => setAlbumName(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Ex. Vacances 2026"
              maxLength={80}
              className={cn(
                "w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm text-[#2D2D2D] placeholder:text-[#8A8D91] focus:bg-white focus:outline-none",
                nameError ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-[#A35A2A]"
              )}
              aria-invalid={!!nameError}
            />
            {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </div>

          {/* Visibilité */}
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-[#2D2D2D]">Visibilité</legend>
            <div className="space-y-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
                    type === option.value ? "border-[#A35A2A] bg-[#F5EFE8]/60" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="album-visibility"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    className="mt-0.5 accent-[#A35A2A]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#2D2D2D]">{option.label}</span>
                    <span className="block text-xs text-[#65676B]">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Fichiers */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="album-files" className="text-sm font-semibold text-[#2D2D2D]">
                Photos / vidéos <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#A35A2A]/40 px-3 py-1 text-xs font-semibold text-[#A35A2A] transition hover:bg-[#F5EFE8]"
              >
                <ImagePlus size={13} aria-hidden />
                Ajouter
              </button>
            </div>
            <input
              ref={inputRef}
              id="album-files"
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="sr-only"
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? [])
                setFiles((current) => [...current, ...selected])
                event.target.value = ""
              }}
            />

            {files.length === 0 ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-6 text-center transition hover:border-[#A35A2A]/50 hover:bg-[#F5EFE8]/40"
              >
                <ImagePlus size={22} className="text-[#A35A2A]" aria-hidden />
                <span className="text-xs font-medium text-[#65676B]">
                  Cliquez pour choisir vos fichiers (images ou vidéos, 20 Mo max par fichier)
                </span>
              </button>
            ) : (
              <>
                <ul className="grid grid-cols-3 gap-2">
                  {previews.map(({ file, url, isVideo }) => (
                    <li
                      key={`${file.name}-${file.lastModified}`}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                    >
                      {isVideo ? (
                        <video src={url} className="size-full object-cover" muted playsInline />
                      ) : (
                        <Image src={url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(file)}
                        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                        aria-label={`Retirer ${file.name}`}
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                {filesError && <p className="mt-1 text-xs text-red-600">{filesError}</p>}
                {tooLarge && <p className="mt-1 text-xs text-red-600">Un ou plusieurs fichiers dépassent 20 Mo.</p>}
              </>
            )}
          </div>

          {/* Progression + erreurs */}
          {pending && typeof progress === "number" && (
            <div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-[#A35A2A] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-[#65676B]">Envoi… {progress}%</p>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-gray-200 text-[#65676B]"
              onClick={() => close(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" className="rounded-xl bg-[#A35A2A] text-white hover:bg-[#8B5A2B]" disabled={pending}>
              {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
              Créer l&apos;album
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
