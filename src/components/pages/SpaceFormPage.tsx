"use client"

/**
 * Formulaire de création / édition d'un espace (POST /page).
 * - Mode Création : Wizard en 3 étapes guidées :
 *     Étape 1 : Photo de couverture & photo de profil (avec prévisualisation immédiate).
 *     Étape 2 : Informations d'identité (nom, titre, description).
 *     Étape 3 : Catégorie, coordonnées (site web, téléphone, adresse) et permissions.
 * - Mode Édition : Vue directe pré-remplie permettant de mettre à jour les informations.
 */

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  FileText,
  ImageIcon,
  Layers,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth/use-auth"
import { useCreateOrUpdatePage, usePageCategories, usePageDetail } from "@/hooks/pages/use-pages"
import type { PageFormValues } from "@/types/pages/pages.types"
import { PageSkeleton } from "./PageStates"
import { cn } from "@/lib/utils"

interface SpaceFormPageProps {
  /** ID de l'espace à éditer (absent = création). */
  editPageId?: string
}

const EMPTY: PageFormValues = {
  pageName: "",
  pageTitle: "",
  pageDescription: "",
  pageCategory: "",
  website: "",
  phone: "",
  address: "",
  usersPost: false,
}

const INPUT_CLASS =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2D2D2D] outline-none transition focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/20"

const STEPS = [
  { id: 1, title: "Photos", icon: Camera, desc: "Couverture & profil" },
  { id: 2, title: "Informations", icon: FileText, desc: "Identité de l'espace" },
  { id: 3, title: "Catégorie & Contact", icon: Layers, desc: "Coordonnées" },
] as const

type StepNumber = 1 | 2 | 3

/** Prévisualisation d'un fichier image téléversé. */
function ImageUploadBox({
  label,
  sublabel,
  file,
  onSelect,
  onRemove,
  aspect = "banner",
}: {
  label: string
  sublabel: string
  file: File | null
  onSelect: (file: File) => void
  onRemove: () => void
  aspect?: "banner" | "avatar"
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (!selected.type.startsWith("image/")) {
      toast.error("Veuillez choisir un fichier image (PNG, JPG, WEBP).")
      return
    }
    onSelect(selected)
    e.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-bold text-[#2D2D2D]">{label}</label>
          <p className="text-xs text-[#65676B]">{sublabel}</p>
        </div>
        {file && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition"
          >
            <Trash2 size={13} aria-hidden />
            Supprimer
          </button>
        )}
      </div>

      {previewUrl ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-gray-200 bg-[#F7F8FA] group",
            aspect === "banner" ? "aspect-[21/9] sm:aspect-[3/1] w-full" : "size-28 sm:size-32 rounded-3xl"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#2D2D2D] shadow">
              <Camera size={13} aria-hidden /> Changer
            </span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>
      ) : (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-[#FAFAFA] p-6 text-center transition hover:border-[#A35A2A] hover:bg-[#F5EFE8]/40",
            aspect === "avatar" && "size-28 sm:size-32 p-3"
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#A35A2A] shadow-sm">
            {aspect === "banner" ? <ImageIcon size={20} /> : <Camera size={20} />}
          </span>
          <div className={cn(aspect === "avatar" ? "space-y-0.5" : "space-y-1")}>
            <p className="text-xs font-semibold text-[#2D2D2D]">
              {aspect === "avatar" ? "Photo de profil" : "Choisir une photo"}
            </p>
            {aspect === "banner" && <p className="text-[11px] text-[#8A8D91]">PNG, JPG ou WEBP</p>}
          </div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
      )}
    </div>
  )
}

export default function SpaceFormPage({ editPageId }: SpaceFormPageProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const dughuUserId = String(rawUser?.dughu?.userId || rawUser?.dughuUserId || "") || undefined

  const categoriesQuery = usePageCategories()
  const detailQuery = usePageDetail(editPageId, dughuUserId)
  const mutation = useCreateOrUpdatePage()

  const [step, setStep] = useState<StepNumber>(1)
  const [values, setValues] = useState<PageFormValues>(EMPTY)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [ready, setReady] = useState(!editPageId)

  // Pré-remplissage en mode édition une fois le détail chargé.
  useEffect(() => {
    const page = detailQuery.data?.page
    if (!editPageId || !page || ready) return
    setValues({
      pageName: page.pageName,
      pageTitle: page.pageTitle,
      pageDescription: page.pageDescription,
      pageCategory: page.pageCategory,
      website: page.website,
      phone: page.phone,
      address: page.address,
      usersPost: page.usersPost,
    })
    setReady(true)
  }, [detailQuery.data, editPageId, ready])

  const update = <K extends keyof PageFormValues>(key: K, value: PageFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const canGoNext = (): boolean => {
    if (step === 2) {
      return !!values.pageName.trim() && !!values.pageTitle.trim()
    }
    return true
  }

  const handleNext = () => {
    if (step === 2) {
      if (!values.pageName.trim() || !values.pageTitle.trim()) {
        toast.error("Veuillez renseigner le nom et le titre de votre espace.")
        return
      }
    }
    if (step < 3) {
      setStep((s) => (s + 1) as StepNumber)
    }
  }

  const handlePrev = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as StepNumber)
    }
  }

  const handleSubmit = async () => {
    if (!values.pageName.trim() || !values.pageTitle.trim()) {
      toast.error("Le nom et le titre de l'espace sont obligatoires.")
      setStep(2)
      return
    }
    try {
      const result = await mutation.mutateAsync({
        ...values,
        pageId: editPageId,
        coverImage: !editPageId ? coverImage : undefined,
        profileImage: !editPageId ? profileImage : undefined,
      })
      if (result.success === false) {
        toast.error(result.message || "Impossible d'enregistrer l'espace.")
        return
      }
      const createdId = editPageId || (result.result as { page_id?: string | number } | undefined)?.page_id
      toast.success(editPageId ? "Espace mis à jour !" : "Espace créé avec succès ! 🎉")
      router.push(createdId ? `/espaces/${createdId}` : "/espaces")
    } catch {
      toast.error("Impossible d'enregistrer l'espace. Veuillez réessayer.")
    }
  }

  const loading = !!editPageId && (!ready || detailQuery.isLoading)

  return (
    <MainLayout user={rawUser} noRightSidebar active="espaces" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-0 sm:py-6">
        <header className="mb-6 flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => router.push(editPageId ? `/espaces/${editPageId}` : "/espaces")}
            className="flex size-10 items-center justify-center rounded-full bg-[#F0F2F5] text-[#65676B] transition hover:bg-[#E4E6EB]"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2D2D2D]">
              {editPageId ? "Modifier l'espace" : "Créer un espace"}
            </h1>
            <p className="mt-0.5 text-sm text-[#65676B]">
              {editPageId
                ? "Mettez à jour les informations et coordonnées de votre espace."
                : "Configurez votre espace en 3 étapes simples."}
            </p>
          </div>
        </header>

        {loading ? (
          <PageSkeleton rows={4} />
        ) : (
          <div className="space-y-6">
            {/* Stepper Wizard (mode création uniquement) */}
            {!editPageId && (
              <nav aria-label="Étapes de création" className="rounded-3xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
                <ol className="grid grid-cols-3 gap-2">
                  {STEPS.map((s) => {
                    const isCurrent = step === s.id
                    const isPassed = step > s.id
                    const StepIcon = s.icon
                    return (
                      <li
                        key={s.id}
                        className={cn(
                          "flex flex-col sm:flex-row items-center sm:items-start gap-2 rounded-2xl p-2.5 text-center sm:text-left transition",
                          isCurrent ? "bg-[#F5EFE8]" : "bg-transparent"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                            isCurrent
                              ? "bg-[#A35A2A] text-white shadow-sm"
                              : isPassed
                              ? "bg-[#10B981] text-white"
                              : "bg-gray-100 text-[#65676B]"
                          )}
                        >
                          {isPassed ? <Check size={14} aria-hidden /> : <StepIcon size={14} aria-hidden />}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-xs font-bold",
                              isCurrent ? "text-[#A35A2A]" : isPassed ? "text-[#2D2D2D]" : "text-[#8A8D91]"
                            )}
                          >
                            Étape {s.id}
                          </p>
                          <p className="hidden truncate text-xs text-[#65676B] sm:block">{s.title}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </nav>
            )}

            {/* Corps du formulaire */}
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              {/* ÉTAPE 1 : Photos (création) */}
              {!editPageId && step === 1 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-bold text-[#2D2D2D]">Photos de l&apos;espace</h2>
                    <p className="mt-1 text-sm text-[#65676B]">
                      Ajoutez une photo de couverture et une photo de profil pour donner une identité forte à votre espace. Ces photos sont facultatives mais fortement recommandées.
                    </p>
                  </div>

                  {/* Upload photo de couverture */}
                  <ImageUploadBox
                    label="Photo de couverture"
                    sublabel="Format bannière recommandé (16:9 ou 3:1)"
                    file={coverImage}
                    onSelect={(f) => setCoverImage(f)}
                    onRemove={() => setCoverImage(null)}
                    aspect="banner"
                  />

                  {/* Upload photo de profil */}
                  <ImageUploadBox
                    label="Photo de profil / Logo"
                    sublabel="Format carré ou cercle recommandé"
                    file={profileImage}
                    onSelect={(f) => setProfileImage(f)}
                    onRemove={() => setProfileImage(null)}
                    aspect="avatar"
                  />
                </div>
              )}

              {/* ÉTAPE 2 : Informations générales (ou mode édition) */}
              {((!editPageId && step === 2) || editPageId) && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {!editPageId && (
                    <div className="border-b border-gray-100 pb-4">
                      <h2 className="text-lg font-bold text-[#2D2D2D]">Informations de base</h2>
                      <p className="mt-1 text-sm text-[#65676B]">
                        Définissez le nom, le titre et la présentation de votre communauté.
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="page-name" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                      Identifiant unique (slug)*
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-[#8A8D91]">
                        @
                      </span>
                      <input
                        id="page-name"
                        value={values.pageName}
                        onChange={(e) => update("pageName", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                        placeholder="nom-de-votre-espace"
                        className={`${INPUT_CLASS} pl-8`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#8A8D91]">Identifiant unique utilisé dans l&apos;URL de votre espace.</p>
                  </div>

                  <div>
                    <label htmlFor="page-title" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                      Titre public de l&apos;espace*
                    </label>
                    <input
                      id="page-title"
                      value={values.pageTitle}
                      onChange={(e) => update("pageTitle", e.target.value)}
                      placeholder="ex. Club des Développeurs Dughu"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="page-description" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                      Description
                    </label>
                    <textarea
                      id="page-description"
                      value={values.pageDescription}
                      onChange={(e) => update("pageDescription", e.target.value)}
                      rows={4}
                      placeholder="Décrivez les objectifs, valeurs ou thématiques de votre espace…"
                      className={`${INPUT_CLASS} resize-none`}
                    />
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : Catégorie & Contact (ou mode édition) */}
              {((!editPageId && step === 3) || editPageId) && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {!editPageId && (
                    <div className="border-b border-gray-100 pb-4">
                      <h2 className="text-lg font-bold text-[#2D2D2D]">Catégorie & Coordonnées</h2>
                      <p className="mt-1 text-sm text-[#65676B]">
                        Facilitez la découverte de votre espace par les utilisateurs.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="page-category" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                        Catégorie
                      </label>
                      <select
                        id="page-category"
                        value={values.pageCategory}
                        onChange={(e) => update("pageCategory", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">— Choisir une catégorie —</option>
                        {categoriesQuery.data?.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="page-website" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                        Site web
                      </label>
                      <input
                        id="page-website"
                        value={values.website}
                        onChange={(e) => update("website", e.target.value)}
                        placeholder="https://monsite.com"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label htmlFor="page-phone" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                        Téléphone
                      </label>
                      <input
                        id="page-phone"
                        value={values.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="+225 07 00 00 00"
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="page-address" className="mb-1.5 block text-sm font-semibold text-[#2D2D2D]">
                        Adresse
                      </label>
                      <input
                        id="page-address"
                        value={values.address}
                        onChange={(e) => update("address", e.target.value)}
                        placeholder="Ville, commune ou quartier…"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={values.usersPost}
                        onChange={(e) => update("usersPost", e.target.checked)}
                        className="mt-0.5 size-4 accent-[#A35A2A] rounded"
                      />
                      <div>
                        <span className="block text-sm font-bold text-[#2D2D2D]">
                          Autoriser les membres à publier
                        </span>
                        <span className="block text-xs text-[#65676B]">
                          Si activé, les membres abonnés pourront créer des publications directement sur la page.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Boutons de navigation et soumission */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                {!editPageId ? (
                  <>
                    {step > 1 ? (
                      <Button type="button" variant="outline" onClick={handlePrev} className="rounded-full px-5">
                        <ArrowLeft size={16} aria-hidden className="mr-1.5" />
                        Précédent
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/espaces")}
                        className="rounded-full text-[#65676B]"
                      >
                        Annuler
                      </Button>
                    )}

                    {step < 3 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={step === 2 && !canGoNext()}
                        className="rounded-full bg-[#A35A2A] px-6 text-white hover:bg-[#8B4A1F]"
                      >
                        Suivant
                        <ArrowRight size={16} aria-hidden className="ml-1.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={mutation.isPending}
                        className="rounded-full bg-[#A35A2A] px-7 text-white hover:bg-[#8B4A1F]"
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Création en cours…
                          </>
                        ) : (
                          <>
                            <Save size={16} aria-hidden className="mr-1.5" />
                            Créer l&apos;espace
                          </>
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/espaces/${editPageId}`)}
                      className="rounded-full"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={mutation.isPending}
                      className="rounded-full bg-[#A35A2A] px-6 text-white hover:bg-[#8B4A1F]"
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin mr-2" />
                          Enregistrement…
                        </>
                      ) : (
                        <>
                          <Save size={16} aria-hidden className="mr-1.5" />
                          Enregistrer les modifications
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}