"use client"

import * as React from "react"
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"
import { cn } from "@/lib/utils"

function PreviewCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="preview-card" {...props} />
}

function PreviewCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return (
    <PreviewCardPrimitive.Trigger
      data-slot="preview-card-trigger"
      {...props}
    />
  )
}

function PreviewCardPortal({ ...props }: PreviewCardPrimitive.Portal.Props) {
  return (
    <PreviewCardPrimitive.Portal
      data-slot="preview-card-portal"
      {...props}
    />
  )
}

interface PreviewCardContentProps
  extends PreviewCardPrimitive.Popup.Props,
    Pick<
      PreviewCardPrimitive.Positioner.Props,
      "align" | "alignOffset" | "side" | "sideOffset" | "collisionPadding"
    > {}

function PreviewCardContent({
  align = "center",
  alignOffset = 0,
  side = "top",
  sideOffset = 8,
  collisionPadding = 12,
  className,
  children,
  ...props
}: PreviewCardContentProps) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
      >
        <PreviewCardPrimitive.Popup
          data-slot="preview-card-popup"
          className={cn(
            "z-50 w-80 rounded-2xl border border-gray-100/90 bg-white shadow-xl outline-none",
            "transition-all data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </PreviewCardPrimitive.Popup>
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

export {
  PreviewCard,
  PreviewCardTrigger,
  PreviewCardPortal,
  PreviewCardContent,
}
