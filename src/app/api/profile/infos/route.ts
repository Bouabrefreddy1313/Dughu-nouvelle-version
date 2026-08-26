import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

const TEXT_FIELDS = [
  "villeActuelle",
  "villeOrigine",
  "etablissementFrequente",
  "domaineActivite",
  "profession",
  "entrepriseActuelle",
] as const

const LIST_FIELDS = ["entreprisePassee", "centresInteret", "competences", "lieuxFrequentes"] as const

export async function POST(req: NextRequest) {
  try {
    const userId = await getDughuUserIdFromCookies()
    if (!userId) {
      return NextResponse.json({ success: false, message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })
    }
    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "La mise à jour est momentanément indisponible." }, { status: 503 })
    }

    const body = await req.json()
    for (const field of TEXT_FIELDS) {
      if (typeof body?.[field] !== "string" || body[field].length > 500) {
        return NextResponse.json({ success: false, message: "Certaines informations sont invalides." }, { status: 422 })
      }
    }
    for (const field of LIST_FIELDS) {
      const value = body?.[field]
      if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== "string" || item.length > 150)) {
        return NextResponse.json({ success: false, message: "Certaines listes sont invalides." }, { status: 422 })
      }
    }

    const cleanList = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))]
    const raw = await dughuApi.saveProfileInfos({
      user_id: userId,
      ville_actuelle: body.villeActuelle.trim(),
      ville_origine: body.villeOrigine.trim(),
      etablissement_frequente: body.etablissementFrequente.trim(),
      domaine_activite: body.domaineActivite.trim(),
      profession: body.profession.trim(),
      entreprise_actuelle: body.entrepriseActuelle.trim(),
      entreprise_passee: cleanList(body.entreprisePassee),
      centres_interet: cleanList(body.centresInteret),
      competences: cleanList(body.competences),
      lieux_frequentes: cleanList(body.lieuxFrequentes),
    })

    if (!raw || raw.success !== true) {
      return NextResponse.json({ success: false, message: "Dughu n'a pas pu enregistrer ces informations." }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      message: "Vos informations ont été enregistrées avec succès.",
      profileCompleted: raw.profile_completed === true,
    })
  } catch (error) {
    console.error("PROFILE INFOS UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Une erreur est survenue lors de la mise à jour." }, { status: 500 })
  }
}
