import type { Metadata } from "next"
import FinanceListPage from "@/components/finance/FinanceListPage"

export const metadata: Metadata = {
  title: "Finances | Dughu",
  description: "Découvrez et soutenez des projets de financement participatif sur Dughu.",
}

export default function Page() {
  return <FinanceListPage />
}
