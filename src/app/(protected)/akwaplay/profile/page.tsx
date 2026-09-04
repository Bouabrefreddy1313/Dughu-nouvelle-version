import { Suspense } from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { RefreshCw } from "lucide-react"
import AkwaProfilePage from "@/components/akwaplay/profile/AkwaProfilePage"

export const metadata: Metadata = {
  title: "Profil Créateur | Akwaplay Dughu",
  description: "Consultez et gérez vos vidéos, chaînes, capsules et activités sur Akwaplay.",
}

export default async function Page() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("dughu_user_id")?.value || ""

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#f5821f] animate-spin" aria-label="Chargement" />
        </div>
      }
    >
      <AkwaProfilePage initialUserId={userId} />
    </Suspense>
  )
}
