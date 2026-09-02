"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Mail, ArrowLeft, CheckCircle, Lock, KeyRound } from "lucide-react"
import { forgotPassword, resetPassword } from "@/services/auth/auth.service"

export default function ForgotPasswordPage() {
  const router = useRouter()
  // Étape 1 : email
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  // Étape 2 : OTP + nouveau mot de passe
  const [step, setStep] = useState<"email" | "reset">("email")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [resetDone, setResetDone] = useState(false)

  // ---------- Étape 1 : envoyer le code de réinitialisation ----------
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error("Veuillez entrer votre email")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Format email invalide")
      return
    }

    setLoading(true)
    try {
      const data = await forgotPassword({ email })
      if (!data.success) {
        toast.error(data.message || "Erreur lors de l'envoi")
        return
      }
      setStep("reset")
      toast.success(data.message || "Code de réinitialisation envoyé !")
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  // ---------- Étape 2 : réinitialiser le mot de passe ----------
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp) {
      toast.error("Veuillez entrer le code reçu")
      return
    }
    if (!password) {
      toast.error("Veuillez entrer un nouveau mot de passe")
      return
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères")
      return
    }
    if (password !== passwordConfirmation) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    setLoading(true)
    try {
      const data = await resetPassword({
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation,
      })
      if (!data.success) {
        toast.error(data.message || "Erreur lors de la réinitialisation")
        return
      }
      setResetDone(true)
      toast.success(data.message || "Mot de passe réinitialisé avec succès !")
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5]">
      {/* Partie gauche */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#B87333] overflow-hidden rounded-r-[40px]">
        <div className="absolute top-16 left-10 z-10">
          <h1 className="text-white text-2xl font-bold leading-tight">
            Le monde change. Les réseaux aussi
          </h1>
        </div>
        <div className="absolute top-1/3 left-8 text-4xl animate-bounce" style={{ animationDuration: "3s" }}>❤️</div>
        <div className="absolute top-1/2 left-1/4 text-3xl animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>👍</div>
        <div className="absolute bottom-1/3 left-12 text-4xl animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>😂</div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-center">
          <Image src="/images/register-img.png" alt="Jeunes sur leur téléphone" width={500} height={400} className="w-full max-w-[500px] object-contain" />
        </div>
      </div>

      {/* Partie droite */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#B87333] tracking-tight">
            <span className="inline-block mr-0.5">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="inline-block -mt-1">
                <path d="M8 4C8 4 4 8 4 16C4 24 8 28 8 28C8 28 12 24 12 16C12 8 8 4 8 4Z" fill="#B87333"/>
                <circle cx="20" cy="16" r="8" fill="#B87333"/>
              </svg>
            </span>
            ughu
          </h2>
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-sm p-8">
          {/* ─────── ÉTAPE 1 : SAISIE EMAIL ─────── */}
          {step === "email" && (
            <>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                Mot de passe oublié ?
              </h3>
              <p className="text-center text-sm text-gray-500 mb-6">
                Entrez votre email et nous vous enverrons un code pour réinitialiser votre mot de passe.
              </p>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="email"
                    placeholder="Votre adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-full bg-gray-100 border-gray-200 pl-11 pr-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium transition-colors"
                >
                  {loading ? "Envoi en cours..." : "Envoyer le code"}
                </Button>
              </form>
            </>
          )}

          {/* ─────── ÉTAPE 2 : SAISIE OTP + NOUVEAU MOT DE PASSE ─────── */}
          {step === "reset" && !resetDone && (
            <>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                Réinitialiser le mot de passe
              </h3>
              <p className="text-center text-sm text-gray-500 mb-6">
                Un code a été envoyé à <span className="font-medium text-gray-700">{email}</span>.
                Entrez-le ci-dessous avec votre nouveau mot de passe.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="text"
                    placeholder="Code de réinitialisation"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-11 rounded-full bg-gray-100 border-gray-200 pl-11 pr-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="password"
                    placeholder="Nouveau mot de passe (min. 8 caractères)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-full bg-gray-100 border-gray-200 pl-11 pr-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    type="password"
                    placeholder="Confirmer le nouveau mot de passe"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="h-11 rounded-full bg-gray-100 border-gray-200 pl-11 pr-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium transition-colors"
                >
                  {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                </Button>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="w-full text-center text-sm text-[#B87333] hover:underline disabled:opacity-50"
                >
                  Renvoyer le code
                </button>
              </form>
            </>
          )}

          {/* ─────── SUCCÈS ─────── */}
          {resetDone && (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Mot de passe réinitialisé !
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-11 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium"
              >
                Aller à la connexion
              </Button>
            </div>
          )}

          {/* Retour */}
          <div className="mt-6 text-center">
            <a href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft size={16} />
              Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}