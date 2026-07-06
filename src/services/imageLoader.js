/**
 * Optimized Image Loader for ColorVerse
 * Features:
 * - Advanced Intersection Observer with rootMargin
 * - Blur-up placeholder technique
 * - Responsive images with srcset
 * - Priority loading for above-the-fold images
 * - Background image lazy loading
 */

class OptimizedImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: "200px", // Start loading 200px before viewport
      threshold: 0.01,
      blurUp: true,
      placeholderColor: "#f0f0f0",
      ...options,
    };

    this.observer = null;
    this.queue = [];
    this.loadingCount = 0;
    this.maxConcurrent = 3; // Max simultaneous image loads
    this.imageCache = new Map();
  }

  /**
   * Initialize the image loader
   */
  init() {
    this.setupIntersectionObserver();
    this.processQueue();
    console.log("[ImageLoader] Initialized with optimized settings");
  }

  /**
   * Setup Intersection Observer with optimized settings
   */
  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold,
    };

    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.queueImage(img);
          this.observer.unobserve(img);
        }
      });
    }, options);
  }

  /**
   * Queue an image for loading
   */
  queueImage(img) {
    // Check cache first
    const src = img.dataset.src || img.src;
    if (this.imageCache.has(src)) {
      this.loadImage(img, src);
      return;
    }

    this.queue.push(img);
    this.processQueue();
  }

  /**
   * Process the loading queue with concurrency control
   */
  processQueue() {
    while (this.loadingCount < this.maxConcurrent && this.queue.length > 0) {
      const img = this.queue.shift();
      this.loadingCount++;
      this.loadImage(img);
    }
  }

  /**
   * Load an image with optimizations
   */
  loadImage(img, cachedSrc = null) {
    const src = cachedSrc || img.dataset.src || img.src;
    const isPriority = img.dataset.priority === "true" || img.dataset.loading === "eager";

    if (!src || src === PLACEHOLDER_IMAGE) {
      this.loadingCount--;
      this.processQueue();
      return;
    }

    // Use cached version if available
    if (this.imageCache.has(src)) {
      img.src = src;
      this.onImageLoad(img);
      return;
    }

    // Create new image for preloading
    const preloadImg = new Image();

    preloadImg.onload = () => {
      this.imageCache.set(src, true);

      // Apply blur-up effect if enabled
      if (this.options.blurUp && !isPriority) {
        this.applyBlurUpTransition(img, src);
      } else {
        img.src = src;
      }

      this.onImageLoad(img);
    };

    preloadImg.onerror = () => {
      this.onImageError(img);
    };

    // Start loading
    preloadImg.src = src;

    // For priority images, set src immediately
    if (isPriority) {
      img.src = src;
    }
  }

  /**
   * Apply blur-up transition effect
   */
  applyBlurUpTransition(img, src) {
    // Create a low-quality placeholder if not exists
    if (!img.dataset.placeholder) {
      img.style.filter = "blur(10px)";
      img.style.transition = "filter 0.3s ease-out";
    }

    // Load full image
    img.src = src;

    // Remove blur once loaded
    img.onload = () => {
      img.style.filter = "blur(0px)";
      setTimeout(() => {
        img.style.filter = "";
        img.style.transition = "";
      }, 300);
    };
  }

  /**
   * Handle successful image load
   */
  onImageLoad(img) {
    img.classList.remove("loading", "lazy-load");
    img.classList.add("loaded");

    // Hide loading indicator
    const container = img.closest(".image-container, [data-image-container]");
    if (container) {
      const loader = container.querySelector(".image-loading-indicator");
      if (loader) {
        loader.style.display = "none";
      }
    }

    // Update loading count and process next
    this.loadingCount--;
    this.processQueue();

    // Dispatch custom event
    img.dispatchEvent(new CustomEvent("imageloaded", { bubbles: true }));
  }

  /**
   * Handle image load error
   */
  onImageError(img) {
    console.warn("[ImageLoader] Failed to load:", img.dataset.src || img.src);
    img.classList.remove("loading");
    img.classList.add("error");

    // Show error state
    const container = img.closest(".image-container, [data-image-container]");
    if (container) {
      const loader = container.querySelector(".image-loading-indicator");
      const error = container.querySelector(".image-error-indicator");
      if (loader) {
        loader.style.display = "none";
      }
      if (error) {
        error.style.display = "flex";
      }
    }

    // Update loading count and process next
    this.loadingCount--;
    this.processQueue();
  }

  /**
   * Observe an image for lazy loading
   */
  observe(img) {
    if (this.observer && img) {
      img.classList.add("loading", "lazy-load");
      this.observer.observe(img);
    }
  }

  /**
   * Observe all images with data-src attribute
   */
  observeAll(container = document) {
    const images = container.querySelectorAll("img[data-src]:not([data-observed])");
    images.forEach(img => {
      img.dataset.observed = "true";
      this.observe(img);
    });
    console.log(`[ImageLoader] Observing ${images.length} images`);
  }

  /**
   * Generate responsive srcset for different screen sizes
   */
  generateSrcset(baseUrl, widths = [400, 800, 1024]) {
    return widths
      .map(width => {
        const url = new URL(baseUrl);
        url.searchParams.set("width", width);
        return `${url.toString()} ${width}w`;
      })
      .join(", ");
  }

  /**
   * Create optimized image HTML
   */
  createOptimizedImage(options) {
    const { src, alt, width, height, priority = false, className = "", sizes = "100vw" } = options;

    const srcset = this.generateSrcset(src);
    const loading = priority ? "eager" : "lazy";
    const decoding = priority ? "sync" : "async";

    return `
            <div class="image-container relative overflow-hidden bg-gray-100" style="aspect-ratio: ${width}/${height}">
                <img 
                    src="${PLACEHOLDER_IMAGE}"
                    data-src="${src}"
                    srcset="${srcset}"
                    sizes="${sizes}"
                    alt="${alt}"
                    width="${width}"
                    height="${height}"
                    loading="${loading}"
                    decoding="${decoding}"
                    data-priority="${priority}"
                    class="w-full h-full object-cover transition-opacity duration-300 ${className}"
                    style="background-color: ${this.options.placeholderColor}"
                />
                <div class="image-loading-indicator absolute inset-0 flex items-center justify-center">
                    <div class="spinner"></div>
                </div>
                <div class="image-error-indicator absolute inset-0 flex items-center justify-center hidden bg-red-50 text-red-500">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <span>Failed to load</span>
                </div>
            </div>
        `;
  }

  /**
   * Preload critical images
   */
  preloadCritical(images) {
    images.forEach(src => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      document.head.appendChild(link);
    });
  }

  /**
   * Load background image lazily
   */
  lazyLoadBackground(element, imageUrl) {
    if (this.imageCache.has(imageUrl)) {
      element.style.backgroundImage = `url(${imageUrl})`;
      return;
    }

    const img = new Image();
    img.onload = () => {
      this.imageCache.set(imageUrl, true);
      element.style.backgroundImage = `url(${imageUrl})`;
      element.classList.add("bg-loaded");
    };
    img.src = imageUrl;
  }

  /**
   * Cancel loading of all pending images
   */
  cancelAll() {
    this.queue = [];
    this.loadingCount = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedImages: this.imageCache.size,
      queueLength: this.queue.length,
      loadingCount: this.loadingCount,
    };
  }

  /**
   * Clear image cache
   */
  clearCache() {
    this.imageCache.clear();
    console.log("[ImageLoader] Cache cleared");
  }

  /**
   * Destroy the loader
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.cancelAll();
    this.clearCache();
  }
}

// Create global instance
const imageLoader = new OptimizedImageLoader();
window.ImageLoader = imageLoader;
window.OptimizedImageLoader = OptimizedImageLoader;

// Auto-initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => imageLoader.init());
} else {
  imageLoader.init();
}

export default imageLoader;
