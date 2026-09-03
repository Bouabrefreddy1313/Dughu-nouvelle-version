"use client"

interface AkwaPromoCardProps {
  tag?: string
  title: string
  subtitle?: string
  onClick?: () => void
}

/**
 * Variante "annonce/promo" pour les cartes institutionnelles ou sponsorisées.
 * Fond beige clair, tag catégorie en haut à gauche, grand titre foncé.
 */
export default function AkwaPromoCard({
  tag,
  title,
  subtitle,
  onClick,
}: AkwaPromoCardProps) {
  return (
    <article
      className="flex flex-col cursor-pointer group"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Visuel promo */}
      <div
        className="relative w-full aspect-video rounded-xl overflow-hidden flex flex-col justify-between p-3 transition group-hover:brightness-95"
        style={{ backgroundColor: "#f5ede0" }}
      >
        {/* Tag catégorie */}
        {tag && (
          <span
            className="self-start px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
            style={{ backgroundColor: "#f5821f", color: "#ffffff" }}
          >
            {tag}
          </span>
        )}

        {/* Grand titre */}
        <p
          className="text-base font-bold leading-snug line-clamp-3"
          style={{ color: "#1a1a1a" }}
        >
          {title}
        </p>
      </div>

      {/* Sous-titre */}
      {subtitle && (
        <p className="mt-2 text-xs text-[#9a9a9a] line-clamp-2">{subtitle}</p>
      )}
    </article>
  )
}
