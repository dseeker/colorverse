/**
 * Search Manager for ColorVerse
 * Allows parents to quickly find coloring pages by category, name, or theme
 */

const PLACEHOLDER_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

class SearchManager {
  constructor() {
    this.searchIndex = [];
    this.searchInput = null;
    this.searchBtn = null;
    this.lastQuery = "";
  }

  /**
   * Initialize search with categories data
   */
  initialize(categories) {
    this.buildSearchIndex(categories);
    this.setupEventListeners();
  }

  /**
   * Build search index from categories
   */
  buildSearchIndex(categories) {
    this.searchIndex = [];

    try {
      Object.entries(categories).forEach(([categoryKey, category]) => {
        if (!category || !category.items) {
          console.warn(`[SearchManager] Category ${categoryKey} has no items`);
          return;
        }

        // Handle both array and object formats for items
        let items;
        if (Array.isArray(category.items)) {
          items = category.items;
        } else if (typeof category.items === "object") {
          items = Object.entries(category.items).map(([key, item]) => ({
            ...item,
            key,
            title: item.title || item.name || key,
          }));
        } else {
          console.warn(`[SearchManager] Category ${categoryKey} has invalid items format`);
          return;
        }

        items.forEach(item => {
          if (!item) {
            return;
          }

          this.searchIndex.push({
            id: `${categoryKey}-${item.key || Math.random()}`,
            category: categoryKey,
            categoryName: category.title || category.name || categoryKey,
            item: item,
            searchTerms: [
              (item.title || item.name || "").toLowerCase(),
              categoryKey.toLowerCase(),
              (category.title || category.name || "").toLowerCase(),
              ...(item.tags || []),
              ...(item.keywords || []),
            ].join(" "),
          });
        });
      });

      console.log(`[SearchManager] Indexed ${this.searchIndex.length} coloring pages`);
    } catch (error) {
      console.error("[SearchManager] Error building search index:", error);
    }
  }

  /**
   * Setup search event listeners
   */
  setupEventListeners() {
    this.searchInput = document.getElementById("search-input");
    this.searchBtn = document.getElementById("search-btn");

    if (this.searchInput) {
      // Search on Enter key
      this.searchInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          this.performSearch(this.searchInput.value);
        }
      });

      // Real-time search with debounce
      let debounceTimer;
      this.searchInput.addEventListener("input", e => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (e.target.value.length >= 2) {
            this.performSearch(e.target.value);
          } else if (e.target.value.length === 0) {
            this.clearSearch();
          }
        }, 300);
      });
    }

    if (this.searchBtn) {
      this.searchBtn.addEventListener("click", () => {
        if (this.searchInput) {
          this.performSearch(this.searchInput.value);
        }
      });
    }
  }

  /**
   * Perform search
   */
  performSearch(query) {
    if (!query || query.trim().length < 2) {
      this.showToast("Please enter at least 2 characters", "warning");
      return;
    }

    this.lastQuery = query.trim().toLowerCase();
    const results = this.search(this.lastQuery);

    if (results.length === 0) {
      this.showNoResults(this.lastQuery);
    } else {
      this.displayResults(results, this.lastQuery);
    }

    // Update URL for SEO
    this.updateUrl(this.lastQuery);
  }

  /**
   * Search the index
   */
  search(query) {
    const terms = query.toLowerCase().split(/\s+/);

    return this.searchIndex
      .filter(item => {
        const searchTerms = item.searchTerms;
        // Match all search terms (AND logic)
        return terms.every(term => searchTerms.includes(term));
      })
      .map(item => ({
        ...item,
        relevance: this.calculateRelevance(item, terms),
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 50); // Limit to top 50 results
  }

  /**
   * Calculate search relevance score
   */
  calculateRelevance(item, terms) {
    let score = 0;
    const name = (item.item.title || item.item.name || "").toLowerCase();

    terms.forEach(term => {
      // Exact match in name gets highest score
      if (name === term) {
        score += 100;
      }
      // Name starts with term
      else if (name.startsWith(term)) {
        score += 80;
      }
      // Name contains term
      else if (name.includes(term)) {
        score += 60;
      }
      // Category match
      else if (item.category.toLowerCase().includes(term)) {
        score += 40;
      }
      // Other fields match
      else {
        score += 20;
      }
    });

    return score;
  }

  /**
   * Display search results
   */
  displayResults(results, query) {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) {
      return;
    }

    const resultsHtml = results
      .map(
        result => `
            <div class="relative group" data-item-full='${JSON.stringify(result.item).replace(/'/g, "&#39;")}'>
                ${window.FavoritesManager ? window.FavoritesManager.createFavoriteButton(result.category, result.item) : ""}
                <div class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer category-card"
                     onclick="window.showItemDetail('${result.category}', '${result.item.key}')">
                    <div class="aspect-square overflow-hidden bg-gray-100 relative">
                        <img src="${PLACEHOLDER_IMAGE}" 
                             data-src="${window.getImageUrl ? window.getImageUrl(result.item.prompt || result.item.title || result.item.name, { width: 400, height: 400, seed: result.item.key ? window.stringToHash(result.item.key) : Math.floor(Math.random() * 100000) }) : ""}" 
                             alt="${result.item.title || result.item.name} coloring page - Free printable ${result.category} coloring sheet for kids" 
                             class="w-full h-full object-cover lazy-load"
                             loading="lazy"
                             data-prompt="${result.item.prompt || result.item.title || result.item.name}"
                             data-width="400"
                             data-height="400"
                             data-seed="${result.item.key ? window.stringToHash(result.item.key) : Math.floor(Math.random() * 100000)}">
                        <div class="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded capitalize">
                            ${result.categoryName}
                        </div>
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-gray-800">${this.highlightMatch(result.item.title || result.item.name, query)}</h3>
                        <p class="text-sm text-gray-500 mt-1">${result.item.description || "Click to view and print this free coloring page!"}</p>
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    mainContent.innerHTML = `
            <nav aria-label="breadcrumb" class="flex items-center mb-6 text-sm text-gray-600">
                <a href="#" class="hover:text-primary-600 transition-colors flex items-center" onclick="window.showHomepage(); return false;">
                    <i class="fas fa-home mr-1"></i> Home
                </a>
                <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                <span class="font-medium text-gray-800">Search Results</span>
            </nav>
            
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold">
                    Search Results for "${query}"
                </h1>
                <span class="text-gray-600">${results.length} coloring pages found</span>
            </div>
            
            <!-- Search refinement -->
            <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-blue-800">
                    <i class="fas fa-lightbulb mr-2"></i>
                    <strong>Parent Tip:</strong> Click on any coloring page to view, download, or print it! Add pages to your favorites to save them for later.
                </p>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                ${resultsHtml}
            </div>
            
            ${
              results.length >= 50
                ? `
                <div class="text-center mt-8">
                    <p class="text-gray-500">Showing top 50 results. Try a more specific search term for better results.</p>
                </div>
            `
                : ""
            }
            
            <!-- Affiliate Section -->
            <div class="mt-12 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-bold text-orange-800 mb-2">
                            <i class="fas fa-book-open mr-2"></i>Looking for More Coloring Fun?
                        </h3>
                        <p class="text-orange-700">Check out these popular coloring books on Amazon - perfect for when you need offline activities!</p>
                    </div>
                    <a href="https://www.amazon.com/s?k=coloring+books+for+kids&ref=nb_sb_noss" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold px-6 py-3 rounded-lg hover:shadow-lg transition-shadow flex items-center whitespace-nowrap">
                        <i class="fas fa-external-link-alt mr-2"></i> Browse Coloring Books
                    </a>
                </div>
            </div>
        `;

    // Trigger lazy loading
    if (window.imageObserver) {
      document.querySelectorAll("img.lazy-load").forEach(img => {
        window.imageObserver.observe(img);
      });
    }

    // Update SEO
    if (window.SEOManager) {
      window.SEOManager.updateMetaTags(
        `Search: ${query}`,
        `Found ${results.length} free coloring pages matching "${query}". Download and print high-quality coloring sheets for kids.`,
        null,
        `${window.SEOManager.siteUrl}/#search?q=${encodeURIComponent(query)}`
      );

      // Add structured data for search results
      const searchSchema = {
        "@context": "https://schema.org",
        "@type": "SearchResultsPage",
        name: `Search results for ${query}`,
        about: query,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: results.slice(0, 10).map((result, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "ImageObject",
              name: result.item.title || result.item.name,
              url: `${window.SEOManager.siteUrl}/#item/${result.category}/${result.item.key}`,
            },
          })),
        },
      };
      window.SEOManager.injectStructuredData(searchSchema);
    }
  }

  /**
   * Highlight matching terms in text
   */
  highlightMatch(text, query) {
    const terms = query.toLowerCase().split(/\s+/);
    let highlighted = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, "gi");
      highlighted = highlighted.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    });

    return highlighted;
  }

  /**
   * Show no results message
   */
  showNoResults(query) {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) {
      return;
    }

    mainContent.innerHTML = `
            <nav aria-label="breadcrumb" class="flex items-center mb-6 text-sm text-gray-600">
                <a href="#" class="hover:text-primary-600 transition-colors flex items-center" onclick="window.showHomepage(); return false;">
                    <i class="fas fa-home mr-1"></i> Home
                </a>
                <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                <span class="font-medium text-gray-800">Search Results</span>
            </nav>
            
            <div class="text-center py-16">
                <i class="fas fa-search text-6xl text-gray-300 mb-4"></i>
                <h2 class="text-2xl font-semibold text-gray-600 mb-2">No results found</h2>
                <p class="text-gray-500 mb-6">We couldn't find any coloring pages matching "${query}"</p>
                
                <div class="max-w-2xl mx-auto mb-8">
                    <h3 class="font-semibold mb-3">Try searching for:</h3>
                    <div class="flex flex-wrap justify-center gap-2">
                        ${[
                          "animals",
                          "fantasy",
                          "mandalas",
                          "nature",
                          "space",
                          "dinosaurs",
                          "flowers",
                        ]
                          .map(
                            term => `
                            <button onclick="window.SearchManager.performSearch('${term}')" 
                                    class="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-full transition-colors">
                                ${term}
                            </button>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                
                <a href="#" class="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center" 
                   onclick="window.showHomepage(); return false;">
                    <i class="fas fa-th-large mr-2"></i> Browse All Categories
                </a>
            </div>
        `;

    // Update SEO
    if (window.SEOManager) {
      window.SEOManager.updateMetaTags(
        `Search: ${query}`,
        `No coloring pages found for "${query}". Browse our collection of free printable coloring pages for kids.`,
        null,
        `${window.SEOManager.siteUrl}/#search?q=${encodeURIComponent(query)}`
      );
    }
  }

  /**
   * Clear search and return to homepage
   */
  clearSearch() {
    if (this.searchInput) {
      this.searchInput.value = "";
    }
    this.lastQuery = "";

    // Remove search param from URL
    if (window.location.hash.includes("search")) {
      window.location.hash = "";
    }
  }

  /**
   * Update URL with search query
   */
  updateUrl(query) {
    const newHash = `#search?q=${encodeURIComponent(query)}`;
    if (window.location.hash !== newHash) {
      window.history.pushState({ search: query }, "", newHash);
    }
  }

  /**
   * Handle browser back/forward for search
   */
  handlePopState(event) {
    if (event.state && event.state.search) {
      this.performSearch(event.state.search);
    } else {
      this.clearSearch();
    }
  }

  /**
   * Check URL for search params on page load
   */
  checkUrlForSearch() {
    const hash = window.location.hash;
    const match = hash.match(/#search\?q=([^&]+)/);
    if (match) {
      const query = decodeURIComponent(match[1]);
      if (this.searchInput) {
        this.searchInput.value = query;
      }
      this.performSearch(query);
      return true;
    }
    return false;
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
}

// Create global instance
const searchManager = new SearchManager();
window.SearchManager = searchManager;

// Handle browser navigation
window.addEventListener("popstate", e => {
  searchManager.handlePopState(e);
});

export default searchManager;
