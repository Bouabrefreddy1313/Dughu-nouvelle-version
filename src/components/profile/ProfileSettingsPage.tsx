"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  BriefcaseBusiness,
  Camera,
  ChevronLeft,
  CircleUserRound,
  Globe2,
  Loader2,
  Plus,
  Save,
  Share2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { resolveMediaUrl } from "@/lib/dughu"
import { cn } from "@/lib/utils"

type Section = "infos" | "reseaux" | "retrouvailles"

type Country = {
  id: string
  name: string
  code: string
  dialCode: string
}

type ProfileForm = {
  firstName: string
  lastName: string
  username: string
  phone: string
  email: string
  gender: string
  birthdate: string
  postcode: string
  countryId: string
  city: string
  bio: string
  signature: string
  facebook: string
  instagram: string
  twitter: string
  linkedin: string
  youtube: string
  google: string
  website: string
  discord: string
  wechat: string
  villeOrigine: string
  etablissementFrequente: string
  domaineActivite: string
  profession: string
  entrepriseActuelle: string
  entreprisePassee: string[]
  centresInteret: string[]
  competences: string[]
  lieuxFrequentes: string[]
}

type TextFieldKey = Exclude<keyof ProfileForm, "entreprisePassee" | "centresInteret" | "competences" | "lieuxFrequentes">

type SettingsUser = {
  id: string
  avatar?: string | null
  image?: string | null
  name?: string | null
  username?: string | null
  [key: string]: unknown
}

const EMPTY_FORM: ProfileForm = {
  firstName: "", lastName: "", username: "", phone: "", email: "", gender: "",
  birthdate: "", postcode: "", countryId: "", city: "", bio: "", signature: "",
  facebook: "", instagram: "", twitter: "", linkedin: "", youtube: "", google: "",
  website: "", discord: "", wechat: "", villeOrigine: "", etablissementFrequente: "",
  domaineActivite: "", profession: "", entrepriseActuelle: "", entreprisePassee: [],
  centresInteret: [], competences: [], lieuxFrequentes: [],
}

const sections = [
  { key: "infos" as const, label: "Infos", description: "Identité et informations personnelles", icon: CircleUserRound },
  { key: "reseaux" as const, label: "Réseaux", description: "Vos liens et présences en ligne", icon: Share2 },
  { key: "retrouvailles" as const, label: "Retrouvailles", description: "Formation, carrière et centres d’intérêt", icon: BriefcaseBusiness },
]

const inputClass = "mt-1.5 block h-11 w-full min-w-0 max-w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-[#2D2D2D] outline-none transition placeholder:text-gray-400 focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/15 sm:px-3.5 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
const labelClass = "block min-w-0 text-sm font-semibold text-[#2D2D2D]"

function SoonField({ label, multiline = false }: { label: string; multiline?: boolean }) {
  const Element = multiline ? "textarea" : "input"
  return (
    <label className={labelClass}>
      <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span className="min-w-0 break-words">{label}</span>
        <span className="shrink-0 rounded-full bg-[#A35A2A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8B4A1F]">Bientôt modifiable</span>
      </span>
      <Element disabled rows={multiline ? 3 : undefined} className={cn(inputClass, multiline && "h-auto py-3 resize-none")} />
    </label>
  )
}

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("")
  const addValue = () => {
    const value = draft.trim()
    if (!value) return
    if (!values.some((item) => item.toLocaleLowerCase("fr") === value.toLocaleLowerCase("fr"))) {
      onChange([...values, value])
    }
    setDraft("")
  }

  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{label}</legend>
      <div className="mt-1.5 rounded-xl border border-gray-200 bg-white p-2 focus-within:border-[#A35A2A] focus-within:ring-2 focus-within:ring-[#A35A2A]/15">
        {values.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {values.map((value) => (
              <span key={value} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F5EFE8] py-1 pl-2.5 pr-1 text-xs font-medium text-[#6B3F1D]">
                <span className="max-w-[220px] truncate">{value}</span>
                <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Retirer ${value}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-[#A35A2A]/10">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex min-w-0 gap-2">
          <input value={draft} maxLength={150} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addValue() } }} placeholder={placeholder} className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm font-normal outline-none placeholder:text-gray-400" />
          <button type="button" onClick={addValue} disabled={!draft.trim()} aria-label={`Ajouter à ${label}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#A35A2A] text-white transition hover:bg-[#8B4A1F] disabled:cursor-not-allowed disabled:opacity-40">
            <Plus size={16} />
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] font-normal text-[#8A8A8A]">Saisissez une valeur puis appuyez sur Entrée.</p>
    </fieldset>
  )
}

export function ProfileSettingsPage() {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState<Section>("infos")
  const [user, setUser] = useState<SettingsUser | null>(null)
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const authRes = await fetch("/api/auth/me", { cache: "no-store" })
        const authData = await authRes.json()
        if (!authRes.ok || !authData?.user) {
          router.replace("/login")
          return
        }
        const current = authData.user
        const profileRes = await fetch(`/api/profile?userId=${encodeURIComponent(current.id)}`, { cache: "no-store" })
        const profileData = await profileRes.json()
        const profileUser = profileData?.user || current
        const info = profileData?.info || {}
        if (cancelled) return
        setUser({ ...current, ...profileUser })
        setForm({
          firstName: profileUser.firstName || "",
          lastName: profileUser.lastName || "",
          username: profileUser.username || "",
          phone: profileUser.phone || info.phoneNumber || info.phone || "",
          email: profileUser.email || info.email || "",
          gender: profileUser.gender || info.gender || "",
          birthdate: (profileUser.birthdate || info.birthdate || "").slice(0, 10),
          postcode: profileUser.postcode || info.postcode || "",
          countryId: String(profileUser.countryId || info.countryId || ""),
          city: profileUser.city || info.city || "",
          bio: profileUser.bio || "",
          signature: profileUser.signature || info.signature || "",
          facebook: profileUser.facebook || "",
          instagram: profileUser.instagram || "",
          twitter: profileUser.twitter || "",
          linkedin: profileUser.linkedin || "",
          youtube: profileUser.youtube || "",
          google: profileUser.google || "",
          website: profileUser.website || "",
          discord: profileUser.discord || "",
          wechat: profileUser.wechat || "",
          villeOrigine: profileUser.villeOrigine || "",
          etablissementFrequente: profileUser.etablissementFrequente || "",
          domaineActivite: profileUser.domaineActivite || "",
          profession: profileUser.profession || "",
          entrepriseActuelle: profileUser.entrepriseActuelle || "",
          entreprisePassee: Array.isArray(profileUser.entreprisePassee) ? profileUser.entreprisePassee : [],
          centresInteret: Array.isArray(profileUser.centresInteret) ? profileUser.centresInteret : [],
          competences: Array.isArray(profileUser.competences) ? profileUser.competences : [],
          lieuxFrequentes: Array.isArray(profileUser.lieuxFrequentes) ? profileUser.lieuxFrequentes : [],
        })
      } catch {
        toast.error("Impossible de charger vos informations. Veuillez réessayer.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    let cancelled = false
    fetch("/api/countries")
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!cancelled && ok && Array.isArray(data.countries)) setCountries(data.countries)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCountriesLoading(false) })
    return () => { cancelled = true }
  }, [])

  const update = (key: TextFieldKey, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const updateList = (key: "entreprisePassee" | "centresInteret" | "competences" | "lieuxFrequentes", value: string[]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Le nom et les prénoms sont requis.")
      return
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Veuillez saisir une adresse email valide.")
      return
    }

    setSaving(true)
    try {
      const [profileResponse, infosResponse] = await Promise.all([
        fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
        fetch("/api/profile/infos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            villeActuelle: form.city,
            villeOrigine: form.villeOrigine,
            etablissementFrequente: form.etablissementFrequente,
            domaineActivite: form.domaineActivite,
            profession: form.profession,
            entrepriseActuelle: form.entrepriseActuelle,
            entreprisePassee: form.entreprisePassee,
            centresInteret: form.centresInteret,
            competences: form.competences,
            lieuxFrequentes: form.lieuxFrequentes,
          }),
        }),
      ])
      const [profileData, infosData] = await Promise.all([profileResponse.json(), infosResponse.json()])
      if (!profileResponse.ok || !profileData.success || !infosResponse.ok || !infosData.success) {
        toast.error(profileData.message || infosData.message || "Impossible de mettre à jour le profil.")
        return
      }
      setUser((current) => current ? ({ ...current, ...profileData.user, ...form }) : current)
      toast.success("Profil mis à jour avec succès.")
    } catch {
      toast.error("Impossible de contacter Dughu. Vérifiez votre connexion puis réessayez.")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatar = async (file?: File) => {
    if (!file || !user?.id) return
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      toast.error("Choisissez une image PNG, JPG ou GIF de moins de 10 Mo.")
      return
    }
    setAvatarSaving(true)
    try {
      const payload = new FormData()
      payload.append("userId", user.id)
      payload.append("avatar", file)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: payload })
      const data = await res.json()
      if (!res.ok || !data.success || !data.avatar) {
        toast.error(data.message || "Impossible de modifier la photo de profil.")
        return
      }
      setUser((current) => current ? ({ ...current, avatar: data.avatar, image: data.avatar }) : current)
      toast.success("Photo de profil mise à jour.")
    } catch {
      toast.error("Impossible de contacter Dughu. Vérifiez votre connexion puis réessayez.")
    } finally {
      setAvatarSaving(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const renderInput = (label: string, key: TextFieldKey, options?: { type?: string; placeholder?: string; disabled?: boolean }) => (
    <label className={labelClass}>
      {label}
      <input
        type={options?.type || "text"}
        value={form[key]}
        placeholder={options?.placeholder}
        disabled={options?.disabled}
        onChange={(event) => update(key, event.target.value)}
        className={inputClass}
      />
    </label>
  )

  return (
    <MainLayout user={user} wide noRightSidebar active="profile" reserveLeftSidebar>
      <div className="min-w-0 max-w-full overflow-x-hidden pb-8">
        <div className="mb-4 flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
          <button type="button" onClick={() => router.push("/profile")} aria-label="Retour au profil" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#65676B] shadow-sm transition hover:text-[#A35A2A]">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 pt-0.5">
            <h1 className="break-words text-lg font-bold leading-tight text-[#050505] sm:text-2xl">Paramètres du profil</h1>
            <p className="mt-1 break-words text-xs leading-5 text-[#65676B] sm:text-sm">Gérez les informations visibles sur votre profil Dughu.</p>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-[250px_minmax(0,1fr)] xl:items-start">
          <nav aria-label="Sections des paramètres du profil" className="min-w-0 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm sm:p-2 xl:sticky xl:top-24">
            <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2 xl:flex xl:flex-col">
              {sections.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.key} type="button" onClick={() => setSection(item.key)} aria-current={section === item.key ? "page" : undefined} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center transition sm:flex-row sm:gap-2 sm:px-3 sm:py-3 xl:justify-start xl:gap-3 xl:text-left", section === item.key ? "bg-[#A35A2A] text-white shadow-sm" : "text-[#4A4A4A] hover:bg-[#F7F1EB]") }>
                    <Icon size={18} className="shrink-0" />
                    <span className="min-w-0 max-w-full">
                      <span className="block break-words text-[11px] font-semibold leading-tight sm:text-sm">{item.label}</span>
                      <span className={cn("hidden text-[11px] leading-4 xl:block", section === item.key ? "text-white/75" : "text-[#8A8A8A]")}>{item.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>

          <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="grid min-h-[420px] place-items-center" role="status"><Loader2 className="animate-spin text-[#A35A2A]" size={30} /><span className="sr-only">Chargement du profil</span></div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void handleSave() }}>
                <div className="border-b border-gray-100 px-3 py-4 sm:px-6 sm:py-5">
                  <h2 className="text-lg font-bold text-[#050505]">{sections.find((item) => item.key === section)?.label}</h2>
                  <p className="mt-1 text-sm text-[#65676B]">{sections.find((item) => item.key === section)?.description}</p>
                </div>

                <div className="min-w-0 p-3 sm:p-6">
                  {section === "infos" && (
                    <div className="space-y-6">
                      <div className="flex min-w-0 flex-col items-center gap-4 rounded-2xl bg-[#F7F8FA] p-3 text-center sm:flex-row sm:p-4 sm:text-left">
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-sm">
                          <Image src={user?.avatar ? resolveMediaUrl(user.avatar) : "/images/avatar.png"} alt="Photo de profil" fill sizes="96px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-[#2D2D2D]">Photo de profil</h3>
                          <p className="mt-1 text-xs text-[#65676B]">PNG, JPG ou GIF, jusqu’à 10 Mo.</p>
                          <button type="button" disabled={avatarSaving} onClick={() => avatarInputRef.current?.click()} className="mt-3 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-[#A35A2A] px-4 text-sm font-semibold text-white transition hover:bg-[#8B4A1F] disabled:opacity-60">
                            {avatarSaving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                            Modifier la photo
                          </button>
                          <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => void handleAvatar(event.target.files?.[0])} />
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                        {renderInput("Prénoms", "firstName")}
                        {renderInput("Nom", "lastName")}
                        <label className={labelClass}>Nom d’utilisateur <span className="font-normal text-[#8A8A8A]">(non modifiable)</span><input value={form.username} disabled className={inputClass} /></label>
                        {renderInput("Téléphone", "phone", { type: "tel" })}
                        {renderInput("Email", "email", { type: "email" })}
                        <label className={labelClass}>Sexe<select value={form.gender} onChange={(event) => update("gender", event.target.value)} className={inputClass}><option value="">Non précisé</option><option value="Homme">Homme</option><option value="Femme">Femme</option><option value="Autre">Autre</option></select></label>
                        {renderInput("Date de naissance", "birthdate", { type: "date" })}
                        {renderInput("Code postal", "postcode")}
                        <label className={labelClass}>Pays<select value={form.countryId} disabled={countriesLoading} onChange={(event) => update("countryId", event.target.value)} className={inputClass}><option value="">{countriesLoading ? "Chargement des pays…" : "Sélectionner un pays"}</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
                        {renderInput("Ville actuelle", "city")}
                        {renderInput("Ville d’origine", "villeOrigine")}
                        <SoonField label="Relation" />
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                        <label className={labelClass}>Biographie<textarea value={form.bio} onChange={(event) => update("bio", event.target.value)} rows={4} className={cn(inputClass, "h-auto resize-y py-3")} /></label>
                        <label className={labelClass}>Signature<textarea value={form.signature} onChange={(event) => update("signature", event.target.value)} rows={4} className={cn(inputClass, "h-auto resize-y py-3")} /></label>
                      </div>
                    </div>
                  )}

                  {section === "reseaux" && (
                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                      {renderInput("Facebook", "facebook", { type: "url", placeholder: "https://facebook.com/…" })}
                      {renderInput("Instagram", "instagram", { type: "url", placeholder: "https://instagram.com/…" })}
                      {renderInput("Twitter / X", "twitter", { type: "url", placeholder: "https://x.com/…" })}
                      {renderInput("LinkedIn", "linkedin", { type: "url", placeholder: "https://linkedin.com/in/…" })}
                      {renderInput("YouTube", "youtube", { type: "url", placeholder: "https://youtube.com/…" })}
                      <SoonField label="TikTok" />
                      {renderInput("Google", "google", { placeholder: "Lien ou identifiant Google" })}
                      {renderInput("Site web", "website", { type: "url", placeholder: "https://…" })}
                      {renderInput("Discord", "discord", { placeholder: "Lien ou identifiant Discord" })}
                      {renderInput("WeChat", "wechat", { placeholder: "Identifiant WeChat" })}
                    </div>
                  )}

                  {section === "retrouvailles" && (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-3 flex min-w-0 items-start gap-2">
                          <Globe2 size={18} className="mt-0.5 shrink-0 text-[#A35A2A]" />
                          <h3 className="min-w-0 break-words font-semibold text-[#2D2D2D]">Formation et parcours professionnel</h3>
                        </div>
                        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                          <SoonField label="Promotion — date de début" />
                          <SoonField label="Promotion — date de fin" />
                          {renderInput("Établissement fréquenté", "etablissementFrequente")}
                          {renderInput("Domaine d’activité", "domaineActivite")}
                          {renderInput("Profession / Emploi", "profession")}
                          {renderInput("Entreprise actuelle", "entrepriseActuelle")}
                          <div className="md:col-span-2">
                            <TagInput label="Entreprise(s) passée(s)" values={form.entreprisePassee} onChange={(values) => updateList("entreprisePassee", values)} placeholder="Ajouter une ancienne entreprise" />
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-100 pt-6">
                        <h3 className="mb-3 break-words font-semibold text-[#2D2D2D]">Centres d’intérêt et compétences</h3>
                        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                          <TagInput label="Centres d’intérêt" values={form.centresInteret} onChange={(values) => updateList("centresInteret", values)} placeholder="Ajouter un centre d’intérêt" />
                          <TagInput label="Compétences" values={form.competences} onChange={(values) => updateList("competences", values)} placeholder="Ajouter une compétence" />
                          <div className="md:col-span-2">
                            <TagInput label="Lieux fréquentés" values={form.lieuxFrequentes} onChange={(values) => updateList("lieuxFrequentes", values)} placeholder="Ajouter un lieu" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 flex flex-col-reverse items-stretch justify-end gap-2 rounded-b-2xl border-t border-gray-100 bg-white/95 px-3 py-3 backdrop-blur sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4">
                  <button type="button" onClick={() => router.push("/profile")} className="min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-[#65676B] transition hover:bg-gray-100 sm:w-auto">Annuler</button>
                  <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#A35A2A] px-5 text-sm font-semibold text-white transition hover:bg-[#8B4A1F] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Enregistrer</button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
