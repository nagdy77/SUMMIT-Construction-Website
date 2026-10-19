import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './pages/Home'
import { ThemeProvider } from './components/layout/ThemeProvider'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><Home /></ThemeProvider>
  </StrictMode>,
)
