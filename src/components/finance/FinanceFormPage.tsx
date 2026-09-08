"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, ImageIcon, Loader2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import { useFinanceDetail, useSubmitFinanceMutation } from "@/hooks/queries/use-finance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface FinanceFormPageProps {
  editFinanceId?: string
}

export default function FinanceFormPage({ editFinanceId }: FinanceFormPageProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const isEdit = Boolean(editFinanceId)

  // En mode édition, charger les détails existants
  const { data: detailData, isLoading: detailLoading } = useFinanceDetail(
    editFinanceId || ""
  )

  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitMutation = useSubmitFinanceMutation()

  // Pré-remplir en mode édition
  useEffect(() => {
    if (isEdit && detailData?.finance) {
      const f = detailData.finance
      setTitle(f.title || "")
      setAmount(f.amount ? String(f.amount) : "")
      setDescription(f.description || "")
      if (f.image) {
        setPreviewUrl(f.image)
      }
    }
  }, [isEdit, detailData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Veuillez sélectionner un fichier image valide.")
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Le titre est obligatoire.")
      return
    }

    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Veuillez spécifier un nombre de points valide.")
      return
    }

    if (!description.trim()) {
      toast.error("La description est obligatoire.")
      return
    }

    try {
      const res = await submitMutation.mutateAsync({
        title,
        amount: numAmount,
        description,
        image: selectedFile,
        userId,
        financeId: editFinanceId,
      })

      if (res.success) {
        toast.success(
          res.message ||
            (isEdit
              ? "Demande de financement mise à jour !"
              : "Demande de financement publiée avec succès !")
        )
        if (isEdit && editFinanceId) {
          router.push(`/finance/${editFinanceId}`)
        } else {
          router.push("/finance")
        }
      } else {
        toast.error(res.message || "Erreur lors de l'enregistrement.")
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer la demande.")
    }
  }

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="finance">
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header : bandeau marron/dégradé, flèche retour (←) à gauche + titre blanc */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#8B5E34] via-[#7D4F28] to-[#633A18] text-white p-5 sm:p-7 shadow-lg flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              title="Retour"
              aria-label="Retour"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              {isEdit
                ? "Modifier la demande de financement"
                : "Créer une nouvelle demande de financement"}
            </h1>
          </div>

          {/* Formulaire (fond blanc) */}
          {isEdit && detailLoading ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 flex items-center justify-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-[#8B5E34]" />
              <span>Chargement des données existantes...</span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 shadow-xs space-y-6"
            >
              {/* Label "Titre" */}
              <div className="space-y-2">
                <label
                  htmlFor="finance-title"
                  className="block text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                  Titre <span className="text-red-500">*</span>
                </label>
                <Input
                  id="finance-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entrez le titre"
                  className="rounded-xl border-gray-200 dark:border-zinc-700 h-12 text-sm focus-visible:ring-[#8B5E34]"
                  required
                />
              </div>

              {/* Label "Combien de points aimeriez-vous recevoir ?" */}
              <div className="space-y-2">
                <label
                  htmlFor="finance-amount"
                  className="block text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                  Combien de points aimeriez-vous recevoir ?{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="finance-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Entrez le montant en points"
                    className="pr-20 rounded-xl border-gray-200 dark:border-zinc-700 h-12 text-sm focus-visible:ring-[#8B5E34]"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    points
                  </span>
                </div>
              </div>

              {/* Label "La description" */}
              <div className="space-y-2">
                <label
                  htmlFor="finance-description"
                  className="block text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                  La description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  id="finance-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre demande"
                  rows={5}
                  className="rounded-xl border-gray-200 dark:border-zinc-700 text-sm focus-visible:ring-[#8B5E34] resize-y min-h-[120px]"
                  required
                />
              </div>

              {/* Label "Image" + Zone de dépôt */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                  Image
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-full h-56 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-[#8B5E34] bg-gray-50 dark:bg-zinc-800/60 overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(139, 94, 52, 0.05) 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                >
                  {previewUrl ? (
                    <>
                      <Image
                        src={previewUrl}
                        alt="Aperçu de l'illustration"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-4 py-2 rounded-xl bg-white/90 text-gray-800 text-xs font-bold shadow-md">
                          Changer l'image
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        title="Retirer l'image"
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition z-10 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5E34] hover:bg-[#744c29] text-white font-bold text-xs shadow-md transition transform active:scale-98 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>🖼 Choisir une image</span>
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, WEBP jusqu'à 10 Mo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bas de page : lien "← Retour" à gauche et bouton "Publier" / "Enregistrer" à droite */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition cursor-pointer"
                >
                  ← Retour
                </button>

                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="px-7 py-2.5 rounded-xl bg-[#8B5E34] hover:bg-[#744c29] text-white font-bold text-sm shadow-md hover:shadow-lg transition transform active:scale-98 cursor-pointer"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : isEdit ? (
                    "Enregistrer"
                  ) : (
                    "Publier"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
