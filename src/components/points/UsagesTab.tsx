"use client"

/**
 * Onglet « Utilisations » (100 % statique) : bandeau d'intro, liste des usages
 * des points, FAQ en accordéon et encadré mentions légales.
 */

import FaqAccordion from "./FaqAccordion"
import { POINT_USAGES, POINTS_FAQ, LEGAL_NOTICE, USAGES_BANNER } from "./points.constants"

export default function UsagesTab() {
  return (
    <div className="space-y-5" role="tabpanel" aria-label="Utilisations">
      {/* Bandeau d'intro */}
      <header className="rounded-2xl bg-gradient-to-br from-[#6B3F1D] to-[#8B5A2B] p-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <p className="max-w-2xl text-sm leading-relaxed text-white/95 sm:text-base">{USAGES_BANNER}</p>
      </header>

      {/* À quoi servent vos points ? */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-bold text-[#2D2D2D]">À quoi servent vos points ?</h2>
        <ul className="mt-3 space-y-3">
          {POINT_USAGES.map(({ key, icon: Icon, title, description }) => (
            <li key={key} className="flex gap-3 rounded-xl bg-gray-50/70 p-3.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F5EFE8] text-[#A35A2A]"
                aria-hidden
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#2D2D2D]">{title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[#65676B]">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="mb-2 px-1 text-base font-bold text-[#2D2D2D]">Questions fréquentes</h2>
        <FaqAccordion items={POINTS_FAQ} />
      </section>

      {/* Mentions légales */}
      <aside className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
        <p className="text-xs leading-relaxed text-amber-800">{LEGAL_NOTICE}</p>
      </aside>
    </div>
  )
}
