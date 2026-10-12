/**
 * Palette Manager for ColorVerse
 * Manages palette browsing, detail views, and persistence via localStorage
 */

import { palettes, getById, getByCategory, getCategories, getRandom } from "../data/palettes.js";

const PLACEHOLDER_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

class PalettesManager {
  constructor() {
    this.storageKey = "colorverse_palette_favorites";
    this.favoriteKeys = this.loadFavorites();
    this.listeners = [];
  }

  /**
   * Load favorite palette keys from localStorage
   */
  loadFavorites() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("[PalettesManager] Error loading favorites:", error);
      return [];
    }
  }

  /**
   * Save favorite palette keys to localStorage
   */
  saveFavorites() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.favoriteKeys));
      this.notifyListeners();
    } catch (error) {
      console.error("[PalettesManager] Error saving favorites:", error);
    }
  }

  /**
   * Check if a palette is favorited
   */
  isFavorite(paletteKey) {
    return this.favoriteKeys.includes(paletteKey);
  }

  /**
   * Add a palette to favorites
   */
  addFavorite(paletteKey) {
    if (!this.favoriteKeys.includes(paletteKey)) {
      this.favoriteKeys.push(paletteKey);
      this.saveFavorites();
    }
  }

  /**
   * Remove a palette from favorites
   */
  removeFavorite(paletteKey) {
    this.favoriteKeys = this.favoriteKeys.filter(k => k !== paletteKey);
    this.saveFavorites();
  }

  /**
   * Get all favorite palette keys
   */
  getFavorites() {
    return [...this.favoriteKeys];
  }

  /**
   * Get count of favorites
   */
  getFavoritesCount() {
    return this.favoriteKeys.length;
  }

  /**
   * Subscribe to favorites changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.favoriteKeys));
  }

  /**
   * Get suggested palettes (first 4 for coloring page view)
   */
  getSuggestedPalettes(palettesData) {
    return palettesData.slice(0, 4);
  }

  /**
   * Create a palette card HTML for the browse grid
   */
  createPaletteCard(palette, palettesData) {
    const isFav = this.isFavorite(palette.id);
    const escName = escapeHtml(palette.name);
    const escDesc = escapeHtml(palette.description);
    const swatches = palette.colors
      .map(
        color =>
          `<span class="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600 inline-block mr-1" style="background-color: ${color}" title="${color}" aria-label="Color ${color}"></span>`
      )
      .join("");

    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div class="p-4">
          <div class="flex justify-between items-center mb-3">
            <h3 class="font-semibold text-gray-800 dark:text-gray-200">${escName}</h3>
            <button
              class="favorite-btn palette-fav-btn p-1 rounded-full transition-all transform hover:scale-110 ${isFav ? "text-pink-500" : "text-gray-400 hover:text-pink-500"}"
              data-palette-id="${escapeHtml(palette.id)}"
              aria-label="${isFav ? `Remove ${escName} from favorites` : `Add ${escName} to favorites`}"
              aria-pressed="${isFav}">
              <i class="fas fa-heart"></i>
            </button>
          </div>
          <div class="flex flex-wrap items-center mb-3">
            ${swatches}
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">${escDesc}</p>
          <div class="flex gap-2">
            <button onclick="window.PalettesManager.showPaletteDetail('${escapeHtml(palette.id)}')"
                    class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-3 rounded-lg font-medium text-sm transition-colors">
              <i class="fas fa-eye mr-1"></i> View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the palettes browse view
   */
  showPalettesView(palettesData) {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) {
      return;
    }

    let html = `
      <nav aria-label="breadcrumb" class="flex items-center mb-6 text-sm text-gray-600 dark:text-gray-400">
        <a href="#" class="hover:text-primary-600 transition-colors flex items-center" onclick="window.showHomepage(); return false;">
          <i class="fas fa-home mr-1"></i> Home
        </a>
        <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
        <span class="font-medium text-gray-800 dark:text-gray-200">Palettes</span>
      </nav>

      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          <i class="fas fa-palette mr-2"></i>Color Palette Library
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          Browse curated color palettes for inspiration. Click a palette to view details and use it for your coloring page.
        </p>
      </div>
    `;

    if (palettesData.length === 0) {
      html += `
        <div class="text-center py-16">
          <i class="fas fa-palette text-6xl text-gray-300 mb-4"></i>
          <h2 class="text-2xl font-semibold text-gray-600 mb-2">No palettes available</h2>
          <p class="text-gray-500">Palettes will be available soon.</p>
        </div>
      `;
    } else {
      html += `
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          ${palettesData.map(palette => this.createPaletteCard(palette, palettesData)).join("")}
        </div>
      `;
    }

    mainContent.innerHTML = html;
    mainContent.classList.remove("hidden");

    // Setup favorite button event listeners
    this.setupFavoriteListeners();

    // Update SEO
    if (window.SEOManager) {
      window.SEOManager.updateMetaTags(
        "Color Palette Library",
        "Browse curated color palettes for inspiration. Find the perfect color combinations for your coloring pages.",
        null,
        `${window.SEOManager.siteUrl}/#palettes`
      );
    }
  }

  /**
   * Render a single palette detail view
   */
  showPaletteDetail(paletteId, palettesData) {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) {
      return;
    }

    const palette = palettesData.find(p => p.id === paletteId);
    if (!palette) {
      mainContent.innerHTML = `
        <div class="text-center py-16">
          <i class="fas fa-exclamation-triangle text-6xl text-gray-300 mb-4"></i>
          <h2 class="text-2xl font-semibold text-gray-600 mb-2">Palette not found</h2>
          <p class="text-gray-500 mb-4">The requested palette could not be loaded.</p>
          <a href="#palettes" class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center">
            <i class="fas fa-arrow-left mr-2"></i> Back to Palettes
          </a>
        </div>
      `;
      mainContent.classList.remove("hidden");
      return;
    }

    const isFav = this.isFavorite(palette.id);
    const escName = escapeHtml(palette.name);
    const escDesc = escapeHtml(palette.description);
    const escCategory = escapeHtml(palette.category);

    // Large swatches for detail view
    const largeSwatches = palette.colors
      .map(
        color => `
        <div class="flex flex-col items-center">
          <div
            class="w-20 h-20 rounded-full border-4 border-gray-200 dark:border-gray-600 shadow-md mb-2"
            style="background-color: ${color}"
            title="${color}"
            aria-label="Color ${color}"
          ></div>
          <span class="text-xs font-mono text-gray-500 dark:text-gray-400">${color}</span>
        </div>
      `
      )
      .join("");

    // Small swatches for use button
    const smallSwatches = palette.colors
      .map(
        color =>
          `<span class="w-6 h-6 rounded-full border border-gray-300 inline-block mr-1" style="background-color: ${color}" title="${color}"></span>`
      )
      .join("");

    const html = `
      <nav aria-label="breadcrumb" class="flex items-center mb-6 text-sm text-gray-600 dark:text-gray-400">
        <a href="#" class="hover:text-primary-600 transition-colors flex items-center" onclick="window.showHomepage(); return false;">
          <i class="fas fa-home mr-1"></i> Home
        </a>
        <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
        <a href="#palettes" class="hover:text-primary-600 transition-colors">Palettes</a>
        <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
        <span class="font-medium text-gray-800 dark:text-gray-200">${escName}</span>
      </nav>

      <div class="max-w-2xl mx-auto">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">${escName}</h1>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">Category: ${escCategory}</p>
            </div>
            <button
              id="palette-detail-fav-btn"
              class="p-2 rounded-full transition-all transform hover:scale-110 ${isFav ? "text-pink-500" : "text-gray-400 hover:text-pink-500"}"
              data-palette-id="${escapeHtml(palette.id)}"
              aria-label="${isFav ? `Remove ${escName} from favorites` : `Add ${escName} to favorites`}"
              aria-pressed="${isFav}">
              <i class="fas fa-heart text-xl"></i>
            </button>
          </div>

          <p class="text-gray-600 dark:text-gray-300 mb-6">${escDesc}</p>

          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Color Swatches</h2>
            <div class="flex justify-center items-center gap-6">
              ${largeSwatches}
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 class="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Use This Palette</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Click a color to copy it, then use it in your coloring session:</p>
            <div class="flex flex-wrap items-center gap-2">
              ${smallSwatches}
              <button
                id="use-palette-btn"
                data-palette-id="${escapeHtml(palette.id)}"
                class="ml-4 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                <i class="fas fa-check mr-1"></i> Apply Palette
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 text-center">
          <a href="#palettes" class="text-gray-600 dark:text-gray-400 hover:text-primary-600 inline-flex items-center">
            <i class="fas fa-arrow-left mr-2"></i> Back to all palettes
          </a>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
    mainContent.classList.remove("hidden");

    // Setup detail view event listeners
    this.setupFavoriteListeners();
    this.setupUsePaletteListener(palette.id);

    // Update SEO
    if (window.SEOManager) {
      window.SEOManager.updateMetaTags(
        `${escName} Color Palette`,
        `View the ${escName} color palette with ${palette.colors.length} colors. Inspired by ${escCategory} themes.`,
        null,
        `${window.SEOManager.siteUrl}/#palette/${palette.id}`
      );
    }
  }

  /**
   * Setup event listeners for favorite buttons
   */
  setupFavoriteListeners() {
    document.addEventListener("click", e => {
      const btn = e.target.closest(".palette-fav-btn");
      if (!btn) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const paletteId = btn.dataset.paletteId;
      const isFav = this.isFavorite(paletteId);
      const palette = palettes?.find(p => p.id === paletteId);
      const paletteName = palette ? escapeHtml(palette.name) : "Palette";

      if (isFav) {
        this.removeFavorite(paletteId);
        btn.classList.remove("text-pink-500");
        btn.classList.add("text-gray-400");
        btn.title = `Add ${paletteName} to favorites`;
        btn.setAttribute("aria-pressed", "false");
        btn.setAttribute("aria-label", `Add ${paletteName} to favorites`);
      } else {
        this.addFavorite(paletteId);
        btn.classList.remove("text-gray-400");
        btn.classList.add("text-pink-500");
        btn.title = `Remove ${paletteName} from favorites`;
        btn.setAttribute("aria-pressed", "true");
        btn.setAttribute("aria-label", `Remove ${paletteName} from favorites`);
      }

      if (window.showToast) {
        window.showToast(
          isFav ? `Removed "${paletteName}" from favorites` : `Added "${paletteName}" to favorites`,
          isFav ? "info" : "success",
          2000
        );
      }
    });
  }

  /**
   * Setup listener for the "Use this palette" button
   */
  setupUsePaletteListener(paletteId) {
    const useBtn = document.getElementById("use-palette-btn");
    if (!useBtn) {
      return;
    }

    useBtn.addEventListener("click", () => {
      const palette = palettes?.find(p => p.id === paletteId);
      if (!palette) {
        if (window.showToast) {
          window.showToast("Palette not found", "error");
        }
        return;
      }

      // Store the selected palette in localStorage for the coloring session
      try {
        localStorage.setItem("colorverse_active_palette", JSON.stringify(palette));
        if (window.showToast) {
          window.showToast(`Applied "${palette.name}" palette`, "success", 2000);
        }
      } catch (error) {
        console.error("[PalettesManager] Error saving active palette:", error);
        if (window.showToast) {
          window.showToast("Failed to save palette", "error");
        }
      }
    });
  }
}

// Create global instance
const palettesManager = new PalettesManager();
window.PalettesManager = palettesManager;

// Setup event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  palettesManager.setupFavoriteListeners();
});

export default palettesManager;
