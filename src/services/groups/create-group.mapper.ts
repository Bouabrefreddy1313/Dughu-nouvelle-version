import type {
  CreateGroupFieldErrors,
  CreateGroupFields,
  CreateGroupResponse,
  GroupCategory,
  GroupImageElement,
  UploadGroupImageResponse,
} from "@/types/groups/create-group.types"

type UnknownRecord = Record<string, unknown>

export const GROUP_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const GROUP_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}

export function normalizeGroupCategories(raw: unknown): GroupCategory[] {
  const result = record(raw).result
  if (!Array.isArray(result)) return []
  const seen = new Set<string>()
  return result.flatMap((value) => {
    const item = record(value)
    const id = text(item.id)
    const name = text(item.name)
    if (!id || !name || seen.has(id)) return []
    seen.add(id)
    return [{ id, name }]
  })
}

export function normalizeCreateGroup(raw: unknown): CreateGroupResponse {
  const root = record(raw)
  const groupId = text(record(root.result).id)
  return {
    success: root.success === true && Boolean(groupId),
    message: text(root.message) || undefined,
    groupId,
  }
}

export function normalizeGroupImageUpload(raw: unknown): UploadGroupImageResponse {
  const root = record(raw)
  return {
    success: root.success === true,
    message: text(root.message) || undefined,
    filePath: text(root.file_path) || undefined,
  }
}

export function containsHtml(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value)
}

export function validateCreateGroupFields(fields: CreateGroupFields): CreateGroupFieldErrors {
  const errors: CreateGroupFieldErrors = {}
  const title = fields.groupTitle.trim()
  if (title.length < 3 || title.length > 100) errors.groupTitle = "Le nom doit contenir entre 3 et 100 caractères."
  if (fields.about.length > 1000) errors.about = "La description ne doit pas dépasser 1 000 caractères."
  else if (containsHtml(fields.about)) errors.about = "La description doit contenir uniquement du texte brut."
  if (!fields.category.trim()) errors.category = "Sélectionnez une catégorie."
  if (fields.privacy !== "1" && fields.privacy !== "2") errors.privacy = "Sélectionnez une confidentialité valide."
  if (fields.joinPrivacy !== "0" && fields.joinPrivacy !== "1") errors.joinPrivacy = "Sélectionnez un mode d’adhésion valide."
  return errors
}

export function validateGroupImageMetadata(file: File | null): string | null {
  if (!file) return "Cette image est obligatoire."
  if (!GROUP_IMAGE_MIME_TYPES.includes(file.type as typeof GROUP_IMAGE_MIME_TYPES[number])) {
    return "Choisissez une image JPEG, PNG ou WebP."
  }
  if (file.size <= 0 || file.size > GROUP_IMAGE_MAX_BYTES) return "L’image ne doit pas dépasser 5 Mo."
  return null
}

export function hasValidImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  if (mime === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  }
  return false
}

export async function validateGroupImageFile(file: File | null): Promise<string | null> {
  const metadataError = validateGroupImageMetadata(file)
  if (metadataError || !file) return metadataError
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  return hasValidImageSignature(bytes, file.type) ? null : "Le contenu du fichier ne correspond pas à une image valide."
}

export function buildCreateGroupFormData(userId: string, fields: CreateGroupFields): FormData {
  const formData = new FormData()
  formData.set("user_id", userId)
  formData.set("group_title", fields.groupTitle.trim())
  formData.set("about", fields.about.trim())
  formData.set("category", fields.category)
  formData.set("privacy", fields.privacy)
  formData.set("join_privacy", fields.joinPrivacy)
  return formData
}

export function buildGroupImageFormData(groupId: string, image: File, element: GroupImageElement): FormData {
  const formData = new FormData()
  formData.set("page_id", groupId)
  formData.set("image", image)
  formData.set("element", element)
  return formData
}
