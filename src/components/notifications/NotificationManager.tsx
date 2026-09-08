"use client"

import { usePushNotifications } from "@/hooks/notifications/use-push-notifications"
import { useInAppNotifications } from "@/hooks/notifications/use-in-app-notifications"
import InAppNotificationBanner from "@/components/notifications/InAppNotificationBanner"
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt"

interface NotificationManagerProps {
  userId?: string
}

export default function NotificationManager({ userId }: NotificationManagerProps) {
  const { showPrompt, requestPermission, dismissPrompt } = usePushNotifications()
  const { activeBanner, dismissBanner } = useInAppNotifications(userId)

  return (
    <>
      {/* Bannière flottante interactive In-App au premier plan */}
      <InAppNotificationBanner
        notification={activeBanner}
        onDismiss={dismissBanner}
      />

      {/* Invitation respectueuse à activer les notifications Push */}
      {userId && userId !== "0" && (
        <PushPermissionPrompt
          open={showPrompt}
          onAccept={requestPermission}
          onDismiss={dismissPrompt}
        />
      )}
    </>
  )
}
