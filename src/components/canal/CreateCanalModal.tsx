"use client"

/**
 * Modale de création d'un canal (Écran 2).
 *
 * Spécifications :
 *  - Overlay sombre derrière, modale centrée
 *  - Titre "Créer un canal" en orange centré
 *  - Zones d'upload côte à côte (Logo requis, Couverture optionnelle) en pointillé
 *  - Nom, Description, Catégorie (depuis getPossibleCategories)
 *  - Toggles côte à côte : Type (Privé/Public) & Actif (Oui/Non) (bleu foncé sélectionné)
 *  - Bouton "Créer" orange pleine largeur
 */

import { useState, useRef } from "react"
import { X, Image as ImageIcon, UploadCloud } from "lucide-react"
import { useCreateOrUpdateCanal, usePossibleCategories } from "@/hooks/canal/use-canals"
import type { CanalType } from "@/types/canal/canal.types"

interface CreateCanalModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateCanalModal({ userId, isOpen, onClose, onSuccess }: CreateCanalModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [type, setType] = useState<CanalType>("private")
  const [isActive, setIsActive] = useState(true)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { data: categories = [] } = usePossibleCategories()
  const createMutation = useCreateOrUpdateCanal()

  if (!isOpen) return null

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Veuillez saisir un nom pour le canal.")
      return
    }

    if (!logoFile) {
      setError("Le logo du canal est requis.")
      return
    }

    createMutation.mutate(
      {
        userId,
        values: {
          name: name.trim(),
          description: description.trim(),
          categoryId: categoryId || (categories[0]?.id ? String(categories[0].id) : "1"),
          type,
          isActive,
          logo: logoFile,
          cover: coverFile,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.()
          onClose()
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Erreur lors de la création du canal.")
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>

        {/* Titre centré orange */}
        <h2 className="text-center text-2xl font-black text-[#EA580C]">
          Créer un canal
        </h2>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Zones d'upload côte à côte */}
          <div className="grid grid-cols-2 gap-3">
            {/* Upload Logo (Requis) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Logo</span>
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                  Requis
                </span>
              </div>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="relative flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#EA580C] hover:bg-orange-50/20 overflow-hidden"
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="size-7 text-gray-400" />
                    <span className="mt-1 text-[11px] text-gray-500">Choisir un logo</span>
                  </>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
            </div>

            {/* Upload Couverture (Optionnelle) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Couverture</span>
                <span className="text-[10px] text-gray-400">Optionnelle</span>
              </div>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="relative flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#EA580C] hover:bg-orange-50/20 overflow-hidden"
              >
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <UploadCloud className="size-7 text-gray-400" />
                    <span className="mt-1 text-[11px] text-gray-500">Image de cover</span>
                  </>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>
          </div>

          {/* Nom du canal */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nom du canal *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Passion Cinéma, Tech Afrique..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'objectif et les règles de votre canal..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] resize-none"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deux groupes de toggle boutons côte à côte */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Type de canal (Privé par défaut) */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1.5">
                Type de canal
              </span>
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setType("private")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    type === "private"
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Privé
                </button>
                <button
                  type="button"
                  onClick={() => setType("public")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    type === "public"
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Public
                </button>
              </div>
            </div>

            {/* Canal actif (Oui par défaut) */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1.5">
                Canal actif ?
              </span>
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    isActive
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    !isActive
                      ? "bg-[#0F172A] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Non
                </button>
              </div>
            </div>
          </div>

          {/* Bouton Créer orange pleine largeur */}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-6 w-full rounded-2xl bg-[#EA580C] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#C2410C] active:scale-[0.99] disabled:opacity-50"
          >
            {createMutation.isPending ? "Création en cours..." : "Créer le canal"}
          </button>
        </form>
      </div>
    </div>
  )
}
