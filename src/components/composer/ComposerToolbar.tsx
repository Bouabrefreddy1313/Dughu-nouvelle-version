"use client"

import {
  ImageIcon,
  SmileIcon,
  CalendarIcon,
  MapPinIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import IconButton from "@/components/common/IconButton"

interface ComposerToolbarProps {
  className?: string
}

export function ComposerToolbar({ className }: ComposerToolbarProps) {
  const tools = [
    { icon: ImageIcon, label: "Photo" },
    { icon: SmileIcon, label: "Émoji" },
    { icon: CalendarIcon, label: "Événement" },
    { icon: MapPinIcon, label: "Lieu" },
    { icon: MoreHorizontalIcon, label: "Plus" },
  ]

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <IconButton
            key={tool.label}
            ariaLabel={tool.label}
            className="text-gray-600 hover:text-[#A35A2A] hover:bg-gray-100"
          >
            <tool.icon className="w-5 h-5" />
          </IconButton>
        ))}
      </div>
    </div>
  )
}