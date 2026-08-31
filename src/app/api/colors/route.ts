import { NextResponse } from "next/server"
import { dughu, dughuApi, resolveMediaUrl, DughuApiError } from "@/lib/dughu"

export const dynamic = "force-dynamic"

export interface ColoredBackground {
  id: number
  bg: string
  text: string
  color_1: string
  color_2: string
  isImage: boolean
}

export async function GET() {
  try {
    if (!dughu.enabled) {
      // Fallback : couleurs statiques si l'API Dughu n'est pas configurée
      return NextResponse.json({
        success: true,
        colors: getFallbackColors(),
      })
    }

    // Documentation API : GET /getPostColors → tableau { id, color_1, color_2,
    // text_color }. Repli sur l'endpoint legacy GET /colored_posts si le nouveau
    // endpoint est indisponible.
    let raw: any
    try {
      raw = await dughuApi.getPostColors()
    } catch (e) {
      console.warn("getPostColors indisponible, repli sur colored_posts :", e)
      raw = await dughuApi.getColoredPosts({})
    }
    const items: any[] = Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.result)
        ? raw.result
        : Array.isArray(raw?.postColors)
          ? raw.postColors
          : Array.isArray(raw?.coloredPosts)
            ? raw.coloredPosts
            : Array.isArray(raw?.colors)
              ? raw.colors
              : Array.isArray(raw)
                ? raw
                : []

    const colors: ColoredBackground[] = items
      .map(transformColorItem)
      .filter((c): c is ColoredBackground => c !== null)

    return NextResponse.json({
      success: true,
      colors: colors.length > 0 ? colors : getFallbackColors(),
    })
  } catch (error) {
    console.error("FETCH COLORS ERROR:", error)
    if (error instanceof DughuApiError) {
      return NextResponse.json({
        success: true,
        colors: getFallbackColors(),
      })
    }
    return NextResponse.json({
      success: true,
      colors: getFallbackColors(),
    })
  }
}

function transformColorItem(item: any): ColoredBackground | null {
  const id = Number(item.id || item.ID || 0)
  if (!id) return null

  const color1 = String(item.color_1 || item.color1 || "")
  const color2 = String(item.color_2 || item.color2 || "")
  const textColor = String(item.text_color || item.textColor || "#000000")

  // Détecter si color_2 est un chemin d'image (contient '/' ou une extension)
  const isImage =
    !!color2 &&
    !color2.startsWith("#") &&
    (color2.includes("/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/i.test(color2))

  if (isImage) {
    const imageUrl = resolveMediaUrl(color2)
    return {
      id,
      bg: imageUrl, // sera affiché comme background-image
      text: textColor || color1 || "#000000",
      color_1: color1,
      color_2: color2,
      isImage: true,
    }
  }

  // Fond en dégradé (deux couleurs)
  if (color1 && color2) {
    return {
      id,
      bg: `linear-gradient(135deg, ${color1}, ${color2})`,
      text: textColor,
      color_1: color1,
      color_2: color2,
      isImage: false,
    }
  }

  // Fond uni (une seule couleur)
  if (color1) {
    return {
      id,
      bg: color1,
      text: textColor,
      color_1: color1,
      color_2: color2,
      isImage: false,
    }
  }

  return null
}

function getFallbackColors(): ColoredBackground[] {
  return [
    { id: 0, bg: "linear-gradient(135deg, #ff9a9e, #fecfef)", text: "#ffffff", color_1: "#ff9a9e", color_2: "#fecfef", isImage: false },
    { id: 1, bg: "linear-gradient(135deg, #a18cd1, #fbc2eb)", text: "#ffffff", color_1: "#a18cd1", color_2: "#fbc2eb", isImage: false },
    { id: 2, bg: "linear-gradient(135deg, #84fab0, #8fd3f4)", text: "#ffffff", color_1: "#84fab0", color_2: "#8fd3f4", isImage: false },
    { id: 3, bg: "#B87333", text: "#ffffff", color_1: "#B87333", color_2: "", isImage: false },
    { id: 4, bg: "#2c3e50", text: "#ffffff", color_1: "#2c3e50", color_2: "", isImage: false },
    { id: 5, bg: "linear-gradient(135deg, #667eea, #764ba2)", text: "#ffffff", color_1: "#667eea", color_2: "#764ba2", isImage: false },
    { id: 6, bg: "linear-gradient(135deg, #f093fb, #f5576c)", text: "#ffffff", color_1: "#f093fb", color_2: "#f5576c", isImage: false },
    { id: 7, bg: "linear-gradient(135deg, #4facfe, #00f2fe)", text: "#ffffff", color_1: "#4facfe", color_2: "#00f2fe", isImage: false },
  ]
}