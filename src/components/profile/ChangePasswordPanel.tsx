"use client"

import { FormEvent, useState } from "react"
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

interface ChangePasswordPanelProps {
  onBack: () => void
}

interface PasswordErrors {
  actualPassword?: string
  password?: string
  confirmation?: string
}

interface PasswordResponse {
  success?: boolean
  message?: string
}

async function readResponse(response: Response): Promise<PasswordResponse> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as PasswordResponse
  } catch {
    return {}
  }
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  autoComplete: "current-password" | "new-password"
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[#2D2D2D]">{label}</label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={256}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-[#2D2D2D] outline-none transition placeholder:text-gray-400 focus:ring-2 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-gray-200 focus:border-[#A35A2A] focus:ring-[#A35A2A]/15"}`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Masquer ${label.toLocaleLowerCase("fr")}` : `Afficher ${label.toLocaleLowerCase("fr")}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-lg text-[#65676B] transition hover:bg-[#F0F2F5] hover:text-[#A35A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export function ChangePasswordPanel({ onBack }: ChangePasswordPanelProps) {
  const [actualPassword, setActualPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [visible, setVisible] = useState({ actual: false, password: false, confirmation: false })
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [saving, setSaving] = useState(false)

  const validate = (): PasswordErrors => {
    const next: PasswordErrors = {}
    if (!actualPassword) next.actualPassword = "Saisissez votre mot de passe actuel."
    if (!password) next.password = "Saisissez un nouveau mot de passe."
    else if (password.length < 8) next.password = "Le mot de passe doit contenir au moins 8 caractères."
    else if (password === actualPassword) next.password = "Choisissez un mot de passe différent de l'ancien."
    if (!confirmation) next.confirmation = "Confirmez votre nouveau mot de passe."
    else if (confirmation !== password) next.confirmation = "Les mots de passe ne correspondent pas."
    return next
  }

  const updateField = (field: keyof PasswordErrors, value: string, setter: (value: string) => void) => {
    setter(value)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualPassword, password, password_confirmation: confirmation }),
      })
      const data = await readResponse(response)
      if (!response.ok || !data.success) {
        toast.error(data.message || "Impossible de modifier votre mot de passe.")
        return
      }

      setActualPassword("")
      setPassword("")
      setConfirmation("")
      setErrors({})
      setVisible({ actual: false, password: false, confirmation: false })
      toast.success(data.message || "Votre mot de passe a été modifié.")
    } catch {
      toast.error("Impossible de contacter Dughu. Vérifiez votre connexion puis réessayez.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="min-w-0 p-4 sm:p-6 lg:p-8" aria-labelledby="change-password-title">
      <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#65676B] transition-colors hover:bg-[#F0F2F5] hover:text-[#A35A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A]">
        <ArrowLeft size={18} aria-hidden="true" /> Retour au compte
      </button>

      <div className="flex min-w-0 items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#F5EFE8] text-[#A35A2A]">
          <KeyRound size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="change-password-title" className="break-words text-xl font-bold text-[#2D2D2D] sm:text-2xl">Changer le mot de passe</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65676B]">Utilisez un mot de passe différent de l’actuel et composé d’au moins 8 caractères.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-7 max-w-2xl rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#E8D9CA] bg-[#FBF7F3] p-4 text-sm text-[#76583F]">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#A35A2A]" aria-hidden="true" />
          <p>Pour protéger votre compte, vous devez confirmer votre mot de passe actuel.</p>
        </div>

        <div className="space-y-5">
          <PasswordInput id="actual-password" label="Mot de passe actuel" value={actualPassword} onChange={(value) => updateField("actualPassword", value, setActualPassword)} visible={visible.actual} onToggle={() => setVisible((current) => ({ ...current, actual: !current.actual }))} autoComplete="current-password" error={errors.actualPassword} />
          <PasswordInput id="new-password" label="Nouveau mot de passe" value={password} onChange={(value) => updateField("password", value, setPassword)} visible={visible.password} onToggle={() => setVisible((current) => ({ ...current, password: !current.password }))} autoComplete="new-password" error={errors.password} />
          <PasswordInput id="password-confirmation" label="Confirmer le nouveau mot de passe" value={confirmation} onChange={(value) => updateField("confirmation", value, setConfirmation)} visible={visible.confirmation} onToggle={() => setVisible((current) => ({ ...current, confirmation: !current.confirmation }))} autoComplete="new-password" error={errors.confirmation} />
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onBack} disabled={saving} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[#65676B] transition hover:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
          <button type="submit" disabled={saving || !actualPassword || !password || !confirmation} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#A35A2A] px-5 text-sm font-semibold text-white transition hover:bg-[#8B4A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A35A2A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
            {saving && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
            {saving ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </div>
      </form>
    </article>
  )
}

