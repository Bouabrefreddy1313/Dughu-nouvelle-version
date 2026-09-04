import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { ProfileSettingsPage } from "@/components/profile/ProfileSettingsPage"

export default function ProfileSettingsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 size={32} className="animate-spin text-[#A35A2A]" aria-label="Chargement" />
        </div>
      }
    >
      <ProfileSettingsPage />
    </Suspense>
  )
}
