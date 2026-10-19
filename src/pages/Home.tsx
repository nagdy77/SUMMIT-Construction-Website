import { useCallback, useState } from 'react'
import { AboutPreview } from '../components/sections/AboutPreview'
import { ContactCTA } from '../components/sections/ContactCTA'
import { FeaturedProjects } from '../components/sections/FeaturedProjects'
import { Hero } from '../components/sections/Hero'
import { ParallaxStory } from '../components/sections/ParallaxStory'
import { MaterialStudy } from '../components/sections/MaterialStudy'
import { Services } from '../components/sections/Services'
import { EntranceIntro, shouldPlayEntrance } from '../components/layout/EntranceIntro'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { FloatingControls } from '../components/layout/FloatingControls'

export default function Home() {
  const [introActive, setIntroActive] = useState(shouldPlayEntrance)
  const [heroEntranceReady, setHeroEntranceReady] = useState(() => !introActive)

  const revealHero = useCallback(() => setHeroEntranceReady(true), [])
  const completeIntro = useCallback(() => setIntroActive(false), [])

  return (
    <>
      {introActive ? <EntranceIntro onRevealHero={revealHero} onComplete={completeIntro} /> : null}

      <div className="site-shell flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)]">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="w-full flex-1">
          <Hero entranceReady={heroEntranceReady} />
          <AboutPreview />
          <Services />
          <ParallaxStory />
          <FeaturedProjects />
          <MaterialStudy />
          <ContactCTA />
        </main>
        <Footer />
        {!introActive ? <FloatingControls /> : null}
      </div>
    </>
  )
}
