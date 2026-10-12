/**
 * ColorVerse i18n Manager
 * Minimal i18n plumbing using i18next loaded from CDN.
 * Bootstraps i18next with locale JSON files and exposes `window.t(key, params)`
 * so app.js can call `t("key")` without being a module.
 */

/* global i18next */

const SUPPORTED_LOCALES = ["en", "de", "pt"];
const FALLBACK = "en";
const STORAGE_KEY = "cv_i18n_locale";

let currentLocale = FALLBACK;
let loaded = false;

/** Load a single locale file from /locales/{code}/translation.json */
async function loadLocales() {
  const resources = {};
  for (const code of SUPPORTED_LOCALES) {
    try {
      const res = await fetch(`/locales/${code}/translation.json`);
      if (!res.ok) {
        continue;
      }
      resources[code] = { translation: await res.json() };
    } catch {
      /* missing locale — skip */
    }
  }
  return resources;
}

/**
 * Initialize i18n: detect locale, load resources, initialise i18next globally.
 * Must be called before any t() calls.
 */
export async function initI18n() {
  if (loaded) {
    return currentLocale;
  }

  const resources = await loadLocales();
  if (Object.keys(resources).length === 0) {
    // Nothing to load — just ensure fallback is available
    loaded = true;
    return currentLocale;
  }

  // Detect preferred locale: localStorage > browser > fallback
  let userLocale = FALLBACK;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      userLocale = saved;
    }
  } catch {}

  if (!userLocale && typeof navigator !== "undefined") {
    const browser = (navigator.language || "").toLowerCase().replace("-", "_");
    const short = browser.split("_")[0];
    if (SUPPORTED_LOCALES.includes(browser)) {
      userLocale = browser;
    } else if (SUPPORTED_LOCALES.includes(short)) {
      userLocale = short;
    }
  }

  currentLocale = userLocale || FALLBACK;

  // Initialise i18next on the global scope
  if (typeof i18next !== "undefined") {
    await i18next.init({
      resources,
      lng: currentLocale,
      fallbackLng: FALLBACK,
      interpolation: { escapeValue: false }, // already safe via escapeHtml in app.js
    });
  }

  loaded = true;
  return currentLocale;
}

/** Switch locale and return true on success. Triggers a page reload. */
export async function switchLocale(newLocale) {
  if (!SUPPORTED_LOCALES.includes(newLocale)) {
    return false;
  }
  const ok = await initI18n();
  if (!ok) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, newLocale);
  } catch {}
  currentLocale = newLocale;
  if (typeof i18next !== "undefined") {
    await i18next.changeLanguage(newLocale);
  }
  // Reload so all rendered strings update
  window.location.reload();
  return true;
}

/** Get supported locales with display names (reads from en as canonical). */
export function getLocales() {
  return SUPPORTED_LOCALES.map(code => ({
    code,
    name: code === "pt" ? "Portugu\u00eas" : code === "de" ? "Deutsch" : "English",
  }));
}

/** Get currently active locale code. */
export function getLocale() {
  return currentLocale;
}

// ---------------------------------------------------------------------------
// Expose globally for classic-script app.js consumption
// ---------------------------------------------------------------------------
if (typeof window !== "undefined") {
  window.cvI18n = { initI18n, switchLocale, getLocales, getLocale };
}

export default { initI18n, switchLocale, getLocales, getLocale };
