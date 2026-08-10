import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Générer un OTP à 4 chiffres
export function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Slugifier un nom pour le username
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '')
}

// Liste d'emails jetables (simplifiée)
const disposableDomains = [
  'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
  'yopmail.com', 'sharklasers.com', 'getairmail.com', '10minutemail.com',
  'temp-mail.org', 'fakeinbox.com', 'tempinbox.com', 'mailnesia.com',
  'dughu.com' // blocage du domaine propre
]

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return disposableDomains.includes(domain)
}

// Récupérer l'IP depuis la requête
export function getIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

// Détection pays par IP (fallback sur le code pays)
export async function detectCountryFromIp(ip: string): Promise<{ name: string; code: string; indicatif: string } | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`)
    const data = await res.json()
    if (data.error) return null
    return {
      name: data.country_name,
      code: data.country_code,
      indicatif: `+${data.country_calling_code?.replace('+', '')}`
    }
  } catch {
    return null
  }
}