import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/** Package web derivatives while leaving the original media library untouched. */
export function webAssetsOnly() {
  return {
    name: 'summit-web-assets-only',
    apply: 'build',
    async generateBundle() {
      const publicRoot = path.resolve('public')
      const collect = async (relativeDirectory) => {
        const entries = await readdir(path.join(publicRoot, relativeDirectory), { withFileTypes: true })
        for (const entry of entries) {
          const relativeName = path.posix.join(relativeDirectory, entry.name)
          if (entry.name.startsWith('.')) continue
          if (relativeName.startsWith('assets/projects/portfolio/beit-al-razzaz/بيت الرزاز-')) continue
          if (relativeName === 'assets/projects/portfolio/Somabay' || relativeName.startsWith('assets/projects/portfolio/Somabay/')) continue
          // Retain superseded derivatives locally for provenance, but do not
          // ship old standalone project identities or technical source groups.
          if (
            relativeName === 'assets/projects/portfolio/qaitbays-seat-main-hall'
            || relativeName.startsWith('assets/projects/portfolio/qaitbays-seat-main-hall/')
            || relativeName === 'assets/projects/portfolio/carpentry-workshop'
            || relativeName.startsWith('assets/projects/portfolio/carpentry-workshop/')
            || relativeName === 'assets/projects/portfolio/beit-al-razzaz/general-restoration'
            || relativeName.startsWith('assets/projects/portfolio/beit-al-razzaz/general-restoration/')
            || relativeName === 'assets/projects/portfolio/beit-al-razzaz/restoration-comparisons'
            || relativeName.startsWith('assets/projects/portfolio/beit-al-razzaz/restoration-comparisons/')
            || /^assets\/projects\/portfolio\/beit-al-razzaz\/e3-/i.test(relativeName)
          ) continue
          // Keep legacy generated masters in the workspace for provenance, but
          // never include generated architectural imagery in production output.
          if (relativeName === 'assets/generated' || relativeName.startsWith('assets/generated/')) continue
          const isGeneratedProjectAsset = [
            'assets/projects/featured',
            'assets/projects/portfolio',
            'assets/projects/categories/optimized',
          ].some((directory) => relativeName === directory || relativeName.startsWith(`${directory}/`))
          const isCategoryDirectory = relativeName === 'assets/projects/categories'
          if (relativeName.startsWith('assets/projects/') && !isGeneratedProjectAsset && !isCategoryDirectory) continue
          if (entry.isDirectory()) await collect(relativeName)
          else {
            // Client source folders can sit beside generated portfolio folders
            // locally, but only optimized WebPs and the generated manifest ship.
            if (relativeName.startsWith('assets/projects/portfolio/') && !/\.(webp|json)$/i.test(relativeName)) continue
            // PNG masters remain in public for source preservation; the UI uses WebP.
            if (/^assets\/(generated|brand)\/.+\.png$/i.test(relativeName)) continue
            this.emitFile({ type: 'asset', fileName: relativeName, source: await readFile(path.join(publicRoot, relativeName)) })
          }
        }
      }
      await collect('')
    },
  }
}
