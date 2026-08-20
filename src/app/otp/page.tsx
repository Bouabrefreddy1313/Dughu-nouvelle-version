"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function OtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  const [otp, setOtp] = useState(["", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [timer, setTimer] = useState(180) // 3 minutes en secondes
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const resolveNextUrl = async () => {
    try {
      const me = await fetch("/api/auth/me")
      const data = await me.json()
      if (data?.success && data?.user?.onboardingCompleted) return "/home"
    } catch {}
    return "/onboarding/profile"
  }

  useEffect(() => {
    if (!email) {
      toast.error("Aucun email fourni")
      router.push("/register")
      return
    }
    if (searchParams.get("sent") === "1") {
      toast.success(`Code de vérification envoyé à ${email}`)
      router.replace(`/otp?email=${encodeURIComponent(email)}`)
    }
    inputsRef.current[0]?.focus()
  }, [email, router, searchParams])

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => setTimer((t) => t - 1), 1000)
    return () => clearInterval(interval)
  }, [timer])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus()
    }

    // Auto-submit quand les 4 chiffres sont remplis
    if (index === 3 && value) {
      const fullOtp = [...newOtp.slice(0, 3), value].join("")
      if (fullOtp.length === 4) {
        setTimeout(() => verifyOtp(fullOtp), 100)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const verifyOtp = async (code: string) => {
    if (code.length !== 4) return
    setLoading(true)
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || "Code invalide")
        setOtp(["", "", "", ""])
        inputsRef.current[0]?.focus()
        return
      }

      toast.success("Compte vérifié avec succès !")
      router.replace(await resolveNextUrl())
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    try {
      const res = await fetch("/api/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || "Erreur lors de l'envoi")
        return
      }

      toast.success("Nouveau code envoyé !")
      setTimer(180)
      setOtp(["", "", "", ""])
      inputsRef.current[0]?.focus()
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5]">
      {/* Partie gauche */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#B87333] overflow-hidden rounded-r-[40px] flex-col">
        {/* Slogan centré verticalement */}
        <div className="flex-1 flex items-end justify-center px-10 z-10 mb-10">
          <h1 className="text-white text-3xl xl:text-4xl font-bold leading-tight text-center">
            Le monde change. Les réseaux aussi
          </h1>
        </div>

        {/* Image bien grande, alignée à gauche */}
        <div className="flex justify-start items-end w-full">
          <img
            src="/images/register-img.png"
            alt="Jeunes sur leur téléphone"
            fetchPriority="high"
            className="w-full max-w-[900px] object-contain"
          />
        </div>
      </div>

      {/* Partie droite */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        {/* Logo image */}
        <div className="mb-6">
          <img
            src="/images/logo.png"
            alt="Dughu"
            className="h-50 w-auto object-contain"
          />
        </div>

        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Vérification
          </h3>
          <p className="text-center text-sm text-gray-500 mb-6">
            Entrez le code à 4 chiffres envoyé à <br />
            <span className="font-medium text-gray-700">{email}</span>
          </p>

          {/* Inputs OTP */}
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 border-gray-200 bg-gray-50 focus:border-[#B87333] focus:ring-2 focus:ring-[#B87333]/20 focus:outline-none transition-all"
                disabled={loading}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center mb-4">
            {timer > 0 ? (
              <span className="text-sm text-gray-500">
                Code expirant dans <span className="font-mono font-medium text-[#B87333]">{formatTime(timer)}</span>
              </span>
            ) : (
              <span className="text-sm text-red-500">Code expiré</span>
            )}
          </div>

          {/* Bouton vérifier */}
          <Button
            onClick={() => verifyOtp(otp.join(""))}
            disabled={loading || otp.join("").length !== 4}
            className="w-full h-11 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Vérification..." : "Vérifier"}
          </Button>

          {/* Renvoyer */}
          <div className="mt-4 text-center">
            <button
              onClick={handleResend}
              disabled={resendLoading || timer > 0}
              className="text-sm text-[#B87333] hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {resendLoading ? "Envoi en cours..." : timer > 0 ? "Renvoyer le code" : "Renvoyer un nouveau code"}
            </button>
          </div>

          {/* Retour */}
          <div className="mt-6 text-center">
            <a href="/register" className="text-sm text-gray-500 hover:text-gray-700">
              ← Retour à l&apos;inscription
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OtpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full bg-[#f5f5f5]">
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#B87333] overflow-hidden rounded-r-[40px] flex-col" />
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B87333]"></div>
        </div>
      </div>
    }>
      <OtpForm />
    </Suspense>
  )
}