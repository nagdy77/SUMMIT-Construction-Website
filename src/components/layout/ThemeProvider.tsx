import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null)

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171816' : '#f3f1ec')
    try { localStorage.setItem('summit-theme', theme) } catch { /* Preference remains available for this visit. */ }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, toggle: () => setTheme((value) => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>
}

export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const context = useContext(ThemeContext)
  if (!context) return null
  const next = context.theme === 'dark' ? 'light' : 'dark'

  return (
    <button type="button" onClick={context.toggle} aria-label={`Switch to ${next} theme`} className={`theme-toggle ${labelled ? 'theme-toggle-labelled' : ''}`}>
      <Icon name={context.theme === 'dark' ? 'sun' : 'moon'} size={18} />
      {labelled ? <span>{next === 'light' ? 'Light appearance' : 'Dark appearance'}</span> : null}
    </button>
  )
}
