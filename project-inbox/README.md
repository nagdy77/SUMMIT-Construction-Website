# SUMMIT Project Replacement Photography Inbox

This local-only inbox is the handoff location for replacement project photographs. It is intentionally outside `public/`, so media placed here cannot enter a website build by accident.

## Rules

- Place original client-approved photographs only in the matching project folder.
- Do not rename, crop, optimize, convert, or otherwise process incoming files in this folder.
- Do not commit any photographs to Git.
- Do not assign a photograph to website data until the project identity and publication approval are confirmed.
- Every project remains `pendingMedia` until a later curation and optimization pass.
- Arabic titles, descriptions, SEO text, and alt text require approved translations before publication.

## Folder structure

```text
project-inbox/
├── heritage-restoration/
│   ├── mohamed-ali-palace/
│   ├── beit-al-razzaz/
│   ├── safi-al-din-gowhar/
│   └── st-andrews-church/
├── construction/
│   ├── new-capital-administrations-district/
│   ├── stream-3/
│   ├── oriana-cairo-festival-city/
│   └── alto/
├── residential-fit-out/
│   ├── lakeview-residence/
│   └── marvel/
└── retail-fit-out/
    ├── bcbg/
    ├── bsb/
    ├── desigual/
    ├── marina-rinaldi/
    ├── sky-offices/
    └── voda/
```

The legacy client-supplied archive is preserved separately in `client-media-archive/`. Do not use it as the replacement inbox.
