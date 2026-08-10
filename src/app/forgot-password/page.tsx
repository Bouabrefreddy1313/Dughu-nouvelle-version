"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Pour l'instant, simuler l'envoi (la route API n'est pas encore créée)
      // Quand la route sera prête, décommente :
      /*
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || "Erreur")
        return
      }
      */
      
      // Simulation 2 secondes
      await new Promise((r) => setTimeout(r, 1500))
      
      setSent(true)
      toast.success("Lien de réinitialisation envoyé !")
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
          <img src="/images/register-img.png" alt="Jeunes sur leur téléphone" className="w-full max-w-[500px] object-contain" />
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
          {!sent ? (
            <>
              <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
                Mot de passe oublié ?
              </h3>
              <p className="text-center text-sm text-gray-500 mb-6">
                Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email envoyé !
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Consultez votre boîte <span className="font-medium text-gray-700">{email}</span> pour réinitialiser votre mot de passe.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-11 rounded-full bg-[#D4A574] hover:bg-[#C49464] text-white font-medium"
              >
                Retour à la connexion
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