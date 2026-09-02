"use client"

// ── RetrouvaillesContactsTab — onglet « Contacts » ───────────────────────────
// Import d'un fichier CSV de numéros, bouton « Synchroniser », états de
// progression, puis liste des contacts retrouvés avec bouton « Fraterniser ».

import { useRef, useState } from "react"
import { MessageCircleHeart, RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRetrouvailles } from "@/hooks/retrouvailles/use-retrouvailles"
import { useOutgoingRequestUserIds } from "@/hooks/relations/useRelationRequests"
import RetrouvaillePersonCard from "./RetrouvaillePersonCard"
import { RetrouvaillesEmpty, RetrouvaillesError, RetrouvaillesCircleLoader } from "./RetrouvaillesStates"

function parseCsv(text: string): string[] {
  const rows = text.split(/\r?\n/)
  const phones: string[] = []
  for (const row of rows) {
    const trimmed = row.trim()
    if (!trimmed) continue
    const cells = trimmed.split(/[,;]/).map((s) => s.trim())
    const firstCell = cells[0] || ""
    if (cells.length === 1) {
      if (/^[+()0-9\s-]{6,}$/.test(trimmed)) phones.push(trimmed.replace(/[\s()-]/g, ""))
    } else if (/^\d{6,}$/.test(firstCell.replace(/[\s()-]/g, ""))) {
      phones.push(firstCell)
    }
  }
  return phones
}

/**
 * Parse un fichier vCard (VCF) : extrait les numéros des champs `TEL`.
 * Gère les formes courantes `TEL;TYPE=CELL:+225 07 87…`, `item1.TEL:…`,
 * et les fichiers multi-contacts (BEGIN:VCARD…END:VCARD répétés).
 */
function parseVcf(text: string): string[] {
  const phones: string[] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^(?:item\d+\.)?TEL[^:]*:(.+)$/i)
    if (!match) continue
    const raw = match[1].trim()
    if (!raw) continue
    // Retire séparateurs, puis éventuel préfixe national ivoirien « +225 » →
    // format local « 07… » attendu par l'API Dughu (ex. 0787564183).
    let cleaned = raw.replace(/[\s()-]/g, "").replace(/^\+/, "")
    if (cleaned.startsWith("225") && cleaned.length >= 11) {
      cleaned = cleaned.slice(3)
    }
    if (/^[0-9]{6,}$/.test(cleaned)) phones.push(cleaned)
  }
  return [...new Set(phones)]
}

function parseContactFile(fileName: string, text: string): string[] {
  return /\.vcf(?:ard)?$/i.test(fileName) ? parseVcf(text) : parseCsv(text)
}

interface RetrouvaillesContactsTabProps {
  userId: string
}

export default function RetrouvaillesContactsTab({ userId }: RetrouvaillesContactsTabProps) {
  const [filePhones, setFilePhones] = useState<string[]>([])
  const [syncedPhones, setSyncedPhones] = useState<string[]>([])
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // La requête vit ICI : elle part des numéros réellement synchronisés. Dès que
  // `syncedPhones` change, le queryKey change et React Query relance la requête
  // (POST body JSON — aucune query string géante).
  const query = useRetrouvailles("contacts", {
    userId,
    phoneNumbers: syncedPhones,
    enabled: !!userId && syncedPhones.length > 0,
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || "")
      setFilePhones(parseContactFile(file.name, text))
      setFileName(file.name)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // « Synchroniser » : déclenche la requête (le queryKey change → fetch auto).
  const handleSync = () => {
    if (filePhones.length === 0) return
    setSyncedPhones(filePhones)
  }

  const isSyncing = query.isLoading || query.isFetching
  const errorMessage = query.error instanceof Error ? query.error.message : "Impossible de charger vos contacts."
  // Demandes sortantes déjà envoyées (pré-remplissage « Demande envoyée »).
  const outgoingQuery = useOutgoingRequestUserIds(!!userId)
  const sentIds = new Set(outgoingQuery.data ?? [])

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F5EFE8] text-[#A35A2A]">
              <MessageCircleHeart size={20} aria-hidden />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#2D2D2D]">Importer vos contacts</h2>
              <p className="mt-0.5 text-[12px] text-[#65676B]">
                {filePhones.length > 0
                  ? `${filePhones.length} numéro(s) détecté(s) depuis ${fileName || "votre fichier"}`
                  : "Téléchargez un fichier vCard (.vcf) de vos contacts (ou un CSV de numéros)."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <input ref={fileInputRef} type="file" accept=".vcf,.vcard,text/vcard,text/x-vcard,.csv,text/csv" onChange={handleFile} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload size={15} aria-hidden />
              {fileName ? "Changer" : "Choisir"}
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={filePhones.length === 0 || isSyncing}
              className="gap-1.5 bg-[#A35A2A] text-white hover:bg-[#8a4d23]"
            >
              <RefreshCw size={15} className={isSyncing ? "animate-spin" : ""} aria-hidden />
              {isSyncing ? "Synchronisation…" : "Synchroniser"}
            </Button>
          </div>
        </div>
      </div>

      {syncedPhones.length === 0 ? (
        !fileName && <RetrouvaillesEmpty label="Importez un fichier vCard (.vcf) puis cliquez sur « Synchroniser » pour retrouver vos contacts." />
      ) : isSyncing ? (
        <RetrouvaillesCircleLoader label="Synchronisation de vos contacts…" />
      ) : query.isError ? (
        <RetrouvaillesError message={errorMessage} onRetry={() => query.refetch()} />
      ) : (query.data?.persons?.length ?? 0) === 0 ? (
        <RetrouvaillesEmpty label="Aucun contact retrouvé avec ces numéros." />
      ) : (
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-[#65676B]">
            {query.data?.persons?.length ?? 0} contact(s) retrouvé(s)
          </p>
          <ul className="space-y-2.5">
            {query.data?.persons?.map((person) => (
              <RetrouvaillePersonCard key={person.id} person={person} authUserId={userId} sentIds={sentIds} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}