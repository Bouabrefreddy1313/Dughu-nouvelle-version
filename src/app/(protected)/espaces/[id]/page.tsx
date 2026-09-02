import type { Metadata } from "next"
import SpaceDetailPage from "@/components/pages/SpaceDetailPage"

export const metadata: Metadata = {
  title: "Espace | Dughu",
  description: "Détail d'un espace Dughu : actualité, galerie, offres, admins et statistiques.",
}

export default function Page() {
  return <SpaceDetailPage />
}