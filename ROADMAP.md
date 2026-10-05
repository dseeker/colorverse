# Roadmap

This document outlines competitors, high-ranking coloring keywords, and proposed features for Colorverse.

## Competitors

- Crayola (crayola.com)
- Supercoloring (supercoloring.com)
- HelloKids (hellokids.com)
- JustColor (justcolor.net)
- Coloring Home (coloringhome.com)
- Disney Coloring Pages (disneyclips.com)
- Faber-Castell Coloring Pages (faber-castell.com)
- ColouringBook.com (coloring-book.info)
- Coloring Pages for Kids (coloring-pages-kids.com)
- Art Therapy Coloring (arttherapycoloring.com)

## High-Ranking Coloring Keywords

- free coloring pages
- coloring pages for kids
- adult coloring pages
- printable coloring pages
- online coloring book
- coloring games
- coloring sheets
- coloring pages pdf
- color by number
- coloring book app

## Proposed Features

1. **Keyword-Focused Library** – Organize content around top keywords like "free coloring pages" and "coloring pages for kids" to boost search visibility.
2. **Holiday & Seasonal Collections** – Release themed bundles for major holidays and seasons to keep the library fresh and relevant.
3. **Newsletter & Email Updates** – Build an opt-in list to announce new coloring pages, seasonal collections, and special promotions. ✅ (2026-10-05) — `#newsletter-form` wired via `wireNewsletterForm()` in app.js; submissions POST to the content-api worker. `newsletter_subscribe` analytics event added to both allowlists.
4. **Coloring Tips Infobox** – When a coloring page is shown, display a tooltip at the bottom with a random tip that teaches coloring techniques and color theory.
5. **Tag-Based Search & Filtering** – Use tags for themes and difficulty to help visitors quickly find relevant pages. ✅ (2026-10-05) — `searchManager.js` wired into a `#search` route with keyword search. Tag-based filtering by theme/difficulty is a follow-up (taxonomy not yet built).
6. **Social Sharing Buttons** – One-click sharing options for popular platforms to promote finished artworks. ✅ (2026-10-05) — `sharePage()` now shows an accessible modal with per-platform buttons (Twitter/X, Pinterest, Facebook, WhatsApp, Reddit, Email, Copy Link) when `navigator.share` is unavailable or cancelled.
7. **Accessibility Best Practices** – Semantic markup, alt text, and keyboard navigation to meet modern accessibility standards. ✅ (2026-10-05) — skip link, landmark roles/labels, `aria-label` on icon-only buttons, `:focus-visible` outlines, single-`<h1>` heading hierarchy per route. See commit 9c14b31.
8. **Structured Data & XML Sitemap** – Implement schema markup and generate a sitemap for better SEO performance.
9. **Multi-Language Interface** – Localize menus and keywords to reach a global audience.
10. **Analytics Dashboard** – Track page popularity and keyword performance to inform future content. ✅ (2026-10-05) — privacy-first `AnalyticsManager` + `/events` worker route (off by default) + KV-backed counters + `#dashboard` admin route reading `/events/stats`. See `ANALYTICS.md`.
11. **Color Palette Library** – Curated palettes and printable color charts to inspire color choices.
