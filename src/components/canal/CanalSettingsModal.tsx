"use client"

/**
 * Modale de gestion et paramètres d'un canal.
 *
 * Permet au créateur / administrateur de :
 *  1. Consulter les demandes d'adhésion en attente et les Accepter / Refuser.
 *  2. Consulter la liste des membres actuels.
 *  3. MODIFIER toutes les informations du canal :
 *     - Nom, description, catégorie
 *     - Visibilité (Public / Privé)
 *     - Statut actif/inactif
 *     - Photo de profil (logo) & Photo de couverture (cover)
 */

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {
  X,
  Users,
  Bell,
  Settings,
  Check,
  UserCheck,
  UserX,
  ShieldCheck,
  Globe,
  Lock,
  Power,
  UploadCloud,
  Save,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react"
import type { Canal, CanalType } from "@/types/canal/canal.types"
import {
  useCanalMembers,
  useHandleJoinRequest,
  useUpdateCanalStatus,
  useCreateOrUpdateCanal,
  usePossibleCategories,
} from "@/hooks/canal/use-canals"
import {
  useReceivedNotifications,
  useProcessedNotifications,
  useDeleteNotification,
} from "@/hooks/canal/use-canal-notifications"

interface CanalSettingsModalProps {
  canal: Canal
  currentUserId: string
  isOpen: boolean
  onClose: () => void
  initialTab?: "requests" | "members" | "settings"
}

export default function CanalSettingsModal({
  canal,
  currentUserId,
  isOpen,
  onClose,
  initialTab = "requests",
}: CanalSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "members" | "settings">(initialTab)

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  const [notifsSubTab, setNotifsSubTab] = useState<"pending" | "processed">("pending")

  // Requêtes : Demandes d'adhésion (reçues & traitées), Membres & Catégories
  const { data: notifsData, isLoading: notifsLoading } = useReceivedNotifications(
    currentUserId,
    canal.id
  )
  const { data: processedNotifsData, isLoading: processedLoading } = useProcessedNotifications(
    currentUserId,
    canal.id
  )
  const deleteNotifMutation = useDeleteNotification(canal.id)

  const notifications = notifsData?.notifications ?? []
  const pendingRequests = notifications.filter(
    (n) => n.status === null || n.status === "" || n.status === "pending"
  )
  const processedRequests = processedNotifsData?.notifications ?? []

  const { data: members = [], isLoading: membersLoading } = useCanalMembers(canal.id)
  const { data: categories = [] } = usePossibleCategories()

  // Mutations
  const handleJoinMutation = useHandleJoinRequest()
  const updateStatusMutation = useUpdateCanalStatus()
  const updateCanalMutation = useCreateOrUpdateCanal()

  // États du formulaire d'édition
  const [name, setName] = useState(canal.name || "")
  const [description, setDescription] = useState(canal.description || "")
  const [categoryId, setCategoryId] = useState(canal.categoryId || "")
  const [type, setType] = useState<CanalType>(canal.type || "public")
  const [isActive, setIsActive] = useState(canal.isActive ?? true)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(canal.logo || null)

  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(canal.cover || null)

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Mettre à jour les champs si le canal change
  useEffect(() => {
    setName(canal.name || "")
    setDescription(canal.description || "")
    setCategoryId(canal.categoryId || (categories[0]?.id ? String(categories[0].id) : "1"))
    setType(canal.type || "public")
    setIsActive(canal.isActive ?? true)
    setLogoPreview(canal.logo || null)
    setCoverPreview(canal.cover || null)
    setLogoFile(null)
    setCoverFile(null)
    setSaveSuccess(null)
    setSaveError(null)
  }, [canal, categories])

  if (!isOpen) return null

  const handleAction = (requestId: string, accept: boolean) => {
    handleJoinMutation.mutate({
      requestId,
      userId: currentUserId,
      canalId: canal.id,
      accept,
    })
  }

  const handleDeleteNotif = (notificationId: string) => {
    deleteNotifMutation.mutate({
      notificationId,
      userId: currentUserId,
    })
  }

  const handleToggleActive = () => {
    const nextState = !isActive
    setIsActive(nextState)
    updateStatusMutation.mutate({
      userId: currentUserId,
      canalId: canal.id,
      isActive: nextState,
    })
  }

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

  const handleSaveCanal = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess(null)
    setSaveError(null)

    if (!name.trim()) {
      setSaveError("Le nom du canal est requis.")
      return
    }

    updateCanalMutation.mutate(
      {
        userId: currentUserId,
        values: {
          canalId: canal.id,
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
          setSaveSuccess("Canal mis à jour avec succès !")
          setTimeout(() => setSaveSuccess(null), 4000)
        },
        onError: (err) => {
          setSaveError(err instanceof Error ? err.message : "Erreur lors de la modification du canal.")
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex max-h-[90vh] h-[720px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#0F172A] border border-gray-800 text-gray-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================== */}
        {/* En-tête */}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 shrink-0 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-gray-800 border border-gray-700">
              <Image
                src={logoPreview || canal.logo || "/images/avatar.png"}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
                unoptimized={(logoPreview || canal.logo)?.startsWith("http")}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{name || canal.name}</span>
                <span className="rounded-full bg-[#985810]/20 border border-[#985810]/40 px-2 py-0.5 text-[11px] font-bold text-[#d48937]">
                  {canal.categoryName || "Général"}
                </span>
              </h2>
              <p className="text-xs text-gray-400">Paramètres et administration du canal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* Onglets */}
        {/* ===================================================================== */}
        <div className="flex border-b border-gray-800 bg-gray-900/60 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "requests"
                ? "border-[#985810] text-[#985810]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Bell size={15} />
            <span>Demandes d'adhésion</span>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-[#985810] px-2 py-0.5 text-[10px] font-extrabold text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "members"
                ? "border-[#985810] text-[#985810]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Users size={15} />
            <span>Membres ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "settings"
                ? "border-[#985810] text-[#985810]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Settings size={15} />
            <span>Modifier le canal</span>
          </button>
        </div>

        {/* ===================================================================== */}
        {/* Contenu de l'onglet actif */}
        {/* ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. DEMANDES D'ADHÉSION & NOTIFICATIONS */}
          {activeTab === "requests" && (
            <div>
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Notifications & Adhésions
                  </h3>
                  <p className="text-xs text-gray-400">
                    Gérez les demandes d'adhésion et les notifications relatives à votre canal
                  </p>
                </div>

                {/* Sélecteur de sous-onglets : En attente / Traitées */}
                <div className="flex items-center gap-1.5 rounded-xl bg-gray-900 border border-gray-800 p-1 self-start">
                  <button
                    type="button"
                    onClick={() => setNotifsSubTab("pending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      notifsSubTab === "pending"
                        ? "bg-[#985810] text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    En attente ({pendingRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifsSubTab("processed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      notifsSubTab === "processed"
                        ? "bg-[#985810] text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Traitées ({processedRequests.length})
                  </button>
                </div>
              </div>

              {(notifsSubTab === "pending" ? notifsLoading : processedLoading) ? (
                <div className="flex h-48 items-center justify-center text-xs text-gray-500">
                  Chargement des notifications...
                </div>
              ) : (notifsSubTab === "pending" ? pendingRequests : processedRequests).length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/30 p-8 text-center">
                  <UserCheck size={36} className="text-gray-600" />
                  <p className="mt-3 text-sm font-bold text-gray-300">
                    {notifsSubTab === "pending"
                      ? "Aucune demande d'adhésion en attente"
                      : "Aucune notification traitée pour le moment"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 max-w-sm">
                    {notifsSubTab === "pending"
                      ? "Les nouvelles personnes qui demandent à intégrer votre canal privé apparaîtront ici."
                      : "L'historique de vos demandes acceptées ou refusées apparaîtra ici."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(notifsSubTab === "pending" ? pendingRequests : processedRequests).map((notif) => {
                    const reqId = notif.requestId || notif.id
                    const isAccepted = notif.status?.toLowerCase().includes("accept")
                    const isRejected = notif.status?.toLowerCase().includes("rejet") || notif.status?.toLowerCase().includes("refus")

                    return (
                      <div
                        key={notif.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-4 transition hover:border-gray-700"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-gray-800 border border-gray-700">
                            <Image
                              src={notif.senderAvatar || "/images/avatar.png"}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                              unoptimized={notif.senderAvatar?.startsWith("http")}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {notif.senderName || notif.content || "Utilisateur"}
                            </p>
                            {notif.content && notif.senderName && notif.content !== notif.senderName && (
                              <p className="text-xs text-gray-300 truncate">
                                {notif.content}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {notif.createdAt
                                ? new Date(notif.createdAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                          </div>
                        </div>

                        {/* Actions selon sous-onglet */}
                        <div className="flex items-center gap-2 shrink-0">
                          {notifsSubTab === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAction(reqId, true)}
                                disabled={handleJoinMutation.isPending}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                              >
                                <Check size={14} />
                                <span className="hidden sm:inline">Accepter</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAction(reqId, false)}
                                disabled={handleJoinMutation.isPending}
                                className="flex items-center gap-1.5 rounded-xl bg-red-950/60 border border-red-800/80 px-3.5 py-2 text-xs font-bold text-red-300 transition hover:bg-red-900/80 disabled:opacity-50 cursor-pointer"
                              >
                                <UserX size={14} />
                                <span className="hidden sm:inline">Refuser</span>
                              </button>
                            </>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isAccepted
                                  ? "bg-emerald-950/70 border border-emerald-800 text-emerald-300"
                                  : isRejected
                                  ? "bg-red-950/70 border border-red-800 text-red-300"
                                  : "bg-gray-800 border border-gray-700 text-gray-300"
                              }`}
                            >
                              {notif.status || "Traitée"}
                            </span>
                          )}

                          {/* Bouton de suppression de la notification */}
                          <button
                            type="button"
                            onClick={() => handleDeleteNotif(notif.id)}
                            disabled={deleteNotifMutation.isPending}
                            title="Supprimer la notification"
                            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. LISTE DES MEMBRES */}
          {activeTab === "members" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Membres adhérents ({members.length})
                </h3>
              </div>

              {membersLoading ? (
                <div className="flex h-48 items-center justify-center text-xs text-gray-500">
                  Chargement des membres...
                </div>
              ) : members.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-12">
                  Aucun membre pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-800/60 bg-gray-900/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-gray-800 border border-gray-700">
                          <Image
                            src={m.avatar || "/images/avatar.png"}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized={m.avatar?.startsWith("http")}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-200">{m.name}</p>
                          <p className="text-[11px] text-gray-500">@{m.username || "membre"}</p>
                        </div>
                      </div>

                      {m.isAdmin && (
                        <span className="flex items-center gap-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                          <ShieldCheck size={12} />
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. MODIFIER LE CANAL (FORMULAIRE COMPLET) */}
          {activeTab === "settings" && (
            <form onSubmit={handleSaveCanal} className="space-y-5">
              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/50 border border-emerald-800/70 p-3 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 rounded-2xl bg-red-950/50 border border-red-800/70 p-3 text-xs font-semibold text-red-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Photos côte à côte : Photo de profil (Logo) & Couverture (Cover) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Photo de profil (Logo)
                  </label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="relative flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/50 transition hover:border-[#985810] hover:bg-gray-900 overflow-hidden"
                  >
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt="Logo prévisualisation"
                        fill
                        className="object-cover"
                        unoptimized={logoPreview.startsWith("http") || logoPreview.startsWith("blob")}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center p-2">
                        <UploadCloud size={24} className="text-gray-400" />
                        <span className="text-[11px] font-bold text-gray-400">
                          Changer le logo
                        </span>
                      </div>
                    )}
                    {logoPreview && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition text-xs font-bold text-white">
                        Modifier
                      </div>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </div>

                {/* Cover */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Photo de couverture
                  </label>
                  <div
                    onClick={() => coverInputRef.current?.click()}
                    className="relative flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/50 transition hover:border-[#985810] hover:bg-gray-900 overflow-hidden"
                  >
                    {coverPreview ? (
                      <Image
                        src={coverPreview}
                        alt="Cover prévisualisation"
                        fill
                        className="object-cover"
                        unoptimized={coverPreview.startsWith("http") || coverPreview.startsWith("blob")}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-center p-2">
                        <UploadCloud size={24} className="text-gray-400" />
                        <span className="text-[11px] font-bold text-gray-400">
                          Ajouter une couverture
                        </span>
                      </div>
                    )}
                    {coverPreview && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition text-xs font-bold text-white">
                        Modifier
                      </div>
                    )}
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Nom du canal <span className="text-[#985810]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Actualités Tech, Musique..."
                  className="w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#985810]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Décrivez brièvement le thème de ce canal..."
                  className="w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#985810] resize-none"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  Catégorie
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-xs text-white outline-none focus:border-[#985810]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-gray-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles Type et Statut Actif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Type de canal */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Visibilité
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("public")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                        type === "public"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Globe size={13} />
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("private")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                        type === "private"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Lock size={13} />
                      Privé
                    </button>
                  </div>
                </div>

                {/* Statut actif */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-3">
                  <label className="block text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Statut du canal
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsActive(true)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Power size={13} />
                      Actif
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsActive(false)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                        !isActive
                          ? "bg-red-900/80 text-red-200 border border-red-800 shadow-sm"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Power size={13} />
                      Inactif
                    </button>
                  </div>
                </div>
              </div>

              {/* Bouton de sauvegarde */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateCanalMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#985810] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#7d480d] disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>
                    {updateCanalMutation.isPending
                      ? "Enregistrement..."
                      : "Enregistrer les modifications"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
