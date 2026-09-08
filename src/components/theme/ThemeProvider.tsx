"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = "dughu-theme"

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")
  const [mounted, setMounted] = useState(false)

  // Initialisation en mode clair
  useEffect(() => {
    try {
      const root = document.documentElement
      root.classList.remove("dark")
      root.style.colorScheme = "light"
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  // Application de la classe dark et synchronisation DOM
  const applyTheme = useCallback((t: Theme) => {
    const resolved = t === "system" ? getSystemTheme() : t
    setResolvedTheme(resolved)

    const root = document.documentElement
    if (resolved === "dark") {
      root.classList.add("dark")
      root.style.colorScheme = "dark"
    } else {
      root.classList.remove("dark")
      root.style.colorScheme = "light"
    }
  }, [])

  // Mise à jour de l'état et persistance dans localStorage
  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {
      // Ignorer si localStorage indisponible
    }
    applyTheme(nextTheme)
  }, [applyTheme])

  // Bascule rapide entre clair et sombre
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  // Effet lors du changement de theme
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
  }, [theme, mounted, applyTheme])

  // Écoute en direct des changements de préférence OS
  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, applyTheme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
