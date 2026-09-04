import { Suspense } from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { RefreshCw } from "lucide-react"
import AkwaWatchPage from "@/components/akwaplay/watch/AkwaWatchPage"

export const metadata: Metadata = {
  title: "Regarder sur Akwaplay | Dughu",
  description: "Visionnez les meilleures vidéos, commentez et découvrez des suggestions sur Akwaplay.",
}

interface PageProps {
  searchParams: Promise<{ v?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("dughu_user_id")?.value || ""
  const params = await searchParams
  const videoId = params?.v || ""

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-[#f5821f] animate-spin" aria-label="Chargement" />
        </div>
      }
    >
      <AkwaWatchPage initialVideoId={videoId} initialUserId={userId} />
    </Suspense>
  )
}
