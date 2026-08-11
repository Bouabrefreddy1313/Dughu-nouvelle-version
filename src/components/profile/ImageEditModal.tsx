"use client"

import { useRef, useState, useEffect } from "react"
import { X, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ImageEditModalProps {
  open: boolean
  type: "avatar" | "cover"
  userId: string
  currentUrl?: string | null
  onClose: () => void
  onSaved: (url: string) => void
}

export function ImageEditModal({ open, type, userId, currentUrl, onClose, onSaved }: ImageEditModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPreview(null)
      setFile(null)
    }
  }, [open])

  if (!open) return null

  const isAvatar = type === "avatar"
  const title = isAvatar ? "Modifier la photo de profil" : "Modifier la photo de couverture"

  const handleFile = (f: File | null) => {
    if (!f) return
    if (!f.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image.")
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    if (!file) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("userId", userId)
      formData.append(type, file)
      const res = await fetch(`/api/profile/${type}`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        onSaved(data[type])
        toast.success(isAvatar ? "Photo de profil mise à jour !" : "Photo de couverture mise à jour !")
        onClose()
      } else {
        toast.error(data.message || "Erreur lors de l'enregistrement.")
      }
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#050505]">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition" aria-label="Fermer">
            <X size={20} className="text-[#65676B]" />
          </button>
        </div>

        <div className="p-5">
          {/* Aperçu */}
          <div className={isAvatar ? "mx-auto w-40 h-40 rounded-full overflow-hidden bg-[#F0F2F5]" : "w-full h-44 overflow-hidden bg-[#F0F2F5]"}>
            {preview ? (
              <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
            ) : (
              <img src={currentUrl || (isAvatar ? "/images/avatar.png" : "/images/group/default-cover.jpg")} alt="Actuel"
                className="w-full h-full object-cover" />
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          {/* Zone de dépôt */}
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-5 w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#A35A2A]/40 rounded-2xl py-8 bg-[#A35A2A]/5 hover:bg-[#A35A2A]/10 transition"
          >
            <Upload size={28} className="text-[#A35A2A]" />
            <span className="text-[14px] font-semibold text-[#A35A2A]">Choisir une image</span>
            <span className="text-[12px] text-[#65676B]">PNG, JPG ou GIF - max 10 Mo</span>
          </button>
        </div>

        <div className="p-5 pt-0 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-[14px] font-medium text-[#65676B] hover:bg-gray-100 transition"
          >
            Annuler
          </button>
          <button
            onClick={() => (file ? handleSave() : fileRef.current?.click())}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-semibold bg-[#A35A2A] text-white hover:bg-[#8B4A1F] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {file ? "Enregistrer" : "Sélectionner une image"}
          </button>
        </div>
      </div>
    </div>
  )
}