"use client"

import Image from "next/image"
import { ImagePlus, Trash2 } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface Props { label: string; kind: "avatar" | "cover"; file: File | null; error?: string; disabled?: boolean; onChange: (file: File | null) => void }

export function GroupImageField({ label, kind, file, error, disabled, onChange }: Props) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  useEffect(() => {
    if (!file) { setPreviewUrl(""); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return <fieldset className="min-w-0">
    <legend className="mb-2 text-sm font-semibold text-[#2D2D2D]">{label} <span aria-hidden="true">*</span></legend>
    <div className={cn("relative overflow-hidden border-2 border-dashed bg-[#F7F3EF]", kind === "cover" ? "aspect-[16/7] rounded-xl" : "mx-auto aspect-square w-40 rounded-full", error ? "border-red-500" : "border-[#C47830]/40")}>
      {previewUrl ? <Image src={previewUrl} alt={`Aperçu de ${label.toLocaleLowerCase("fr")}`} fill unoptimized className="object-cover" sizes={kind === "cover" ? "(max-width: 768px) 100vw, 700px" : "160px"} /> :
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="flex size-full min-h-32 flex-col items-center justify-center gap-2 p-4 text-sm font-medium text-[#6B3F1D] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#6B3F1D] disabled:opacity-50"><ImagePlus size={28} aria-hidden="true" />Ajouter une image</button>}
    </div>
    <input ref={inputRef} id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-hint`} onChange={(event) => { onChange(event.target.files?.[0] || null); event.target.value = "" }} />
    <p id={`${id}-hint`} className="mt-2 text-center text-xs text-[#65676B]">JPEG, PNG ou WebP · 5 Mo maximum</p>
    {error && <p id={`${id}-error`} className="mt-1 text-center text-sm text-red-700" role="alert">{error}</p>}
    {file && <div className="mt-3 flex flex-wrap justify-center gap-2">
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="min-h-11 rounded-full border border-[#6B3F1D] px-4 text-sm font-semibold text-[#6B3F1D] disabled:opacity-50">Remplacer</button>
      <button type="button" onClick={() => onChange(null)} disabled={disabled} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 size={17} aria-hidden="true" />Supprimer</button>
    </div>}
  </fieldset>
}
