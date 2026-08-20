"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import GoogleSignInButton from "@/components/auth/GoogleSignInButton"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!login || !password) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, remember }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.redirect) {
          toast.error(data.message)
          router.push(data.redirect)
          return
        }
        toast.error(data.message || "Erreur de connexion")
        return
      }
      localStorage.setItem("dughu_user", JSON.stringify(data.user))
      toast.success("Connexion réussie !")
      const nextUrl = data.user?.onboardingCompleted ? "/home" : "/onboarding/profile"
      router.replace(data.redirect || nextUrl)
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
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
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo image */}
        <div className="mb-8">
          <img
            src="/images/logo.png"
            alt="Dughu"
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-sm p-8">
          <h3 className="text-xl font-semibold text-center text-gray-900 mb-6">
            Connexion
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Tel, Email, ou Nom d'utilisateur"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="h-11 rounded-full bg-gray-100 border-gray-200 px-4 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-full bg-gray-100 border-gray-200 px-4 pr-10 text-sm focus-visible:ring-[#B87333] focus-visible:ring-1"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked as boolean)}
                className="border-gray-300 data-[state=checked]:bg-[#B87333] data-[state=checked]:border-[#B87333]"
              />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                Se souvenir de moi
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium transition-colors"
            >
              {loading ? "Connexion..." : "Connexion"}
            </Button>

            <GoogleSignInButton width={356} />
          </form>

          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <a href="/register" className="font-semibold text-gray-900 underline underline-offset-2 hover:text-[#B87333]">
              Pas de compte ? S'inscrire
            </a>
            <a href="/forgot-password" className="text-gray-500 hover:text-gray-700">
              Mot de passe oublié
            </a>
          </div>
        </div>

        <button className="mt-6 flex items-center gap-1.5 text-sm text-[#B87333] hover:underline">
          <AlertTriangle size={16} />
          Signaler un problème
        </button>
      </div>
    </div>
  )
}