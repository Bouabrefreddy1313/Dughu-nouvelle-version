import type { Metadata } from "next"
import FinanceFormPage from "@/components/finance/FinanceFormPage"

export const metadata: Metadata = {
  title: "Modifier la demande de financement | Dughu",
  description: "Modifiez les informations de votre demande de financement sur Dughu.",
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <FinanceFormPage editFinanceId={id} />
}
