export type GroupPrivacy = "1" | "2"
export type GroupJoinPrivacy = "0" | "1"
export type GroupImageElement = "avatar" | "cover"

export interface GroupCategory {
  id: string
  name: string
}

export interface CreateGroupFields {
  groupTitle: string
  about: string
  category: string
  privacy: GroupPrivacy
  joinPrivacy: GroupJoinPrivacy
}

export interface CreateGroupInput extends CreateGroupFields {
  avatar: File
  cover: File
}

export interface CreateGroupResponse {
  success: boolean
  message?: string
  groupId: string
}

export interface UploadGroupImageResponse {
  success: boolean
  message?: string
  filePath?: string
}

export interface CreateGroupOutcome {
  groupId: string
  failedUploads: GroupImageElement[]
}

export type CreateGroupFieldErrors = Partial<Record<keyof CreateGroupFields, string>>

