import type { Metadata } from "next"
import PokesPage from "@/components/pokes/PokesPage"

export const metadata: Metadata = {
  title: "Pokes | Dughu",
  description:
    "Consultez vos pokes reçus, répondez d'un clic et découvrez qui poke sur Dughu.",
}

export default function Page() {
  return <PokesPage />
}
