import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { RelationRequestsPage } from "@/components/profile/RelationRequestsPage"

export default function ProfileRelationsRoute() {
  return (
    // useSearchParams() (lecture du filtre ?type=) exige une limite Suspense
    // pour le pré-rendu statique (build Next.js).
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 size={32} className="animate-spin text-[#A35A2A]" aria-label="Chargement" />
        </div>
      }
    >
      <RelationRequestsPage />
    </Suspense>
  )
}


