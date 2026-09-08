"use client"

import { Bell, Sparkles, X, Check } from "lucide-react"

interface PushPermissionPromptProps {
  open: boolean
  onAccept: () => void
  onDismiss: () => void
}

export default function PushPermissionPrompt({
  open,
  onAccept,
  onDismiss,
}: PushPermissionPromptProps) {
  if (!open) return null

  return (
    <aside
      aria-label="Invitation aux notifications"
      className="fixed bottom-20 sm:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-50 sm:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="relative rounded-3xl bg-white dark:bg-[#1E1E1E] p-5 shadow-2xl border border-amber-200/70 dark:border-white/15 overflow-hidden ring-1 ring-black/5">
        {/* Décoration d'arrière-plan */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/20 dark:from-amber-950/20 dark:to-orange-950/10 blur-xl pointer-events-none" />

        {/* Bouton fermer en haut à droite */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Plus tard"
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center text-[#65676B] hover:text-[#2D2D2D] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] transition"
        >
          <X size={15} />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#985810] to-[#7d480d] text-white shadow-md shadow-[#985810]/25">
            <Bell size={22} className="animate-bounce" />
          </div>

          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-sm font-bold text-[#1C1E21] dark:text-[#F3F4F6] flex items-center gap-1.5">
              <span>Ne manquez aucune interaction</span>
              <Sparkles size={14} className="text-[#985810]" />
            </h3>
            <p className="mt-1 text-xs text-[#65676B] dark:text-[#A1A1AA] leading-relaxed">
              Activez les notifications pour être alerté instantanément de vos pokes, réactions, commentaires et récompenses, même lorsque l&apos;écran est verrouillé.
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-4 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-white/10">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full px-4 py-2 text-xs font-semibold text-[#65676B] hover:bg-[#F0F2F5] dark:hover:bg-[#2A2A2A] transition"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#985810] hover:bg-[#7d480d] px-5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            <Check size={14} />
            <span>Activer les notifications</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
