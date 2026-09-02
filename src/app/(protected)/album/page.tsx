import type { Metadata } from "next"
import AlbumPage from "@/components/album/AlbumPage"

export const metadata: Metadata = {
  title: "Album | Dughu",
  description: "Créez et gérez vos albums photos et vidéos sur Dughu.",
}

export default function Page() {
  return <AlbumPage />
}
