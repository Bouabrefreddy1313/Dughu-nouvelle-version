import type { Metadata } from "next"
import { cookies } from "next/headers"
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

  return <AkwaWatchPage initialVideoId={videoId} initialUserId={userId} />
}
