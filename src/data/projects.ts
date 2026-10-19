export type ProjectImage = {
  src: string
  alt: string
  label: string
  fit?: 'cover' | 'contain'
  position?: string
}

export type FeaturedProject = {
  id: string
  name: string
  category: 'Heritage Restoration' | 'Construction' | 'Residential Fit-Out'
  description: string
  images: readonly ProjectImage[]
}

export const projects: readonly FeaturedProject[] = [
  {
    id: 'mohamed-ali-palace',
    name: 'Mohamed Ali Palace',
    category: 'Heritage Restoration',
    description: 'Restoration and renovation of marble works at Al-Fasqiya Palace.',
    images: [
      {
        src: '/assets/projects/featured/mohamed-ali-palace/mohamed-ali-palace-restored-marble-hall.webp',
        alt: 'Restored marble hall inside Mohamed Ali Palace',
        label: 'Marble hall',
      },
      {
        src: '/assets/projects/featured/mohamed-ali-palace/mohamed-ali-palace-stone-entrance.webp',
        alt: 'Stone entrance and walkway at Mohamed Ali Palace',
        label: 'Palace entrance',
      },
      {
        src: '/assets/projects/featured/mohamed-ali-palace/mohamed-ali-palace-ornate-interior.webp',
        alt: 'Ornate interior room at Mohamed Ali Palace',
        label: 'Ornate interior',
      },
    ],
  },
  {
    id: 'ministries-district',
    name: 'Ministries District',
    category: 'Construction',
    description: 'Mechanical marble works for the Transportation Ministry elevation in the Ministries District of the New Administrative Capital.',
    images: [
      {
        src: '/assets/projects/featured/ministries-district/ministries-district-main-facade.webp',
        alt: 'Ministries District building facade under construction',
        label: 'Main facade',
      },
      {
        src: '/assets/projects/featured/ministries-district/ministries-district-facade-scaffolding.webp',
        alt: 'Scaffolding across a Ministries District facade',
        label: 'Facade works',
      },
      {
        src: '/assets/projects/featured/ministries-district/ministries-district-construction-overview.webp',
        alt: 'Construction overview in the Ministries District',
        label: 'Site overview',
      },
    ],
  },
  {
    id: 'lakeview-residence',
    name: 'Lakeview Residence',
    category: 'Residential Fit-Out',
    description: 'Turnkey finishing for Lakeview Residence in the Fifth Settlement.',
    images: [
      {
        src: '/assets/projects/featured/lakeview/lakeview-marble-kitchen-detail.webp',
        alt: 'Black and white marble kitchen detail at Lakeview Residence',
        label: 'Kitchen detail',
        position: 'object-center',
      },
      {
        src: '/assets/projects/featured/lakeview/lakeview-bathroom-fitout.webp',
        alt: 'Finished bathroom at Lakeview Residence',
        label: 'Bathroom finish',
        fit: 'contain',
      },
      {
        src: '/assets/projects/featured/lakeview/lakeview-interior-joinery.webp',
        alt: 'Dark fitted joinery at Lakeview Residence',
        label: 'Interior joinery',
        fit: 'contain',
      },
    ],
  },
]
