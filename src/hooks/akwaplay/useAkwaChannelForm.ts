"use client"

import { useState, useCallback } from "react"
import type { AkwaChannel } from "@/types/akwaplay/akwaplayChannel.types"
import { storeChannel } from "@/services/akwaplay/akwaplayChannel.service"
import { formatChannelIdentifiant } from "@/services/akwaplay/akwaplay.helpers"

interface UseAkwaChannelFormOptions {
  userId: string | number
  onSuccess?: (channel?: AkwaChannel) => void
}

export function useAkwaChannelForm({ userId, onSuccess }: UseAkwaChannelFormOptions) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingChannelId, setEditingChannelId] = useState<string | number | null>(null)

  // Champs du formulaire
  const [name, setName] = useState("")
  const [identifiant, setIdentifiant] = useState("")
  const [description, setDescription] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setChannelBannerFile] = useState<File | null>(null)
  const [bannerPreview, setChannelBannerPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Réinitialise tous les champs
  const resetForm = useCallback(() => {
    setEditingChannelId(null)
    setName("")
    setIdentifiant("")
    setDescription("")
    setAvatarFile(null)
    setAvatarPreview(null)
    setChannelBannerFile(null)
    setChannelBannerPreview(null)
    setError(null)
  }, [])

  // Ouvrir en mode création
  const openCreateModal = useCallback(() => {
    resetForm()
    setIsOpen(true)
  }, [resetForm])

  // Ouvrir en mode édition avec pré-remplissage
  const openEditModal = useCallback((channel: AkwaChannel) => {
    setEditingChannelId(channel.id)
    setName(channel.name)
    setIdentifiant(channel.identifiant || channel.slug)
    setAvatarFile(null)
    setAvatarPreview(channel.avatar || null)
    setError(null)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    resetForm()
  }, [resetForm])

  // Changement du nom avec suggestion automatique de l'identifiant si non saisi
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value)
      // Si en mode création et que l'utilisateur n'a pas encore saisi manuellement son identifiant
      if (!editingChannelId && (!identifiant || identifiant === formatChannelIdentifiant(name))) {
        setIdentifiant(formatChannelIdentifiant(value))
      }
    },
    [editingChannelId, identifiant, name]
  )

  // Changement manuel de l'identifiant (forcé en minuscules et sans espaces)
  const handleIdentifiantChange = useCallback((value: string) => {
    setIdentifiant(formatChannelIdentifiant(value))
  }, [])

  // Sélection du fichier image (avatar unique)
  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }, [])

  // Soumission du formulaire
  const submitForm = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()

      if (!name.trim()) {
        setError("Le nom de la chaîne est requis.")
        return
      }

      if (!identifiant.trim()) {
        setError("L'identifiant de la chaîne est requis.")
        return
      }

      setSubmitting(true)
      setError(null)

      try {
        const res = await storeChannel({
          channelId: editingChannelId ?? undefined,
          name: name.trim(),
          identifiant: formatChannelIdentifiant(identifiant),
          description: description.trim() || null,
          avatarFile,
          bannerFile,
          userId,
        })

        if (res.success) {
          closeModal()
          onSuccess?.(res.channel)
        }
        return res
      } catch (err: any) {
        setError(err?.message || "Erreur lors de l'enregistrement de la chaîne.")
      } finally {
        setSubmitting(false)
      }
    },
    [name, identifiant, description, avatarFile, bannerFile, editingChannelId, userId, closeModal, onSuccess]
  )

  return {
    isOpen,
    isEditing: Boolean(editingChannelId),
    editingChannelId,
    name,
    setName: handleNameChange,
    identifiant,
    setIdentifiant: handleIdentifiantChange,
    avatarFile,
    avatarPreview,
    handleAvatarSelect,
    submitting,
    error,
    openCreateModal,
    openEditModal,
    closeModal,
    resetForm,
    submitForm,
  }
}
