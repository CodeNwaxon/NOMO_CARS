"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  const pathname = usePathname()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || pathname?.includes('/driver/profile')) {
    return <div className="fixed bottom-6 right-6 w-12 h-12 hidden" />
  }

  const currentTheme = theme === "system" ? systemTheme : theme

  return (
    <button
      onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
      className="fixed bottom-6 right-6 p-2 rounded-full bg-card-bg border border-card-border shadow-xl backdrop-blur-md z-50 transition-all hover:scale-110 flex items-center justify-center dark:bg-slate-800 bg-white"
      aria-label="Toggle theme"
    >
      {currentTheme === "dark" ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4 text-slate-800" fill="currentColor" />
      )}
    </button>
  )
}
