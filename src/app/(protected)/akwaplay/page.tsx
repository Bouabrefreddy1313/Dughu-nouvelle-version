import type { Metadata } from "next"
import { cookies } from "next/headers"
import AkwaplayHomePage from "@/components/akwaplay/AkwaplayHomePage"

export const metadata: Metadata = {
  title: "Akwaplay | Dughu",
  description: "Regardez, partagez et découvrez les meilleures vidéos sur Akwaplay par Dughu.",
}

export default async function Page() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("dughu_user_id")?.value || ""

  return <AkwaplayHomePage initialUserId={userId} />
}
