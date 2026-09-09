import type { Metadata } from "next"
import VideosPage from "@/components/videos/VideosPage"

export const metadata: Metadata = {
  title: "Vidéos | Dughu",
  description: "Explorez toutes les publications vidéo de la communauté Dughu.",
}

export default function Page() {
  return <VideosPage />
}
