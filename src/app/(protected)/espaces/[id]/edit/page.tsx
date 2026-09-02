import type { Metadata } from "next"
import type { Viewport } from "next"
import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import SpaceFormPage from "@/components/pages/SpaceFormPage"

export const metadata: Metadata = {
  title: "Modifier l'espace | Dughu",
  description: "Mettez à jour les informations de votre espace Dughu.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 size={32} className="animate-spin text-[#A35A2A]" aria-label="Chargement" />
        </div>
      }
    >
      <SpaceFormPage editPageId={decodeURIComponent(id)} />
    </Suspense>
  )
}