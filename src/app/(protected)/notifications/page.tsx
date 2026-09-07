import type { Metadata } from "next"
import NotificationsPage from "@/components/notifications/NotificationsPage"

export const metadata: Metadata = {
  title: "Toutes les notifications | Dughu",
  description:
    "Consultez l'historique complet de vos notifications par catégorie sur Dughu.",
}

export default function Page() {
  return <NotificationsPage />
}
