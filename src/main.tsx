import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { ClientApp, loadClientPage } from './ClientApp'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { resolveRoute } from './lib/routes'
import './styles/globals.css'

const root = document.getElementById('root')!

async function bootstrap() {
  const path = window.location.pathname
  const route = resolveRoute(path)
  const Page = await loadClientPage(route)
  const application = <StrictMode><ThemeProvider><ClientApp path={path} Page={Page} /></ThemeProvider></StrictMode>

  if (root.dataset.prerendered === 'true') hydrateRoot(root, application)
  else createRoot(root).render(application)

  window.requestAnimationFrame(() => {
    root.dataset.clientReady = 'true'
  })
}

void bootstrap()
