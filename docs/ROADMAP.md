# Roadmap

This roadmap compares ColorVerse's product objectives with the implementation
currently present in the repository. "Implemented" describes source-code support;
it does not imply that production services are configured or that the feature has
been independently audited.

## Objectives and current status

| Objective                        | Status               | Current state                                                                                                                                                               |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyword-focused coloring library | In progress          | Category browsing and keyword search exist. Dedicated search landing pages and keyword-focused organization remain opportunities.                                           |
| Holiday and seasonal collections | Implemented          | Seasonal gallery support exists in the app and static content build.                                                                                                        |
| Newsletter sign-up               | Partial              | The form validates the address and stores a subscribed flag in local storage, but does not submit the address or connect to a mailing-list service.                         |
| Contextual coloring tips         | Partial              | A tips service and daily-pick tips exist; a page-specific tip infobox is not confirmed.                                                                                     |
| Search by theme and difficulty   | Partial              | Keyword search exists; a consistent theme/difficulty taxonomy and filters remain to be built.                                                                               |
| Social sharing                   | Implemented          | Native sharing and a platform-specific fallback are present.                                                                                                                |
| Accessibility                    | Baseline implemented | Landmarks, skip link, focus styles, labels, and route headings exist; a full accessibility audit remains outstanding.                                                       |
| Structured data and sitemap      | Implemented in code  | Route metadata and structured data are supported; the static build generates `sitemap.xml`.                                                                                 |
| Multilingual interface           | Partial              | English, German, and Portuguese resources and a language selector exist. Browser-language auto-detection needs verification/follow-up.                                      |
| Privacy-first analytics          | Implemented, opt-in  | Client and worker collection are off by default. Dashboard and counters require worker/KV configuration. Search analytics are count-only, not keyword-performance tracking. |
| Color palette library            | Implemented          | Curated palettes, details, swatches, and palette favorites are present.                                                                                                     |
| Palette-aware painted preview    | Not implemented      | Palette selection is not yet connected to the painted-image prompt.                                                                                                         |

## Recommended next priorities

1. Connect the selected palette colors to painted-preview generation.
2. Complete a shared theme/difficulty taxonomy and use it in search filters.
3. Validate locale detection, translations, and route behavior in each supported language.
4. Add automated tests for the high-visibility user flows and run them in CI.
5. Perform an accessibility audit and address any remaining keyboard or screen-reader issues.
6. Confirm and document newsletter delivery/storage behavior in the deployed worker.

## Search positioning

Search and page organization should support relevant queries such as:

- free coloring pages
- coloring pages for kids
- adult coloring pages
- printable coloring pages
- coloring sheets
- online coloring book
- color by number

These are content and SEO objectives, not a promise of search ranking. Prioritize
useful navigation and descriptive page metadata over keyword stuffing.
