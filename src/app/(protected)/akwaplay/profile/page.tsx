import type { Metadata } from "next"
import { cookies } from "next/headers"
import AkwaProfilePage from "@/components/akwaplay/profile/AkwaProfilePage"

export const metadata: Metadata = {
  title: "Profil Créateur | Akwaplay Dughu",
  description: "Consultez et gérez vos vidéos, chaînes, capsules et activités sur Akwaplay.",
}

export default async function Page() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("dughu_user_id")?.value || ""

  return <AkwaProfilePage initialUserId={userId} />
}
