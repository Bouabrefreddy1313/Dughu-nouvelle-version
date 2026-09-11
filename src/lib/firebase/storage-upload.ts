import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "./client"

export interface UploadedMediaResult {
  url: string
  fileName: string
  mimeType: string
  fileSize: number
  type: "image" | "video" | "document"
}

/**
 * Upload d'un média de message vers Firebase Storage.
 */
export async function uploadChatMedia(
  file: File,
  conversationId: string
): Promise<UploadedMediaResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `chat/${conversationId}/${timestamp}_${safeName}`
  const storageRef = ref(storage, path)

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || undefined,
  })

  const url = await getDownloadURL(snapshot.ref)

  let type: "image" | "video" | "document" = "document"
  if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
    type = "image"
  } else if (file.type.startsWith("video/") || ["mp4", "webm", "ogg", "mov"].includes(ext)) {
    type = "video"
  }

  return {
    url,
    fileName: file.name,
    mimeType: file.type || "",
    fileSize: file.size,
    type,
  }
}
