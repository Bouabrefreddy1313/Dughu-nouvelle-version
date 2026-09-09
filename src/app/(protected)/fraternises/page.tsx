import type { Metadata } from "next"
import FraternisesPage from "@/components/fraternises/FraternisesPage"

export const metadata: Metadata = {
  title: "Fraternisés | Dughu",
  description: "Découvrez les publications exclusives de vos amis et contacts fraternisés sur Dughu.",
}

export default function Page() {
  return <FraternisesPage />
}
