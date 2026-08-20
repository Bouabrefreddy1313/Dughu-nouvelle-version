"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, CheckCircle2, Sparkles, ArrowRight, UserRound, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { isDefaultDughuMedia } from "@/lib/dughu"

type OnboardingUser = {
  id: string
  avatar?: string | null
  cover?: string | null
  name?: string | null
  onboardingCompleted?: boolean
}

type UploadType = "avatar" | "cover"

const DEFAULT_AVATAR = "/images/avatar.png"
const DEFAULT_COVER = "/images/group/default-cover.jpg"

export default function OnboardingProfilePage() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<OnboardingUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragType, setDragType] = useState<UploadType | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const loadUser = async () => {
    // Plus de cache localStorage : source de vérité = /api/auth/me (cookies Dughu)
    try {
      const res = await fetch("/api/auth/me")
      const data = await res.json()
      if (data?.success && data.user) {
        setUser(data.user)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUser()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
    }
  }, [avatarPreview, coverPreview])

  const hasRealAvatar = !!avatarPreview || !!avatarFile || (!!user?.avatar && !isDefaultDughuMedia(user.avatar))
  const hasRealCover = !!coverPreview || !!coverFile || (!!user?.cover && !isDefaultDughuMedia(user.cover))
  const avatarOk = hasRealAvatar
  const coverOk = hasRealCover
  const complete = avatarOk && coverOk

  const persistUser = (nextUser: OnboardingUser) => {
    setUser(nextUser)
  }

  const selectedAvatar = useMemo(() => avatarPreview || user?.avatar || DEFAULT_AVATAR, [avatarPreview, user?.avatar])

  const setPreviewFile = (type: UploadType, file: File) => {
    const previewUrl = URL.createObjectURL(file)
    if (type === "avatar") {
      if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(previewUrl)
      setAvatarFile(file)
    } else {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
      setCoverPreview(previewUrl)
      setCoverFile(file)
    }
  }

  const handleInput = (type: UploadType, file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image valide.")
      return
    }
    setPreviewFile(type, file)
  }

  const openPicker = (type: UploadType) => {
    if (type === "avatar") avatarInputRef.current?.click()
    else coverInputRef.current?.click()
  }

  const onDrop = (type: UploadType) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragType(null)
    handleInput(type, e.dataTransfer.files?.[0])
  }

  const handleContinue = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const nextUser: OnboardingUser = { ...user }

      if (avatarFile) {
        const avatarFormData = new FormData()
        avatarFormData.append("userId", user.id)
        avatarFormData.append("avatar", avatarFile)
        const res = await fetch("/api/profile/avatar", { method: "POST", body: avatarFormData })
        const data = await res.json()
        const resolvedAvatar = String(data?.avatar || data?.image || nextUser.avatar || "")
        if (!resolvedAvatar) throw new Error(data?.message || "Erreur lors de la mise à jour de l'avatar.")
        nextUser.avatar = resolvedAvatar
      }

      if (coverFile) {
        const coverFormData = new FormData()
        coverFormData.append("userId", user.id)
        coverFormData.append("cover", coverFile)
        const res = await fetch("/api/profile/cover", { method: "POST", body: coverFormData })
        const data = await res.json()
        const resolvedCover = String(data?.cover || nextUser.cover || "")
        if (!resolvedCover) throw new Error(data?.message || "Erreur lors de la mise à jour de la couverture.")
        nextUser.cover = resolvedCover
      }

      const completed = !!(nextUser.avatar && !isDefaultDughuMedia(nextUser.avatar) && nextUser.cover && !isDefaultDughuMedia(nextUser.cover))
      persistUser({ ...nextUser, onboardingCompleted: completed })
      toast.success("Profil mis à jour avec succès !")
      router.push("/home")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour du profil.")
    } finally {
      setSaving(false)
    }
  }

  const previewItems = [
    { label: "Photo de profil", ok: avatarOk, textOk: "Photo de profil OK", textBad: "Photo de profil manquante" },
    { label: "Photo de couverture", ok: coverOk, textOk: "Couverture OK", textBad: "Couverture manquante" },
    { label: "Accès au fil", ok: complete, textOk: "Débloqué", textBad: "Bloqué" },
  ]

  return (
    <MainLayout user={user} wide noRightSidebar>
      <div className="min-h-[calc(100vh-56px)] bg-[radial-gradient(circle_at_top,rgba(212,165,116,0.16),transparent_34%),linear-gradient(180deg,#f8f4ef_0%,#f7f8fa_40%,#f7f8fa_100%)] py-6 sm:py-8">
        <div className="mx-auto grid max-w-6xl gap-6 px-3 sm:px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.06)] backdrop-blur sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#A35A2A]/10 px-4 py-2 text-sm font-semibold text-[#A35A2A]">
              <Sparkles size={16} />
              Finalisez votre inscription
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-[#050505] sm:text-4xl">
              Ajoutez vos photos pour entrer dans Dughu
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#65676B]">
              Sélectionnez d’abord votre photo de profil et votre photo de couverture pour les prévisualiser. La mise à jour réelle se fera uniquement quand vous cliquerez sur le bouton de validation.
            </p>

            <div className="mt-6 rounded-2xl border border-[#A35A2A]/15 bg-[#FFF8F1] p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm font-semibold text-[#050505]">
                <span>Photos requises pour débloquer le fil</span>
                <span className="text-[#A35A2A]">{complete ? "2/2" : `${(avatarOk ? 1 : 0) + (coverOk ? 1 : 0)}/2`}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[#A35A2A] transition-all" style={{ width: `${((avatarOk ? 1 : 0) + (coverOk ? 1 : 0)) * 50}%` }} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "1", text: "Uploader l'avatar" },
                { label: "2", text: "Uploader la couverture" },
                { label: "3", text: "Valider et accéder au fil" },
              ].map((step) => (
                <div key={step.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#A35A2A]/10 text-sm font-bold text-[#A35A2A]">
                    {step.label}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#050505]">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => openPicker("avatar")} className="inline-flex items-center gap-2 rounded-full bg-[#A35A2A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8B4A1F]">
                <ImagePlus size={18} />
                Choisir une photo de profil
              </button>
              <button onClick={() => openPicker("cover")} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-[#050505] transition hover:border-[#A35A2A] hover:text-[#A35A2A]">
                <ImageIcon size={18} />
                Choisir une couverture
              </button>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {[
                {
                  type: "avatar" as UploadType,
                  title: "Photo de profil",
                  hint: "Cliquez ou glissez une image",
                  preview: avatarPreview || user?.avatar || DEFAULT_AVATAR,
                  ok: avatarOk,
                  inputRef: avatarInputRef,
                  active: dragType === "avatar",
                },
                {
                  type: "cover" as UploadType,
                  title: "Photo de couverture",
                  hint: "Cliquez ou glissez une image",
                  preview: coverPreview || user?.cover || DEFAULT_COVER,
                  ok: coverOk,
                  inputRef: coverInputRef,
                  active: dragType === "cover",
                },
              ].map((cfg) => (
                <div key={cfg.type} className="rounded-3xl border border-gray-100 bg-[#F7F8FA] p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#050505]">
                    {cfg.type === "avatar" ? <UserRound size={18} className="text-[#A35A2A]" /> : <ImageIcon size={18} className="text-[#A35A2A]" />}
                    {cfg.title}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragType(cfg.type)
                    }}
                    onDragLeave={() => setDragType(null)}
                    onDrop={onDrop(cfg.type)}
                    onClick={() => openPicker(cfg.type)}
                    className={`group mt-3 cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition ${cfg.active ? "border-[#A35A2A] bg-white shadow-sm" : cfg.ok ? "border-emerald-300 bg-emerald-50 hover:border-emerald-400" : "border-gray-200 bg-white/70 hover:border-[#A35A2A] hover:bg-white"}`}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img src={cfg.preview} alt={cfg.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.01]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-white">
                        <div>
                          <p className="text-sm font-semibold">{cfg.ok ? "Image sélectionnée" : "Aucune image"}</p>
                          <p className="text-xs text-white/80">{cfg.hint}</p>
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cfg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-[#A35A2A]/10 text-[#A35A2A]"}`}>
                          <ImagePlus size={22} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[32px] border border-white/70 bg-[#050505] p-5 text-white shadow-[0_20px_80px_rgba(0,0,0,0.15)] sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
              <CheckCircle2 size={16} className="text-[#D4A574]" />
              Aperçu du profil
            </div>

            <div className="mt-6 overflow-hidden rounded-[28px] bg-[#111111] ring-1 ring-white/10">
              <div className="h-36 bg-gradient-to-br from-[#A35A2A] via-[#D4A574] to-[#F7CFA4]" />
              <div className="relative px-5 pb-5 pt-0">
                <div className="-mt-10 flex items-end gap-4">
                  <div className={`h-20 w-20 overflow-hidden rounded-full border-4 ${avatarOk ? "border-emerald-400" : "border-red-500"} bg-[#1B1B1B]`}>
                    <img src={avatarPreview || user?.avatar || DEFAULT_AVATAR} alt="Avatar" className={`h-full w-full object-cover ${avatarOk ? "" : "opacity-60"}`} />
                  </div>
                  <div className="pb-1">
                    <p className="text-lg font-bold">{user?.name || "Votre nom"}</p>
                    <p className="text-sm text-white/60">Prévisualisez avant validation</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-white/5 p-4 text-sm text-white/80">
                  {previewItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <span className={item.ok ? "text-emerald-400" : "text-red-300"}>{item.ok ? item.textOk : item.textBad}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-white/50">
                  La mise à jour réelle de vos images est effectuée uniquement au clic sur le bouton de validation.
                </p>

                <button
                  onClick={handleContinue}
                  disabled={!complete || loading || saving}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D4A574] px-5 py-3 text-sm font-bold text-[#050505] transition hover:bg-[#E3B98B] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuer vers le fil d&apos;actualité
                  <ArrowRight size={16} className={saving ? "animate-pulse" : ""} />
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-white/50">
                  Le bouton restera désactivé tant que les deux images ne sont pas sélectionnées.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInput("avatar", e.target.files?.[0])} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInput("cover", e.target.files?.[0])} />

      {loading && (
        <div className="fixed inset-0 z-[9998] grid place-items-center bg-white/70 backdrop-blur-sm">
          <div className="rounded-3xl bg-white px-6 py-5 shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D4A574]/25 border-t-[#A35A2A]" />
          </div>
        </div>
      )}
    </MainLayout>
  )
}