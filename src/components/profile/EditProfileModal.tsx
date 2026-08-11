"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"

export interface EditableProfile {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  bio?: string | null
  gender?: string | null
  birthdate?: string | null
  phone?: string | null
}

interface EditProfileModalProps {
  open: boolean
  user: EditableProfile
  onClose: () => void
  onSaved: (updated: Record<string, unknown>) => void
}

export function EditProfileModal({ open, user, onClose, onSaved }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [username, setUsername] = useState(user?.username || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [gender, setGender] = useState(user?.gender || "")
  const [birthdate, setBirthdate] = useState(user?.birthdate ? user.birthdate.slice(0, 10) : "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          firstName,
          lastName,
          username,
          bio,
          gender,
          birthdate: birthdate || "",
          phone,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSaved(data.user)
        toast.success("Profil mis à jour !")
        onClose()
      } else {
        toast.error(data.message || "Erreur lors de la mise à jour.")
      }
    } catch {
      toast.error("Erreur réseau.")
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "w-full h-10 rounded-lg border border-gray-200 bg-[#F7F8FA] px-3 text-[14px] outline-none focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20 transition"
  const labelCls = "block text-[13px] font-semibold text-[#2D2D2D] mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4 rounded-t-3xl">
          <h3 className="text-lg font-semibold text-[#050505]">Modifier le profil</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition" aria-label="Fermer">
            <X size={20} className="text-[#65676B]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Nom d'utilisateur</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Biographie</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Parlez-nous de vous..."
              className="w-full rounded-lg border border-gray-200 bg-[#F7F8FA] px-3 py-2 text-[14px] outline-none focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Genre</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                <option value="">Non précisé</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date de naissance</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="p-5 pt-0 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-[14px] font-medium text-[#65676B] hover:bg-gray-100 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-semibold bg-[#A35A2A] text-white hover:bg-[#8B4A1F] transition disabled:opacity-60"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}