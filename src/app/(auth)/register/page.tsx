"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const countryCodes = [
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada" },
  { code: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "+212", flag: "🇲🇦", name: "Maroc" },
  { code: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "+242", flag: "🇨🇬", name: "Congo" },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    country_code: "+225",
    phone: "",
    gender: "",
    password: "",
    password_confirmation: "",
    ref: "",
    accept_terms: false,
  })

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.gender || !form.password) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }
    if (form.password.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères")
      return
    }
    if (form.password !== form.password_confirmation) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }
    if (!form.accept_terms) {
      toast.error("Vous devez accepter les conditions d'utilisation")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          gender: form.gender,
          phone: form.phone,
          country_code: form.country_code,
          ref: form.ref || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || "Erreur lors de l'inscription")
        return
      }

      toast.success(data.message || "Inscription réussie !")
      router.push(`/otp?email=${encodeURIComponent(form.email)}&sent=1`)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = "/api/auth/google"
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5]">
      {/* Partie gauche */}
      <div className="hidden lg:flex lg:w-1/2 h-screen lg:sticky lg:top-0 overflow-hidden relative">
        <Image
          src="/images/imglo.jpeg"
          alt="Dughu"
          fill
          className="object-cover rounded-r-[40px]"
          priority
          sizes="50vw"
        />
      </div>

      {/* Partie droite */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        {/* Logo image */}
        <div className="mb-6">
          <img
            src="/images/logo.png"
            alt="Dughu"
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-center text-gray-900 mb-5">
            Créer un compte
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="Prénom"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className="h-10 rounded-full bg-gray-100 border-gray-200 px-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
              />
              <Input
                type="text"
                placeholder="Nom"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className="h-10 rounded-full bg-gray-100 border-gray-200 px-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
              />
            </div>

            <Input
              type="email"
              placeholder="Adresse email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="h-10 rounded-full bg-gray-100 border-gray-200 px-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
            />

            <div className="flex gap-2">
              <select
                value={form.country_code}
                onChange={(e) => update("country_code", e.target.value)}
                className="h-10 rounded-full bg-gray-100 border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#B87333]"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                placeholder="Numéro de téléphone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, ""))}
                className="flex-1 h-10 rounded-full bg-gray-100 border-gray-200 px-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update("gender", "Homme")}
                className={`flex-1 h-10 rounded-full border text-sm font-medium transition-all ${
                  form.gender === "Homme"
                    ? "bg-[#B87333] text-white border-[#B87333]"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                }`}
              >
                Homme
              </button>
              <button
                type="button"
                onClick={() => update("gender", "Femme")}
                className={`flex-1 h-10 rounded-full border text-sm font-medium transition-all ${
                  form.gender === "Femme"
                    ? "bg-[#B87333] text-white border-[#B87333]"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                }`}
              >
                Femme
              </button>
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe (min. 8 caractères)"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="h-10 rounded-full bg-gray-100 border-gray-200 px-4 pr-10 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirmer le mot de passe"
                value={form.password_confirmation}
                onChange={(e) => update("password_confirmation", e.target.value)}
                className="h-10 rounded-full bg-gray-100 border-gray-200 px-4 pr-10 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Input
              type="text"
              placeholder="Code de parrainage (optionnel)"
              value={form.ref}
              onChange={(e) => update("ref", e.target.value)}
              className="h-10 rounded-full bg-gray-100 border-gray-200 px-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
            />

<div className="flex items-start gap-2 pt-1">
  <Checkbox
    id="terms"
    checked={form.accept_terms}
    onCheckedChange={(checked) => update("accept_terms", checked as boolean)}
    className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#B87333] data-[state=checked]:border-[#B87333] shrink-0"
  />
  <p className="text-xs text-gray-500 leading-relaxed">
    J'accepte les{" "}
    <a href="/terms" className="text-[#B87333] hover:underline">conditions d'utilisation</a>{" "}
    et la{" "}
    <a href="/privacy" className="text-[#B87333] hover:underline">politique de confidentialité</a>{" "}
    de Dughu.
  </p>
</div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium transition-colors"
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-3 text-xs text-gray-400">ou</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              className="w-full h-10 rounded-full border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-600">
            Déjà un compte ?{" "}
            <a href="/login" className="font-semibold text-[#B87333] hover:underline">Se connecter</a>
          </p>
        </div>
      </div>
    </div>
  )
}