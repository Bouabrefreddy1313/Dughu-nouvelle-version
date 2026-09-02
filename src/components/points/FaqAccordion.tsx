"use client"

/**
 * Accordéon FAQ réutilisable et accessible : boutons réels avec aria-expanded
 * et régions liées (aria-controls), ouverture/fermeture au clic.
 */

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { FaqEntry } from "./points.constants"
import { cn } from "@/lib/utils"

interface FaqAccordionProps {
  items: FaqEntry[]
  /** Clé de l'item ouvert au premier rendu (aucun par défaut). */
  defaultOpenKey?: string
  className?: string
}

export default function FaqAccordion({ items, defaultOpenKey, className }: FaqAccordionProps) {
  const [openKey, setOpenKey] = useState<string | null>(defaultOpenKey ?? null)

  return (
    <div className={cn("divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white", className)}>
      {items.map(({ key, question, answer }) => {
        const open = openKey === key
        return (
          <div key={key}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`faq-panel-${key}`}
              id={`faq-button-${key}`}
              onClick={() => setOpenKey(open ? null : key)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-[#2D2D2D] transition hover:bg-[#F5EFE8]/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#A35A2A]"
            >
              <span>{question}</span>
              <ChevronDown
                size={18}
                aria-hidden
                className={cn("shrink-0 text-[#65676B] transition-transform", open && "rotate-180")}
              />
            </button>
            <div
              id={`faq-panel-${key}`}
              role="region"
              aria-labelledby={`faq-button-${key}`}
              hidden={!open}
              className="px-4 pb-4 text-sm leading-relaxed text-[#65676B]"
            >
              {answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}
