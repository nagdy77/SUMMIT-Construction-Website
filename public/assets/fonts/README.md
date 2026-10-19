# SUMMIT self-hosted web fonts

These unmodified WOFF2 files are the Latin subsets served by the official Google Fonts CSS API. DM Sans uses one variable normal-style file for weights 400–700. Instrument Serif uses one regular and one italic file at weight 400. CSS uses `font-display: swap`; no font service is contacted by the website at runtime.

Both families are distributed under the SIL Open Font License 1.1. The complete upstream copyright notices and licenses are included beside the font files. The licenses allow embedding and redistribution with software while retaining those notices and license terms.

| Local font | Style | Weight | Bytes | Official binary source |
| --- | --- | --- | ---: | --- |
| dm-sans-latin.woff2 | normal | 400 700 | 36,932 | [Google Fonts WOFF2](https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2) |
| instrument-serif-latin.woff2 | normal | 400 | 21,032 | [Google Fonts WOFF2](https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjg.woff2) |
| instrument-serif-italic-latin.woff2 | italic | 400 | 22,128 | [Google Fonts WOFF2](https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zAjjH7M.woff2) |

## Upstream licenses

- DM Sans: [official OFL source](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt); local copy: [dm-sans-OFL.txt](./dm-sans-OFL.txt).
- Instrument Serif: [official OFL source](https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/OFL.txt); local copy: [instrument-serif-OFL.txt](./instrument-serif-OFL.txt).

## Reproduction and verification

Run `node scripts/prepare-phase5-fonts.mjs` from the workspace. The script requests the official CSS for these families with a WOFF2-capable browser user agent, selects only blocks labelled exactly `latin`, verifies the returned style and weight, downloads each official binary, and checks its WOFF2 signature and header length. `font-provenance.json` records CSS URLs, binary URLs, exact bytes, Unicode coverage, and SHA-256 checksums.

- [Official CSS request](https://fonts.googleapis.com/css2?family=DM+Sans%3Awght%40400..700&display=swap)
- [Official CSS request](https://fonts.googleapis.com/css2?family=Instrument+Serif%3Aital%400%3B1&display=swap)

The Latin subset does not provide Arabic glyphs. The existing direction-aware Arabic fallback stack remains available for future bilingual content; an Arabic font should be chosen and licensed when Arabic copy is implemented.
