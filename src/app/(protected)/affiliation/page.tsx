import type { Metadata } from "next"
import AffiliatePage from "@/components/affiliate/AffiliatePage"

export const metadata: Metadata = {
  title: "Affiliation & Parrainage | Dughu",
  description:
    "Partagez votre lien de parrainage Dughu et gagnez 100 points pour chaque nouvel utilisateur inscrit.",
}

export default function Page() {
  return <AffiliatePage />
}
