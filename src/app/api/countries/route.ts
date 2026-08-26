import { NextResponse } from "next/server"
import { dughu, dughuApi } from "@/lib/dughu"

type DughuCountry = {
  id?: string | number
  nom?: string
  abreviation?: string
  active?: string | number | boolean
  indicatif?: string
}

export async function GET() {
  try {
    if (!dughu.enabled) {
      return NextResponse.json({ success: false, message: "La liste des pays est momentanément indisponible." }, { status: 503 })
    }

    const raw = await dughuApi.getCountries()
    const source = Array.isArray(raw?.result) ? raw.result : []
    const countries = source
      .filter((country: DughuCountry) => country?.active === 1 || country?.active === "1" || country?.active === true)
      .map((country: DughuCountry) => ({
        id: String(country.id),
        name: String(country.nom || ""),
        code: String(country.abreviation || ""),
        dialCode: String(country.indicatif || ""),
      }))
      .filter((country: { id: string; name: string }) => country.id && country.name)
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "fr"))

    return NextResponse.json({ success: true, countries })
  } catch (error) {
    console.error("COUNTRIES GET ERROR:", error)
    return NextResponse.json({ success: false, message: "Impossible de charger la liste des pays." }, { status: 502 })
  }
}
