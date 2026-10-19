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
          if (relativeName.startsWith('assets/projects/') && relativeName !== 'assets/projects/featured' && !relativeName.startsWith('assets/projects/featured/')) continue
          if (entry.isDirectory()) await collect(relativeName)
          else {
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
