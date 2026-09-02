import type { Metadata } from "next"
import SavedPage from "@/components/saved/SavedPage"

export const metadata: Metadata = {
  title: "Mes sauvegardes | Dughu",
  description:
    "Retrouvez toutes les publications que vous avez sauvegardées sur Dughu et retirez-les quand vous voulez.",
}

export default function Page() {
  return <SavedPage />
}
