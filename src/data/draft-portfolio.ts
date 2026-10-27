// Client-supplied public working records. Missing facts remain null and the three
// unresolved identities retain their folder labels as explicitly provisional titles.
import type { PortfolioImage, PortfolioProject, ProjectCategory, ProjectState } from './portfolio'

const media = (slug: string, index: number, name: string, titleAr: string): PortfolioImage => {
  const base = `/assets/projects/featured/phase3-curated/${slug}/${String(index).padStart(2, '0')}-${name}`
  const available: Record<string, string[][]> = {
    'beit-al-razzaz': [['640', '1200'], ['640', '1200'], ['640', '1200'], ['640', '1200'], ['640', '1200']],
    marvel: [['640'], ['640', '1200'], ['640', '1200'], ['640', '1200']],
    'oriana-cfc': [['640', '1200'], ['640'], ['640'], ['640']],
    'stream-3': [['640'], ['640', '1200'], ['640']],
    'new-capital-downtown-mall': [['640', '1200'], ['640', '1200'], ['640', '1200'], ['640', '1200'], ['640', '1200']],
    'wajha-office': [['640', '1200']],
  }
  const variants = available[slug]?.[index - 1] ?? ['640']
  const srcSet = variants.map((width) => `${base}-${width}.webp ${slug === 'oriana-cfc' && index === 2 ? '600' : width}w`).join(', ')
  const fallback = `${base}-${variants.includes('1200') ? '1200' : '640'}.webp`
  const labels: Record<string, string[]> = {
    'beit-al-razzaz': ['Courtyard restoration at Beit Al-Razzaz', 'Restored timber stair at Beit Al-Razzaz', 'Interior corridor at Beit Al-Razzaz', 'Heritage interior at Beit Al-Razzaz', 'Restored interior detail at Beit Al-Razzaz'],
    marvel: ['Finished bathroom interior at Marvel', 'Interior construction work at Marvel', 'Ceiling installation in progress at Marvel', 'Finished kitchen interior at Marvel'],
    'oriana-cfc': ['Residential buildings at Oriana CFC', 'Villa exterior at Oriana CFC', 'Residential exterior at Oriana CFC', 'Villa exterior at Oriana CFC'],
    'stream-3': ['Building construction at Stream 3', 'Residential building exterior at Stream 3', 'Residential building construction at Stream 3'],
    'new-capital-downtown-mall': ['Building services installation in progress', 'Ceiling services work in progress', 'Mall interior fit-out in progress', 'Overhead services installation', 'Interior atrium under construction'],
    'wajha-office': ['Worker installing office wall insulation'],
  }
  return {
    src: fallback,
    srcSet,
    alt: { en: labels[slug]?.[index - 1] ?? 'Authentic SUMMIT project photograph', ar: `${titleAr} — صورة أصلية من مواد المشروع المقدمة من العميل` },
  }
}

function draftRecord({
  id, titleEn, folder, state = 'verified-pending-approval', category = null, mediaFiles = [], titleAr = 'الاسم بانتظار اعتماد العميل', approvalNeeds = [],
}: {
  id: string; titleEn: string; folder: string; state?: ProjectState; category?: ProjectCategory | null; mediaFiles?: string[]; titleAr?: string; approvalNeeds?: string[]
}): PortfolioProject {
  const gallery = mediaFiles.map((file, index) => media(id, index + 1, file, titleAr))
  return {
    id, slug: id, title: { en: titleEn, ar: titleAr }, sourceFolder: folder, state,
    category, location: null, client: null, description: null, scope: null,
    cover: gallery[0] ?? null,
    gallery,
    seo: {
      title: { en: `${titleEn} | SUMMIT Construction`, ar: `${titleAr} | سوميت للإنشاءات` },
      description: { en: 'Client-supplied SUMMIT project record. Verified project facts are pending.', ar: 'سجل مشروع مقدم من العميل. بيانات المشروع الموثقة قيد الاستكمال.' },
    },
    approvalNeeds: [...approvalNeeds, 'verified project facts', 'approved English and Arabic content', 'publication and image rights'],
  }
}

const drafts: PortfolioProject[] = [
  draftRecord({ id: 'beit-al-razzaz', titleEn: 'Beit Al-Razzaz', folder: 'BEIT AL RAZZAZ', titleAr: 'بيت الرزاز', category: 'Heritage Restoration', mediaFiles: ['img-20250908-110032', 'dsc-6630', 'dsc-6757', 'dsc-7041', 'dsc-7244'], approvalNeeds: ['project-specific scope and location confirmation'] }),
  draftRecord({ id: 'marvel', titleEn: 'Marvel', folder: 'Marvel', titleAr: 'مارفل', category: 'Residential Fit-Out', mediaFiles: ['img-20240408-wa0019', 'img20211121115529', 'img20211205125400', 'whatsapp-image-2024-04-10-at-16-58-41-19bb7284'], approvalNeeds: ['project scope', 'worker/photo consent where identifiable people appear'] }),
  draftRecord({ id: 'oriana-cfc', titleEn: 'Oriana CFC', folder: 'ORIANA - CFC', titleAr: 'أوريانا سي إف سي', category: 'Construction', mediaFiles: ['img20200123104212', 'img20200109104211', 'img-20210307-095545', 'img-20210307-095328'], approvalNeeds: ['confirm each selected image is a real project photograph and approved for SUMMIT publication', 'project location and scope'] }),
  draftRecord({ id: 'stream-3', titleEn: 'Stream 3', folder: 'STREAM 3', titleAr: 'ستريم 3', category: 'Construction', mediaFiles: ['fb-img-1602655964163', 'whatsapp-image-2024-04-16-at-12-05-14-443a6769', 'whatsapp-image-2024-04-16-at-12-05-12-0de713c6'], approvalNeeds: ['higher-resolution originals for large display placements', 'project location and scope'] }),
  draftRecord({ id: 'safi-al-din-gawhar', titleEn: 'Safi Al-Din Gawhar', folder: 'SAFI AL-DIN GAWHAR', titleAr: 'صافي الدين جوهر', category: 'Heritage Restoration', approvalNeeds: ['authentic project photographs or approval for image-free publication', 'project location and scope'] }),
  draftRecord({ id: 'mountain-view', titleEn: 'Mountain view — folder label', titleAr: 'Mountain view — اسم مجلد مؤقت', folder: 'Mountain view', state: 'provisional', approvalNeeds: ['confirmed project identity and approved bilingual title', 'still photography or video review and frame approval', 'project category, location and scope'] }),
  draftRecord({ id: 'new-capital-downtown-mall', titleEn: 'New Capital down town mall — folder label', titleAr: 'New Capital down town mall — اسم مجلد مؤقت', folder: 'New Capital down town mall', state: 'provisional', mediaFiles: ['img-20250602-153218', 'img-20250628-133031', 'img-20250719-150853', 'img-20250730-141201', 'img-20260510-120354'], approvalNeeds: ['confirmed project identity and approved bilingual title', 'project category, location and scope', 'worker/photo consent where identifiable people appear'] }),
  draftRecord({ id: 'wajha-office', titleEn: 'Wajha Office — folder label', titleAr: 'Wajha Office — اسم مجلد مؤقت', folder: 'Wajha Office', state: 'provisional', mediaFiles: ['img-20251207-002557'], approvalNeeds: ['confirmed project identity and approved bilingual title', 'project category, location and scope', 'worker consent for the selected photograph'] }),
]

export const unpublishedProjects = drafts
export const registeredProjects = drafts
export const publicWorkingProjects = drafts
