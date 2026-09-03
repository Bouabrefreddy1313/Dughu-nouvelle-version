"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { userMessage } from "@/lib/api/api-error"
import { useCreateGroup, useGroupCategories } from "@/hooks/groups/use-create-group"
import { validateCreateGroupFields, validateGroupImageFile } from "@/services/groups/create-group.mapper"
import type { CreateGroupFieldErrors, CreateGroupFields } from "@/types/groups/create-group.types"
import { GroupImageField } from "./GroupImageField"

const INITIAL_FIELDS: CreateGroupFields = { groupTitle: "", about: "", category: "", privacy: "1", joinPrivacy: "0" }
const controlClass = "min-h-11 w-full rounded-xl border border-[#D8DADF] bg-white px-3 py-2 text-sm text-[#2D2D2D] outline-none focus:border-[#C47830] focus:ring-2 focus:ring-[#C47830]/20"

export function CreateGroupForm() {
  const router = useRouter()
  const categories = useGroupCategories()
  const mutation = useCreateGroup()
  const [step, setStep] = useState<1 | 2>(1)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [imageErrors, setImageErrors] = useState<{ avatar?: string; cover?: string }>({})
  const [fields, setFields] = useState(INITIAL_FIELDS)
  const [errors, setErrors] = useState<CreateGroupFieldErrors>({})
  const refs = useRef<Partial<Record<keyof CreateGroupFields, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>>({})

  const setField = <K extends keyof CreateGroupFields>(key: K, value: CreateGroupFields[K]) => {
    setFields((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const setImage = async (kind: "avatar" | "cover", file: File | null) => {
    const error = await validateGroupImageFile(file)
    setImageErrors((current) => ({ ...current, [kind]: error || undefined }))
    const accepted = error ? null : file
    if (kind === "avatar") setAvatar(accepted); else setCover(accepted)
  }
  const goNext = async () => {
    const [avatarError, coverError] = await Promise.all([validateGroupImageFile(avatar), validateGroupImageFile(cover)])
    setImageErrors({ avatar: avatarError || undefined, cover: coverError || undefined })
    if (!avatarError && !coverError) setStep(2)
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validateCreateGroupFields(fields)
    setErrors(nextErrors)
    const firstError = (Object.keys(nextErrors) as (keyof CreateGroupFields)[])[0]
    if (firstError) { refs.current[firstError]?.focus(); return }
    if (!avatar || !cover) { setStep(1); return }
    try {
      const result = await mutation.mutateAsync({ ...fields, avatar, cover })
      if (result.failedUploads.length === 0) toast.success("Groupe créé avec succès.")
      else {
        const failed = result.failedUploads.map((item) => item === "avatar" ? "la photo de profil" : "la couverture").join(" et ")
        toast.warning(`Le groupe a été créé, mais ${failed} n’a pas pu être envoyée.`)
      }
      router.push("/groups?tab=mine")
    } catch (error) { toast.error(userMessage(error, "Impossible de créer le groupe.")) }
  }

  return <form onSubmit={submit} noValidate className="rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:p-6">
    <div className="mb-6" aria-label={`Étape ${step} sur 2`}><p className="text-sm font-semibold text-[#6B3F1D]">Étape {step} sur 2</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EDE7E1]"><div className="h-full rounded-full bg-[#C47830] transition-all" style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>
    {step === 1 ? <section aria-labelledby="images-title">
      <h2 id="images-title" className="text-lg font-bold text-[#2D2D2D]">Images du groupe</h2><p className="mt-1 text-sm text-[#65676B]">Ajoutez une couverture et une photo de profil.</p>
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)] md:items-start"><GroupImageField label="Couverture" kind="cover" file={cover} error={imageErrors.cover} onChange={(file) => void setImage("cover", file)} /><GroupImageField label="Photo de profil" kind="avatar" file={avatar} error={imageErrors.avatar} onChange={(file) => void setImage("avatar", file)} /></div>
      <div className="mt-8 flex justify-end"><button type="button" onClick={() => void goNext()} disabled={!avatar || !cover} className="min-h-11 rounded-full bg-[#6B3F1D] px-6 text-sm font-semibold text-white hover:bg-[#4E2A14] disabled:cursor-not-allowed disabled:opacity-50">Suivant</button></div>
    </section> : <section aria-labelledby="information-title">
      <h2 id="information-title" className="text-lg font-bold text-[#2D2D2D]">Informations du groupe</h2>
      <div className="mt-6 grid gap-5">
        <FieldLabel htmlFor="group-title" label="Nom du groupe" error={errors.groupTitle} required /><input ref={(node) => { refs.current.groupTitle = node }} id="group-title" className={controlClass} value={fields.groupTitle} onChange={(e) => setField("groupTitle", e.target.value)} minLength={3} maxLength={100} aria-invalid={Boolean(errors.groupTitle)} aria-describedby={errors.groupTitle ? "group-title-error" : undefined} />
        <FieldLabel htmlFor="group-about" label="Description" error={errors.about} /><textarea ref={(node) => { refs.current.about = node }} id="group-about" className={controlClass} value={fields.about} onChange={(e) => setField("about", e.target.value)} maxLength={1000} rows={5} aria-invalid={Boolean(errors.about)} aria-describedby={errors.about ? "group-about-error" : "group-about-count"} /><p id="group-about-count" className="-mt-3 text-right text-xs text-[#65676B]">{fields.about.length}/1 000</p>
        <FieldLabel htmlFor="group-category" label="Catégorie" error={errors.category} required />
        {categories.isError ? <button type="button" onClick={() => void categories.refetch()} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#6B3F1D]"><RefreshCw size={17} aria-hidden="true" />Réessayer de charger les catégories</button> : <select ref={(node) => { refs.current.category = node }} id="group-category" className={controlClass} value={fields.category} onChange={(e) => setField("category", e.target.value)} disabled={categories.isPending} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? "group-category-error" : undefined}><option value="">{categories.isPending ? "Chargement…" : "Sélectionner une catégorie"}</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>}
        <div className="grid gap-5 sm:grid-cols-2"><div><FieldLabel htmlFor="group-privacy" label="Confidentialité" required /><select ref={(node) => { refs.current.privacy = node }} id="group-privacy" className={controlClass} value={fields.privacy} onChange={(e) => setField("privacy", e.target.value as "1" | "2")}><option value="1">Public</option><option value="2">Privé</option></select></div><div><FieldLabel htmlFor="group-join-privacy" label="Adhésion" required /><select ref={(node) => { refs.current.joinPrivacy = node }} id="group-join-privacy" className={controlClass} value={fields.joinPrivacy} onChange={(e) => setField("joinPrivacy", e.target.value as "0" | "1")}><option value="0">Adhésion libre</option><option value="1">Soumise à approbation</option></select></div></div>
      </div>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => setStep(1)} disabled={mutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#6B3F1D] px-5 text-sm font-semibold text-[#6B3F1D] disabled:opacity-50"><ArrowLeft size={17} aria-hidden="true" />Retour aux images</button><button type="submit" disabled={mutation.isPending || categories.isPending || categories.isError} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#6B3F1D] px-6 text-sm font-semibold text-white hover:bg-[#4E2A14] disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}{mutation.isPending ? "Création…" : "Créer le groupe"}</button></div>
    </section>}
  </form>
}

function FieldLabel({ htmlFor, label, error, required }: { htmlFor: string; label: string; error?: string; required?: boolean }) {
  return <div className="-mb-3"><label htmlFor={htmlFor} className="text-sm font-semibold text-[#2D2D2D]">{label}{required && <span aria-hidden="true"> *</span>}</label>{error && <p id={`${htmlFor}-error`} className="mt-1 text-sm text-red-700" role="alert">{error}</p>}</div>
}
