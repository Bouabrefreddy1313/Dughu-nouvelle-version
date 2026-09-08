import type { Metadata } from "next"
import FinanceDetailPage from "@/components/finance/FinanceDetailPage"

export const metadata: Metadata = {
  title: "Détail du financement | Dughu",
  description: "Consultez les informations et soutenez cette demande de financement sur Dughu.",
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <FinanceDetailPage id={id} />
}
