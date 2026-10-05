/**
 * Favorites Manager for ColorVerse
 * Stores user's favorite coloring pages in localStorage
 * Perfect for parents who want to save pages for later
 */

const PLACEHOLDER_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function escapeFavHtml(value) {
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

class FavoritesManager {
  constructor() {
    this.storageKey = "colorverse_favorites";
    this.favorites = this.loadFavorites();
    this.listeners = [];
  }

  /**
   * Items in the live data use `title`; some legacy/seed paths use `name`.
   * Normalize so the manager works either way.
   */
  itemName(item) {
    return (item && (item.title || item.name)) || "Untitled";
  }

  /**
   * Load favorites from localStorage
   */
  loadFavorites() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error loading favorites:", error);
      return [];
    }
  }

  /**
   * Save favorites to localStorage
   */
  saveFavorites() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
      this.notifyListeners();
      this.updateUI();
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  }

  /**
   * Add a coloring page to favorites
   */
  addFavorite(category, item, imageUrl) {
    const favorite = {
      id: `${category}-${item.key}`,
      category,
      item,
      imageUrl,
      addedAt: new Date().toISOString(),
    };

    // Check if already exists
    if (!this.isFavorite(category, item.key)) {
      this.favorites.push(favorite);
      this.saveFavorites();
      this.showToast(`Added "${this.itemName(item)}" to favorites`, "success");
      if (window.analytics && typeof window.analytics.track === "function") {
        window.analytics.track("favorite_add");
      }
      return true;
    }
    return false;
  }

  /**
   * Remove a coloring page from favorites
   */
  removeFavorite(category, itemKey) {
    const id = `${category}-${itemKey}`;
    const index = this.favorites.findIndex(f => f.id === id);

    if (index > -1) {
      const removed = this.favorites.splice(index, 1)[0];
      this.saveFavorites();
      this.showToast(`Removed "${this.itemName(removed.item)}" from favorites`, "info");
      if (window.analytics && typeof window.analytics.track === "function") {
        window.analytics.track("favorite_remove");
      }
      return true;
    }
    return false;
  }

  /**
   * Check if an item is in favorites
   */
  isFavorite(category, itemKey) {
    const id = `${category}-${itemKey}`;
    return this.favorites.some(f => f.id === id);
  }

  /**
   * Get all favorites
   */
  getFavorites() {
    return [...this.favorites];
  }

  /**
   * Get favorites count
   */
  getCount() {
    return this.favorites.length;
  }

  /**
   * Clear all favorites
   */
  clearFavorites() {
    this.favorites = [];
    this.saveFavorites();
    this.showToast("All favorites cleared", "info");
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
    this.listeners.forEach(callback => callback(this.favorites));
  }

  /**
   * Update UI elements (count badge)
   */
  updateUI() {
    const countBadge = document.getElementById("favorites-count");
    if (countBadge) {
      const count = this.getCount();
      countBadge.textContent = count;
      countBadge.classList.toggle("hidden", count === 0);
    }
  }

  /**
   * Create favorites button HTML for a coloring page card
   */
  createFavoriteButton(category, item) {
    const isFav = this.isFavorite(category, item.key);
    const escName = escapeFavHtml(this.itemName(item));
    const escCategory = escapeFavHtml(category);
    const escKey = escapeFavHtml(item.key);
    return `
            <button class="favorite-btn absolute top-2 right-2 p-2 rounded-full transition-all transform hover:scale-110 z-10 ${isFav ? "bg-pink-500 text-white" : "bg-white bg-opacity-80 text-gray-400 hover:text-pink-500"}"
                    data-category="${escCategory}"
                    data-item-key="${escKey}"
                    data-item-name="${escName}"
                    aria-pressed="${isFav}"
                    aria-label="${isFav ? `Remove ${escName} from favorites` : `Add ${escName} to favorites`}">
                <i class="fas fa-heart" aria-hidden="true"></i>
            </button>
        `;
  }

  /**
   * Setup event delegation for favorite buttons
   */
  setupEventListeners() {
    document.addEventListener("click", e => {
      const btn = e.target.closest(".favorite-btn");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();

        const category = btn.dataset.category;
        const itemKey = btn.dataset.itemKey;

        // Get the full item object from the card data
        const card = btn.closest("[data-item-full]");
        let item = { key: itemKey, name: btn.dataset.itemName };

        if (card) {
          try {
            item = JSON.parse(card.dataset.itemFull);
          } catch (_error) {
            console.warn("Could not parse item data from card");
          }
        }

        const itemName = this.itemName(item);
        if (this.isFavorite(category, itemKey)) {
          this.removeFavorite(category, itemKey);
          btn.classList.remove("bg-pink-500", "text-white");
          btn.classList.add("bg-white", "bg-opacity-80", "text-gray-400");
          btn.title = "Add to favorites";
          btn.setAttribute("aria-pressed", "false");
          btn.setAttribute("aria-label", `Add ${itemName} to favorites`);
        } else {
          // Get image URL from the card
          const img = card?.querySelector("img");
          const imageUrl = img?.src || img?.dataset.src || "";

          this.addFavorite(category, item, imageUrl);
          btn.classList.remove("bg-white", "bg-opacity-80", "text-gray-400");
          btn.classList.add("bg-pink-500", "text-white");
          btn.title = "Remove from favorites";
          btn.setAttribute("aria-pressed", "true");
          btn.setAttribute("aria-label", `Remove ${itemName} from favorites`);

          // Add animation
          btn.classList.add("animate-pulse");
          setTimeout(() => btn.classList.remove("animate-pulse"), 500);
        }
      }
    });

    // Favorites toggle button in header. Setting the hash lets
    // handleRouteChange drive the rendering, SEO, and analytics, so the
    // back button works the same as any other page.
    const favoritesToggle = document.getElementById("favorites-toggle");
    if (favoritesToggle) {
      favoritesToggle.addEventListener("click", () => {
        window.location.hash = "#favorites";
      });
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    if (window.showToast) {
      window.showToast(message, type, 2000);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  /**
   * Show favorites view/page
   */
  showFavoritesView() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) {
      return;
    }

    const favorites = this.getFavorites();

    let html = `
            <nav aria-label="breadcrumb" class="flex items-center mb-6 text-sm text-gray-600">
                <a href="#" class="hover:text-primary-600 transition-colors flex items-center">
                    <i class="fas fa-home mr-1"></i> Home
                </a>
                <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                <span class="font-medium text-gray-800">My Favorites</span>
            </nav>

            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">My Favorite Coloring Pages</h1>
                ${
                  favorites.length > 0
                    ? `
                    <button onclick="window.FavoritesManager.clearFavorites()"
                            class="text-red-500 hover:text-red-700 transition-colors flex items-center">
                        <i class="fas fa-trash-alt mr-2"></i> Clear All
                    </button>
                `
                    : ""
                }
            </div>
        `;

    if (favorites.length === 0) {
      html += `
                <div class="text-center py-16">
                    <i class="fas fa-heart text-6xl text-gray-300 mb-4"></i>
                    <h2 class="text-2xl font-semibold text-gray-600 mb-2">No favorites yet</h2>
                    <p class="text-gray-500 mb-6">Start exploring and save your favorite coloring pages here!</p>
                    <a href="#"
                       class="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center">
                        <i class="fas fa-search mr-2"></i> Browse Coloring Pages
                    </a>
                </div>
            `;
    } else {
      html += `
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${favorites
                      .map(fav => {
                        const name = this.itemName(fav.item);
                        const escName = escapeFavHtml(name);
                        const escCategory = escapeFavHtml(fav.category);
                        const escKey = escapeFavHtml(fav.item.key);
                        const escImgUrl = escapeFavHtml(fav.imageUrl || PLACEHOLDER_IMAGE);
                        const escDate = escapeFavHtml(new Date(fav.addedAt).toLocaleDateString());
                        // data-item-full carries the JSON-encoded item payload for the
                        // click handler. We escape the JSON to safely embed it in a
                        // single-quoted attribute. JSON.stringify already escapes
                        // quotes; the .replace handles the single-quote case.
                        const itemJson = escapeFavHtml(
                          JSON.stringify(fav.item).replace(/'/g, "&#39;")
                        );
                        return `
                        <div class="relative group" data-item-full='${itemJson}'>
                            ${this.createFavoriteButton(fav.category, fav.item)}
                            <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                 onclick="window.location.hash = '#item/${escCategory}/${escKey}'">
                                <div class="aspect-square overflow-hidden bg-gray-100">
                                    <img src="${escImgUrl}"
                                         alt="${escName} coloring page"
                                         class="w-full h-full object-cover"
                                         loading="lazy">
                                </div>
                                <div class="p-4">
                                    <h2 class="font-semibold text-gray-800 truncate">${escName}</h2>
                                    <p class="text-sm text-gray-500 capitalize">${escCategory}</p>
                                    <p class="text-xs text-gray-400 mt-1">
                                        Added ${escDate}
                                    </p>
                                </div>
                            </div>
                        </div>
                    `;
                      })
                      .join("")}
                </div>

                <!-- Affiliate Banner for Coloring Books -->
                <div class="mt-12 p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border-2 border-purple-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-bold text-purple-800 mb-2">
                                <i class="fas fa-book mr-2"></i>Love These Pages?
                            </h3>
                            <p class="text-purple-700">Get a physical coloring book with hundreds of pages! Perfect for offline coloring.</p>
                        </div>
                        <a href="https://www.amazon.com/s?k=coloring+books+for+kids&ref=nb_sb_noss"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold px-6 py-3 rounded-lg hover:shadow-lg transition-shadow flex items-center">
                            <i class="fas fa-shopping-cart mr-2"></i> Shop on Amazon
                        </a>
                    </div>
                </div>
            `;
    }

    mainContent.innerHTML = html;

    // Update SEO
    if (window.SEOManager) {
      window.SEOManager.updateMetaTags(
        "My Favorites",
        `You have ${favorites.length} favorite coloring pages saved on ColorVerse.`,
        null,
        `${window.SEOManager.siteUrl}/#favorites`
      );
    }
  }
}

// Create global instance
const favoritesManager = new FavoritesManager();
window.FavoritesManager = favoritesManager;

// Setup event listeners when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  favoritesManager.setupEventListeners();
  favoritesManager.updateUI();
});

export default favoritesManager;
