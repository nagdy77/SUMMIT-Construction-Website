import { AboutPreview } from '../components/sections/AboutPreview'
import { ContactCTA } from '../components/sections/ContactCTA'
import { FeaturedProjects } from '../components/sections/FeaturedProjects'
import { Hero } from '../components/sections/Hero'
import { ParallaxStory } from '../components/sections/ParallaxStory'
import { MaterialStudy } from '../components/sections/MaterialStudy'
import { Services } from '../components/sections/Services'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { FloatingControls } from '../components/layout/FloatingControls'
import { useHomeCopy } from '../content/site'

export default function Home({ entranceReady = true }: { entranceReady?: boolean }) {
  const copy = useHomeCopy()

  return (
    <>
      <div className="site-shell flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-ink)]">
        <a className="skip-link" href="#main-content">
          {copy.skip}
        </a>
        <Header />
        <main id="main-content" className="w-full flex-1">
          <Hero entranceReady={entranceReady} />
          <AboutPreview />
          <Services />
          <ParallaxStory />
          <FeaturedProjects />
          <MaterialStudy />
          <ContactCTA />
        </main>
        <Footer />
        <FloatingControls />
      </div>
    </>
  )
}
