"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Calendar,
  MapPin,
  Clock,
  FileText,
  UploadCloud,
  ArrowLeft,
  Loader2,
  X,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import MainLayout from "@/components/layout/MainLayout"
import { useAuth } from "@/hooks/queries/use-auth"
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useEventDetail,
} from "@/hooks/queries/use-events"
import type { DughuEvent } from "@/types/events/events.types"
import LocationAutocomplete from "./LocationAutocomplete"

interface EventFormPageProps {
  initialData?: DughuEvent | null
  editEventId?: string
  isEdit?: boolean
}

export default function EventFormPage({ initialData: propInitialData, editEventId, isEdit = false }: EventFormPageProps) {
  const router = useRouter()
  const { data: rawUser } = useAuth()
  const userId = String(rawUser?.dughu?.userId || rawUser?.id || "")

  const actualIsEdit = isEdit || Boolean(editEventId)
  const { data: fetchedDetail } = useEventDetail(editEventId || "", userId)
  const initialData = propInitialData || fetchedDetail?.event || null

  const [name, setName] = useState(initialData?.name || "")
  const [location, setLocation] = useState(initialData?.location || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [startDate, setStartDate] = useState(initialData?.startDate || "")
  const [startTime, setStartTime] = useState(initialData?.startTime || "")
  const [endDate, setEndDate] = useState(initialData?.endDate || "")
  const [endTime, setEndTime] = useState(initialData?.endTime || "")

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>(
    initialData?.cover || initialData?.coverPath || ""
  )

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const createMutation = useCreateEventMutation()
  const updateMutation = useUpdateEventMutation()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // Synchronisation si initialData change en mode édition
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "")
      setLocation(initialData.location || "")
      setDescription(initialData.description || "")
      setStartDate(initialData.startDate || "")
      setStartTime(initialData.startTime || "")
      setEndDate(initialData.endDate || "")
      setEndTime(initialData.endTime || "")
      if (initialData.cover || initialData.coverPath) {
        setCoverPreview(initialData.cover || initialData.coverPath)
      }
    }
  }, [initialData])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 10 Mo.")
        return
      }
      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCover = () => {
    setCoverFile(null)
    setCoverPreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Veuillez entrer le nom de l'événement.")
      return
    }
    if (!location.trim()) {
      toast.error("Veuillez préciser le lieu de l'événement.")
      return
    }
    if (!description.trim()) {
      toast.error("Veuillez fournir une description de l'événement.")
      return
    }
    if (!startDate || !startTime) {
      toast.error("Veuillez renseigner la date et l'heure de début.")
      return
    }
    if (!endDate || !endTime) {
      toast.error("Veuillez renseigner la date et l'heure de fin.")
      return
    }

    try {
      if (isEdit && initialData?.id) {
        const res = await updateMutation.mutateAsync({
          id: initialData.id,
          input: {
            name,
            location,
            description,
            startDate,
            startTime,
            endDate,
            endTime,
            cover: coverFile,
            userId,
          },
        })

        if (res.success) {
          toast.success("Événement mis à jour avec succès !")
          router.push(`/events/${initialData.id}`)
        } else {
          toast.error(res.message || "Erreur lors de la mise à jour.")
        }
      } else {
        const res = await createMutation.mutateAsync({
          name,
          location,
          description,
          startDate,
          startTime,
          endDate,
          endTime,
          cover: coverFile,
          userId,
        })

        if (res.success) {
          toast.success("Événement créé avec succès !")
          const targetId = res.eventId
          if (targetId) {
            router.push(`/events/${targetId}`)
          } else {
            router.push("/events")
          }
        } else {
          toast.error(res.message || "Erreur lors de la création de l'événement.")
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Une erreur inattendue est survenue.")
    }
  }

  return (
    <MainLayout user={rawUser} wide noRightSidebar active="events">
      <div className="min-h-screen bg-[#F5F6FA] dark:bg-[#121212] py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Bouton retour */}
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux événements</span>
          </button>

          {/* Form Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Header Formulaire */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-[#8B5E34]/10 via-[#8B5E34]/5 to-transparent border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#8B5E34] text-white flex items-center justify-center shadow-md">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
                    {isEdit ? "Modifier l'événement" : "Créer un événement"}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Remplissez les détails pour inviter la communauté Dughu
                  </p>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* Nom de l'événement */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8B5E34]" />
                  Nom de l'événement <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Soirée Networking Dughu Tech 2026"
                  required
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 transition"
                />
              </div>

              {/* Lieu de l'événement */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8B5E34]" />
                  Lieu ou adresse <span className="text-rose-500">*</span>
                </label>
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder="Ex : Sofitel Hôtel Ivoire, Abidjan"
                  required
                />
              </div>

              {/* Dates et Heures : Début et Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Début */}
                <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/80 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B5E34]">
                    Début de l'événement
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5" /> Date de début
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 outline-none focus:border-[#8B5E34] transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Heure de début
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 outline-none focus:border-[#8B5E34] transition"
                    />
                  </div>
                </div>

                {/* Fin */}
                <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-zinc-800/50 border border-gray-200/80 dark:border-zinc-700/80 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8B5E34]">
                    Fin de l'événement
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5" /> Date de fin
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 outline-none focus:border-[#8B5E34] transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Heure de fin
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 outline-none focus:border-[#8B5E34] transition"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#8B5E34]" />
                  Description de l'événement <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Décrivez le programme, les intervenants, les conditions d'accès, etc."
                  required
                  className="w-full px-4 py-3 text-sm rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#8B5E34] focus:ring-2 focus:ring-[#8B5E34]/15 transition resize-y"
                />
              </div>

              {/* Image de couverture (16:9) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#8B5E34]" />
                  Image de couverture (Format 16:9 recommandé)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {coverPreview ? (
                  <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 group">
                    <Image
                      src={coverPreview}
                      alt="Aperçu couverture"
                      fill
                      className="object-cover"
                      unoptimized={Boolean(coverPreview.startsWith("data:") || coverPreview.startsWith("http"))}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-white/90 text-gray-900 text-xs font-bold hover:bg-white transition cursor-pointer"
                      >
                        Changer
                      </button>
                      <button
                        type="button"
                        onClick={removeCover}
                        className="p-2 rounded-xl bg-red-600/90 text-white hover:bg-red-600 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-16/9 w-full rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-[#8B5E34] dark:hover:border-[#8B5E34] bg-gray-50/50 dark:bg-zinc-800/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-gray-400 hover:text-[#8B5E34]"
                  >
                    <UploadCloud className="w-10 h-10" />
                    <p className="text-sm font-bold">Cliquez pour ajouter une image de couverture</p>
                    <p className="text-xs text-gray-400">PNG, JPG, WEBP jusqu'à 10 Mo</p>
                  </div>
                )}
              </div>

              {/* Bouton de soumission */}
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold text-sm transition cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-[#8B5E34] hover:bg-[#724b28] text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isSubmitting
                      ? "Enregistrement..."
                      : isEdit
                      ? "Enregistrer les modifications"
                      : "Publier l'événement"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
