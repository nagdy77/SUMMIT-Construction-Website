import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function collectSourceText(directory) {
  let source = ''
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) source += await collectSourceText(fullPath)
    else if (/\.(?:css|html|js|jsx|json|ts|tsx)$/i.test(entry.name)) source += `\n${await readFile(fullPath, 'utf8')}`
  }
  return source
}

function addBeitRuntimeAssets(files) {
  const addVariants = (directory, stems) => {
    for (const stem of stems) {
      for (const variant of ['mobile', 'small', 'large']) files.add(`assets/projects/portfolio/beit-al-razzaz/${directory}/${stem}-${variant}.webp`)
    }
  }
  addVariants('phase-1-northern/comparisons', Array.from({ length: 4 }, (_, index) => String(index + 1).padStart(2, '0')).flatMap((stem) => [`${stem}-before`, `${stem}-after`]))
  addVariants('phase-2-western-wing/comparisons', Array.from({ length: 3 }, (_, index) => String(index + 1).padStart(2, '0')).flatMap((stem) => [`${stem}-before`, `${stem}-after`]))
  addVariants('phase-2-western-wing/gallery', Array.from({ length: 16 }, (_, index) => String(index + 1).padStart(2, '0')))
  addVariants('northern-side', Array.from({ length: 9 }, (_, index) => String(index + 6).padStart(2, '0')))
  addVariants('archive-views', ['01', '02', '03'])
  addVariants('qaitbay-main-hall', Array.from({ length: 17 }, (_, index) => index + 1).filter((index) => index !== 5).map((index) => String(index).padStart(2, '0')))
  addVariants('carpentry-workshop', Array.from({ length: 11 }, (_, index) => index + 1).filter((index) => index !== 7).map((index) => String(index).padStart(2, '0')))
}

/** Package web derivatives while leaving the original media library untouched. */
export function webAssetsOnly() {
  return {
    name: 'summit-web-assets-only',
    apply: 'build',
    async generateBundle() {
      const publicRoot = path.resolve('public')
      const sourceText = `${await collectSourceText(path.resolve('src'))}\n${await readFile(path.resolve('index.html'), 'utf8')}`
      const referencedAssets = new Set([...sourceText.matchAll(/\/assets\/[^\s"'`),>]+/g)].map(([match]) => match.slice(1).split(/[?#]/)[0]))
      addBeitRuntimeAssets(referencedAssets)
      let emittedAssets = 0
      let skippedUnreferencedAssets = 0
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
            // Production output is an allow-list: local provenance files and
            // superseded derivatives remain intact, but only runtime references ship.
            if (relativeName.startsWith('assets/') && !referencedAssets.has(relativeName)) {
              skippedUnreferencedAssets += 1
              continue
            }
            this.emitFile({ type: 'asset', fileName: relativeName, source: await readFile(path.join(publicRoot, relativeName)) })
            emittedAssets += 1
          }
        }
      }
      await collect('')
      console.log(`[web-assets] Packaged ${emittedAssets} referenced files; excluded ${skippedUnreferencedAssets} unreferenced production candidates.`)
    },
  }
}
