import type { Metadata } from "next"
import TrendingPage from "@/components/trending/TrendingPage"

export const metadata: Metadata = {
  title: "Tendances | Dughu",
  description:
    "Découvrez les publications les plus populaires et engageantes sur Dughu avec le plus de réactions, commentaires et partages.",
}

export default function Page() {
  return <TrendingPage />
}
