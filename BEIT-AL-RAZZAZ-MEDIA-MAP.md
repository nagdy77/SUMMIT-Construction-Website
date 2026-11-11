# Beit Al-Razzaz restoration media map

The 20 supplied JPGs are preserved byte-for-byte in the ignored local archive at `client-media-archive/BEIT AL RAZZAZ/restoration-documentation/`. The page uses optimized WebP derivatives in `public/assets/projects/portfolio/beit-al-razzaz/<code>/`. The five Northern Side photographs and their supplied 720-pixel alternatives are preserved in the same local archive; only one high-resolution image per photograph is used for display, with its 720-pixel counterpart in `srcSet`.

## Coded restoration groups

| Documentation group | Supplied photo pairs | Frontend presentation | Phase association |
| --- | --- | --- | --- |
| `E3-00-27-01` | `1/DSC_6653.jpg` + `1/E3-1-27-01 (7).jpg`; `2/2..jpg` + `2/2.jpg`; `3/3.jpg` + `3/E3-1-27-01 (6).jpg` | Three interactive Before/After sliders. | Unverified. Kept under its supplied code. |
| `E3-01-37-03` | `1..jpg` + `1.jpg` | One interactive Before/After slider. | Unverified. Kept under its supplied code. |
| `E3-01-37-05` | `DSC_3207.jpg` + `DSC_6699.JPG` | One interactive Before/After slider. | Unverified. Kept under its supplied code. |
| `E3-01-37-07` | `1/2025.01.27 - E3-1-15-02 (7).jpg` + `1/DSC_6738.jpg`; `2/2..jpg` + `2/2.jpg`; `3/3...jpg` + `3/3.jpg` | Three interactive Before/After sliders. | Unverified. Kept under its supplied code. |
| `E3-01-37-09` | `1/09..jpg` + `1/09.jpg`; `2/09...2.jpg` + `2/09..2.jpg` | Two interactive Before/After sliders. | Unverified. Kept under its supplied code. |

The request does not identify which coded groups belong to the three official phases, so no coded group has been assigned to a phase. Per the latest presentation requirement, all ten supplied pairs use the same interactive comparison component. Internal group and file identifiers remain in this mapping report and asset paths only; none are rendered in the project-page UI. Northern Side images remain a separate gallery.

## Northern Side gallery

Five distinct photographs are displayed once each: `01-1203.webp`, `02-1562.webp`, `03-1570.webp`, `04-1563.webp`, and `05-1586.webp`. Their `*-720.webp` versions are responsive alternatives, not additional photos.

## Production derivatives

Each coded source photo has a 720-pixel WebP derivative and a maximum-1400-pixel WebP derivative at quality 76/80. Below-the-fold images are lazy-loaded. The first architectural image loads eagerly to lead the case study. No source photograph was overwritten or deleted.
