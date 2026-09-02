import type { Metadata } from "next"
import PagesPage from "@/components/pages/PagesPage"

export const metadata: Metadata = {
  title: "Espaces | Dughu",
  description: "Découvrez et gérez les espaces Dughu : pages, communautés et marques.",
}

export default function Page() {
  return <PagesPage />
}