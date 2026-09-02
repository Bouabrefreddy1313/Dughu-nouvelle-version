"use client"

/**
 * Page « Stop aux arnaques » — contenu 100 % statique (aucun appel API) :
 * 20 mesures anti-arnaque DUGHU présentées sous forme de cartes numérotées.
 * Accessible depuis le bouton « Stop aux arnaques » de la sidebar gauche
 * (état actif `active="scam"`). Même gabarit que les pages Points /
 * Mes sauvegardes : MainLayout sans sidebar droite, colonne max-w-3xl.
 */

import { ShieldAlert } from "lucide-react"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import NumberedTipCard from "./NumberedTipCard"
import { ANTI_SCAM_TIPS } from "./anti-scam-data"

export default function ScamPage() {
  const { data: rawUser } = useAuth()

  return (
    <MainLayout user={rawUser} noRightSidebar active="scam" reserveLeftSidebar>
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-0 sm:py-6">
        {/* En-tête : pastille bouclier + libellé, puis titre principal centré */}
        <header className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FF4444]/10 px-3 py-1.5 text-sm font-semibold text-[#D32F2F]">
            <ShieldAlert size={18} aria-hidden />
            Stop arnaque
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#A35A2A] sm:text-3xl">
            20 mesures anti-arnaque DUGHU
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#65676B]">
            Les réflexes essentiels pour protéger votre compte, votre argent et
            votre réseau sur Dughu.
          </p>
        </header>

        {/* Liste numérotée des 20 mesures (sémantique <ol> pour l'accessibilité) */}
        <ol role="list" className="space-y-3">
          {ANTI_SCAM_TIPS.map((tip, index) => (
            <NumberedTipCard
              key={tip.title}
              number={index + 1}
              title={tip.title}
              description={tip.description}
            />
          ))}
        </ol>

        <p className="mt-6 px-2 text-center text-xs text-[#8A8D91]">
          Page d'information Dughu — en cas de doute, contactez le Service
          Sécurité Dughu.
        </p>
      </div>
    </MainLayout>
  )
}
