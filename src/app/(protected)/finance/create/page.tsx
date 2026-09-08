import type { Metadata } from "next"
import FinanceFormPage from "@/components/finance/FinanceFormPage"

export const metadata: Metadata = {
  title: "Créer une demande de financement | Dughu",
  description: "Lancez votre appel de financement participatif sur Dughu.",
}

export default function Page() {
  return <FinanceFormPage />
}
