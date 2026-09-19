# Akash Dashboard — Modular Version

Architecture:
- core.js — Supabase, login, dashboard, tasks and shared dashboard logic
- pdf-watermark.js — PDF Watermark only
- pdf-compress.js — PDF Compress only
- image-common.js — shared image utility functions used by both image tools
- image-converter.js — Image Converter only
- image-resize.js — Image Resize + Crop only
- navigation.js — menu search and navigation
- settings-auth.js — profile, theme, settings and authentication

CSS is split into dashboard, PDF watermark, PDF compress, image tools, and auth files.

Load order is intentionally preserved: libraries → core → PDF tools → shared image helpers → image tools → navigation → settings/auth.

For future changes, edit only the relevant feature file unless the change is a shared utility or shared styling change.


## Fonts
Font files are kept in the `fonts/` folder. The Arial Black font is referenced as `../fonts/ariblk.ttf` from CSS and `./fonts/ariblk.ttf` from the root-level JavaScript module.
