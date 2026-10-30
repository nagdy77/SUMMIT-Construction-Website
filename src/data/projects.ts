export type ProjectImage = {
  src: string
  alt: string
  label: string
  fit?: 'cover' | 'contain'
  position?: string
}

export type ProjectCategory = 'Heritage Restoration' | 'Construction' | 'Residential Fit-Out' | 'Retail Fit-Out'
export type ProjectContentStatus = 'source-supplied' | 'source-contains-speculative-language' | 'awaiting-client-correction' | 'awaiting-conflict-resolution'

export type ProjectSpecifications = {
  client: string | null
  scope: string
  location: string
  projectDuration: string
  bua?: string | null
  year?: string | null
}

export type ProjectRecord = {
  id: string
  slug: string
  title: { en: string; ar: string | null }
  category: ProjectCategory
  inboxFolder: string
  historicalBackground: string | null
  sourceOverview: string
  publicOverview: string | null
  specifications: ProjectSpecifications
  contentStatus: ProjectContentStatus
  reviewNotes: readonly string[]
  sourceVariants?: Readonly<Record<string, Readonly<Record<string, string>>>>
  sourceNamingReferences?: readonly string[]
  pendingMedia: boolean
  images: readonly ProjectImage[]
}

export const projects: readonly ProjectRecord[] = [
  {
    id: 'mohamed-ali-palace', slug: 'mohamed-ali-palace', title: { en: 'Mohamed Ali Palace', ar: null }, category: 'Heritage Restoration',
    inboxFolder: 'project-inbox/heritage-restoration/mohamed-ali-palace/',
    historicalBackground: 'Qasr al Fusqiya in Shubra is a significant landmark built in 1808 and a symbol of Muhammad Ali pasha era and represents a key chapter in modern Egyptian history.',
    sourceOverview: 'Summit Construction company, along with its distinguished partner The Stone shop company was assigned to restore all the marble works in Al-Fasqiya Palace in Shubra Al-Khaimah with total area about 4000 M2 of Italian Carrara. The project was delivered within the specified time frame and with the highest possible quality.',
    publicOverview: 'Summit Construction company, along with its distinguished partner The Stone shop company was assigned to restore all the marble works in Al-Fasqiya Palace in Shubra Al-Khaimah with total area about 4000 M2 of Italian Carrara. The project was delivered within the specified time frame and with the highest possible quality.',
    specifications: { client: 'Rowad Modern Engineering', scope: 'Renovation of all marble works in AL-Fasqiah Palace', location: 'Mohamed Ali palace', projectDuration: '12 months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'beit-al-razzaz', slug: 'beit-al-razzaz', title: { en: 'Beit Al Razzaz', ar: null }, category: 'Heritage Restoration',
    inboxFolder: 'project-inbox/heritage-restoration/beit-al-razzaz/',
    historicalBackground: "Bayt Al-Razzaz is a magnificent historical mansion located in the heart of Cairo's district, Darb Al Ahmar, the mansion was built on two stages.\n\nMamluk origins: the eastern part of the complex dates back to the 15th century, constructed during reign of the mamluk sultan Qaitbay. This section showcases the grandeur and intricate details characteristic of mamluk architecture.\n\nOttoman Expansion: in 18th century, the western part was added by Ahmed Katkhuda AL-Razzaz, a wealthy rice merchant. This expansion connected the two parts, creating a vast and impressive complex.",
    sourceOverview: 'Summit construction was responsible for the structural repair, adaptive reuse and renovation of eastern part of Bayt Al Razzaz.',
    publicOverview: 'Summit construction was responsible for the structural repair, adaptive reuse and renovation of eastern part of Bayt Al Razzaz.',
    specifications: { client: 'Ministry of Antiquities and Tourism', scope: 'Restoration and rehabilitation for the north eastern corner house', location: 'Al Darb Al Ahmar', projectDuration: '10 months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'safi-al-din-gowhar', slug: 'safi-al-din-gowhar', title: { en: 'Safi Al Din Gowhar', ar: null }, category: 'Heritage Restoration',
    inboxFolder: 'project-inbox/heritage-restoration/safi-al-din-gowhar/',
    historicalBackground: 'It was established by Safi al-Din Jawhar al-Nasiri al-Maliki, also known sometimes as Sidi Muqaddam of the Sultanate Mamluks during the days of the Bahri Mamluk Sultan Baybars al-Jashankir, in the year 714 AH/1314 AD. It is located on Rukibiya Street, branching from Sulaibiyah Street in the Khalifa neighborhood in the city of Cairo. It consists of an irregular rectangular space divided into a dirka (entrance hall) followed by the main entrance. This dirka leads to an open courtyard and the burial dome, which is preceded by a prayer area on its southeastern side.',
    sourceOverview: 'Summit Construction Company was assigned as a company specializing in restoration works and everything related to restoration. The company was assigned to implement dewatering system to Safi al-Din Dome.',
    publicOverview: 'Summit Construction Company was assigned as a company specializing in restoration works and everything related to restoration. The company was assigned to implement dewatering system to Safi al-Din Dome.',
    specifications: { client: 'Megawra Office (Dr. Mai El Abrashi)', scope: 'Dewatering System', location: 'Al Saleeba Street', projectDuration: '5 months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'st-andrews-church', slug: 'st-andrews-church', title: { en: 'St Andrews Church', ar: null }, category: 'Heritage Restoration',
    inboxFolder: 'project-inbox/heritage-restoration/st-andrews-church/', historicalBackground: null,
    sourceOverview: 'summit Construction company was selected as a specialized company in restoration works to carry out structural restoration works for the floor of the main prayer hall.',
    publicOverview: 'summit Construction company was selected as a specialized company in restoration works to carry out structural restoration works for the floor of the main prayer hall.',
    specifications: { client: 'Megawra Office (Dr. Mai El Abrashi)', scope: 'Restoration and Structural Reinforcement works for the Floor of the main hall', location: 'Emad al din street, Cairo', projectDuration: '3 Months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'new-capital-administrations-district', slug: 'new-capital-administrations-district', title: { en: 'New Capital Administrations District', ar: null }, category: 'Construction',
    inboxFolder: 'project-inbox/construction/new-capital-administrations-district/', historicalBackground: null,
    sourceOverview: "Summit Construction has been assigned to execute the mechanical marble works for the Transportation Ministry in collaboration with Gama Construction at the New Administrative District. This prestigious project not only highlights Summit Construction's expertise in high-quality marble installation and precision craftsmanship but also adds significant value to the company's portfolio. The partnership with Gama Construction underscores Summit's capability to deliver exceptional results in large-scale, high-profile developments, further solidifying its reputation as a leader in the construction industry.",
    publicOverview: "Summit Construction has been assigned to execute the mechanical marble works for the Transportation Ministry in collaboration with Gama Construction at the New Administrative District. This prestigious project not only highlights Summit Construction's expertise in high-quality marble installation and precision craftsmanship but also adds significant value to the company's portfolio. The partnership with Gama Construction underscores Summit's capability to deliver exceptional results in large-scale, high-profile developments, further solidifying its reputation as a leader in the construction industry.",
    specifications: { client: 'Gama Construction', scope: 'Installation of mechanical marble works in the elevation for the transportation ministry', location: 'The ministries district in the new Administrative Capital', projectDuration: '10 months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'stream-3', slug: 'stream-3', title: { en: 'Stream 3', ar: null }, category: 'Construction', inboxFolder: 'project-inbox/construction/stream-3/', historicalBackground: null,
    sourceOverview: 'Summit Construction Company was selected as the specialized contractor for finishing works in the Stream Live 3 project. The company successfully executed and delivered the project within the agreed-upon timeline while meeting all quality standards. This project has significantly contributed to Summit portfolio, showcasing their expertise and commitment to excellence in the field of finishing works.',
    publicOverview: 'Summit Construction Company was selected as the specialized contractor for finishing works in the Stream Live 3 project. The company successfully executed and delivered the project within the agreed-upon timeline while meeting all quality standards. This project has significantly contributed to Summit portfolio, showcasing their expertise and commitment to excellence in the field of finishing works.',
    specifications: { client: 'Gama Construction', scope: 'Fully Finishing for 1 Building', location: 'Cairo Festival City', projectDuration: '2 years' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'oriana-cairo-festival-city', slug: 'oriana-cairo-festival-city', title: { en: 'Oriana Cairo Festival City', ar: null }, category: 'Construction', inboxFolder: 'project-inbox/construction/oriana-cairo-festival-city/', historicalBackground: null,
    sourceOverview: "Summit Construction was entrusted to implement the finishing works for 12 villas at Oriana Villas 3 CFC, delivering exceptional quality standards within the agreed project schedule. The team ensured precision in execution, meticulous attention to detail, and adherence to the highest standards of craftsmanship, resulting in luxurious and refined living spaces that met the client's expectations and project timelines.",
    publicOverview: "Summit Construction was entrusted to implement the finishing works for 12 villas at Oriana Villas 3 CFC, delivering exceptional quality standards within the agreed project schedule. The team ensured precision in execution, meticulous attention to detail, and adherence to the highest standards of craftsmanship, resulting in luxurious and refined living spaces that met the client's expectations and project timelines.",
    specifications: { client: 'Gama Construction', scope: 'External Finishing for 12 Villas (Block works – Plaster – Painting – Marble)', location: 'Cairo Festival City', projectDuration: '15 months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'alto', slug: 'alto', title: { en: 'Alto', ar: null }, category: 'Construction', inboxFolder: 'project-inbox/construction/alto/', historicalBackground: null,
    sourceOverview: 'Summit construction was committed to deliver two buildings in up town Cairo. With a commitment to excellence, we deliver this project with top-tier quality and efficiency.',
    publicOverview: 'Summit construction was committed to deliver two buildings in up town Cairo. With a commitment to excellence, we deliver this project with top-tier quality and efficiency.',
    specifications: { client: 'ACC', scope: 'External Finishing (Painting – Marble)', location: 'uptown Cairo', projectDuration: '15 months' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'lakeview-residence', slug: 'lakeview-residence', title: { en: 'Lakeview Residence', ar: null }, category: 'Residential Fit-Out', inboxFolder: 'project-inbox/residential-fit-out/lakeview-residence/', historicalBackground: null,
    sourceOverview: "Summit Construction was entrusted to carry out finishing works for one of the unique and simply luxurious fit-out projects at Lakeview. This project likely involved high-end interior finishes, attention to detail, and a focus on creating a luxurious yet understated aesthetic. Summit Construction's role would have included coordinating with designers, managing subcontractors, and ensuring the highest quality of craftsmanship to meet the client's expectations for a premium fit-out.",
    publicOverview: null,
    specifications: { client: null, scope: 'Finishing Turn Key', location: '5th Settlement', projectDuration: '6 Months' },
    contentStatus: 'source-contains-speculative-language', reviewNotes: ["The source uses 'likely' and 'would have'; do not publish those statements as confirmed achievements.", 'Client is not specified in the supplied source.'], pendingMedia: true, images: [],
  },
  {
    id: 'marvel', slug: 'marvel', title: { en: 'Marvel', ar: null }, category: 'Residential Fit-Out', inboxFolder: 'project-inbox/residential-fit-out/marvel/', historicalBackground: null,
    sourceOverview: "Summit Construction was commissioned by the client to execute the finishing works for an exceptional and elegantly understated fit-out project at the Marvel Compound. This apartment project embodies a blend of sophistication and simplicity, showcasing luxurious design elements tailored to modern living. Summit Construction's expertise ensured meticulous attention to detail, seamless coordination with designers, and the delivery of a high-quality, refined living space that aligns with the client's vision of contemporary luxury.",
    publicOverview: "Summit Construction was commissioned by the client to execute the finishing works for an exceptional and elegantly understated fit-out project at the Marvel Compound. This apartment project embodies a blend of sophistication and simplicity, showcasing luxurious design elements tailored to modern living. Summit Construction's expertise ensured meticulous attention to detail, seamless coordination with designers, and the delivery of a high-quality, refined living space that aligns with the client's vision of contemporary luxury.",
    specifications: { client: null, scope: 'Finishing Turn Key', location: '5th Settlement', projectDuration: '5 Months' },
    contentStatus: 'source-supplied', reviewNotes: ['Client is not specified in the supplied source.'], pendingMedia: true, images: [],
  },
  {
    id: 'bcbg', slug: 'bcbg', title: { en: 'BCBG', ar: null }, category: 'Retail Fit-Out', inboxFolder: 'project-inbox/retail-fit-out/bcbg/', historicalBackground: null,
    sourceOverview: 'SUMMIT CONSTRUCTION was entrusted with the execution of the BCBG project in collaboration with Fashion International Group. This unique project represents an excellent addition to our portfolio, showcasing our commitment to quality and precision in delivering specialized construction solutions.',
    publicOverview: 'SUMMIT CONSTRUCTION was entrusted with the execution of the BCBG project in collaboration with Fashion International Group. This unique project represents an excellent addition to our portfolio, showcasing our commitment to quality and precision in delivering specialized construction solutions.',
    specifications: { client: null, bua: '160 M²', location: 'Mall of Arabia', scope: 'Fully Finishing, MEP Works', projectDuration: '9 weeks', year: '2022' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'bsb', slug: 'bsb', title: { en: 'BSB', ar: null }, category: 'Retail Fit-Out', inboxFolder: 'project-inbox/retail-fit-out/bsb/', historicalBackground: null,
    sourceOverview: "Summit Construction was commissioned by the client to execute the finishing works for an exceptional and elegantly understated fit-out project at the Marvel Compound. This apartment project embodies a blend of sophistication and simplicity, showcasing luxurious design elements tailored to modern living. Summit Construction's expertise ensured meticulous attention to detail, seamless coordination with designers, and the delivery of a high-quality, refined living space that aligns with the client's vision of contemporary luxury.",
    publicOverview: null,
    specifications: { client: null, bua: '140 M²', location: 'city stars', scope: 'Fully Furnishing - MEP Works - Furniture', projectDuration: '7 weeks', year: '2020' },
    contentStatus: 'awaiting-client-correction', reviewNotes: ["The supplied BSB overview incorrectly refers to the Marvel Compound residential project. Preserve the original wording as reference, but do not publish it as BSB's verified description."], pendingMedia: true, images: [],
  },
  {
    id: 'desigual', slug: 'desigual', title: { en: 'Desigual', ar: null }, category: 'Retail Fit-Out', inboxFolder: 'project-inbox/retail-fit-out/desigual/', historicalBackground: null,
    sourceOverview: "For the Desigual project, we delivered a fully furnished and turnkey solution within a tight 7-week schedule. All furniture and cladding components were imported directly from Spain, reflecting a unique and authentic design vision. Summit Construction's professional team expertly managed the careful installation, ensuring precision and high-quality finishes throughout. Committed to excellence, we successfully closed the project on time, meeting the highest quality standards and fully satisfying Fashion International Group's requirements.",
    publicOverview: "For the Desigual project, we delivered a fully furnished and turnkey solution within a tight 7-week schedule. All furniture and cladding components were imported directly from Spain, reflecting a unique and authentic design vision. Summit Construction's professional team expertly managed the careful installation, ensuring precision and high-quality finishes throughout. Committed to excellence, we successfully closed the project on time, meeting the highest quality standards and fully satisfying Fashion International Group's requirements.",
    specifications: { client: null, bua: '140 M²', location: 'cario festival mall', scope: 'Fully Furnishing, MEP Works, Furniture', projectDuration: '7 WEEKS', year: '2019' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
  {
    id: 'marina-rinaldi', slug: 'marina-rinaldi', title: { en: 'Marina Rinaldi', ar: null }, category: 'Retail Fit-Out', inboxFolder: 'project-inbox/retail-fit-out/marina-rinaldi/', historicalBackground: null,
    sourceOverview: "Summit Construction was entrusted with the execution of the Marina project in 2021, located in City Stars with a built-up area of 180m². The scope of work encompassed full finishing—including fit-out and MEP services—and the precise installation of high-end furniture imported directly from Italy. Despite the tight schedule, the project was completed within an ambitious 8-week timeframe. This collaboration with Fashion International Group reflects Summit Construction's dedication to quality, attention to detail, and ability to deliver sophisticated results on time in premier commercial destinations.",
    publicOverview: null,
    specifications: { client: null, bua: '160 M²', location: 'City stars', scope: 'Fully Finishing - MEP - Furniture', projectDuration: '7 WEEKS', year: '2019' },
    sourceVariants: { overviewClaims: { year: '2021', bua: '180m²', projectDuration: '8-week timeframe' }, separateSpecifications: { year: '2019', bua: '160 M²', projectDuration: '7 WEEKS' } },
    contentStatus: 'awaiting-conflict-resolution', reviewNotes: ['The overview states 2021, 180m², and 8 weeks, while the separately supplied specifications state 2019, 160 M², and 7 weeks. Confirm all three fields before public display.'], pendingMedia: true, images: [],
  },
  {
    id: 'sky-offices', slug: 'sky-offices', title: { en: 'Sky Offices', ar: null }, category: 'Retail Fit-Out', inboxFolder: 'project-inbox/retail-fit-out/sky-offices/', historicalBackground: null,
    sourceOverview: 'Summit Construction proudly executed the Square Offices project in 2024 at Park Street, covering a built-up area of 230 m². Our experienced and dedicated team managed the full finishing, MEP works, and careful installation of furniture, all within an efficient 8-week timeline. This project exemplifies our commitment to delivering exceptional quality, precision, and timely completion, regardless of project complexity. We greatly appreciate the opportunity to collaborate with Sky Bond and value the trust they placed in our capabilities, reinforcing our dedication to building strong, lasting client relationships.',
    publicOverview: null,
    specifications: { client: null, bua: '230 M²', location: 'park street', scope: 'Fully Finishing - MEP - Furniture', projectDuration: '8 weeks', year: '2024' },
    sourceNamingReferences: ['SKY OFFICES', 'Square Offices', 'Sky Bond'],
    contentStatus: 'awaiting-client-correction', reviewNotes: ['The project heading says SKY OFFICES, while the overview calls it Square Offices and mentions Sky Bond. Confirm the naming relationship before public display.'], pendingMedia: true, images: [],
  },
  {
    id: 'voda', slug: 'voda', title: { en: 'Voda', ar: null }, category: 'Retail Fit-Out', inboxFolder: 'project-inbox/retail-fit-out/voda/', historicalBackground: null,
    sourceOverview: 'Summit Construction successfully completed the Voda project in 2019, located in Alexandria with a built-up area of 30 m². Our skilled team executed full finishing and MEP works with meticulous attention to detail, delivering high-quality results within a tight 4-week schedule. We take great pride in working with Niles Projects and appreciate the trust they placed in our expertise. This project highlights our commitment to precision, efficiency, and maintaining strong client partnerships regardless of project scale.',
    publicOverview: 'Summit Construction successfully completed the Voda project in 2019, located in Alexandria with a built-up area of 30 m². Our skilled team executed full finishing and MEP works with meticulous attention to detail, delivering high-quality results within a tight 4-week schedule. We take great pride in working with Niles Projects and appreciate the trust they placed in our expertise. This project highlights our commitment to precision, efficiency, and maintaining strong client partnerships regardless of project scale.',
    specifications: { client: null, bua: '30 M²', location: 'Alexandria', scope: 'Fully Finishing - MEP', projectDuration: '4 weeks', year: '2019' },
    contentStatus: 'source-supplied', reviewNotes: [], pendingMedia: true, images: [],
  },
]

export const hasProjectMedia = projects.some((project) => !project.pendingMedia && project.images.length > 0)
