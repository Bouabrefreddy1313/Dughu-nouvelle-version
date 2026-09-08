import type { Metadata } from "next"
import EventFormPage from "@/components/events/EventFormPage"

export const metadata: Metadata = {
  title: "Modifier l'événement | Dughu",
  description: "Modifiez les informations de votre événement sur Dughu.",
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EventFormPage editEventId={id} isEdit={true} />
}
