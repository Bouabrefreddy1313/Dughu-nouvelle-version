import { NextRequest, NextResponse } from "next/server"
import { dughu, dughuApi, normalizeUser, pick } from "@/lib/dughu"
import { getDughuUserIdFromCookies } from "@/lib/dughu-user"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      bio, firstName, lastName, gender, birthdate, phone, email, countryId,
      postcode, signature, facebook, instagram, twitter, linkedin, youtube,
      google, website, discord, wechat,
    } = body

    const editableValues = [
      bio, firstName, lastName, gender, birthdate, phone, email, countryId,
      postcode, signature, facebook, instagram, twitter, linkedin, youtube,
      google, website, discord, wechat,
    ]
    if (editableValues.some((value) => value !== undefined && typeof value !== "string")) {
      return NextResponse.json({ success: false, message: "Certaines informations sont invalides." }, { status: 422 })
    }
    if (typeof email === "string" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "L'adresse email est invalide." }, { status: 422 })
    }
    if (typeof gender === "string" && gender && !["Homme", "Femme", "Autre"].includes(gender)) {
      return NextResponse.json({ success: false, message: "La valeur choisie pour le sexe est invalide." }, { status: 422 })
    }
    if (editableValues.some((value) => typeof value === "string" && value.length > 5000)) {
      return NextResponse.json({ success: false, message: "Une information saisie est trop longue." }, { status: 422 })
    }

    // L'identité de la cible vient exclusivement de la session serveur.
    const dughuUserId = await getDughuUserIdFromCookies()
    if (!dughuUserId) {
      return NextResponse.json({ success: false, message: "Votre session a expiré. Veuillez vous reconnecter." }, { status: 401 })
    }

    if (!dughu.enabled) {
      return NextResponse.json(
        { success: false, message: "L'API Dughu n'est pas configurée." },
        { status: 500 }
      )
    }

    const formData = new FormData()
    formData.append("user_id", String(dughuUserId))
    if (typeof firstName === "string") formData.append("first_name", firstName)
    if (typeof lastName === "string") formData.append("last_name", lastName)
    if (typeof bio === "string") formData.append("bio", bio)
    if (typeof gender === "string") formData.append("gender", gender)
    if (typeof birthdate === "string") formData.append("birthday", birthdate)
    if (typeof phone === "string") formData.append("phone_number", phone)
    if (typeof email === "string") formData.append("email", email)
    if (typeof countryId === "string") formData.append("country_id", countryId)
    if (typeof postcode === "string") formData.append("postode zip", postcode)
    if (typeof signature === "string") formData.append("signature", signature)
    if (typeof facebook === "string") formData.append("facebook", facebook)
    if (typeof instagram === "string") formData.append("instagram", instagram)
    if (typeof twitter === "string") formData.append("twitter", twitter)
    if (typeof linkedin === "string") formData.append("linkedin", linkedin)
    if (typeof youtube === "string") formData.append("youtube", youtube)
    if (typeof google === "string") formData.append("google", google)
    if (typeof website === "string") formData.append("website", website)
    if (typeof discord === "string") formData.append("discord", discord)
    if (typeof wechat === "string") formData.append("wechat", wechat)

    const raw = await dughuApi.updateProfile(formData)
    if (raw && typeof raw === "object" && raw.success === false) {
      return NextResponse.json({ success: false, message: "Dughu n'a pas pu enregistrer ces informations." }, { status: 422 })
    }
    const userObj = normalizeUser(raw?.user || raw?.data || raw?.profile || raw?.result || raw)

    return NextResponse.json({
      success: true,
      user: {
        id: String(dughuUserId),
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(" ").trim() || pick(raw, "name", "full_name") || "",
        username: pick(raw, "username", "user_name") ?? "",
        bio: bio ?? pick(raw, "bio") ?? "",
        gender: gender ?? pick(raw, "gender") ?? "",
        birthdate: birthdate || null,
        phone: phone ?? pick(raw, "phone") ?? "",
        email: email ?? pick(raw, "email") ?? "",
        countryId: countryId ?? pick(raw, "country_id") ?? "",
        postcode: postcode ?? pick(raw, "postode zip") ?? "",
        signature: signature ?? pick(raw, "signature") ?? "",
        ...(userObj || {}),
      },
      raw,
    })
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error)
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour." }, { status: 500 })
  }
}
