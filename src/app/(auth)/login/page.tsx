"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
      router.push(data.redirect || "/home")
    } catch {
      toast.error("Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google"
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f5]">
      {/* Partie gauche */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#B87333] overflow-hidden rounded-r-[40px] flex-col">
        {/* Slogan centré verticalement */}
        <div className="flex-1 flex items-end justify-center px-10 z-10 mb-20">
          <h1 className="text-white text-3xl xl:text-4xl font-bold leading-tight text-center">
            Le monde change. Les réseaux aussi
          </h1>
        </div>

        {/* Image bien grande en bas, alignée à gauche */}
        <div className="flex justify-start items-end w-full">
          <img
            src="/images/register-img.png"
            alt="Jeunes sur leur téléphone"
            className="w-full max-w-full object-contain"
          />
        </div>
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

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full h-11 rounded-full border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-2"
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