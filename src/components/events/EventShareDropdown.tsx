"use client"

import { useState } from "react"
import { Share2, Copy, Check, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EventShareDropdownProps {
  title: string
  url?: string
}

export default function EventShareDropdown({ title, url }: EventShareDropdownProps) {
  const [copied, setCopied] = useState(false)
  const shareUrl = typeof window !== "undefined" ? url || window.location.href : ""
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(`Découvrez cet événement sur Dughu : ${title}`)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Lien de l'événement copié !")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Impossible de copier le lien.")
    }
  }

  const openShareWindow = (targetUrl: string) => {
    window.open(targetUrl, "_blank", "width=600,height=500,location=no,menubar=no,toolbar=no")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs cursor-pointer text-xs sm:text-sm">
        <Share2 className="w-4 h-4" />
        <span>PARTAGER</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 p-2 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 z-50"
      >
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-medium"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
          <span>{copied ? "Lien copié !" : "Copier le lien"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openShareWindow(`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-medium"
        >
          <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
            <MessageCircle className="w-3.5 h-3.5" />
          </div>
          <span>WhatsApp</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-medium"
        >
          <div className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
            <span className="font-bold text-xs">f</span>
          </div>
          <span>Facebook</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openShareWindow(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-medium"
        >
          <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0">
            <span className="font-bold text-xs">𝕏</span>
          </div>
          <span>Twitter / X</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 text-sm font-medium"
        >
          <div className="w-6 h-6 rounded-full bg-[#0A66C2] text-white flex items-center justify-center shrink-0">
            <span className="font-bold text-xs">in</span>
          </div>
          <span>LinkedIn</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
