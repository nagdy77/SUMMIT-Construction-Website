import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'references/phase3-draft-previews')
const server = await createServer({ configFile: path.join(root, 'vite.config.ts'), root, appType: 'custom', server: { middlewareMode: true } })

try {
  const { unpublishedProjects } = await server.ssrLoadModule('/src/data/draft-portfolio.ts')
  const labels = {
    en: { eyebrow: 'Internal client review draft', status: 'Not approved for publication', facts: 'Project details pending verification', location: 'Location', client: 'Client', category: 'Category', scope: 'Scope', gallery: 'Photo candidates', empty: 'No approved still photographs are available. Request client assets or review source video before proposing imagery.', note: 'This preview is for internal review only. The title, project details, image selection and publication rights require client approval.' },
    ar: { eyebrow: 'مسودة مراجعة داخلية للعميل', status: 'غير معتمد للنشر', facts: 'بيانات المشروع بانتظار التحقق', location: 'الموقع', client: 'العميل', category: 'التصنيف', scope: 'نطاق العمل', gallery: 'صور مرشحة', empty: 'لا تتوفر صور ثابتة معتمدة. يرجى طلب صور من العميل أو مراجعة الفيديو قبل اقتراح الصور.', note: 'هذه المعاينة للمراجعة الداخلية فقط. العنوان وبيانات المشروع والصور وحقوق النشر بحاجة إلى اعتماد العميل.' },
  }
  const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
  const link = (src) => src.replace('/assets/projects/featured/phase3-curated/', 'assets/phase3-curated/').replaceAll(' ', '%20')
  const css = `:root{color-scheme:dark;--gold:#d5b452;--ink:#f4f0e5;--muted:#aaa79d;--bg:#121312}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,sans-serif}.bar{position:sticky;top:0;z-index:1;padding:12px 5vw;border-bottom:1px solid #765f25;background:#171713;color:var(--gold);font-size:.75rem;letter-spacing:.12em;text-transform:uppercase}.wrap{width:min(1200px,90vw);margin:auto}.hero{padding:clamp(4rem,12vw,10rem) 0 3rem}.eyebrow{color:var(--gold);font-size:.7rem;letter-spacing:.17em;text-transform:uppercase}.status{display:inline-block;border:1px solid #8f7440;padding:.45rem .7rem;color:var(--gold);font-size:.72rem}h1{max-width:15ch;margin:.6rem 0;font:400 clamp(3rem,9vw,7rem)/.98 Georgia,serif;letter-spacing:-.04em}.intro{max-width:55rem;color:var(--muted)}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0 4rem}.facts div{border-top:1px solid #48453c;padding:1rem 0;color:var(--muted)}.facts b{display:block;color:var(--ink)}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}.grid figure{margin:0;background:#242522}.grid img{display:block;width:100%;height:auto;max-height:80vh;object-fit:contain}.grid figcaption{padding:.7rem;color:var(--muted);font-size:.8rem}footer{margin:5rem 0 3rem;border-top:1px solid #48453c;padding-top:1.5rem;color:var(--muted)}[dir=rtl] body{font-family:system-ui,sans-serif}[dir=rtl] h1{line-height:1.2;letter-spacing:0}@media(max-width:650px){.facts,.grid{grid-template-columns:1fr}.grid img{max-height:70vh}}`
  for (const project of unpublishedProjects) {
    for (const locale of ['en', 'ar']) {
      const t = labels[locale]
      const imageMarkup = project.gallery.slice(0, 5).map((image) => `<figure><img src="${link(image.src)}" alt="${escape(image.alt[locale])}" loading="lazy" decoding="async"><figcaption>${escape(image.alt[locale])}</figcaption></figure>`).join('')
      const markup = `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="Internal SUMMIT project review draft; not approved for publication."><title>${escape(project.title[locale])} — internal draft</title><style>${css}</style></head><body><div class="bar">SUMMIT Construction · ${escape(t.eyebrow)} · ${escape(t.status)}</div><main class="wrap"><header class="hero"><p class="eyebrow">${escape(t.eyebrow)}</p><span class="status">${escape(t.status)}</span><h1>${escape(project.title[locale])}</h1><p class="intro">${escape(t.note)}</p></header><section class="facts" aria-label="${escape(t.facts)}"><div><b>${escape(t.location)}</b>${project.location ? escape(project.location[locale]) : escape(t.facts)}</div><div><b>${escape(t.client)}</b>${project.client ? escape(project.client) : escape(t.facts)}</div><div><b>${escape(t.category)}</b>${project.category ? escape(project.category) : escape(t.facts)}</div></section>${project.scope?.[locale]?.length ? `<h2>${escape(t.scope)}</h2><ul>${project.scope[locale].map((item) => `<li>${escape(item)}</li>`).join('')}</ul>` : `<h2>${escape(t.scope)}</h2><p>${escape(t.facts)}</p>`}<h2>${escape(t.gallery)}</h2>${imageMarkup ? `<section class="grid">${imageMarkup}</section>` : `<p>${escape(t.empty)}</p>`}<footer>${escape(t.note)}<br>Record state: ${escape(project.state)} · ${project.gallery.length} candidate photograph(s)</footer></main></body></html>`
      await mkdir(output, { recursive: true })
      await writeFile(path.join(output, `${project.slug}-${locale}.html`), markup)
    }
  }
  await writeFile(path.join(output, 'README.md'), `# Phase 3 internal review previews\n\n${unpublishedProjects.length} unpublished project records are previewed in English and Arabic. These standalone files and their WebP candidates are kept under references and are excluded from the public build. Each HTML file declares noindex/nofollow/noarchive. Original archive media is untouched.\n`)
  console.log(`Rendered ${unpublishedProjects.length * 2} bilingual unpublished project previews outside dist/public.`)
} finally {
  await server.close()
}
