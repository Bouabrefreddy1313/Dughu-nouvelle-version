import type { Metadata } from "next"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import SpaceFormPage from "@/components/pages/SpaceFormPage"

export const metadata: Metadata = {
  title: "Créer un espace | Dughu",
  description: "Créez un espace Dughu pour votre communauté, votre marque ou votre page.",
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 size={32} className="animate-spin text-[#A35A2A]" aria-label="Chargement" />
        </div>
      }
    >
      <SpaceFormPage />
    </Suspense>
  )
}