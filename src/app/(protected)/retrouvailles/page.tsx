import { Suspense } from "react"
import type { Metadata } from "next"
import { Loader2 } from "lucide-react"
import RetrouvaillesPage from "@/components/retrouvailles/RetrouvaillesPage"

export const metadata: Metadata = {
  title: "Retrouvailles | Dughu",
  description: "Retrouvez ceux qui ont marqué votre vie sur Dughu.",
}

export default function Page() {
  return (
    // useSearchParams() (onglet ?tab=) exige une limite Suspense pour le
    // pré-rendu statique (build Next.js).
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 size={32} className="animate-spin text-[#A35A2A]" aria-label="Chargement" />
        </div>
      }
    >
      <RetrouvaillesPage />
    </Suspense>
  )
}
