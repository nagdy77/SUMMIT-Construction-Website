import { renderToString } from 'react-dom/server'
import { App } from './App'
import { ThemeProvider } from './components/layout/ThemeProvider'

export function renderRoute(path: string) {
  return renderToString(<ThemeProvider><App path={path} /></ThemeProvider>)
}

