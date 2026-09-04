"use client"

import { FormEvent, useState } from "react"
import { ArrowLeft, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { usePrivacySettings, useUpdatePrivacySettings } from "@/hooks/profile/use-privacy-settings"
import { userMessage } from "@/lib/api/api-error"
import type { PrivacySettings } from "@/types/profile/profile.types"

interface PrivacySettingsPanelProps {
  onBack: () => void
}

type SelectField = Exclude<keyof PrivacySettings, "confirmFollowers">

const AUDIENCE_OPTIONS = [
  { value: "0", label: "Toutes les personnes" },
  { value: "1", label: "Celles que je suis" },
  { value: "2", label: "Personne" },
] as const

const FIELDS: Array<{
  key: SelectField
  label: string
  description: string
  options: ReadonlyArray<{ value: string; label: string }>
}> = [
  {
    key: "followPrivacy",
    label: "Qui peut me suivre ?",
    description: "Choisissez qui peut s’abonner à votre profil.",
    options: AUDIENCE_OPTIONS.slice(0, 2),
  },
  {
    key: "messagePrivacy",
    label: "Qui peut m’envoyer des messages ?",
    description: "Limitez les personnes autorisées à vous contacter.",
    options: AUDIENCE_OPTIONS,
  },
  {
    key: "friendPrivacy",
    label: "Qui peut voir mes amis ?",
    description: "Contrôlez la visibilité de votre liste d’amis.",
    options: AUDIENCE_OPTIONS,
  },
  {
    key: "postPrivacy",
    label: "Qui peut publier sur mon fil d’actualité ?",
    description: "Choisissez qui peut ajouter une publication à votre profil.",
    options: [
      { value: "everyone", label: "Tout le monde" },
      { value: "ifollow", label: "Les personnes que je suis" },
      { value: "nobody", label: "Personne" },
    ],
  },
  {
    key: "birthPrivacy",
    label: "Qui peut voir mon anniversaire ?",
    description: "Définissez qui peut consulter votre date de naissance.",
    options: [
      { value: "0", label: "Tout le monde" },
      { value: "1", label: "Amis uniquement" },
      { value: "2", label: "Moi uniquement" },
    ],
  },
]

export function PrivacySettingsPanel({ onBack }: PrivacySettingsPanelProps) {
  const query = usePrivacySettings()
  const mutation = useUpdatePrivacySettings()
  const [draft, setDraft] = useState<PrivacySettings | null>(null)
  const form = draft ?? query.data?.data ?? null

  const updateSelect = (key: SelectField, value: string) => {
    if (form) setDraft({ ...form, [key]: value } as PrivacySettings)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) return
    try {
      const response = await mutation.mutateAsync(form)
      if (response.data) setDraft(response.data)
      toast.success(response.message || "Paramètres de confidentialité mis à jour avec succès.")
    } catch (error) {
      toast.error(userMessage(error, "Impossible d’enregistrer vos paramètres de confidentialité."))
    }
  }

  return (
    <article className="min-w-0 p-4 sm:p-6 lg:p-8" aria-labelledby="privacy-settings-title">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#A35A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]">
        <ArrowLeft size={18} aria-hidden="true" /> Retour au compte
      </button>

      <div className="flex min-w-0 items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F5EFE8] text-[#A35A2A]">
          <LockKeyhole size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="privacy-settings-title" className="break-words text-xl font-bold text-[#2D2D2D] sm:text-2xl">Paramètres de confidentialité</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65676B]">Contrôlez qui peut vous contacter, vous suivre et consulter certaines informations de votre profil.</p>
        </div>
      </div>

      {query.isPending && (
        <div role="status" className="mt-7 flex min-h-52 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-[#65676B]">
          <Loader2 size={20} className="mr-2 animate-spin text-[#A35A2A]" aria-hidden="true" /> Chargement des paramètres…
        </div>
      )}

      {query.isError && (
        <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">Impossible de charger vos paramètres de confidentialité.</p>
          <button type="button" onClick={() => void query.refetch()} className="mt-4 min-h-11 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">Réessayer</button>
        </div>
      )}

      {form && !query.isError && (
        <form onSubmit={handleSubmit} className="mt-7 max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-start gap-3 border-b border-[#E8D9CA] bg-[#FBF7F3] p-4 text-sm text-[#76583F] sm:p-5">
            <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden="true" />
            <p>Ces choix déterminent la visibilité et les interactions autorisées sur votre profil.</p>
          </div>

          <div className="divide-y divide-gray-100 px-4 sm:px-6">
            {FIELDS.map((field) => (
              <div key={field.key} className="grid gap-3 py-5 md:grid-cols-[minmax(0,1fr)_minmax(190px,240px)] md:items-center md:gap-6">
                <div>
                  <label htmlFor={`privacy-${field.key}`} className="text-sm font-semibold text-[#2D2D2D]">{field.label}</label>
                  <p id={`privacy-${field.key}-description`} className="mt-1 text-xs leading-5 text-[#65676B]">{field.description}</p>
                </div>
                <select
                  id={`privacy-${field.key}`}
                  value={form[field.key]}
                  onChange={(event) => updateSelect(field.key, event.target.value)}
                  aria-describedby={`privacy-${field.key}-description`}
                  disabled={mutation.isPending}
                  className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-[#2D2D2D] outline-none transition focus:border-[#A35A2A] focus:ring-2 focus:ring-[#A35A2A]/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            ))}

            <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 sm:pr-6">
                <p id="confirm-followers-label" className="text-sm font-semibold text-[#2D2D2D]">Confirmer les demandes d’abonnement</p>
                <p id="confirm-followers-description" className="mt-1 text-xs leading-5 text-[#65676B]">Lorsqu’il est activé, chaque nouvel abonnement nécessite votre confirmation.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.confirmFollowers === "1"}
                aria-labelledby="confirm-followers-label"
                aria-describedby="confirm-followers-description"
                disabled={mutation.isPending}
                onClick={() => setDraft({ ...form, confirmFollowers: form.confirmFollowers === "1" ? "0" : "1" })}
                className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${form.confirmFollowers === "1" ? "bg-[#A35A2A]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-1 size-6 rounded-full bg-white shadow-sm transition-transform ${form.confirmFollowers === "1" ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 bg-[#FCFCFC] p-4 sm:p-5">
            <button type="submit" disabled={mutation.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#A35A2A] px-5 text-sm font-semibold text-white transition hover:bg-[#8B4A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
              {mutation.isPending && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
              {mutation.isPending ? "Enregistrement…" : "Enregistrer les paramètres"}
            </button>
          </div>
        </form>
      )}
    </article>
  )
}
