"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Menu, Search, Video, X, Play } from "lucide-react"
import { useAuth } from "@/hooks/queries/use-auth"

interface AkwaHeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onSearchSubmit: () => void
  onClearSearch: () => void
  onPublishClick: () => void
}

export default function AkwaHeader({
  sidebarOpen,
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onPublishClick,
}: AkwaHeaderProps) {
  const router = useRouter()
  const { data: user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const avatar =
    user?.profileImage ||
    user?.avatar ||
    user?.dughu?.profileImage ||
    null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchSubmit()
    inputRef.current?.blur()
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14"
      style={{ backgroundColor: "#1c1c1c", borderBottom: "1px solid #2a2a2a" }}
    >
      {/* ── Gauche : hamburger + logo ── */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-white/10 text-white"
        >
          <Menu size={20} />
        </button>

        <button
          onClick={() => router.push("/akwaplay")}
          className="flex items-center gap-2 group"
          aria-label="Akwaplay — Accueil"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#f5821f" }}
          >
            <Play className="fill-white text-white translate-x-px" size={14} />
          </div>
          <span className="hidden sm:block text-white font-bold text-base tracking-tight">
            Akwa<span style={{ color: "#f5821f" }}>play</span>
          </span>
        </button>
      </div>

      {/* ── Centre : barre de recherche ── */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 max-w-2xl mx-auto"
        role="search"
      >
        <div className="relative flex items-center">
          <Search
            size={16}
            className="absolute left-4 shrink-0"
            style={{ color: "#9a9a9a" }}
          />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une vidéo"
            aria-label="Rechercher une vidéo"
            className="w-full pl-10 pr-10 py-2 text-sm text-white placeholder:text-[#9a9a9a] rounded-full outline-none transition focus:ring-2 focus:ring-[#f5821f]/40"
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Effacer la recherche"
              className="absolute right-3 text-[#9a9a9a] hover:text-white transition"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </form>

      {/* ── Droite : bouton Publier + avatar ── */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onPublishClick}
          className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition hover:bg-[#f5821f]/10"
          style={{
            border: "1px solid #f5821f",
            color: "#f5821f",
          }}
        >
          <Video size={15} />
          <span>Publier</span>
        </button>

        {/* Avatar */}
        <button
          onClick={() => router.push("/profile")}
          aria-label="Mon profil"
          className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-transparent hover:ring-[#f5821f] transition"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt="Mon avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: "#f5821f" }}
            >
              {(user?.firstName?.[0] || user?.name?.[0] || "A").toUpperCase()}
            </div>
          )}
        </button>
      </div>
    </header>
  )
}
