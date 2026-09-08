import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface PlaceSuggestion {
  id: string
  mainText: string
  secondaryText: string
  description: string
  source: "google" | "maps"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") || "").trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, suggestions: [] })
    }

    const googleApiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      ""

    // 1. Tenter l'API Google Places si une clé API est configurée
    if (googleApiKey) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&language=fr&key=${encodeURIComponent(googleApiKey)}`

        const res = await fetch(googleUrl, { next: { revalidate: 3600 } })
        const data = await res.json()

        if (data.status === "OK" && Array.isArray(data.predictions)) {
          const suggestions: PlaceSuggestion[] = data.predictions.map(
            (p: any) => ({
              id: String(p.place_id || Math.random()),
              mainText: String(
                p.structured_formatting?.main_text || p.description || ""
              ),
              secondaryText: String(
                p.structured_formatting?.secondary_text || ""
              ),
              description: String(p.description || ""),
              source: "google" as const,
            })
          )

          if (suggestions.length > 0) {
            return NextResponse.json({ success: true, suggestions })
          }
        }
      } catch (googleError) {
        console.warn("Google Maps Places API error, fallback to OSM:", googleError)
      }
    }

    // 2. Fallback rapide et gratuit avec Photon (OSM mondial avec tolérance fautes de frappe)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}&limit=6&lang=fr`

      const res = await fetch(photonUrl, { next: { revalidate: 1800 } })
      const data = await res.json()

      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const suggestions: PlaceSuggestion[] = data.features.map(
          (f: any, idx: number) => {
            const p = f.properties || {}
            const mainText = String(
              p.name || p.street || p.city || p.country || "Lieu"
            )
            const secondaryParts = [
              p.street && p.street !== mainText ? p.street : null,
              p.district,
              p.city && p.city !== mainText ? p.city : null,
              p.state,
              p.country,
            ].filter(Boolean)

            const secondaryText = secondaryParts.join(", ")
            const description = secondaryText
              ? `${mainText}, ${secondaryText}`
              : mainText

            return {
              id: `photon-${p.osm_id || idx}`,
              mainText,
              secondaryText,
              description,
              source: "maps" as const,
            }
          }
        )

        return NextResponse.json({ success: true, suggestions })
      }
    } catch (photonError) {
      console.warn("Photon error, fallback to Nominatim:", photonError)
    }

    // 3. Fallback avec OpenStreetMap Nominatim
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=6&addressdetails=1`

      const res = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "Dughu-App/1.0",
        },
        next: { revalidate: 1800 },
      })
      const data = await res.json()

      if (Array.isArray(data)) {
        const suggestions: PlaceSuggestion[] = data.map((item: any) => {
          const name = String(item.name || item.display_name?.split(",")[0] || "")
          const address = item.address || {}
          const secondary = [
            address.road,
            address.suburb,
            address.city || address.town || address.village,
            address.state,
            address.country,
          ]
            .filter(Boolean)
            .join(", ")

          return {
            id: String(item.place_id || item.osm_id),
            mainText: name || String(item.display_name),
            secondaryText: secondary,
            description: String(item.display_name),
            source: "maps" as const,
          }
        })

        return NextResponse.json({ success: true, suggestions })
      }
    } catch (nominatimError) {
      console.error("Nominatim error:", nominatimError)
    }

    return NextResponse.json({ success: true, suggestions: [] })
  } catch (error) {
    console.error("PLACES AUTOCOMPLETE ERROR:", error)
    return NextResponse.json({ success: false, suggestions: [] }, { status: 500 })
  }
}
