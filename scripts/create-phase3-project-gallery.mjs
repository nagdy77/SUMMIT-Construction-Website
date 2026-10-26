import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const sourceRoot = path.join(root, 'public/assets/projects')
const outputRoot = path.join(root, 'public/assets/projects/featured/phase3-curated')
const audit = JSON.parse(await readFile(path.join(root, 'references/real-media-transition/contact-sheets/index.json'), 'utf8'))

// Explicit shortlist from the existing audit/contact sheets. The archive is only read;
// all WebP files are new public-working derivatives; original media remains untouched.
const selections = {
  'beit-al-razzaz': {
    folder: 'BEIT AL RAZZAZ',
    files: [
      'Phase 2/IMG_20250908_110032.jpg',
      'Phase 2/DSC_6630.JPG',
      'Phase 2/DSC_6757.JPG',
      'Phase 1/DSC_7041.JPG',
      'Phase 1/DSC_7244.JPG',
    ],
  },
  marvel: {
    folder: 'Marvel',
    files: [
      'IMG-20240408-WA0019.jpg',
      'IMG20211121115529.jpg',
      'IMG20211205125400.jpg',
      'WhatsApp Image 2024-04-10 at 16.58.41_19bb7284.jpg',
    ],
  },
  'oriana-cfc': {
    folder: 'ORIANA - CFC',
    note: 'Selected camera-source files; confirm project provenance and publication approval.',
    files: [
      'IMG20200123104212.jpg',
      'IMG20200109104211.jpg',
      'IMG_20210307_095545.jpg',
      'IMG_20210307_095328.jpg',
    ],
  },
  'stream-3': {
    folder: 'STREAM 3',
    note: 'Low-resolution source set; retain for small cards only until larger originals arrive.',
    files: [
      'FB_IMG_1602655964163.jpg',
      'WhatsApp Image 2024-04-16 at 12.05.14_443a6769.jpg',
      'WhatsApp Image 2024-04-16 at 12.05.12_0de713c6.jpg',
    ],
  },
  'new-capital-downtown-mall': {
    folder: 'New Capital down town mall',
    note: 'Provisional folder identity; publication and worker-image approvals are pending.',
    files: [
      'IMG_20250602_153218.jpg',
      'IMG_20250628_133031.jpg',
      'IMG_20250719_150853.jpeg',
      'IMG_20250730_141201.jpg',
      'IMG_20260510_120354.jpeg',
    ],
  },
  'wajha-office': { folder: 'Wajha Office', note: 'One portrait candidate; worker consent remains outstanding.', files: ['IMG_20251207_002557.jpg'] },
}

const variants = [640, 1200]
const mapping = { generatedAt: new Date().toISOString(), sourceMediaModified: false, portfolioState: 'public-working', quality: 82, projects: {} }

for (const [slug, selection] of Object.entries(selections)) {
  const folderAudit = audit.folders.find((folder) => folder.folder === selection.folder)
  if (!folderAudit) throw new Error(`Missing audited source folder: ${selection.folder}`)
  const projectOutput = path.join(outputRoot, slug)
  await mkdir(projectOutput, { recursive: true })
  mapping.projects[slug] = { sourceFolder: selection.folder, reviewNote: selection.note ?? '', candidates: [] }
  for (const [index, file] of selection.files.entries()) {
    if (!folderAudit.sourceImages.includes(file)) throw new Error(`Selection missing from audited source list: ${selection.folder}/${file}`)
    const sourcePath = path.join(sourceRoot, selection.folder, file)
    const metadata = await sharp(sourcePath).metadata()
    const filename = `${String(index + 1).padStart(2, '0')}-${path.parse(file).name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`
    const exports = []
    for (const width of variants.filter((candidateWidth) => candidateWidth < (metadata.width ?? 0))) {
      const out = path.join(projectOutput, `${filename}-${width}.webp`)
      await sharp(sourcePath).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(out)
      exports.push({ width, src: `/assets/projects/featured/phase3-curated/${slug}/${path.basename(out)}` })
    }
    if (!exports.length) {
      const out = path.join(projectOutput, `${filename}-640.webp`)
      await sharp(sourcePath).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(out)
      exports.push({ width: Math.min(640, metadata.width ?? 640), src: `/assets/projects/featured/phase3-curated/${slug}/${path.basename(out)}` })
    }
    mapping.projects[slug].candidates.push({
      source: `public/assets/projects/${selection.folder}/${file}`,
      originalDimensions: { width: metadata.width, height: metadata.height },
      variants: exports,
      publicWorking: true,
      factsConfirmed: false,
    })
  }
}

await mkdir(path.join(root, 'references/public-working-portfolio'), { recursive: true })
await writeFile(path.join(root, 'references/public-working-portfolio/selection-map.json'), `${JSON.stringify(mapping, null, 2)}\n`)
const reportRows = Object.entries(mapping.projects).flatMap(([slug, project]) => project.candidates.map((candidate) => `| ${slug} | \`${candidate.source}\` | ${candidate.originalDimensions.width}×${candidate.originalDimensions.height} | ${candidate.variants.map((variant) => `\`public/assets/projects/featured/phase3-curated/${slug}/${path.basename(variant.src)}\``).join(', ')} |`))
const notes = Object.entries(mapping.projects).filter(([, project]) => project.reviewNote).map(([slug, project]) => `- **${slug}:** ${project.reviewNote}`).join('\n')
await writeFile(path.join(root, 'references/public-working-portfolio/photo-selection-report.md'), `# Public working portfolio photo selections\n\n${reportRows.length} source photographs were read and exported to new responsive WebP derivatives for the client-supplied working portfolio. All original archive media remains untouched.\n\n| Project | Original source | Original dimensions | Public working WebP derivative(s) |\n|---|---|---:|---|\n${reportRows.join('\n')}\n\n## Review notes\n\n${notes}\n\n**Mountain View:** 19 source videos and no stills. A browser decoded the first frame of one 37-second MP4 at 1920×1080. The frame is an overexposed, mostly empty tiled floor and is not a candidate. Video-based stills are technically feasible but other clips/timecodes need review; no frame derivative was retained.\n\n**Safi Al-Din Gawhar:** no photo/video source.\n`)
console.log(`Created ${Object.values(mapping.projects).reduce((n, p) => n + p.candidates.length, 0)} public-working photo candidates for ${Object.keys(mapping.projects).length} projects; originals were read-only.`)
