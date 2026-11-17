"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

interface ThemeToggleProps {
  onToggle?: () => void
}

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({ onToggle }: ThemeToggleProps) {
  const { theme, setTheme, systemTheme } = useTheme()
  const mounted = React.useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  if (!mounted) return null

  const currentTheme = theme === "system" ? systemTheme : theme
  const nextTheme = currentTheme === "dark" ? "light" : "dark"

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(nextTheme)
        onToggle?.()
      }}
      className="flex items-center gap-3 w-full px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-left dark:text-gray-200 text-gray-700 hover:bg-brand-primary/10 rounded-lg transition-colors group"
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {nextTheme === "light" ? (
        <Sun className="w-5 h-5 dark:text-gray-400 text-gray-500 group-hover:text-brand-primary" />
      ) : (
        <Moon className="w-5 h-5 dark:text-gray-400 text-gray-500 group-hover:text-brand-primary" />
      )}
      <span className="text-xs md:text-sm font-medium">Switch to {nextTheme} mode</span>
    </button>
  )
}
