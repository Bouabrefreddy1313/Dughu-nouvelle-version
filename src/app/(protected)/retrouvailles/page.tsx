import type { Metadata } from "next"
import RetrouvaillesPage from "@/components/retrouvailles/RetrouvaillesPage"

export const metadata: Metadata = {
  title: "Retrouvailles | Dughu",
  description: "Retrouvez ceux qui ont marqué votre vie sur Dughu.",
}

export default function Page() {
  return <RetrouvaillesPage />
}