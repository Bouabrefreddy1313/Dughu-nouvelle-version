/**
 * Carte numérotée d'une mesure anti-arnaque — réutilisée pour les 20 items de
 * la page « Stop aux arnaques ». Purement présentationnelle (aucun état,
 * aucune interaction) : numéro + titre (bleu foncé, gras) + description (gris,
 * plus petite). Composant serveur-compatible : il n'utilise ni hooks ni
 * événements, il est simplement monté par la page cliente.
 */

interface NumberedTipCardProps {
  /** Numéro de la mesure (1-based). */
  number: number
  title: string
  description: string
}

export default function NumberedTipCard({ number, title, description }: NumberedTipCardProps) {
  return (
    <li className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#A35A2A]/10 text-sm font-bold text-[#A35A2A] sm:size-9 sm:text-base"
        >
          {number}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-snug text-[#1E3A8A] sm:text-base">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#65676B]">{description}</p>
        </div>
      </div>
    </li>
  )
}
