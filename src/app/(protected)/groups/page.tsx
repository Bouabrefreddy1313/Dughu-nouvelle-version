import { Suspense } from "react"
import type { Metadata } from "next"
import { Loader2 } from "lucide-react"
import GroupsPage from "@/components/groups/GroupsPage"

export const metadata: Metadata = {
  title: "Groupes | Dughu",
  description: "Retrouvez vos groupes et découvrez de nouvelles communautés sur Dughu.",
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
      <GroupsPage />
    </Suspense>
  )
}