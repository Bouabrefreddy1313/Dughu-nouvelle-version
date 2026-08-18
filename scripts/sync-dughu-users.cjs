#!/usr/bin/env node
// Réparation one-shot : aligne le miroir local (Prisma) sur l'API Dughu
// (source de vérité des pages profil).
//
// Dughu ne résout pas les emails via getSpecificUser (404). On résout chaque
// compte local par : overrides connus (email → ID), puis getSpecificUser par
// email (souvent 404), puis par username local (fonctionne si l'username
// existe encore sur Dughu). Les comptes non résolubles seront resynchronisés
// automatiquement à leur prochaine connexion (login / /api/auth/me).
//
// Usage : node scripts/sync-dughu-users.cjs [--dry]
//   --dry : affiche les corrections sans les écrire.

const fs = require("fs")
const path = require("path")

// Chargement minimal du .env du projet
const envFile = path.join(__dirname, "..", ".env")
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
}

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const BASE = (process.env.DUGHU_API_BASE_URL || "https://apitest.dughu.com/api").replace(/\/+$/, "")
const KEY = process.env.DUGHU_API_KEY || ""
const ORIGIN = BASE.replace(/\/api\/?$/, "")
const DRY = process.argv.includes("--dry")

// Correspondances locales → ID Dughu connues (prioritaires sur getAllUsers)
const KNOWN_OVERRIDES = {
  "freddyescobar13013@gmail.com": "34243",
}

if (!KEY) {
  console.error("DUGHU_API_KEY manquant dans .env")
  process.exit(1)
}

async function apiGet(p) {
  const res = await fetch(`${BASE}/${p}`, {
    headers: { "X-AppApiToken": KEY, Accept: "application/json" },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { ok: res.ok, status: res.status, data }
}

function pick(obj, ...keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const entry of keys) {
    const list = Array.isArray(entry) ? entry : [entry]
    for (const k of list) {
      const v = obj[k]
      if (v !== undefined && v !== null && v !== "") return v
    }
  }
  return undefined
}

function resolveMediaUrl(v) {
  if (!v || typeof v !== "string") return ""
  if (/^https?:\/\//i.test(v) || v.startsWith("data:") || v.startsWith("blob:")) return v
  if (v.startsWith("/uploads/") || v.startsWith("/images/") || v.startsWith("/media/")) return v
  const clean = v.replace(/^\/+/, "")
  if (/^(comments|replies|videos|files|images|photos|uploads)\//i.test(clean)) {
    return `https://dughuprod.s3.amazonaws.com/${clean}`
  }
  return `${ORIGIN}/${clean}`
}

function normalizeBirthday(v) {
  if (typeof v !== "string") return ""
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v
}

function normalizeUser(u) {
  if (!u || typeof u !== "object") return null
  const id = pick(u, "id", "ID", "user_id", "userId", "userID")
  if (!id) return null
  const firstName = pick(u, ["first_name", "firstName", "firstname"]) || ""
  const lastName = pick(u, ["last_name", "lastName", "lastname"]) || ""
  const name =
    pick(u, ["name", "full_name", "fullName", "nickname"]) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    "Utilisateur"
  const rawAvatar = pick(u, ["avatar", "profileImage", "profile_image", "profile_image_url", "profile_picture", "profilePicture", "photo", "image"]) || ""
  const rawCover = pick(u, ["cover", "cover_image", "coverImage", "background", "banner", "coverImageUrl"]) || ""
  return {
    id: String(id),
    firstName: String(firstName),
    lastName: String(lastName),
    name: String(name),
    username: String(pick(u, ["username", "user_name", "userName", "slug"]) || ""),
    avatar: resolveMediaUrl(rawAvatar) || "/images/avatar.png",
    cover: resolveMediaUrl(rawCover) || "/images/group/default-cover.jpg",
    bio: pick(u, ["bio", "about", "description", "about_me"]) || "",
    gender: pick(u, ["gender", "sexe", "sex"]) || "",
    phone: pick(u, ["phone", "phone_number", "phoneNumber", "telephone"]) || "",
    birthdate: normalizeBirthday(pick(u, ["birthdate", "birthday", "dateNaissance", "dob"]) || "") || null,
  }
}


// ── 1. Profil canonique frais par ID/username Dughu ──
async function fetchFreshProfile(dughuId) {
  const r = await apiGet(`getSpecificUser/${encodeURIComponent(dughuId)}/0`)
  const d = r.data
  return r.ok ? (d?.user ?? d?.data ?? d?.profile ?? d?.result ?? d ?? null) : null
}

function buildPatch(local, n, takenUsernames, takenSlugs) {
  const patch = {}
  const set = (k, v) => { if (v !== undefined && v !== null && v !== "" && local[k] !== v) patch[k] = v }
  set("firstName", n.firstName || null)
  set("lastName", n.lastName || null)
  set("name", n.name || null)
  set("bio", n.bio || null)
  set("gender", n.gender || null)
  set("phone", n.phone || null)
  if (n.birthdate) {
    const d = new Date(n.birthdate)
    if (!Number.isNaN(d.getTime()) && (!local.birthdate || local.birthdate.getTime() !== d.getTime())) {
      patch.birthdate = d
    }
  }
  if (n.username && n.username !== local.username) {
    const owner = takenUsernames.get(n.username)
    const slugOwner = takenSlugs.get(n.username)
    if ((!owner || owner === local.id) && (!slugOwner || slugOwner === local.id)) {
      patch.username = n.username
      patch.slug = n.username
    } else {
      console.warn(`  ATTENTION: username Dughu "${n.username}" deja pris localement — username local conserve`)
    }
  }
  // Miroir strict : defauts compris, pour que l'accueil == profil
  if (n.avatar && local.avatar !== n.avatar) patch.avatar = n.avatar
  if (n.cover && local.cover !== n.cover) patch.cover = n.cover
  return patch
}

async function main() {
  console.log(`Dughu: ${BASE} | mode: ${DRY ? "DRY-RUN" : "ECRITURE"}`)

  const locals = await prisma.user.findMany({
    select: { id: true, email: true, username: true, slug: true, firstName: true, lastName: true, name: true, avatar: true, cover: true, bio: true, gender: true, phone: true, birthdate: true },
  })

  const takenUsernames = new Map(locals.filter((u) => u.username).map((u) => [u.username, u.id]))
  const takenSlugs = new Map(locals.filter((u) => u.slug).map((u) => [u.slug, u.id]))

  let synced = 0, ok = 0, skipped = 0
  for (const local of locals) {
    const email = (local.email || "").toLowerCase()
    let dughuId = ""
    let record = null
    let via = ""
    if (email && KNOWN_OVERRIDES[email]) {
      dughuId = KNOWN_OVERRIDES[email]
      record = await fetchFreshProfile(dughuId)
      via = `override #${dughuId}`
    }
    if (!record && email) {
      // getSpecificUser ne résout normalement pas les emails (404), mais on
      // tente quand même : certains déploiements Dughu les acceptent.
      record = await fetchFreshProfile(email)
      via = `email ${email}`
      dughuId = record ? String(pick(record, "user_id", "userId", "id", "ID")) : ""
    }

    if (!record && local.username) {
      record = await fetchFreshProfile(local.username)
      via = `username ${local.username}`
      dughuId = record ? String(pick(record, "user_id", "userId", "id", "ID")) : ""
    }
    if (!record) {
      console.log(`[SKIP] ${local.email} (${local.username}) : aucun compte Dughu correspondant (sera resynchronise a la prochaine connexion)`)
      skipped++
      continue
    }
    if (!dughuId) dughuId = String(pick(record, "user_id", "userId", "id", "ID"))
    const n = normalizeUser(record)
    if (!n) {
      console.log(`[SKIP] ${local.email} : profil Dughu #${dughuId} illisible`)
      skipped++
      continue
    }

    const patch = buildPatch(local, n, takenUsernames, takenSlugs)
    if (Object.keys(patch).length === 0) {
      console.log(`[OK]   ${local.email} (${local.username}) : deja synchronise avec dughu #${dughuId}`)
      ok++
      continue
    }

    console.log(`[SYNC] ${local.email} <- dughu #${dughuId} (${via})`)
    console.log(`       avant : name="${local.name}" username="${local.username}" avatar="${local.avatar}" cover="${local.cover}"`)
    console.log(`       apres : name="${patch.name ?? local.name}" username="${patch.username ?? local.username}" avatar="${patch.avatar ?? local.avatar}" cover="${patch.cover ?? local.cover}"`)
    if (!DRY) {
      await prisma.user.update({ where: { id: local.id }, data: patch })
      if (patch.username) {
        if (local.username) takenUsernames.delete(local.username)
        takenUsernames.set(patch.username, local.id)
        if (local.slug) takenSlugs.delete(local.slug)
        takenSlugs.set(patch.username, local.id)
      }
    }
    synced++
  }

  console.log(`\nTermine : ${synced} synchronise(s), ${ok} deja a jour, ${skipped} ignore(s)`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())