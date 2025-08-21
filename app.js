/**
 * ColorVerse - Free AI-Generated Coloring Pages
 * Main application script
 */

// --- Constants & Configuration ---
const API_BASE_URL = "https://image.pollinations.ai/prompt/";
const DEFAULT_IMAGE_PARAMS = {
    width: 1024,
    height: 1024,
    seed: () => Math.floor(Math.random() * 100000), // Random seed per image
    nologo: true
    // Removed model parameter to let API choose default
};
// Dynamic referrer based on domain name
function getDynamicReferrer() {
    // Always use dseeker.github.io
    return 'dseeker.github.io';
}

const REFERRER_ID = getDynamicReferrer(); // Dynamic referrer for API usage tracking
const PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Coloring book styles configuration
const COLORING_STYLES = {
    '': {
        name: 'Classic Style',
        prompt: '',
        description: 'Traditional simple coloring book style'
    },
    'bold-simple': {
        name: 'Bold & Simple',
        prompt: 'EXTREMELY BOLD AND THICK black lines, MASSIVE stroke width, ultra-simple shapes, MINIMAL detail, chunky outlines, beginner-friendly thick borders, BOLD BOLD BOLD line art style',
        description: 'Thick, clean outlines perfect for beginners'
    },
    'intricate': {
        name: 'Intricate & Detailed',
        prompt: 'ULTRA INTRICATE and EXTREMELY detailed line art, FINE hairline strokes, elaborate ornate patterns, MAXIMUM complexity, incredibly dense detail work, sophisticated fine line patterns, complex decorative elements',
        description: 'Complex detailed patterns for advanced colorists'
    },
    'geometric': {
        name: 'Geometric',
        prompt: 'PERFECT GEOMETRIC precision, MATHEMATICAL symmetry, precise angular shapes, triangular tessellations, hexagonal grids, CRYSTALLINE structures, architectural precision, STRICT geometric forms, symmetrical mandala patterns',
        description: 'Perfectly symmetrical geometric shapes and mathematical patterns'
    },
    'doodle': {
        name: 'Doodle & Sketch',
        prompt: 'HAND-DRAWN sketchy style, ROUGH pencil strokes, messy crosshatching, spontaneous scribbled lines, artistic sketch marks, LOOSE drawing style, imperfect hand-drawn lines, sketchy doodle texture',
        description: 'Spontaneous, hand-drawn artistic expression with pencil sketch lines'
    },
    'whimsical': {
        name: 'Whimsical & Playful',
        prompt: 'WHIMSICAL fairy-tale style, PLAYFUL magical elements, charming storybook illustrations, fantasy flourishes, lighthearted enchanted design, magical creature aesthetics, storybook charm',
        description: 'Charming, imaginative designs with fantasy elements'
    },
    'vintage': {
        name: 'Vintage & Retro',
        prompt: 'VINTAGE art nouveau style, RETRO classic illustration, historical decorative elements, antique design aesthetic, classic vintage typography style, old-fashioned ornate details',
        description: 'Nostalgic designs inspired by past eras'
    },
    'fantasy': {
        name: 'Fantasy & Surreal',
        prompt: 'FANTASY epic art style, SURREAL mythical elements, magical creatures and landscapes, otherworldly dreamlike scenes, enchanted fantasy realms, mystical ethereal design',
        description: 'Imaginative scenes with mythical and magical elements'
    },
    'children_friendly': {
        name: 'Children Friendly',
        prompt: 'EXTRA THICK outlines for children, SUPER BOLD lines, HUGE stroke width, basic simple shapes, MASSIVE line thickness, chunky cartoon style, toddler-friendly thick borders, GIANT outline style',
        description: 'Extra simple drawings with thick lines, perfect for young children'
    },
    'futuristic': {
        name: 'Futuristic & Sci-Fi',
        prompt: 'FUTURISTIC sci-fi aesthetic, sleek technological lines, CYBERPUNK neon-style outlines, space-age design, robotic angular features, HIGH-TECH geometric patterns, digital circuit aesthetics, cyber-enhanced line art',
        description: 'Cutting-edge futuristic designs with sci-fi and tech elements'
    },
    'minimalist': {
        name: 'Minimalist & One-Line',
        prompt: 'ULTRA MINIMALIST design, SINGLE continuous line art, bare essential strokes only, ONE-LINE drawing style, elegant simplicity, pure minimal form, continuous unbroken lines, clean minimal aesthetic',
        description: 'Modern elegant style with minimal lines'
    },
    'architectural': {
        name: 'Technical',
        prompt: 'TECHNICAL blueprint style, PRECISE engineering lines, mechanical diagram aesthetic, ARCHITECTURAL drawing style, technical schematic look, engineering blueprint precision, structured technical rendering',
        description: 'Precise, structured technical drawings and mechanical diagrams'
    },
    'organic': {
        name: 'Organic & Nature',
        prompt: 'ORGANIC natural flowing lines, BOTANICAL detailed textures, leaf vein patterns, wood grain aesthetics, natural form structures, flowing nature-inspired curves, organic botanical art style',
        description: 'Natural forms and textures inspired by nature'
    },
    'zentangle': {
        name: 'Zentangle Style', 
        prompt: 'ZENTANGLE meditation art, REPETITIVE intricate patterns, detailed zen doodles, STRUCTURED tangle designs, meditative pattern work, COMPLEX repetitive motifs, zen-inspired line patterns',
        description: 'Detailed repetitive patterns for meditative coloring'
    },
    'kawaii': {
        name: 'Kawaii & Cute',
        prompt: 'KAWAII ultra-cute style, ADORABLE character design, big round eyes, soft bubbly shapes, CHIBI cartoon style, super cute Japanese aesthetic, endearing kawaii features',
        description: 'Adorable Japanese-inspired cute character style'
    },
    'mosaic': {
        name: 'Mosaic Style',
        prompt: 'MOSAIC tile pattern, TESSELLATED geometric segments, stained glass divisions, TILED mosaic art style, segmented geometric patterns, mosaic tile aesthetic',
        description: 'Artistic mosaic patterns with tile-like segments'
    },
    'painted_preview': {
        name: 'Painted Preview',
        prompt: 'PROFESSIONAL WATERCOLOR painting style, artistic coloring book illustration FULLY COLORED with gentle shading and shadows, soft painterly textures, harmonious color palette, skilled colorist technique, traditional art medium appearance, watercolor paper texture, artistic brush strokes, NOT line art but PAINTED ARTWORK',
        description: 'See how it would look when professionally colored with watercolors'
    }
};

// Global state for current coloring style
let currentColoringStyle = '';

// Theme and seasonal content configuration
const THEMES = {
    light: {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        cardBg: 'bg-white',
        accentGradient: 'from-cyan-500 to-blue-500'
    },
    dark: {
        bgColor: 'bg-gray-900',
        textColor: 'text-gray-100',
        cardBg: 'bg-gray-800',
        accentGradient: 'from-blue-800 to-purple-800'
    },
    colorful: {
        bgColor: 'bg-gradient-to-br from-blue-50 to-pink-50',
        textColor: 'text-gray-800',
        cardBg: 'bg-white',
        accentGradient: 'from-pink-500 via-purple-500 to-indigo-500'
    }
};

// Get current season for seasonal content
const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
};

// Seasonal themes and prompts
const SEASONAL_THEMES = {
    spring: {
        name: 'Spring Awakening',
        description: 'Celebrate the renewal of spring with these fresh and vibrant coloring pages.',
        prompt: 'spring blooms, fresh, floral, renewal, nature awakening',
        gradient: 'from-green-400 to-emerald-600',
        icon: 'fas fa-seedling'
    },
    summer: {
        name: 'Summer Fun',
        description: 'Dive into summer adventures with these bright and sunny coloring pages.',
        prompt: 'summer fun, beach, sunshine, vacation, tropical',
        gradient: 'from-yellow-400 to-orange-500',
        icon: 'fas fa-sun'
    },
    autumn: {
        name: 'Autumn Colors',
        description: 'Embrace the cozy atmosphere of autumn with these seasonal coloring pages.',
        prompt: 'autumn leaves, harvest, cozy, fall colors, thanksgiving',
        gradient: 'from-amber-500 to-red-600',
        icon: 'fas fa-leaf'
    },
    winter: {
        name: 'Winter Wonders',
        description: 'Explore the magic of winter with these festive and snowy coloring pages.',
        prompt: 'winter scene, snow, holidays, cozy, festive',
        gradient: 'from-blue-400 to-indigo-600',
        icon: 'fas fa-snowflake'
    }
};

// Category icons mapping
const CATEGORY_ICONS = {
    animals: 'fas fa-paw',
    fantasy: 'fas fa-dragon',
    mandalas: 'fas fa-dharmachakra',
    vehicles: 'fas fa-car',
    nature: 'fas fa-leaf',
    food: 'fas fa-utensils',
    space: 'fas fa-rocket',
    abstract: 'fas fa-paint-brush',
    flowers: 'fas fa-spa',
    ocean: 'fas fa-water',
    dinosaurs: 'fas fa-bone',
    mythical: 'fas fa-hat-wizard',
    birds: 'fas fa-feather-alt',
    insects: 'fas fa-bug',
    architecture: 'fas fa-landmark',
    sports: 'fas fa-basketball-ball',
    seasonal: 'fas fa-calendar-alt',
    patterns: 'fas fa-shapes',
    science: 'fas fa-atom',
    music: 'fas fa-music',
    memes: 'fas fa-laugh-squint',
    adult_zen: 'fas fa-wine-glass',
    spicy_bold: 'fas fa-skull',
    children_characters: 'fas fa-child',
    vintage_retro: 'fas fa-record-vinyl',
    gaming_tech: 'fas fa-gamepad',
    holidays: 'fas fa-gift',
    music_dance: 'fas fa-guitar',
    steampunk: 'fas fa-cog',
    tribal_ethnic: 'fas fa-mask'
};

// --- Style Management Functions ---
function changeColoringStyle(newStyle) {
    console.log(`[changeColoringStyle] Called with newStyle: "${newStyle}"`);
    console.log(`[changeColoringStyle] Current currentColoringStyle: "${currentColoringStyle}"`);
    console.log(`[changeColoringStyle] COLORING_STYLES["${newStyle}"]:`, COLORING_STYLES[newStyle]);
    
    // Cancel all pending image downloads and reset queue
    if (window.imageLoadQueue) {
        const canceledCount = window.imageLoadQueue.cancelAll();
        console.log(`[changeColoringStyle] Canceled ${canceledCount} pending image downloads`);
        showToast(`Canceled ${canceledCount} pending downloads`, 'info', 1500);
    }
    
    // Update current style
    currentColoringStyle = newStyle;
    console.log(`[changeColoringStyle] Updated currentColoringStyle to: "${currentColoringStyle}"`);
    console.log(`[changeColoringStyle] Verifying style config exists:`, COLORING_STYLES[currentColoringStyle]);
    
    // Clear image URL cache since style affects all URLs
    imageUrlCache.clear();
    
    // Show toast notification about style change
    const styleName = COLORING_STYLES[newStyle]?.name || 'Classic Style';
    showToast(`Switched to ${styleName}`, 'success', 2000);
    
    // Reload all images on the page with new style
    reloadAllImages();
}

function reloadAllImages() {
    // Find all images with data-src (lazy loaded images)
    const lazyImages = document.querySelectorAll('img[data-src]');
    console.log(`Found ${lazyImages.length} lazy images to reset`);
    lazyImages.forEach(img => {
        // Get the original prompt from the image's dataset
        const prompt = img.dataset.prompt;
        if (prompt) {
            // Generate new URL with current style
            const newDataSrc = getImageUrl(prompt, {
                width: img.dataset.width || 400,
                height: img.dataset.height || 400,
                seed: img.dataset.seed
            });
            
            console.log(`Updating lazy image data-src from old style to new style`);
            console.log(`New data-src: ${newDataSrc.substring(0, 200)}...`);
            
            // Update the data-src attribute with the new URL
            img.setAttribute('data-src', newDataSrc);
        }
        
        // Reset image state
        img.classList.add('loading');
        img.classList.remove('error');
        
        // Show loading indicator if it exists
        const loadingIndicator = img.parentElement.querySelector('.image-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
        
        // Hide error indicator if it exists
        const errorIndicator = img.parentElement.querySelector('.image-error-indicator');
        if (errorIndicator) {
            errorIndicator.style.display = 'none';
        }
        
        // Trigger reload by re-observing the image
        if (window.imageObserver) {
            window.imageObserver.unobserve(img);
            window.imageObserver.observe(img);
        }
    });
    
    // Find all images that are already loaded (have src but no data-src)
    const loadedImages = document.querySelectorAll('img[src]:not([data-src])');
    console.log(`Found ${loadedImages.length} loaded images to reload`);
    
    // Process loaded images with a small delay to prevent burst loading
    loadedImages.forEach((img, index) => {
        setTimeout(() => {
            // Get the original prompt from the image's dataset if available
            const prompt = img.dataset.prompt;
            if (prompt) {
                console.log(`Reloading image with prompt: "${prompt}"`);
                // Generate new URL with current style
                const newSrc = getImageUrl(prompt, {
                    width: img.dataset.width || 400,
                    height: img.dataset.height || 400,
                    seed: img.dataset.seed
                });
                
                console.log(`New image URL: ${newSrc}`);
                
                // Show loading state
                img.classList.add('loading');
                img.classList.remove('error');
                
                // Set up loading handler to add hover preview when image loads
                const onLoad = () => {
                    setupImageHoverPreview(img);
                    img.removeEventListener('load', onLoad);
                };
                img.addEventListener('load', onLoad);
                
                // Update src to trigger reload
                img.src = newSrc;
            } else {
                console.log('Image missing data-prompt attribute');
            }
        }, index * 100); // 100ms delay between each image reload
    });
    
    console.log(`Reloading ${lazyImages.length + loadedImages.length} images with new style`);
}

// --- Toast Notification System ---
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col items-end space-y-2';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `transform transition-all duration-300 ease-out opacity-0 translate-y-2 max-w-xs`;
    
    // Add appropriate styles based on type
    let bgColor, iconClass;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            iconClass = 'fa-check-circle';
            break;
        case 'error':
            bgColor = 'bg-red-500';
            iconClass = 'fa-exclamation-circle';
            break;
        case 'warning':
            bgColor = 'bg-yellow-500';
            iconClass = 'fa-exclamation-triangle';
            break;
        default: // info
            bgColor = 'bg-blue-500';
            iconClass = 'fa-info-circle';
            break;
    }
    
    toast.innerHTML = `
        <div class="${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center">
            <i class="fas ${iconClass} mr-2"></i>
            <p>${message}</p>
        </div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Trigger enter animation
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-2');
        
        // Remove from DOM after exit animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// --- Staggered Loading Queue ---
class ImageLoadQueue {
    constructor(delayBetweenLoads = 300) {
        this.queue = [];
        this.isProcessing = false;
        this.delayBetweenLoads = delayBetweenLoads;
        this.currentAbortController = null; // For canceling current request
        this.shouldCancel = false; // Flag to stop processing
    }
    
    add(imageElement, src) {
        this.queue.push({ imageElement, src });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    // Cancel all pending requests and clear the queue
    cancelAll() {
        console.log(`Canceling ${this.queue.length} pending image requests`);
        
        // Set cancellation flag
        this.shouldCancel = true;
        
        // Cancel current request if one is in progress
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
        
        // Clear the queue
        const canceledCount = this.queue.length;
        this.queue = [];
        this.isProcessing = false;
        this.shouldCancel = false;
        
        console.log(`Canceled ${canceledCount} pending image requests and cleared queue`);
        return canceledCount;
    }
    
    // Reset and restart with new queue
    resetAndRestart() {
        this.cancelAll();
        this.isProcessing = false;
        this.shouldCancel = false;
        console.log('Queue reset and ready for new requests');
    }
    
    async processQueue() {
        if (this.queue.length === 0 || this.shouldCancel) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        const { imageElement, src } = this.queue.shift();
        
        // Check if we should cancel before processing
        if (this.shouldCancel) {
            this.isProcessing = false;
            return;
        }
        
        try {
            // Ensure the image element is still in the DOM
            if (!document.contains(imageElement)) {
                console.warn('Image element no longer in DOM, skipping:', src);
                // Continue with the next item
                await new Promise(resolve => setTimeout(resolve, this.delayBetweenLoads));
                this.processQueue();
                return;
            }
            
            // Create abort controller for this request
            this.currentAbortController = new AbortController();
            
            // Use the enhanced loading function with retry mechanism and abort controller
            const success = await loadImageWithRetry(imageElement, src, 3, this.currentAbortController);
            
            // Clear abort controller after successful completion
            this.currentAbortController = null;
            
            if (!success && !this.shouldCancel) {
                console.error(`Failed to load image after retries: ${src}`);
            }
        } catch (error) {
            this.currentAbortController = null;
            
            // Don't log errors if we're canceling
            if (error.name === 'AbortError' || this.shouldCancel) {
                console.log('Image request canceled:', src);
                this.isProcessing = false;
                return;
            }
            
            console.error(`Unexpected error loading image: ${src}`, error);
            
            // Ensure error state is properly set
            if (imageElement) {
                imageElement.classList.remove('loading');
                imageElement.classList.add('error');
                
                // Hide loading indicator
                const loadingIndicator = imageElement.parentNode?.querySelector('.image-loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                // Add error indication if not already present
                const wrapper = imageElement.parentNode;
                if (wrapper && !wrapper.querySelector('.image-error-indicator')) {
                    wrapper.classList.add('relative');
                    const errorIndicator = document.createElement('div');
                    errorIndicator.className = 'image-error-indicator absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50';
                    errorIndicator.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>';
                    wrapper.appendChild(errorIndicator);
                }
            }
        } finally {
            // Don't continue if we're canceling
            if (this.shouldCancel) {
                this.isProcessing = false;
                return;
            }
            
            // Delay before next image regardless of success or failure
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenLoads));
            
            // Continue with the next item
            this.processQueue();
        }
    }
}

// Create an instance of the queue
const imageLoadQueue = new ImageLoadQueue(500); // Increased to 500ms between loads for rate limiting
// Make queue globally accessible for cancellation
window.imageLoadQueue = imageLoadQueue;

// --- Image Preview System ---
function createImagePreview() {
    // Create preview overlay if it doesn't exist
    let previewOverlay = document.getElementById('image-preview-overlay');
    if (!previewOverlay) {
        previewOverlay = document.createElement('div');
        previewOverlay.id = 'image-preview-overlay';
        previewOverlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 opacity-0 pointer-events-none transition-opacity duration-300';
        previewOverlay.style.pointerEvents = 'none'; // Ensure the overlay is completely non-interactive
        previewOverlay.innerHTML = `
            <div class="relative w-[80vw] h-[80vh] flex items-center justify-center" style="pointer-events: none;">
                <img id="preview-image" src="" alt="Preview" class="w-full h-full object-contain rounded-lg shadow-2xl" style="pointer-events: none;">
                <div id="preview-loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg" style="pointer-events: none;">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        document.body.appendChild(previewOverlay);
        
        // Remove click event listener since we want it completely non-interactive
        // The overlay will only be hidden when the original thumbnail loses hover
        
        // Close preview when pressing escape (still useful for accessibility)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !previewOverlay.classList.contains('opacity-0')) {
                hideImagePreview();
            }
        });
        
        // Hide preview immediately on any click
        document.addEventListener('click', () => {
            if (!previewOverlay.classList.contains('opacity-0')) {
                hideImagePreview();
            }
        });
    }
    return previewOverlay;
}

function showImagePreview(imageSrc, imageAlt = 'Preview') {
    const overlay = createImagePreview();
    const previewImage = document.getElementById('preview-image');
    const loadingIndicator = document.getElementById('preview-loading');
    
    // Reset state
    previewImage.src = '';
    loadingIndicator.style.display = 'flex';
    
    // Show overlay but keep it non-interactive
    overlay.classList.remove('opacity-0');
    overlay.classList.add('opacity-100');
    // Keep pointer-events: none to ensure it doesn't interfere with hover detection
    overlay.style.pointerEvents = 'none';
    
    // Load the image
    const img = new Image();
    img.onload = () => {
        previewImage.src = imageSrc;
        previewImage.alt = imageAlt;
        loadingIndicator.style.display = 'none';
    };
    img.onerror = () => {
        hideImagePreview();
        console.error('Failed to load preview image:', imageSrc);
    };
    img.src = imageSrc;
}

function hideImagePreview() {
    const overlay = document.getElementById('image-preview-overlay');
    if (overlay) {
        overlay.classList.add('opacity-0');
        overlay.classList.remove('opacity-100');
        // Keep it non-interactive even when hidden
        overlay.style.pointerEvents = 'none';
    }
}

// Global variables to manage hover delays
let isPreviewVisible = false;

function setupImageHoverPreview(imageElement) {
    if (!imageElement || imageElement.hasAttribute('data-hover-setup')) return;
    
    let imageSrc = imageElement.getAttribute('data-src') || imageElement.src;
    let imageAlt = imageElement.alt || 'Preview';
    
    // Mark as setup to avoid duplicate listeners
    imageElement.setAttribute('data-hover-setup', 'true');
    
    // Store hover state for this specific element
    let isHovering = false;
    let elementTimeout = null;
    
    // Add hover event listeners
    imageElement.addEventListener('mouseenter', () => {
        isHovering = true;
        
        // Clear any existing timeout
        if (elementTimeout) {
            clearTimeout(elementTimeout);
        }
        
        // Set a delay before showing preview to avoid accidental triggers
        elementTimeout = setTimeout(() => {
            // Only show if still hovering
            if (isHovering) {
                // Get the current src in case it changed after initial setup
                const currentSrc = imageElement.getAttribute('data-src') || imageElement.src;
                
                // Check if image is properly loaded and not in error state
                const isImageLoaded = imageElement.complete && imageElement.naturalWidth > 0;
                const hasErrorClass = imageElement.classList.contains('error');
                const hasLoadingClass = imageElement.classList.contains('loading');
                const isPlaceholderImage = currentSrc === PLACEHOLDER_IMAGE;
                
                // Also check if parent container has error indicator
                const parentContainer = imageElement.parentNode;
                const hasErrorIndicator = parentContainer && parentContainer.querySelector('.image-error-indicator');
                
                // Only show preview if image is loaded successfully and not in error/loading state
                if (currentSrc && 
                    !isPlaceholderImage && 
                    !hasErrorClass && 
                    !hasLoadingClass && 
                    !hasErrorIndicator &&
                    isImageLoaded) {
                    showImagePreview(currentSrc, imageAlt);
                    isPreviewVisible = true;
                }
            }
        }, 500); // 500ms delay
    });
    
    imageElement.addEventListener('mouseleave', () => {
        isHovering = false;
        
        // Clear the timeout if mouse leaves before delay completes
        if (elementTimeout) {
            clearTimeout(elementTimeout);
            elementTimeout = null;
        }
        
        // Hide preview if it's currently visible
        if (isPreviewVisible) {
            hideImagePreview();
            isPreviewVisible = false;
        }
    });
    
    // Also setup for the parent container to make the hover area larger
    const parentCard = imageElement.closest('.category-card');
    if (parentCard) {
        parentCard.addEventListener('mouseleave', () => {
            isHovering = false;
            
            if (elementTimeout) {
                clearTimeout(elementTimeout);
                elementTimeout = null;
            }
            if (isPreviewVisible) {
                hideImagePreview();
                isPreviewVisible = false;
            }
        });
    }
}

// --- Lazy Loading Setup ---
function setupLazyLoading() {
    // Clear any existing observers to prevent duplicates
    if (window.imageObserver) {
        window.imageObserver.disconnect();
    }
    
    if (!('IntersectionObserver' in window)) {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('img[data-src]').forEach(img => {
            // Ensure the image hasn't already been loaded
            if (img.src !== img.getAttribute('data-src')) {
                img.src = img.getAttribute('data-src');
            }
        });
        return;
    }
    
    // First look for any stuck loading indicators and ensure they're visible
    document.querySelectorAll('.image-loading-indicator').forEach(indicator => {
        // Only show indicators for images that haven't loaded yet
        const img = indicator.parentNode?.querySelector('img');
        if (img && !img.complete) {
            indicator.style.display = 'flex'; // Ensure loading indicators are visible
        }
    });
    
    // Create the IntersectionObserver to watch for images entering the viewport
    window.imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const lazyImage = entry.target;
                const src = lazyImage.getAttribute('data-src');
                
                if (src) {
                    console.log("Image intersecting viewport, loading:", src);
                    // Add to the staggered loading queue
                    imageLoadQueue.add(lazyImage, src);
                    
                    // Stop observing the image
                    observer.unobserve(lazyImage);
                }
            }
        });
    }, {
        root: null, // viewport
        rootMargin: '50px', // Load images when they're 50px from viewport
        threshold: 0.1 // 10% of the item visible
    });
    
    // Observe all images with data-src that haven't been loaded yet
    document.querySelectorAll('img[data-src]').forEach(img => {
        // Skip if already loaded
        if (img.src === img.getAttribute('data-src') && img.complete) {
            // Hide loading indicator if it exists
            const loadingIndicator = img.parentNode?.querySelector('.image-loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            // Setup hover preview for already loaded images
            setupImageHoverPreview(img);
            return;
        }
        
        // Add loading indicator if not already present
        const wrapper = img.parentNode;
        if (wrapper) {
            let loader = wrapper.querySelector('.image-loading-indicator');
            if (!loader) {
                wrapper.classList.add('relative');
                loader = document.createElement('div');
                loader.className = 'image-loading-indicator absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-0';
                loader.innerHTML = '<div class="spinner"></div>';
                wrapper.insertBefore(loader, wrapper.firstChild); // Insert loader before the image
            } else {
                // Ensure loader is visible for unloaded images
                loader.style.display = 'flex';
            }
            
            // Make sure the image has a higher z-index
            img.style.position = 'relative';
            img.style.zIndex = '10';
        }
        
        // Setup hover preview for all images
        setupImageHoverPreview(img);
        
        // Start observing
        window.imageObserver.observe(img);
    });
}

// --- Cache Constants ---
const CACHE_KEY_SITE_DATA = 'colorverse-site-data';
const CACHE_KEY_TIMESTAMP = 'colorverse-cache-timestamp';
const CACHE_KEY_IMAGE_URLS = 'colorverse-image-urls';
const CACHE_DURATION = {
    HOURS: 6, // Cache expires after 6 hours in production
    DEV_MINUTES: 10 // Cache expires after 10 minutes in dev mode
};
const IS_DEV_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// --- DOM Elements ---
const mainContent = document.getElementById('main-content');
const loadingIndicator = document.getElementById('loading-indicator');
const bodyElement = document.body;

// --- State ---
let siteData = null;
let currentSeason = getCurrentSeason();
let featuredCategories = []; // Will store our featured categories
const imageUrlCache = new Map(); // Cache for image URLs

// --- API Functions ---
function getImageUrl(prompt, params = {}) {
    try {
        console.log(`getImageUrl called with currentColoringStyle: "${currentColoringStyle}"`);
        
        // Include current style in cache key
        const cacheKey = JSON.stringify({ prompt, params, style: currentColoringStyle });
        
        // Check if we have this URL cached
        if (imageUrlCache.has(cacheKey)) {
            console.log(`Using cached URL for style "${currentColoringStyle}"`);
            return imageUrlCache.get(cacheKey);
        }
        
        const fullParams = { ...DEFAULT_IMAGE_PARAMS, ...params };
        const seed = typeof fullParams.seed === 'function' ? fullParams.seed() : fullParams.seed;

        // Add seasonal keywords if seasonal theme is active and not already in prompt
        let enhancedPrompt = prompt;
        const seasonalTheme = SEASONAL_THEMES[currentSeason];
        if (params.seasonal && seasonalTheme && !prompt.toLowerCase().includes(currentSeason)) {
            enhancedPrompt = `${prompt}, ${seasonalTheme.prompt}`;
        }

        // Add current coloring style to the prompt with HIGH PRIORITY
        const styleConfig = COLORING_STYLES[currentColoringStyle];
        console.log(`[getImageUrl] currentColoringStyle: "${currentColoringStyle}"`);
        console.log(`[getImageUrl] styleConfig:`, styleConfig);
        console.log(`[getImageUrl] styleConfig.prompt:`, styleConfig?.prompt);
        console.log(`[getImageUrl] enhancedPrompt BEFORE style:`, enhancedPrompt);

        // Create coloring prompt with STYLE-FIRST approach for maximum effect
        let coloringPrompt;
        if (styleConfig && styleConfig.prompt) {
            // Special handling for painted preview style - generate colored artwork instead of line art
            if (currentColoringStyle === 'painted_preview') {
                coloringPrompt = `${styleConfig.prompt}, beautiful illustration of ${enhancedPrompt}, artistic watercolor painting, gentle shading and highlights, professional coloring technique, harmonious color scheme, painterly style`;
                console.log(`Applied PAINTED PREVIEW style - generating COLORED artwork`);
            } else {
                // Put style at the BEGINNING for maximum priority and effect
                coloringPrompt = `${styleConfig.prompt}, coloring page of ${enhancedPrompt}, black and white line art, no color, no shading, no grayscale, pure outlines only, EMPHASIZE THE STYLE: ${styleConfig.prompt}`;
                console.log(`Applied DOMINANT style "${currentColoringStyle}": ${styleConfig.prompt}`);
            }
        } else {
            // For unstyled images, use the classic approach
            coloringPrompt = `high contrast black and white line art coloring page, ${enhancedPrompt}, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only`;
            console.log(`No style applied - using classic approach`);
        }

        console.log(`Final coloring prompt: ${coloringPrompt.substring(0, 200)}...`);
        console.log(`Style applied: ${styleConfig ? 'YES' : 'NO'} - Using ${styleConfig ? 'style-aware' : 'generic'} base prompt`);

        const query = new URLSearchParams({
            width: fullParams.width,
            height: fullParams.height,
            seed: seed,
            nologo: fullParams.nologo,
            referrer: REFERRER_ID
            // Removed model parameter to let API choose default
        });
        
        const imageUrl = `${API_BASE_URL}${encodeURIComponent(coloringPrompt)}?${query.toString()}`;
        
        // Cache the URL
        imageUrlCache.set(cacheKey, imageUrl);
        
        // Persist cached URLs to localStorage occasionally (not on every call to avoid performance issues)
        if (Math.random() < 0.1) { // 10% chance to persist cache
            try {
                const cachedUrls = Object.fromEntries(imageUrlCache.entries());
                localStorage.setItem(CACHE_KEY_IMAGE_URLS, JSON.stringify(cachedUrls));
            } catch (e) {
                console.warn('Failed to persist image URL cache:', e);
            }
        }
        
        return imageUrl;
    } catch (error) {
        console.error("Error generating image URL:", error, "for prompt:", prompt);
        // Return a placeholder or default image URL if there's an error
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk5OTk5OSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+';
    }
}

// --- Cache Utility Functions ---
function isCacheValid() {
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    if (!timestamp) return false;
    
    const cacheTime = new Date(parseInt(timestamp));
    const now = new Date();
    
    // Calculate expiration time based on environment
    let expirationTime;
    if (IS_DEV_MODE) {
        expirationTime = new Date(cacheTime.getTime() + CACHE_DURATION.DEV_MINUTES * 60 * 1000);
        console.log(`Dev mode: Cache expires in ${CACHE_DURATION.DEV_MINUTES} minutes`);
    } else {
        expirationTime = new Date(cacheTime.getTime() + CACHE_DURATION.HOURS * 60 * 60 * 1000);
    }
    
    return now < expirationTime;
}

function saveToCache(data) {
    try {
        // Check if data is valid before caching
        if (!data || !data.categories) {
            console.warn('Skipping cache save - invalid data structure');
            return false;
        }
        
        // Check available storage space (if supported)
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                const percentage = (estimate.usage / estimate.quota) * 100;
                if (percentage > 90) {
                    console.warn('Storage is almost full - clearing cache');
                    localStorage.removeItem(CACHE_KEY_SITE_DATA);
                }
            });
        }
        
        localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(data));
        localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
        console.log('Site data cached successfully');
        return true;
    } catch (error) {
        console.warn('Failed to cache site data:', error);
        // If storage is full, clear it and try again
        try {
            localStorage.clear();
            localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(data));
            localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
            console.log('Site data cached successfully after clearing');
            return true;
        } catch (e) {
            console.error('Still failed to cache after clearing localStorage:', e);
            return false;
        }
    }
}

function loadFromCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            
            // Validate the cached data structure
            if (!parsedData || !parsedData.categories) {
                console.warn('Cached data is invalid - missing required fields');
                return null;
            }
            
            // Check if we have enough categories
            const categoryCount = Object.keys(parsedData.categories).length;
            if (categoryCount < 5) {
                console.warn(`Cached data has insufficient categories (${categoryCount})`);
                return null;
            }
            
            console.log(`Loaded valid cached data with ${categoryCount} categories`);
            return parsedData;
        }
    } catch (error) {
        console.warn('Failed to load cached site data:', error);
        // Clear invalid cache data
        localStorage.removeItem(CACHE_KEY_SITE_DATA);
        localStorage.removeItem(CACHE_KEY_TIMESTAMP);
    }
    return null;
}

// Function to get a category icon
function getCategoryIcon(categoryKey) {
    // Default to paintbrush if no specific icon is found
    return CATEGORY_ICONS[categoryKey] || 'fas fa-paint-brush';
}

// Function to get a random pastel gradient for colorful theme
function getRandomPastelGradient() {
    const gradients = [
        'from-pink-200 to-purple-200',
        'from-yellow-200 to-green-200',
        'from-blue-200 to-indigo-200',
        'from-red-200 to-yellow-200',
        'from-green-200 to-blue-200',
        'from-purple-200 to-pink-200',
        'from-indigo-200 to-purple-200',
        'from-yellow-200 to-orange-200',
        'from-lime-200 to-emerald-200',
        'from-cyan-200 to-sky-200'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

// Function to apply theme to UI - simplified
function applyTheme(themeName) {
    if (!['light', 'dark', 'colorful'].includes(themeName)) {
        themeName = 'light'; // Fallback to light theme
    }
    
    // 1. Remove all theme classes and add the selected one
    bodyElement.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
    bodyElement.classList.add(`theme-${themeName}`);
    
    // 2. Save the selection in local storage
    localStorage.setItem('colorverse-theme', themeName);
    
    // 3. Update theme button active states
    const themeButtons = {
        'light': document.getElementById('theme-light'),
        'dark': document.getElementById('theme-dark'),
        'colorful': document.getElementById('theme-colorful')
    };
    
    // Clear active state from all buttons
    Object.values(themeButtons).forEach(button => {
        if (button) {
            button.classList.remove('bg-white', 'bg-opacity-30', 'text-white', 'font-bold');
        }
    });
    
    // Add active state to current theme button
    if (themeButtons[themeName]) {
        themeButtons[themeName].classList.add('bg-white', 'bg-opacity-30', 'text-white', 'font-bold');
    }
    
    // 4. Update carousel buttons
    const carouselButtons = document.querySelectorAll('#carousel-prev, #carousel-next');
    if (carouselButtons) {
        carouselButtons.forEach(button => {
            // First remove all theme-specific classes
            button.classList.remove(
                'bg-white', 'hover:bg-gray-100', 
                'bg-gray-700', 'hover:bg-gray-600', 'text-white'
            );
            
            // Then add theme-specific classes
            if (themeName === 'dark') {
                button.classList.add('bg-gray-700', 'hover:bg-gray-600', 'text-white');
            } else {
                button.classList.add('bg-white', 'hover:bg-gray-100');
            }
        });
    }
    
    // 5. Apply theme-specific image loading indicator styling
    document.querySelectorAll('.image-loading-indicator').forEach(el => {
        el.classList.remove('bg-gray-100', 'bg-gray-700');
        el.classList.add(themeName === 'dark' ? 'bg-gray-700' : 'bg-gray-100');
    });
    
    console.log(`Theme switched to: ${themeName}`);
}

// --- Rendering Functions ---

// Helper function to wrap sections with theme-appropriate backgrounds
function renderSection(content, title = '', id = '') {
    const currentTheme = localStorage.getItem('colorverse-theme') || 'light';
    let sectionClasses = 'mb-12 p-6 rounded-xl';
    
    // Add theme-specific classes
    if (currentTheme === 'dark') {
        sectionClasses += ' bg-gray-800 bg-opacity-50 text-gray-100';
    } else if (currentTheme === 'colorful') {
        const gradient = getRandomPastelGradient();
        sectionClasses += ` bg-gradient-to-r ${gradient} bg-opacity-80`;
    } else {
        // Light theme - subtle background
        sectionClasses += ' bg-white bg-opacity-60 shadow-sm';
    }
    
    return `
    <section ${id ? `id="${id}"` : ''} class="${sectionClasses}">
        ${title ? `<h2 class="text-2xl font-bold mb-6">${title}</h2>` : ''}
        ${content}
    </section>
    `;
}

function renderHomepage(data) {
    if (!data || !data.categories) {
        return '<p class="text-center text-red-500">Error: Could not load categories.</p>';
    }
    
    // Select featured categories if not already done
    if (featuredCategories.length === 0) {
        const categoryKeys = Object.keys(data.categories);
        // Randomly select 4 categories but ensure they're always the same for consistency
        const shuffled = [...categoryKeys].sort(() => 0.5 - Math.random());
        featuredCategories = shuffled.slice(0, 4);
    }
    
    let html = '';
    
    // Start with hero banner - this one keeps its colors regardless of theme
    html += `
    <section class="mb-10 mt-4">
        <div class="rounded-xl overflow-hidden relative bg-gradient-to-r ${SEASONAL_THEMES[currentSeason].gradient} text-white p-8 shadow-lg">
            <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDEwdjEwaC0xMHpNMTAgMTBoMTB2MTBoLTEweiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48cGF0aCBkPSJNMTAgMGgxMHYxMGgtMTB6TTAgMTBoMTB2MTBoLTEweiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')"></div>
            <div class="md:flex items-center justify-between relative z-10">
                <div class="md:w-2/3">
                    <h1 class="text-3xl md:text-4xl font-bold mb-3">${SEASONAL_THEMES[currentSeason].name}</h1>
                    <p class="text-lg opacity-90 mb-6">${SEASONAL_THEMES[currentSeason].description}</p>
                    <a href="#category/seasonal" class="inline-flex items-center bg-white text-${currentSeason === 'winter' ? 'blue' : currentSeason === 'autumn' ? 'amber' : currentSeason === 'summer' ? 'orange' : 'green'}-600 px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1">
                        <i class="${SEASONAL_THEMES[currentSeason].icon} mr-2"></i>
                        Explore ${SEASONAL_THEMES[currentSeason].name}
                    </a>
                </div>
                <div class="mt-6 md:mt-0 flex justify-center">
                    <div class="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-5xl md:text-6xl">
                        <i class="${SEASONAL_THEMES[currentSeason].icon}"></i>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Featured Categories Section -->
    <section class="mb-12">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">Featured Categories</h2>
            <a href="#all-categories" class="text-primary-600 hover:text-primary-800 font-medium flex items-center">
                View All <i class="fas fa-arrow-right ml-2"></i>
            </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    `;
    
    // Add featured categories
    featuredCategories.forEach(key => {
        const category = data.categories[key];
        if (!category) return;
        
        const firstItemKey = Object.keys(category.items || {})[0];
        const firstItem = firstItemKey ? category.items[firstItemKey] : null;
        
        // Ensure firstItem has the expected structure with description
        let itemDescription = 'coloring page design';
        if (firstItem && firstItem.description) {
            itemDescription = firstItem.description;
        } else if (firstItem && typeof firstItem === 'string') {
            // Handle old data format where item was just a string
            itemDescription = firstItem;
        } else {
            // Fallback: use category description to generate an appropriate image
            itemDescription = `${category.description || category.title || key} coloring page design`;
        }
        
        const thumbnailUrl = getImageUrl(itemDescription, { width: 400, height: 400 });
        
        html += `
            <a href="#category/${key}" class="category-card block rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 group">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" 
                         data-prompt="${itemDescription}" 
                         data-width="400" 
                         data-height="400" 
                         alt="${category.title}" 
                         class="w-full aspect-square object-contain group-hover:opacity-90 transition-opacity relative z-10">
                    <div class="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md z-20">
                        <i class="${getCategoryIcon(key)} text-primary-600"></i>
                    </div>
                </div>
                <div class="p-4 bg-white dark:bg-gray-800">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                        ${category.title}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">${category.description}</p>
                </div>
            </a>
        `;
    });
    
    html += `
        </div>
    </section>
    
    <!-- Today's Pick Section -->
    <section class="mb-12">
        <div class="accent-panel p-6 mb-8">
            <div class="flex flex-col md:flex-row items-center">
                <div class="md:w-1/3 mb-4 md:mb-0 md:pr-6">
                    <h2 class="text-2xl font-bold text-white mb-3">Today's Special Pick</h2>
                    <p class="text-white text-opacity-90">A new hand-selected coloring page every day. Download, print, and color!</p>
                    
                    <a href="#daily-pick" class="mt-4 inline-flex items-center bg-white text-primary-600 px-4 py-2 rounded-lg font-medium">
                        Get Today's Page <i class="fas fa-download ml-2"></i>
                    </a>
                </div>
                <div class="md:w-2/3 bg-white p-3 rounded-lg shadow-lg">
                    <!-- Dynamic daily pick would be generated here -->
                    ${renderDailyPick(data)}
                </div>
            </div>
        </div>
    </section>
    
    <!-- Recent Additions -->
    <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">New Additions</h2>
        <div class="relative">
            <div class="carousel flex space-x-4 overflow-x-auto pb-4">
                ${renderRecentAdditions(data)}
            </div>
            <button class="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition" id="carousel-prev">
                <i class="fas fa-chevron-left"></i>
                <span class="sr-only">Previous</span>
            </button>
            <button class="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition" id="carousel-next">
                <i class="fas fa-chevron-right"></i>
                <span class="sr-only">Next</span>
            </button>
        </div>
    </section>
    
    <!-- All Categories -->
    <section id="all-categories">
        <h2 class="text-2xl font-bold mb-6">All Coloring Categories</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    `;
    
    // Add all categories with icons - use staggered loading
    let delay = 0;
    for (const [key, category] of Object.entries(data.categories)) {
        const firstItemKey = Object.keys(category.items)[0];
        const firstItem = category.items[firstItemKey];
        const thumbnailUrl = firstItem ? getImageUrl(firstItem.description, { width: 400, height: 400, seed: key.charCodeAt(0) * 1000 }) : 'placeholder.png';
        delay += 50; // Stagger the API requests
        
        html += `
            <a href="#category/${key}" class="category-card flex flex-col rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 bg-white dark:bg-gray-800">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" 
                         data-prompt="${firstItem.description}" 
                         data-width="400" 
                         data-height="400" 
                         data-seed="${key.charCodeAt(0) * 1000}" 
                         alt="${category.title}" 
                         class="w-full aspect-square object-contain group-hover:opacity-90 transition-opacity relative z-10">
                </div>
                <div class="p-4 flex-grow flex flex-col">
                    <div class="flex items-center mb-2">
                        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3">
                            <i class="${getCategoryIcon(key)}"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">${category.title}</h3>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300 flex-grow">${category.description}</p>
                </div>
            </a>
        `;
    }
    
    html += `
        </div>
    </section>
    
    <!-- Newsletter Section -->
    <section class="mt-16 mb-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-8 text-white">
        <div class="md:flex items-center justify-between">
            <div class="md:w-2/3 mb-6 md:mb-0">
                <h2 class="text-2xl font-bold mb-2">Stay Inspired</h2>
                <p>Subscribe to our newsletter for weekly coloring pages, tips, and creative inspiration.</p>
            </div>
            <div class="md:w-1/3">
                <form class="flex">
                    <input type="email" placeholder="Your email address" class="px-4 py-3 rounded-l-lg w-full text-gray-800" required aria-label="Email for newsletter">
                    <button type="submit" class="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-3 rounded-r-lg transition duration-300">
                        Subscribe
                    </button>
                </form>
            </div>
        </div>
    </section>
    `;
    
    // Add carousel control script
    setTimeout(() => {
        const carousel = document.querySelector('.carousel');
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        
        if (carousel && prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                carousel.scrollBy({ left: -300, behavior: 'smooth' });
            });
            
            nextBtn.addEventListener('click', () => {
                carousel.scrollBy({ left: 300, behavior: 'smooth' });
            });
        }
    }, 100);
    
    return html;
}

// Render all categories page
function renderAllCategoriesPage(data) {
    if (!data || !data.categories) {
        return '<p class="text-center">Categories are still loading...</p>';
    }

    let html = `
        <nav aria-label="breadcrumb" class="mb-6 mt-2 text-sm py-2" style="color: var(--text-color);">
            <a href="#" class="hover:underline hover:text-primary-600">Home</a> &raquo;
            <span class="mx-1 font-medium">All Categories</span>
        </nav>
        
        <h1 class="text-4xl font-bold mb-4" style="color: var(--text-color);">All Categories</h1>
        <p class="text-lg mb-8" style="color: var(--text-color); opacity: 0.8;">
            Explore our complete collection of ${Object.keys(data.categories).length} coloring page categories. 
            From animals and nature to fantasy and mandalas, find the perfect coloring pages for every mood and skill level.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    `;

    // Sort categories alphabetically for better organization
    const sortedCategories = Object.entries(data.categories).sort(([,a], [,b]) => 
        a.title.localeCompare(b.title)
    );

    sortedCategories.forEach(([categoryKey, category]) => {
        // Count items in category
        const itemCount = Object.keys(category.items || {}).length;
        
        // Create a style-aware prompt for the category thumbnail
        const categoryPrompt = `Simple black and white line art coloring page style illustration representing ${category.title}, clean minimalist design, suitable for coloring, white background`;
        
        // Generate preview image URL using getImageUrl to apply current style
        const previewImageUrl = getImageUrl(categoryPrompt, { 
            width: 300, 
            height: 200, 
            seed: categoryKey.length 
        });

        html += `
            <div class="category-card group" style="background-color: var(--card-bg); border: 1px solid var(--border-color);">
                <a href="#category/${categoryKey}" class="block h-full p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <div class="w-full h-40 mb-4 rounded-lg overflow-hidden" style="background-color: var(--bg-secondary);">
                        <img src="${PLACEHOLDER_IMAGE}" 
                             data-src="${previewImageUrl}"
                             data-prompt="${categoryPrompt}"
                             data-width="300"
                             data-height="200"
                             data-seed="${categoryKey.length}"
                             alt="${category.title} preview"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 lazy-load-image">
                    </div>
                    
                    <h3 class="text-xl font-bold mb-2 group-hover:text-primary-600 transition-colors" style="color: var(--text-color);">
                        ${category.title}
                    </h3>
                    
                    <p class="text-sm mb-3 line-clamp-2" style="color: var(--text-color); opacity: 0.7;">
                        ${category.description}
                    </p>
                    
                    <div class="flex items-center justify-between text-sm" style="color: var(--text-color); opacity: 0.6;">
                        <span class="flex items-center">
                            <i class="fas fa-palette mr-1"></i>
                            ${itemCount} ${itemCount === 1 ? 'page' : 'pages'}
                        </span>
                        <span class="text-primary-600 group-hover:underline">
                            Explore →
                        </span>
                    </div>
                </a>
            </div>
        `;
    });

    html += `
        </div>
        
        <!-- Back to Home Button -->
        <div class="text-center mt-12">
            <a href="#" class="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
                <i class="fas fa-home mr-2"></i>
                Back to Home
            </a>
        </div>
    `;

    return html;
}

// Generate a daily special pick
function renderDailyPick(data) {
    // Use the daily pick from the data if available
    const dailyPick = data.daily_pick || {};
    
    // If no specific daily pick, create a fallback
    const pickItem = dailyPick.item || {
        title: 'Daily Coloring Adventure',
        description: 'A delightful coloring page to brighten your day'
    };
    
    // Use the first spring category if seasonal_gallery exists
    const categoryKey = data.seasonal_gallery ? 'seasonal' : 
        Object.keys(data.categories)[0];
    
    // Generate image with a consistent seed
    const today = new Date();
    const seed = +`${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
    const imageUrl = getImageUrl(pickItem.description, { seed: seed, width: 600, height: 600 });
    
    return `
        <div class="flex flex-col md:flex-row">
            <div class="md:w-2/3 relative">
                <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                    <div class="spinner"></div>
                </div>
                <img src="${PLACEHOLDER_IMAGE}" data-src="${imageUrl}" 
                     data-prompt="${pickItem.description}" 
                     data-width="600" 
                     data-height="600" 
                     data-seed="${seed}" 
                     alt="${pickItem.title}" 
                     class="w-full h-auto object-contain rounded relative z-10">
            </div>
            <div class="md:w-1/3 p-4 flex flex-col justify-between">
                <div>
                    <span class="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
                        ${dailyPick.title || 'Today\'s Pick'}
                    </span>
                    <h3 class="text-xl font-bold mt-2">${pickItem.title}</h3>
                    <p class="text-sm text-gray-600 mt-2">${pickItem.description}</p>
                </div>
                <a href="#category/${categoryKey}" class="mt-4 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg font-medium text-center">
                    View & Download
                </a>
            </div>
        </div>
    `;
}

// Render the full Today's Special Pick page
function renderDailyPickPage(dailyPickData) {
    const today = new Date();
    const seed = +`${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
    
    // Use the daily pick from the data if available
    const dailyPick = dailyPickData || {};
    
    // If no specific daily pick, create a fallback
    const pickItem = dailyPick.item || {
        title: "Mystical Garden Sanctuary",
        description: "A serene garden with mystical creatures, magical flowers, and hidden pathways through an enchanted landscape"
    };
    
    const categoryKey = dailyPick.category || 'fantasy';
    const imageUrl = getImageUrl(pickItem.description, { width: 800, height: 800, seed });

    return `
        <nav aria-label="breadcrumb" class="flex items-center mb-6 mt-2 text-sm text-gray-600 py-2">
            <a href="#" class="hover:text-primary-600 transition-colors flex items-center">
                <i class="fas fa-home mr-1"></i> Home
            </a>
            <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
            <span class="font-medium text-gray-800">Today's Special Pick</span>
        </nav>
        
        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-8 text-white mb-8">
            <div class="flex items-center mb-4">
                <div class="bg-white bg-opacity-20 rounded-full p-3 mr-4">
                    <i class="fas fa-star text-2xl"></i>
                </div>
                <div>
                    <h1 class="text-3xl font-bold">Today's Special Pick</h1>
                    <p class="text-white text-opacity-90">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
            <p class="text-lg text-white text-opacity-90">A hand-selected coloring page designed to inspire creativity and relaxation.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${imageUrl}" 
                         data-prompt="${pickItem.description}" 
                         data-width="800" 
                         data-height="800" 
                         data-seed="${seed}" 
                         alt="${pickItem.title}" 
                         class="w-full h-auto object-contain relative z-10">
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-4">${pickItem.title}</h2>
                <p class="text-gray-600 dark:text-gray-300 mb-6">${pickItem.description}</p>
                
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span class="font-medium">Difficulty Level:</span>
                        <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">Intermediate</span>
                    </div>
                    
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span class="font-medium">Category:</span>
                        <span class="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm">${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}</span>
                    </div>
                    
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span class="font-medium">Estimated Time:</span>
                        <span class="text-gray-600 dark:text-gray-300">45-60 minutes</span>
                    </div>
                </div>
                
                <div class="mt-6 space-y-3">
                    <button onclick="window.print()" class="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center">
                        <i class="fas fa-print mr-2"></i> Print This Page
                    </button>
                    
                    <a href="#category/${categoryKey}" class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium flex items-center justify-center">
                        <i class="fas fa-th-large mr-2"></i> Browse ${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} Category
                    </a>
                </div>
            </div>
        </div>
        
        <div class="bg-gradient-to-r from-green-500 to-teal-600 rounded-xl p-6 text-white">
            <h3 class="text-xl font-bold mb-2">Coloring Tips for Today's Pick</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="flex items-start">
                    <i class="fas fa-lightbulb mr-2 mt-1"></i>
                    <span>Start with lighter colors and gradually build up intensity for depth.</span>
                </div>
                <div class="flex items-start">
                    <i class="fas fa-palette mr-2 mt-1"></i>
                    <span>Use complementary colors to make certain elements pop from the background.</span>
                </div>
                <div class="flex items-start">
                    <i class="fas fa-pencil-alt mr-2 mt-1"></i>
                    <span>Consider using different textures and patterns within each section.</span>
                </div>
                <div class="flex items-start">
                    <i class="fas fa-heart mr-2 mt-1"></i>
                    <span>Remember, there's no right or wrong way - let your creativity flow!</span>
                </div>
            </div>
        </div>
    `;
}

// Render seasonal gallery section
function renderSeasonalGallery(data) {
    // Get current season for dynamic display
    const currentSeason = getCurrentSeason();
    const seasonalTheme = SEASONAL_THEMES[currentSeason];
    
    // Use seasonal_gallery from data if available
    const seasonalGallery = data.seasonal_gallery || {
        title: seasonalTheme.name,
        subtitle: seasonalTheme.description,
        description: seasonalTheme.description,
        items: {}
    };

    let html = `
        <div class="bg-gradient-to-r ${seasonalTheme.gradient} rounded-xl p-6 text-white mb-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold mb-2">${seasonalGallery.title}</h2>
                    <p class="text-lg opacity-90 mb-1">${seasonalGallery.subtitle}</p>
                    <p class="text-sm opacity-80">${seasonalGallery.description}</p>
                </div>
                <div class="hidden md:block">
                    <i class="${seasonalTheme.icon} text-4xl opacity-50"></i>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
    `;

    // Render seasonal gallery items (up to 12 items)
    const items = Object.entries(seasonalGallery.items || {}).slice(0, 12);
    
    items.forEach(([itemKey, item]) => {
        const thumbnailUrl = getImageUrl(item.description, { width: 300, height: 300, seed: itemKey.charCodeAt(0) * 100 });
        
        html += `
            <a href="#item/seasonal/${itemKey}" class="category-card block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" 
                         data-prompt="${item.description}" 
                         data-width="300" 
                         data-height="300" 
                         data-seed="${itemKey.charCodeAt(0) * 100}" 
                         alt="${item.title}" 
                         class="w-full aspect-square object-contain group-hover:opacity-80 transition-opacity relative z-10">
                </div>
                <div class="p-2">
                    <h4 class="text-xs font-medium truncate">${item.title}</h4>
                </div>
            </a>
        `;
    });

    html += `
        </div>
    `;

    return html;
}

// Generate recent additions carousel
function renderRecentAdditions(data) {
    // For demo, we'll select 12 random items from across categories (increased from 8)
    // In a real app, this would use actual timestamp data
    let allItems = [];
    
    for (const [categoryKey, category] of Object.entries(data.categories)) {
        for (const [itemKey, item] of Object.entries(category.items)) {
            allItems.push({
                categoryKey,
                itemKey,
                item,
                categoryTitle: category.title
            });
        }
    }
    
    // Shuffle and take first 12 (increased from 8)
    allItems = allItems.sort(() => 0.5 - Math.random()).slice(0, 12);
    
    let html = '';
    
    allItems.forEach(({ categoryKey, itemKey, item, categoryTitle }) => {
        const thumbnailUrl = getImageUrl(item.description, { width: 300, height: 300 });
        
        html += `
            <a href="#item/${categoryKey}/${itemKey}" class="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" 
                         data-prompt="${item.description}" 
                         data-width="300" 
                         data-height="300" 
                         alt="${item.title}" 
                         class="w-full aspect-square object-contain relative z-10">
                </div>
                <div class="p-3">
                    <span class="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">${categoryTitle}</span>
                    <h4 class="text-sm font-medium mt-1 truncate">${item.title}</h4>
                </div>
            </a>
        `;
    });
    
    return html;
}

function renderCategory(categoryData, categoryKey, currentPage = 1, sortBy = 'popular') {
    if (!categoryData) return '<p class="text-center text-red-500">Category not found.</p>';
    
    const categoryIcon = getCategoryIcon(categoryKey);
    const itemsPerPage = 20; // Show 20 items per page
    const totalPages = 8; // Fixed 8 pages as requested
    
    let html = `
        <nav aria-label="breadcrumb" class="flex items-center mb-6 mt-2 text-sm text-gray-600 dark:text-gray-400 py-2">
            <a href="#" class="hover:text-primary-600 transition-colors flex items-center">
                <i class="fas fa-home mr-1"></i> Home
            </a>
            <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
            <span class="font-medium text-gray-800 dark:text-gray-200">${categoryData.title}</span>
        </nav>
        
        <div class="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white mb-8 relative overflow-hidden">
            <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDEwdjEwaC0xMHpNMTAgMTBoMTB2MTBoLTEweiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48cGF0aCBkPSJNMTAgMGgxMHYxMGgtMTB6TTAgMTBoMTB2MTBoLTEweiIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')"></div>
            <div class="flex flex-col md:flex-row items-start md:items-center relative z-10">
                <div class="rounded-full bg-white bg-opacity-20 p-4 mr-6 mb-4 md:mb-0">
                    <i class="${categoryIcon} text-3xl"></i>
                </div>
                <div>
                    <h2 class="text-3xl font-bold">${categoryData.title}</h2>
                    <p class="mt-2 text-white text-opacity-90 max-w-2xl">${categoryData.description || ''}</p>
                </div>
            </div>
        </div>
        
        <!-- Filter Controls -->
        <div class="mb-6 flex flex-wrap gap-4 items-center">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-2 flex flex-wrap gap-3">
                <span class="text-gray-700 dark:text-gray-300">Sort by:</span>
                <button onclick="sortCategory('${categoryKey}', 'popular')" class="${sortBy === 'popular' ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} px-3 py-1 rounded-md text-sm transition-colors">Popular</button>
                <button onclick="sortCategory('${categoryKey}', 'newest')" class="${sortBy === 'newest' ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} px-3 py-1 rounded-md text-sm transition-colors">Newest</button>
                <button onclick="sortCategory('${categoryKey}', 'az')" class="${sortBy === 'az' ? 'bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} px-3 py-1 rounded-md text-sm transition-colors">A-Z</button>
            </div>
            <div class="ml-auto">
                <span class="text-gray-600 dark:text-gray-400 text-sm">${totalPages * itemsPerPage} items across ${totalPages} pages</span>
            </div>
        </div>
        
        <!-- Items Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" id="category-items-grid">
    `;

    // Generate items for the current page with unique content per page
    const itemsForPage = generateCategoryPageItems(categoryData, categoryKey, currentPage, itemsPerPage, sortBy);
    
    itemsForPage.forEach(({ itemKey, item }) => {
        const thumbnailUrl = getImageUrl(item.description, { width: 400, height: 400, seed: (itemKey.charCodeAt(0) * 100) + (currentPage * 1000) });
        html += `
            <a href="#item/${categoryKey}/${itemKey}" class="category-card block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" 
                         data-prompt="${item.description}" 
                         data-width="400" 
                         data-height="400" 
                         data-seed="${(itemKey.charCodeAt(0) * 100) + (currentPage * 1000)}" 
                         alt="${item.title}" 
                         class="w-full aspect-square object-contain group-hover:opacity-80 transition-opacity relative z-10">
                    <div class="absolute inset-0 bg-primary-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center z-20">
                        <div class="bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300">
                            <i class="fas fa-eye text-primary-600"></i>
                        </div>
                    </div>
                </div>
                <div class="p-3">
                    <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">${item.title || 'Untitled'}</h4>
                </div>
            </a>
        `;
    });

    html += '</div>';
    
    // Add pagination
    html += `
        <div class="mt-8 flex justify-center">
            <nav class="flex items-center space-x-2" aria-label="Pagination">
                ${currentPage > 1 ? 
                    `<button onclick="goToPage('${categoryKey}', ${currentPage - 1}, '${sortBy}')" class="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">Previous</button>` : 
                    `<span class="px-3 py-1 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed">Previous</span>`
                }
    `;

    // Page numbers
    for (let page = 1; page <= totalPages; page++) {
        if (page === currentPage) {
            html += `<span class="px-3 py-1 rounded-md bg-primary-600 text-white font-medium">${page}</span>`;
        } else if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
            html += `<button onclick="goToPage('${categoryKey}', ${page}, '${sortBy}')" class="px-3 py-1 rounded-md hover:bg-gray-200 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">${page}</button>`;
        } else if (page === currentPage - 2 || page === currentPage + 2) {
            html += `<span class="px-2 text-gray-500">...</span>`;
        }
    }

    html += `
                ${currentPage < totalPages ? 
                    `<button onclick="goToPage('${categoryKey}', ${currentPage + 1}, '${sortBy}')" class="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">Next</button>` : 
                    `<span class="px-3 py-1 rounded-md bg-gray-200 text-gray-500 cursor-not-allowed">Next</span>`
                }
            </nav>
        </div>
    `;
    
    return html;
}

// Generate unique items for each page of a category
function generateCategoryPageItems(categoryData, categoryKey, page, itemsPerPage, sortBy = 'popular') {
    const allItems = Object.entries(categoryData.items || {});
    
    if (allItems.length === 0) {
        return [];
    }
    
    // Calculate start and end indices for the current page
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Get items for the current page
    let pageItems = allItems.slice(startIndex, endIndex).map(([itemKey, item], index) => ({
        itemKey,
        item,
        page,
        originalIndex: startIndex + index
    }));
    
    // If we don't have enough items for this page, generate some based on existing items
    if (pageItems.length < itemsPerPage && page <= 8) {
        const existingCount = pageItems.length;
        const neededCount = itemsPerPage - existingCount;
        
        // Create variations based on existing items for missing slots
        for (let i = 0; i < neededCount; i++) {
            const baseIndex = i % allItems.length;
            const [baseKey, baseItem] = allItems[baseIndex];
            
            const variations = [
                ' with intricate patterns',
                ' in detailed style', 
                ' with decorative elements',
                ' featuring elaborate designs',
                ' with artistic flourishes',
                ' in ornate style',
                ' with fine details',
                ' in vintage style'
            ];
            
            const variationIndex = (startIndex + existingCount + i) % variations.length;
            const variation = variations[variationIndex];
            
            const newKey = `${baseKey}_var_${page}_${i}`;
            const newItem = {
                title: `${baseItem.title} - Style ${i + 1}`,
                description: baseItem.description + variation
            };
            
            pageItems.push({
                itemKey: newKey,
                item: newItem,
                page,
                originalIndex: startIndex + existingCount + i
            });
        }
    }
    
    // Apply sorting
    switch (sortBy) {
        case 'newest':
            // Reverse order to simulate newest first
            pageItems.reverse();
            break;
        case 'az':
            // Sort alphabetically by title
            pageItems.sort((a, b) => a.item.title.localeCompare(b.item.title));
            break;
        case 'popular':
        default:
            // Keep default order (popular)
            break;
    }
    
    return pageItems;
}

// Global functions for pagination and sorting
window.goToPage = function(categoryKey, page, sortBy = 'popular') {
    // Cancel pending loads when changing pages
    if (window.imageLoadQueue) {
        const canceledCount = window.imageLoadQueue.cancelAll();
        if (canceledCount > 0) {
            console.log(`[Pagination] Canceled ${canceledCount} pending downloads for page change`);
        }
    }
    
    // Update URL to include page and sort parameters
    const newHash = `#category/${categoryKey}?page=${page}&sort=${sortBy}`;
    window.location.hash = newHash;
};

window.sortCategory = function(categoryKey, sortBy) {
    // Cancel pending loads when changing sort order
    if (window.imageLoadQueue) {
        const canceledCount = window.imageLoadQueue.cancelAll();
        if (canceledCount > 0) {
            console.log(`[Sort Change] Canceled ${canceledCount} pending downloads for sort change`);
        }
    }
    
    // Get current page from URL or default to 1
    const currentPage = getCurrentPageFromHash() || 1;
    const newHash = `#category/${categoryKey}?page=${currentPage}&sort=${sortBy}`;
    window.location.hash = newHash;
};

// Helper function to extract page and sort from URL hash
function getCurrentPageFromHash() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    return parseInt(urlParams.get('page')) || 1;
}

function getCurrentSortFromHash() {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    return urlParams.get('sort') || 'popular';
}

function renderItem(itemData, categoryKey, itemKey) {
    if (!itemData) return '<p class="text-center text-red-500">Item not found.</p>';

    const category = siteData.categories[categoryKey];
    
    // Create a unique cache key for this specific item
    const itemCacheKey = `colorverse-item-cache-${categoryKey}-${itemKey}`;
    
    // Try to retrieve cached image generation details
    const cachedItemData = localStorage.getItem(itemCacheKey);
    let imageUrl, generationParams;

    if (cachedItemData) {
        try {
            const parsedCache = JSON.parse(cachedItemData);
            // Use cached seed and other params to regenerate the exact same image
            generationParams = {
                seed: parsedCache.seed,
                width: parsedCache.width,
                height: parsedCache.height
            };
            imageUrl = getImageUrl(itemData.description, generationParams);
            console.log('Using cached image generation parameters');
        } catch (e) {
            console.warn('Failed to parse cached item data:', e);
            // Fallback to default image generation
            imageUrl = getImageUrl(itemData.description);
        }
    } else {
        // Generate new image with a persistent seed
        const seed = Math.floor(Math.random() * 100000);
        generationParams = {
            seed: seed,
            width: 1024,
            height: 1024
        };
        imageUrl = getImageUrl(itemData.description, generationParams);

        // Cache the generation parameters
        try {
            localStorage.setItem(itemCacheKey, JSON.stringify({
                seed: generationParams.seed,
                width: generationParams.width,
                height: generationParams.height,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to cache item image details:', e);
        }
    }

    // Simple next/prev logic
    const itemKeys = Object.keys(category.items);
    const currentIndex = itemKeys.indexOf(itemKey);
    const prevItemKey = currentIndex > 0 ? itemKeys[currentIndex - 1] : null;
    const nextItemKey = currentIndex < itemKeys.length - 1 ? itemKeys[currentIndex + 1] : null;

    let html = `
        <nav aria-label="breadcrumb" class="mb-6 mt-2 text-sm py-2" style="color: var(--text-color);">
          <a href="#" class="hover:underline hover:text-primary-600">Home</a> &raquo;
          <a href="#category/${categoryKey}" class="hover:underline hover:text-primary-600 mx-1">${category.title}</a> &raquo;
          <span class="mx-1 font-medium">${itemData.title}</span>
        </nav>
        <h2 class="text-3xl font-bold mb-2" style="color: var(--text-color);">${itemData.title}</h2>
        <p class="mb-6" style="color: var(--text-color);">${itemData.description}</p>

        <div class="p-4 shadow-lg rounded-lg flex flex-col lg:flex-row gap-6" 
            style="background-color: var(--card-bg); color: var(--card-text); border: 1px solid var(--border-color);">
            <!-- Image Area -->
            <div class="flex-grow flex justify-center items-center lg:pr-6 relative" style="border-right: 1px solid var(--border-color);">
                <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                    <div class="spinner"></div>
                </div>
                <img id="coloring-image" src="${PLACEHOLDER_IMAGE}" data-src="${imageUrl}" 
                     data-prompt="${itemData.description}" 
                     data-width="${generationParams.width}" 
                     data-height="${generationParams.height}" 
                     data-seed="${generationParams.seed}" 
                     alt="Coloring page: ${itemData.title}" 
                     class="max-w-full max-h-[70vh] object-contain rounded shadow relative z-10">
            </div>

            <!-- Controls & Info Area -->
            <div class="lg:w-1/4 flex flex-col gap-4 actions-panel">
                <h3 class="text-xl font-semibold pb-2 border-b" style="color: var(--text-color); border-color: var(--border-color);">Actions</h3>
                <a href="${imageUrl}" download="${categoryKey}-${itemKey}-${itemData.title.replace(/\s+/g, '-')}.jpg"
                   class="block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                   Download Image
                </a>
                <button onclick="printColoringPage('${itemData.title}')"
                        class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                   Print Coloring Page
                </button>
                <button onclick="sharePage('${itemData.title}', window.location.href)"
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                   Share
                </button>
                 <a href="#donate"
                        class="w-full text-center bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded transition duration-300">
                    Support Us (Donate)
                 </a>
                <!-- Placeholder for Save/Favorite -->
                <button class="w-full font-bold py-2 px-4 rounded transition duration-300" style="background-color: #d1d5db; color: #4b5563;" disabled>
                    Save (Coming Soon)
                </button>

                <h3 class="text-xl font-semibold pb-2 mt-4 border-b" style="color: var(--text-color); border-color: var(--border-color);">Navigation</h3>
                 <div class="flex justify-between gap-2">
                    ${prevItemKey ? `<a href="#item/${categoryKey}/${prevItemKey}" class="flex-1 text-center font-bold py-2 px-4 rounded transition duration-300" style="background-color: #e5e7eb; color: var(--text-color); hover: opacity-90;">&laquo; Previous</a>` : '<div class="flex-1"></div>'}
                    ${nextItemKey ? `<a href="#item/${categoryKey}/${nextItemKey}" class="flex-1 text-center font-bold py-2 px-4 rounded transition duration-300" style="background-color: #e5e7eb; color: var(--text-color); hover: opacity-90;">Next &raquo;</a>` : '<div class="flex-1"></div>'}
                 </div>
                 <a href="#category/${categoryKey}" class="block text-center mt-2 hover:underline" style="color: var(--accent-color);">Back to ${category.title}</a>

                 <!-- Placeholder for Affiliate Links -->
                 <div class="mt-6 pt-4 border-t" style="border-color: var(--border-color);">
                     <h4 class="text-md font-semibold mb-2" style="color: var(--text-color);">Get Coloring Supplies!</h4>
                     <a href="#" target="_blank" rel="noopener noreferrer sponsored" class="text-sm hover:underline block" style="color: var(--accent-color);">Shop Pencils on Amazon (Affiliate)</a>
                     <a href="#" target="_blank" rel="noopener noreferrer sponsored" class="text-sm hover:underline block" style="color: var(--accent-color);">Shop Markers on Amazon (Affiliate)</a>
                     <p class="text-xs mt-1" style="color: var(--text-color); opacity: 0.7;">(As an Amazon Associate we earn from qualifying purchases)</p>
                 </div>
            </div>
        </div>

        <!-- Placeholder for Ads -->
        <div class="mt-8 p-4 rounded-lg text-center border" 
            style="background-color: var(--bg-color); color: var(--text-color); border-color: var(--border-color); opacity: 0.8;">
            Advertisement Placeholder
        </div>
    `;
    return html;
}

// --- Helper Functions ---

// Generate related items from the same category
function renderRelatedItems(category, categoryKey, currentItemKey) {
    const allItems = Object.entries(category.items)
        .filter(([key]) => key !== currentItemKey)
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
    
    let html = '';
    
    allItems.forEach(([itemKey, item]) => {
        const thumbnailUrl = getImageUrl(item.description, { width: 300, height: 300 });
        
        html += `
            <a href="#item/${categoryKey}/${itemKey}" class="category-card block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" 
                         data-prompt="${item.description}" 
                         data-width="300" 
                         data-height="300" 
                         alt="${item.title}" 
                         class="w-full aspect-square object-contain relative z-10">
                </div>
                <div class="p-3">
                    <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">${item.title}</h4>
                </div>
            </a>
        `;
    });
    
    return html;
}

// Handle image load errors globally
function setupGlobalImageErrorHandling() {
    document.addEventListener('error', function(event) {
        const target = event.target;
        
        // Only handle image errors
        if (target.tagName === 'IMG') {
            console.error(`Failed to load image: ${target.src}`);
            target.classList.add('error');
            
            // Create error indicator if not inside lazy loading system
            if (!target.hasAttribute('data-src')) {
                const wrapper = target.parentNode;
                if (wrapper) {
                    wrapper.classList.add('relative');
                    const errorIndicator = document.createElement('div');
                    errorIndicator.className = 'image-error-indicator absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50';
                    errorIndicator.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>';
                    wrapper.appendChild(errorIndicator);
                }
            }
            
            // Replace with error image
            target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk5OTk5OSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+';
        }
    }, true); // Use capture phase to catch all image errors
}

// Enhanced image loading with retry mechanism and cancellation support
async function loadImageWithRetry(imageElement, src, maxRetries = 3, abortController = null) {
    // Validate input
    if (!imageElement || !src) {
        console.error('Invalid parameters for loadImageWithRetry');
        return false;
    }
    
    // Check if request is already aborted
    if (abortController?.signal?.aborted) {
        console.log('Request aborted before starting:', src);
        throw new Error('AbortError');
    }
    
    // Add loading class to show loading state
    imageElement.classList.add('loading');
    imageElement.classList.remove('error');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Check if request was aborted before each attempt
            if (abortController?.signal?.aborted) {
                console.log(`Request aborted during attempt ${attempt}:`, src);
                throw new Error('AbortError');
            }
            
            console.log(`Image load attempt ${attempt} for ${src}`);
            
            await new Promise((resolve, reject) => {
                const img = new Image();
                
                // Set up abort handler
                const abortHandler = () => {
                    console.log(`Image load aborted on attempt ${attempt}:`, src);
                    reject(new Error('AbortError'));
                };
                
                if (abortController?.signal) {
                    abortController.signal.addEventListener('abort', abortHandler);
                }
                
                img.onload = () => {
                    if (abortController?.signal) {
                        abortController.signal.removeEventListener('abort', abortHandler);
                    }
                    console.log(`Image loaded successfully on attempt ${attempt}: ${src}`);
                    resolve();
                };
                
                img.onerror = (error) => {
                    if (abortController?.signal) {
                        abortController.signal.removeEventListener('abort', abortHandler);
                    }
                    console.warn(`Image load error on attempt ${attempt} for ${src}:`, error);
                    reject(new Error(`Image load failed: ${error?.message || 'Unknown error'}`));
                };
                
                img.src = src;
                
                // Add timeout
                const timeoutId = setTimeout(() => {
                    if (abortController?.signal) {
                        abortController.signal.removeEventListener('abort', abortHandler);
                    }
                    console.warn(`Image load timeout on attempt ${attempt} for ${src}`);
                    reject(new Error('Image load timeout after 10 seconds'));
                }, 10000);
                
                // Clear timeout on abort
                if (abortController?.signal) {
                    abortController.signal.addEventListener('abort', () => {
                        clearTimeout(timeoutId);
                    });
                }
            });
            
            // Check one more time before applying the image
            if (abortController?.signal?.aborted) {
                console.log(`Request aborted before applying image:`, src);
                throw new Error('AbortError');
            }
            
            // If we get here, the image loaded successfully
            imageElement.src = src;
            imageElement.classList.remove('loading', 'error');
            
            // Hide loading indicator if it exists
            const loadingIndicator = imageElement.parentNode?.querySelector('.image-loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Setup hover preview for successfully loaded images
            setupImageHoverPreview(imageElement);
            
            return true;
        } catch (error) {
            // Handle abort errors specifically
            if (error.message === 'AbortError' || error.name === 'AbortError') {
                console.log(`Image load aborted for ${src}`);
                throw error; // Re-throw abort errors
            }
            
            console.warn(`Image load attempt ${attempt} failed for ${src}:`, error.message || error);
            
            if (attempt === maxRetries) {
                // Last attempt failed, show error
                imageElement.classList.remove('loading');
                imageElement.classList.add('error');
                
                // Hide loading indicator
                const loadingIndicator = imageElement.parentNode?.querySelector('.image-loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                // Show a more descriptive error message
                const errorImageUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk5OTk5OSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+';
                imageElement.src = errorImageUrl;
                
                // Show toast notification about the failed image load
                if (typeof showToast === 'function') {
                    showToast(`Failed to load image after ${maxRetries} attempts. Please try again later.`, 'error');
                }
                
                // Add error indication
                const wrapper = imageElement.parentNode;
                if (wrapper && !wrapper.querySelector('.image-error-indicator')) {
                    wrapper.classList.add('relative');
                    const errorIndicator = document.createElement('div');
                    errorIndicator.className = 'image-error-indicator absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50';
                    errorIndicator.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>';
                    wrapper.appendChild(errorIndicator);
                }
                
                return false;
            }
            
            // Wait before retrying with exponential backoff
            const delay = Math.min(2000 * Math.pow(1.5, attempt - 1), 8000); // Increased delays: 2s, 3s, 4.5s, max 8s
            console.log(`Waiting ${delay}ms before retrying image load for ${src}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Function to print the coloring page
function printColoringPage(title) {
    const img = document.getElementById('coloring-image');
    
    // Make sure the image is fully loaded
    if (img.complete && img.naturalHeight !== 0) {
        doPrint(img.src, title);
    } else {
        // If image is not loaded yet, load from data-src
        const actualSrc = img.getAttribute('data-src');
        // Show loading toast
        if (typeof showToast === 'function') {
            showToast('Preparing coloring page for printing...', 'info');
        }
        
        const tempImg = new Image();
        tempImg.onload = function() {
            doPrint(actualSrc, title);
        };
        tempImg.onerror = function() {
            if (typeof showToast === 'function') {
                showToast('Error preparing image for print.', 'error');
            } else {
                alert('Error preparing image for print.');
            }
        };
        tempImg.src = actualSrc;
    }
    
    function doPrint(imgSrc, pageTitle) {
        // Get the current theme
        const currentTheme = localStorage.getItem('colorverse-theme') || 'light';
        
        // Get a sample element to extract computed CSS variables
        const sampleEl = document.createElement('div');
        sampleEl.className = `theme-${currentTheme}`;
        document.body.appendChild(sampleEl);
        
        // We'll provide fallback values in case the CSS variables aren't accessible
        let bgColor, textColor, cardBg;
        
        // Try to get CSS variables from our element, fall back to theme-specific defaults if needed
        try {
            // This may fail in some contexts, so we have fallbacks
            const computedStyle = getComputedStyle(sampleEl);
            sampleEl.remove();
            
            bgColor = currentTheme === 'colorful' ? 
                'linear-gradient(135deg, #fdf2f8, #e0f2fe, #ecfdf5)' : 
                (currentTheme === 'dark' ? '#1a202c' : '#ffffff');
                
            textColor = currentTheme === 'dark' ? '#e2e8f0' : '#333333';
            cardBg = currentTheme === 'dark' ? '#2d3748' : '#ffffff';
        } catch(e) {
            console.warn('Could not access CSS variables, using fallbacks');
            // Fallback values
            bgColor = currentTheme === 'dark' ? '#1a202c' : 
                (currentTheme === 'colorful' ? 'linear-gradient(135deg, #fdf2f8, #e0f2fe, #ecfdf5)' : '#ffffff');
            textColor = currentTheme === 'dark' ? '#e2e8f0' : '#333333';
            cardBg = currentTheme === 'dark' ? '#2d3748' : '#ffffff';
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ColorVerse - ${pageTitle}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        text-align: center;
                        font-family: Arial, sans-serif;
                        background: ${bgColor};
                        color: ${textColor};
                    }
                    h1 {
                        font-size: 24px;
                        margin-bottom: 20px;
                        color: ${textColor};
                    }
                    img {
                        max-width: 100%;
                        max-height: 90vh;
                        margin: 0 auto;
                        display: block;
                        background-color: #ffffff;
                        border-radius: 5px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }
                    .footer {
                        margin-top: 20px;
                        font-size: 12px;
                        color: ${textColor};
                        opacity: 0.8;
                    }
                    .print-button {
                        padding: 10px 20px; 
                        background-color: #3182ce; 
                        color: white; 
                        border: none; 
                        border-radius: 5px; 
                        cursor: pointer; 
                        font-weight: bold; 
                        margin-top: 10px;
                    }
                    .print-button:hover {
                        background-color: #2c5282;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                        body {
                            padding: 0;
                            background-color: white !important;
                            color: black !important;
                        }
                        h1 {
                            margin-top: 0;
                            color: black !important;
                        }
                        img {
                            background-color: white !important;
                            padding: 0 !important;
                        }
                        .footer {
                            color: #666 !important;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>${pageTitle} - Coloring Page</h1>
                <img src="${imgSrc}" alt="${pageTitle}">
                <div class="footer">
                    <p>Downloaded from ColorVerse - Free Coloring Pages & AI Art</p>
                    <p class="no-print">
                        <button onclick="window.print();" class="print-button">
                            Click to Print
                        </button>
                    </p>
                </div>
                <script>
                    // Auto-print when loaded
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}

async function sharePage(title, url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Coloring Page: ${title}`,
                text: `Check out this free coloring page: ${title}`,
                url: url,
            });
            console.log('Page shared successfully');
        } catch (err) {
            console.error('Share failed:', err.message);
        }
    } else {
        // Fallback for browsers that don't support Web Share API
        alert(`Share this page: ${url}`);
        // Or implement custom share buttons (e.g., mailto, Twitter link)
    }
}

function showLoading(isLoading) {
    if (isLoading) {
        bodyElement.classList.add('loading');
    } else {
        bodyElement.classList.remove('loading');
    }
}

// --- Routing and Initialization ---

function handleRouteChange() {
    showLoading(true);
    const hash = window.location.hash || '#';
    
    // Cancel all pending image downloads when navigation occurs
    if (window.imageLoadQueue) {
        const canceledCount = window.imageLoadQueue.cancelAll();
        if (canceledCount > 0) {
            console.log(`[Navigation] Canceled ${canceledCount} pending image downloads due to page change`);
            showToast(`Canceled ${canceledCount} pending downloads`, 'info', 1500);
        }
    }
    
    mainContent.innerHTML = ''; // Clear previous content
    
    // Disconnect any existing IntersectionObserver to prevent memory leaks
    if (window.imageObserver) {
        window.imageObserver.disconnect();
    }

    // Hide all static content sections
    document.querySelectorAll('[id^="static-"]').forEach(element => {
        element.classList.add('hidden');
    });

    // Small delay to allow UI to show loading state
    setTimeout(() => {
        try {
             if (hash === '#' || hash === '#/') {
                mainContent.innerHTML = renderHomepage(siteData);
                mainContent.classList.remove('hidden');
            } else if (hash.startsWith('#category/')) {
                const categoryPath = hash.substring('#category/'.length);
                const [categoryKey, queryString] = categoryPath.split('?');
                
                // Parse query parameters for page and sort
                const urlParams = new URLSearchParams(queryString || '');
                const currentPage = parseInt(urlParams.get('page')) || 1;
                const sortBy = urlParams.get('sort') || 'popular';
                
                // Handle seasonal category specially
                if (categoryKey === 'seasonal' && siteData.seasonal_gallery) {
                    // Create a temporary category structure for seasonal content
                    const seasonalCategory = {
                        title: siteData.seasonal_gallery.title,
                        description: siteData.seasonal_gallery.description,
                        items: siteData.seasonal_gallery.items
                    };
                    mainContent.innerHTML = renderCategory(seasonalCategory, categoryKey, currentPage, sortBy);
                } else {
                    // Use progressive loading for regular categories
                    renderCategoryWithProgressiveLoading(categoryKey, currentPage, sortBy);
                    return; // Exit early since renderCategoryWithProgressiveLoading handles everything
                }
                mainContent.classList.remove('hidden');
            } else if (hash.startsWith('#item/')) {
                const parts = hash.substring('#item/'.length).split('/');
                if (parts.length === 2) {
                    const categoryKey = parts[0];
                    const itemKey = parts[1];
                    
                    let itemData = null;
                    
                    // Check if it's a seasonal item
                    if (categoryKey === 'seasonal' && siteData?.seasonal_gallery?.items?.[itemKey]) {
                        itemData = siteData.seasonal_gallery.items[itemKey];
                    } else {
                        // Regular category item
                        itemData = siteData?.categories?.[categoryKey]?.items?.[itemKey];
                    }
                    
                    mainContent.innerHTML = renderItem(itemData, categoryKey, itemKey);
                    mainContent.classList.remove('hidden');
                } else {
                     mainContent.innerHTML = '<p class="text-center text-red-500">Invalid item URL.</p>';
                     mainContent.classList.remove('hidden');
                }
            } else if (hash === '#about') {
                // Show static about page content
                document.getElementById('static-about').classList.remove('hidden');
                mainContent.classList.add('hidden');
            } else if (hash === '#privacy') {
                // Show static privacy policy content
                document.getElementById('static-privacy').classList.remove('hidden');
                mainContent.classList.add('hidden');
            } else if (hash === '#terms') {
                // Show static terms of service content
                document.getElementById('static-terms').classList.remove('hidden');
                mainContent.classList.add('hidden');
            } else if (hash === '#contact') {
                // Show static contact page content
                document.getElementById('static-contact').classList.remove('hidden');
                mainContent.classList.add('hidden');
            } else if (hash === '#daily-pick') {
                // Handle Today's Special Pick page
                const dailyPickData = siteData.daily_pick || {};
                mainContent.innerHTML = renderDailyPickPage(dailyPickData);
                mainContent.classList.remove('hidden');
            } else if (hash === '#donate') {
                mainContent.innerHTML = `
                    <nav aria-label="breadcrumb" class="flex items-center mb-6 mt-2 text-sm py-2">
                        <a href="#" class="hover:text-primary-600 transition-colors flex items-center opacity-70">
                            <i class="fas fa-home mr-1"></i> Home
                        </a>
                        <i class="fas fa-chevron-right mx-2 opacity-50"></i>
                        <span class="font-medium">Support ColorVerse</span>
                    </nav>
                    
                    <h1 class="text-3xl font-bold mb-6">Support ColorVerse</h1>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
                        <h2 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Why Support Us?</h2>
                        <p class="mb-4 text-gray-700 dark:text-gray-300">ColorVerse is dedicated to making high-quality coloring pages accessible to everyone. We provide all our content for free, but maintaining and improving our platform requires resources. Your support helps us:</p>
                        
                        <ul class="list-disc ml-6 mb-6 space-y-2 text-gray-700 dark:text-gray-300">
                            <li>Keep our coloring pages completely free for everyone</li>
                            <li>Develop new features and improve our AI generation technology</li>
                            <li>Add more diverse categories and designs</li>
                            <li>Cover our server and development costs</li>
                            <li>Keep ads minimal and non-intrusive</li>
                        </ul>
                        
                        <p class="text-gray-700 dark:text-gray-300">Every contribution, no matter the size, makes a difference in our ability to continue providing this creative resource.</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                            <h2 class="text-2xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                                <i class="fas fa-heart text-red-500 mr-3"></i>
                                One-Time Donation
                            </h2>
                            <p class="mb-6 text-gray-700 dark:text-gray-300">Make a single contribution to support our ongoing efforts. Every donation helps!</p>
                            
                            <div class="space-y-4">
                                <button class="w-full py-3 bg-primary-100 hover:bg-primary-200 text-primary-800 font-medium rounded-lg transition-colors">$5 Donation</button>
                                <button class="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">$10 Donation</button>
                                <button class="w-full py-3 bg-primary-100 hover:bg-primary-200 text-primary-800 font-medium rounded-lg transition-colors">$25 Donation</button>
                                <button class="w-full py-3 bg-primary-100 hover:bg-primary-200 text-primary-800 font-medium rounded-lg transition-colors">Custom Amount</button>
                            </div>
                            
                            <div class="mt-6 flex flex-wrap gap-3">
                                <button class="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center">
                                    <i class="fab fa-paypal mr-2"></i> PayPal
                                </button>
                                <button class="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center">
                                    <i class="fas fa-credit-card mr-2"></i> Card
                                </button>
                            </div>
                        </div>
                        
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                            <h2 class="text-2xl font-semibold mb-4 flex items-center text-gray-900 dark:text-gray-100">
                                <i class="fas fa-star text-yellow-500 mr-3"></i>
                                Become a Patron
                            </h2>
                            <p class="mb-6 text-gray-700 dark:text-gray-300">Support us monthly and receive special perks as a thank you for your ongoing support!</p>
                            
                            <div class="space-y-6">
                                <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h3 class="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Art Enthusiast - $5/month</h3>
                                    <ul class="text-sm space-y-1 mb-3 text-gray-600 dark:text-gray-400">
                                        <li>• Ad-free browsing experience</li>
                                        <li>• Special thank you in our monthly newsletter</li>
                                    </ul>
                                </div>
                                
                                <div class="p-4 border-2 border-primary-500 rounded-lg relative">
                                    <span class="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/2 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">Popular</span>
                                    <h3 class="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Creative Supporter - $10/month</h3>
                                    <ul class="text-sm space-y-1 mb-3 text-gray-600 dark:text-gray-400">
                                        <li>• All Art Enthusiast benefits</li>
                                        <li>• Early access to new coloring page collections</li>
                                        <li>• Vote on upcoming coloring page themes</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <a href="https://patreon.com/" target="_blank" rel="noopener noreferrer" class="mt-6 block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-center">
                                <i class="fab fa-patreon mr-2"></i> Join on Patreon
                            </a>
                        </div>
                    </div>
                    
                    <div class="accent-panel p-6 text-white mb-8">
                        <h2 class="text-2xl font-semibold mb-4">Other Ways to Support</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <div class="rounded-full bg-white bg-opacity-20 w-16 h-16 flex items-center justify-center text-3xl mb-4">
                                    <i class="fas fa-share-alt"></i>
                                </div>
                                <h3 class="text-xl font-medium mb-2">Share ColorVerse</h3>
                                <p class="text-white text-opacity-90">Help us grow by sharing ColorVerse with friends, family, and on social media.</p>
                            </div>
                            
                            <div>
                                <div class="rounded-full bg-white bg-opacity-20 w-16 h-16 flex items-center justify-center text-3xl mb-4">
                                    <i class="fas fa-comment"></i>
                                </div>
                                <h3 class="text-xl font-medium mb-2">Provide Feedback</h3>
                                <p class="text-white text-opacity-90">Your input helps us improve! Let us know what you like and how we can make ColorVerse even better.</p>
                            </div>
                            
                            <div>
                                <div class="rounded-full bg-white bg-opacity-20 w-16 h-16 flex items-center justify-center text-3xl mb-4">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <h3 class="text-xl font-medium mb-2">Subscribe</h3>
                                <p class="text-white text-opacity-90">Join our newsletter to stay updated and engaged with our growing community.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
                        <h2 class="text-2xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Thank You!</h2>
                        <p class="mb-4 text-gray-700 dark:text-gray-300">We're grateful for every form of support. Your contributions help us continue to provide free, high-quality coloring pages to our community.</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">ColorVerse is not a registered non-profit organization. Donations are not tax-deductible.</p>
                    </div>
                `;
                mainContent.classList.remove('hidden');
            } else if (hash === '#all-categories') {
                // Show all categories page
                mainContent.innerHTML = renderAllCategoriesPage(siteData);
                mainContent.classList.remove('hidden');
            } else {
                // Handle any other routes
                mainContent.innerHTML = `<div class="text-center py-8">
                    <h2 class="text-2xl font-semibold mb-4">Page Not Found</h2>
                    <p class="mb-4">Sorry, the page you're looking for doesn't exist or is still under construction.</p>
                    <a href="#" class="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">Return Home</a>
                </div>`;
                mainContent.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Error rendering route:", error);
            mainContent.innerHTML = '<p class="text-center text-red-500">An error occurred while loading this page. Please try again later.</p>';
            mainContent.classList.remove('hidden');
        } finally {
            showLoading(false);
            window.scrollTo(0, 0); // Scroll to top on page change
            
            // Initialize lazy loading for images
            setTimeout(() => {
                setupLazyLoading();
                
                // Setup hover preview for any existing loaded images that don't have it
                document.querySelectorAll('img[src]:not([data-src])').forEach(img => {
                    if (img.src && img.src !== PLACEHOLDER_IMAGE && !img.hasAttribute('data-hover-setup')) {
                        setupImageHoverPreview(img);
                        img.setAttribute('data-hover-setup', 'true');
                    }
                });
            }, 100);
        }
    }, 100); // Short delay for visual feedback
}

// --- AI Data Generation ---

// Check if we need to refresh the cache
function shouldRefreshCache() {
    // First check if we have cached data at all
    const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
    if (!cachedData) return true;
    
    // Check if cached data has the expected structure with 25 categories
    try {
        const parsedData = JSON.parse(cachedData);
        const categoryCount = Object.keys(parsedData.categories || {}).length;
        
        // If we don't have all 25 categories, force refresh
        if (categoryCount < 25) {
            console.log(`Cached data has only ${categoryCount} categories, forcing refresh to get all 25`);
            return true;
        }
        
        // Check if categories have proper item structure with title/description
        let hasProperStructure = true;
        for (const [catKey, category] of Object.entries(parsedData.categories || {})) {
            const items = Object.values(category.items || {});
            if (items.length === 0) {
                hasProperStructure = false;
                break;
            }
            
            // Check if first item has proper structure
            const firstItem = items[0];
            if (!firstItem || !firstItem.title || !firstItem.description) {
                console.log(`Category ${catKey} has improper item structure, forcing refresh`);
                hasProperStructure = false;
                break;
            }
        }
        
        if (!hasProperStructure) {
            return true;
        }
        
    } catch (e) {
        console.log('Error parsing cached data, forcing refresh');
        return true;
    }
    
    // If we have good data, check timestamp
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    if (!timestamp) return true;
    
    const cacheTime = new Date(parseInt(timestamp));
    const now = new Date();
    
    // Calculate expiration time based on environment
    let refreshInterval;
    if (IS_DEV_MODE) {
        // Dev mode: Refresh every 10 minutes
        refreshInterval = CACHE_DURATION.DEV_MINUTES * 60 * 1000;
        console.log(`Dev mode: Cache refresh interval is ${CACHE_DURATION.DEV_MINUTES} minutes`);
    } else {
        // Production mode: Refresh 4 times a day (every 6 hours)
        refreshInterval = CACHE_DURATION.HOURS * 60 * 60 * 1000;
    }
    
    // Check if we've exceeded our refresh interval
    return (now.getTime() - cacheTime.getTime()) > refreshInterval;
}

async function generateSiteData() {
    console.log("Initializing site data...");
    showLoading(true); // Ensure loading is shown during generation
    
    // FORCE CACHE CLEAR: Remove this after one successful load with 25 categories
    const cachedData = loadFromCache();
    if (cachedData) {
        const categoryCount = Object.keys(cachedData.categories || {}).length;
        if (categoryCount < 25) {
            console.log(`Clearing old cache with only ${categoryCount} categories`);
            localStorage.removeItem(CACHE_KEY_SITE_DATA);
            localStorage.removeItem(CACHE_KEY_TIMESTAMP);
            localStorage.removeItem(CACHE_KEY_IMAGE_URLS);
        }
    }
    
    // First try to load from cache
    const validCachedData = loadFromCache();
    const needsRefresh = shouldRefreshCache();
    
    if (validCachedData && !needsRefresh) {
        console.log("Loading site data from cache...");
        siteData = validCachedData;
        
        // Load cached image URLs if available
        try {
            const cachedImageUrls = localStorage.getItem(CACHE_KEY_IMAGE_URLS);
            if (cachedImageUrls) {
                const urlMap = JSON.parse(cachedImageUrls);
                for (const [key, value] of Object.entries(urlMap)) {
                    imageUrlCache.set(key, value);
                }
                console.log(`Loaded ${imageUrlCache.size} cached image URLs`);
            }
        } catch (e) {
            console.warn('Failed to load cached image URLs:', e);
        }
        
        showLoading(false);
        return validCachedData;
    }
    
    // If we have cached data but need a refresh, use the cached data first 
    // and update in the background
    if (validCachedData && needsRefresh) {
        console.log("Using cached data while refreshing in background...");
        siteData = validCachedData;
        showLoading(false);
        
        // Start a background refresh
        setTimeout(() => {
            fetchFreshData().then(newData => {
                if (newData) {
                    console.log("Background refresh complete");
                    siteData = newData;
                    saveToCache(newData);
                    // Don't force a page reload here, let natural navigation handle it
                }
            }).catch(err => {
                console.warn("Background refresh failed:", err);
                // Continue using the cached data
            });
        }, 100);
        
        return validCachedData;
    }
    
    console.log("Cache invalid or not found, generating front page data first...");
    return fetchFrontPageData();
}

// Progressive loading state
let categoryLoadingState = {
    isComplete: false,
    loadedCategories: new Set(),
    loadingPromises: new Map(),
    frontPageDataOnly: false
};

// Generate just the front page data (brand, seasonal, and basic category info)
async function fetchFrontPageData() {
    const currentSeason = getCurrentSeason();
    const seasonalTheme = SEASONAL_THEMES[currentSeason];
    
    // Define the 25 categories with just basic info for the front page
    const categoryList = [
        'animals', 'fantasy', 'mandalas', 'vehicles', 'nature', 'food', 'space', 
        'abstract', 'flowers', 'ocean', 'dinosaurs', 'mythical', 'birds', 
        'architecture', 'sports', 'memes', 'adult_zen', 'spicy_bold', 'children_characters', 
        'vintage_retro', 'gaming_tech', 'holidays', 'music_dance', 'steampunk', 'tribal_ethnic'
    ];
    
    const prompt = `
Generate front page data for 'ColorVerse', a free coloring page website.
The output MUST be a valid JSON object with this EXACT structure:
{
  "brand": {
    "name": "ColorVerse",
    "vision": "A short, inspiring vision statement for the ColorVerse brand."
  },
  "seasonal_gallery": {
    "title": "${seasonalTheme.name}",
    "subtitle": "${seasonalTheme.description}",
    "description": "${seasonalTheme.description}",
    "items": {
      "seasonal_item_1": { "title": "Unique ${currentSeason} Title 1", "description": "Detailed description for ${currentSeason} themed coloring page 1" },
      "seasonal_item_2": { "title": "Unique ${currentSeason} Title 2", "description": "Detailed description for ${currentSeason} themed coloring page 2" },
      "seasonal_item_3": { "title": "Unique ${currentSeason} Title 3", "description": "Detailed description for ${currentSeason} themed coloring page 3" },
      "seasonal_item_4": { "title": "Unique ${currentSeason} Title 4", "description": "Detailed description for ${currentSeason} themed coloring page 4" },
      "seasonal_item_5": { "title": "Unique ${currentSeason} Title 5", "description": "Detailed description for ${currentSeason} themed coloring page 5" },
      "seasonal_item_6": { "title": "Unique ${currentSeason} Title 6", "description": "Detailed description for ${currentSeason} themed coloring page 6" },
      "seasonal_item_7": { "title": "Unique ${currentSeason} Title 7", "description": "Detailed description for ${currentSeason} themed coloring page 7" },
      "seasonal_item_8": { "title": "Unique ${currentSeason} Title 8", "description": "Detailed description for ${currentSeason} themed coloring page 8" },
      "seasonal_item_9": { "title": "Unique ${currentSeason} Title 9", "description": "Detailed description for ${currentSeason} themed coloring page 9" },
      "seasonal_item_10": { "title": "Unique ${currentSeason} Title 10", "description": "Detailed description for ${currentSeason} themed coloring page 10" },
      "seasonal_item_11": { "title": "Unique ${currentSeason} Title 11", "description": "Detailed description for ${currentSeason} themed coloring page 11" },
      "seasonal_item_12": { "title": "Unique ${currentSeason} Title 12", "description": "Detailed description for ${currentSeason} themed coloring page 12" }
    }
  },
  "categories": {
    "animals": { "title": "Animal Kingdom", "description": "Discover the wonderful world of animals from cute pets to wild creatures.", "keywords": ["animals", "wildlife", "pets", "zoo", "creatures"], "items": { "sample_item": { "title": "Majestic Mountain Eagle", "description": "A detailed animal coloring page" } } },
    "fantasy": { "title": "Fantasy & Magic", "description": "Enter magical realms filled with dragons, unicorns, and mystical adventures.", "keywords": ["fantasy", "magic", "dragons", "unicorns", "mystical"], "items": { "sample_item": { "title": "Enchanted Forest Dragon", "description": "A detailed fantasy coloring page" } } },
    "mandalas": { "title": "Mandala Meditation", "description": "Find peace and focus with intricate mandala patterns for mindful coloring.", "keywords": ["mandalas", "meditation", "patterns", "zen", "mindfulness"], "items": { "sample_item": { "title": "Cosmic Flower Mandala", "description": "A detailed mandala coloring page" } } },
    "vehicles": { "title": "Vehicles & Transportation", "description": "Explore cars, trucks, planes, and all kinds of amazing vehicles.", "keywords": ["vehicles", "cars", "trucks", "planes", "transportation"], "items": { "sample_item": { "title": "Vintage Racing Speedster", "description": "A detailed vehicle coloring page" } } },
    "nature": { "title": "Nature & Landscapes", "description": "Beautiful scenes from nature including forests, mountains, and gardens.", "keywords": ["nature", "landscapes", "trees", "flowers", "outdoors"], "items": { "sample_item": { "title": "Sunset Forest Clearing", "description": "A detailed nature coloring page" } } },
    "food": { "title": "Delicious Food & Treats", "description": "Tasty treats, healthy foods, and culinary delights to color.", "keywords": ["food", "treats", "cooking", "desserts", "cuisine"], "items": { "sample_item": { "title": "Gourmet Pizza Delight", "description": "A detailed food coloring page" } } },
    "space": { "title": "Space & Astronomy", "description": "Blast off to explore planets, stars, and cosmic adventures.", "keywords": ["space", "planets", "stars", "astronomy", "rockets"], "items": { "sample_item": { "title": "Galactic Space Station", "description": "A detailed space coloring page" } } },
    "abstract": { "title": "Abstract Art", "description": "Creative abstract designs and artistic patterns for imagination.", "keywords": ["abstract", "art", "patterns", "creative", "artistic"], "items": { "sample_item": { "title": "Flowing Energy Patterns", "description": "A detailed abstract coloring page" } } },
    "flowers": { "title": "Beautiful Flowers", "description": "Gorgeous floral designs from simple blooms to elaborate bouquets.", "keywords": ["flowers", "floral", "gardens", "blooms", "botanical"], "items": { "sample_item": { "title": "Rose Garden Paradise", "description": "A detailed flower coloring page" } } },
    "ocean": { "title": "Ocean & Sea Life", "description": "Dive into underwater worlds filled with sea creatures and coral reefs.", "keywords": ["ocean", "sea", "marine", "underwater", "aquatic"], "items": { "sample_item": { "title": "Coral Reef Adventure", "description": "A detailed ocean coloring page" } } },
    "dinosaurs": { "title": "Prehistoric Dinosaurs", "description": "Travel back in time to the age of mighty dinosaurs and ancient creatures.", "keywords": ["dinosaurs", "prehistoric", "fossils", "ancient", "paleontology"], "items": { "sample_item": { "title": "T-Rex Jungle Hunter", "description": "A detailed dinosaur coloring page" } } },
    "mythical": { "title": "Mythical Creatures", "description": "Legendary beings from folklore and mythology around the world.", "keywords": ["mythical", "legends", "folklore", "creatures", "mythology"], "items": { "sample_item": { "title": "Phoenix Fire Dancer", "description": "A detailed mythical creature coloring page" } } },
    "birds": { "title": "Birds & Flight", "description": "Soar with beautiful birds from tiny hummingbirds to majestic eagles.", "keywords": ["birds", "flight", "wings", "feathers", "avian"], "items": { "sample_item": { "title": "Peacock Feather Glory", "description": "A detailed bird coloring page" } } },
    "architecture": { "title": "Buildings & Architecture", "description": "Explore amazing buildings, castles, and architectural wonders.", "keywords": ["architecture", "buildings", "castles", "monuments", "structures"], "items": { "sample_item": { "title": "Gothic Cathedral Spires", "description": "A detailed architecture coloring page" } } },
    "sports": { "title": "Sports & Recreation", "description": "Active sports, games, and recreational activities for all ages.", "keywords": ["sports", "games", "recreation", "athletics", "competition"], "items": { "sample_item": { "title": "Soccer Championship Match", "description": "A detailed sports coloring page" } } },
    "memes": { "title": "Internet Memes & Pop Culture", "description": "Fun and trendy internet memes, viral content, and pop culture references.", "keywords": ["memes", "internet", "viral", "trending", "pop culture"], "items": { "sample_item": { "title": "Viral Cat Sensation", "description": "A detailed meme coloring page" } } },
    "adult_zen": { "title": "Adult Zen & Sophistication", "description": "Complex, sophisticated designs for adult colorists seeking detailed meditation.", "keywords": ["adult", "sophisticated", "complex", "detailed", "zen"], "items": { "sample_item": { "title": "Wine Cellar Meditation", "description": "A detailed zen coloring page" } } },
    "spicy_bold": { "title": "Bold & Spicy Designs", "description": "Edgy, bold patterns with attitude - skulls, tattoo-style, and rock themes.", "keywords": ["bold", "edgy", "skulls", "tattoo", "rock"], "items": { "sample_item": { "title": "Skull Rock Anthem", "description": "A detailed bold coloring page" } } },
    "children_characters": { "title": "Cute Children's Characters", "description": "Beloved children's characters and friendly cartoon companions for young colorists.", "keywords": ["children", "characters", "cartoon", "friendly", "kids"], "items": { "sample_item": { "title": "Happy Teddy Bear Picnic", "description": "A detailed children's character coloring page" } } },
    "vintage_retro": { "title": "Vintage & Retro Vibes", "description": "Nostalgic designs from past decades with classic style and charm.", "keywords": ["vintage", "retro", "classic", "nostalgic", "antique"], "items": { "sample_item": { "title": "1950s Diner Dreams", "description": "A detailed vintage coloring page" } } },
    "gaming_tech": { "title": "Gaming & Technology", "description": "Video game characters, retro gaming, robots, and futuristic technology.", "keywords": ["gaming", "technology", "robots", "futuristic", "digital"], "items": { "sample_item": { "title": "Cyber Robot Guardian", "description": "A detailed gaming coloring page" } } },
    "holidays": { "title": "Holidays & Celebrations", "description": "Festive designs for all holidays and special celebrations year-round.", "keywords": ["holidays", "celebrations", "festive", "seasonal", "traditions"], "items": { "sample_item": { "title": "Christmas Morning Magic", "description": "A detailed holiday coloring page" } } },
    "music_dance": { "title": "Music & Dance", "description": "Musical instruments, dance poses, and rhythm-inspired artistic designs.", "keywords": ["music", "dance", "instruments", "rhythm", "performance"], "items": { "sample_item": { "title": "Jazz Orchestra Night", "description": "A detailed music coloring page" } } },
    "steampunk": { "title": "Steampunk & Victorian", "description": "Intricate steampunk machinery, Victorian elegance, and clockwork mechanisms.", "keywords": ["steampunk", "victorian", "gears", "clockwork", "mechanical"], "items": { "sample_item": { "title": "Clockwork Airship Captain", "description": "A detailed steampunk coloring page" } } },
    "tribal_ethnic": { "title": "Tribal & Cultural Patterns", "description": "Beautiful traditional patterns and designs from cultures around the world.", "keywords": ["tribal", "cultural", "traditional", "ethnic", "patterns"], "items": { "sample_item": { "title": "Aztec Sun Ceremony", "description": "A detailed tribal coloring page" } } }
  }
}

Focus on ${seasonalTheme.prompt} themes for seasonal items.
Examples: ${currentSeason === 'spring' ? 'cherry blossoms, Easter, baby animals, garden flowers, rain showers' :
             currentSeason === 'summer' ? 'beaches, pools, ice cream, camping, outdoor activities' :
             currentSeason === 'autumn' ? 'Halloween, harvest, falling leaves, pumpkins, cozy scenes' :
             'Christmas, snow, winter sports, hot cocoa, holiday celebrations'}

CRITICAL TITLE REQUIREMENTS:
- ALL seasonal item titles must be unique, creative, and evocative
- NO generic patterns like "Seasonal Item Title X" or "Sample X"
- Use descriptive adjectives + specific nouns that evoke the actual coloring page
- Each title should paint a vivid picture of what someone would color
- Make titles engaging and specific to the ${currentSeason} theme

Examples of GOOD titles for ${currentSeason}:
- "Snowflake Ballet Dancer" (winter)
- "Autumn Harvest Festival" (fall)
- "Cherry Blossom Garden" (spring)
- "Beach Sandcastle Adventure" (summer)

Examples of BAD titles (NEVER use these patterns):
- "Seasonal Item Title 1"
- "Sample ${currentSeason}"
- "Unique ${currentSeason} Title X"
- Any generic numbered pattern

Create 12 unique, engaging titles that capture the magic of ${currentSeason} coloring pages.

Output ONLY the JSON object, no explanations.`;

    try {
        console.log("Generating front page data...");
        showToast('Loading homepage content...', 'info', 3000);
        
        const frontPageData = await callAIAPI(prompt);
        
        // Mark as front page only
        categoryLoadingState.frontPageDataOnly = true;
        categoryLoadingState.loadedCategories.clear();
        
        siteData = frontPageData;
        showLoading(false);
        
        // Start loading full categories in background
        setTimeout(() => {
            loadCategoriesInBackground();
        }, 1000);
        
        return frontPageData;
        
    } catch (error) {
        console.error("Failed to generate front page data:", error);
        showToast('Failed to load content. Using sample data.', 'error');
        
        const sampleData = getSampleSiteData();
        siteData = sampleData;
        showLoading(false);
        return sampleData;
    }
}

// Load individual categories in the background
async function loadCategoriesInBackground() {
    const categoryList = [
        'animals', 'fantasy', 'mandalas', 'vehicles', 'nature', 'food', 'space', 
        'abstract', 'flowers', 'ocean', 'dinosaurs', 'mythical', 'birds', 
        'architecture', 'sports', 'memes', 'adult_zen', 'spicy_bold', 'children_characters', 
        'vintage_retro', 'gaming_tech', 'holidays', 'music_dance', 'steampunk', 'tribal_ethnic'
    ];
    
    console.log("Starting background category loading...");
    showToast('Loading additional categories in background...', 'info', 2000);
    
    let loadedCount = 0;
    const totalCategories = categoryList.length;
    
    // Load categories sequentially to avoid overwhelming the API
    for (let i = 0; i < categoryList.length; i++) {
        const categoryKey = categoryList[i];
        console.log(`Loading category ${i + 1}/${categoryList.length}: ${categoryKey}`);
        
        try {
            const categoryData = await loadSingleCategory(categoryKey);
            loadedCount++;
            
            // Update progress
            const progress = Math.round((loadedCount / totalCategories) * 100);
            console.log(`✅ Category ${categoryKey} loaded successfully (${loadedCount}/${totalCategories} - ${progress}%)`);
            
            // Update UI progress every 5 categories
            if (loadedCount % 5 === 0) {
                showToast(`Loaded ${loadedCount}/${totalCategories} categories (${progress}%)`, 'info', 2000);
            }
            
            // Add 5-second delay between categories (except for the last one)
            if (i < categoryList.length - 1) {
                console.log('Waiting 5 seconds before next category...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
        } catch (error) {
            console.error(`❌ Failed to load category ${categoryKey}:`, error);
            
            // Add longer delay after error before continuing
            if (i < categoryList.length - 1) {
                console.log('Waiting 8 seconds after error before next category...');
                await new Promise(resolve => setTimeout(resolve, 8000));
            }
        }
    }
    
    // Mark as complete
    categoryLoadingState.isComplete = true;
    categoryLoadingState.frontPageDataOnly = false;
    
    // Save complete data to cache
    saveToCache(siteData);
    
    console.log("Background category loading complete!");
    showToast('All categories loaded successfully!', 'success', 3000);
}

// Load a single category with full 160 items
async function loadSingleCategory(categoryKey) {
    // Check if already loaded or loading
    if (categoryLoadingState.loadedCategories.has(categoryKey)) {
        return siteData.categories[categoryKey];
    }
    
    if (categoryLoadingState.loadingPromises.has(categoryKey)) {
        return categoryLoadingState.loadingPromises.get(categoryKey);
    }
    
    const categoryInfo = getCategoryInfo(categoryKey);
    if (!categoryInfo) {
        console.warn(`Unknown category: ${categoryKey}`);
        return null;
    }
    
    const prompt = `
Generate complete category data for "${categoryKey}" in ColorVerse coloring page website.
Output MUST be a valid JSON object with this EXACT structure:
{
  "title": "${categoryInfo.title}",
  "description": "${categoryInfo.description}",
  "keywords": ${JSON.stringify(categoryInfo.keywords)},
  "items": {
    "${categoryKey}_item_1": { "title": "Unique Creative Title 1", "description": "Detailed specific ${categoryKey} coloring page description 1" },
    "${categoryKey}_item_2": { "title": "Unique Creative Title 2", "description": "Detailed specific ${categoryKey} coloring page description 2" },
    // ... continue to exactly 160 ${categoryKey} items total
    "${categoryKey}_item_160": { "title": "Unique Creative Title 160", "description": "Detailed specific ${categoryKey} coloring page description 160" }
  }
}

Create exactly 160 unique items for ${categoryKey}. Each item MUST have both "title" and "description" properties.

CRITICAL REQUIREMENTS FOR TITLES:
- Each title MUST be unique, creative, and specific to the actual coloring page content
- NEVER use generic words like "Sample", "Item", "Title", or category names as prefixes
- Examples of GOOD titles: "Majestic Mountain Eagle", "Enchanted Forest Dragon", "Victorian Steam Locomotive", "Delicate Rose Garden"
- Examples of BAD titles: "Sample Animal", "Item Title 1", "Steampunk Page", "Fantasy Design"
- Titles should evoke the specific subject and mood of the coloring page
- Use descriptive adjectives and specific nouns that paint a clear picture

Item descriptions MUST be detailed enough for AI image generation of black and white line art coloring pages.
Include variety in complexity levels - some simple for beginners, some complex for advanced colorists.
${categoryInfo.specialInstructions || ''}

Output ONLY the JSON object, no explanations.`;

    const loadingPromise = (async () => {
        try {
            console.log(`Loading category: ${categoryKey}`);
            const categoryData = await callAIAPI(prompt);
            
            // Update the site data
            if (siteData && siteData.categories) {
                siteData.categories[categoryKey] = categoryData;
                categoryLoadingState.loadedCategories.add(categoryKey);
            }
            
            return categoryData;
            
        } catch (error) {
            console.error(`Failed to load category ${categoryKey}:`, error);
            // Keep the basic category info as fallback
            return siteData.categories[categoryKey];
        } finally {
            categoryLoadingState.loadingPromises.delete(categoryKey);
        }
    })();
    
    categoryLoadingState.loadingPromises.set(categoryKey, loadingPromise);
    return loadingPromise;
}

// Get category information for generation
function getCategoryInfo(categoryKey) {
    const categoryMap = {
        'animals': { 
            title: 'Animal Kingdom', 
            description: 'Discover the wonderful world of animals from cute pets to wild creatures.',
            keywords: ['animals', 'wildlife', 'pets', 'zoo', 'creatures'],
            specialInstructions: 'Include domestic pets, wild animals, farm animals, zoo animals, and marine life.'
        },
        'fantasy': { 
            title: 'Fantasy & Magic', 
            description: 'Enter magical realms filled with dragons, unicorns, and mystical adventures.',
            keywords: ['fantasy', 'magic', 'dragons', 'unicorns', 'mystical'],
            specialInstructions: 'Include dragons, unicorns, fairies, wizards, magical castles, and mythical creatures.'
        },
        'mandalas': { 
            title: 'Mandala Meditation', 
            description: 'Find peace and focus with intricate mandala patterns for mindful coloring.',
            keywords: ['mandalas', 'meditation', 'patterns', 'zen', 'mindfulness'],
            specialInstructions: 'Include geometric mandalas, floral mandalas, sacred geometry, and meditation patterns.'
        },
        'vehicles': { 
            title: 'Vehicles & Transportation', 
            description: 'Explore cars, trucks, planes, and all kinds of amazing vehicles.',
            keywords: ['vehicles', 'cars', 'trucks', 'planes', 'transportation'],
            specialInstructions: 'Include cars, trucks, airplanes, boats, trains, motorcycles, and emergency vehicles.'
        },
        'nature': { 
            title: 'Nature & Landscapes', 
            description: 'Beautiful scenes from nature including forests, mountains, and gardens.',
            keywords: ['nature', 'landscapes', 'trees', 'flowers', 'outdoors'],
            specialInstructions: 'Include forests, mountains, beaches, gardens, trees, and natural landscapes.'
        },
        'food': { 
            title: 'Delicious Food & Treats', 
            description: 'Tasty treats, healthy foods, and culinary delights to color.',
            keywords: ['food', 'treats', 'cooking', 'desserts', 'cuisine'],
            specialInstructions: 'Include fruits, vegetables, desserts, cooking scenes, and international cuisine.'
        },
        'space': { 
            title: 'Space & Astronomy', 
            description: 'Blast off to explore planets, stars, and cosmic adventures.',
            keywords: ['space', 'planets', 'stars', 'astronomy', 'rockets'],
            specialInstructions: 'Include planets, rockets, astronauts, space stations, and cosmic scenes.'
        },
        'abstract': { 
            title: 'Abstract Art', 
            description: 'Creative abstract designs and artistic patterns for imagination.',
            keywords: ['abstract', 'art', 'patterns', 'creative', 'artistic'],
            specialInstructions: 'Include geometric patterns, abstract shapes, artistic designs, and creative compositions.'
        },
        'flowers': { 
            title: 'Beautiful Flowers', 
            description: 'Gorgeous floral designs from simple blooms to elaborate bouquets.',
            keywords: ['flowers', 'floral', 'gardens', 'blooms', 'botanical'],
            specialInstructions: 'Include roses, sunflowers, daisies, bouquets, and botanical illustrations.'
        },
        'ocean': { 
            title: 'Ocean & Sea Life', 
            description: 'Dive into underwater worlds filled with sea creatures and coral reefs.',
            keywords: ['ocean', 'sea', 'marine', 'underwater', 'aquatic'],
            specialInstructions: 'Include fish, dolphins, coral reefs, underwater scenes, and marine life.'
        },
        'dinosaurs': { 
            title: 'Prehistoric Dinosaurs', 
            description: 'Travel back in time to the age of mighty dinosaurs and ancient creatures.',
            keywords: ['dinosaurs', 'prehistoric', 'fossils', 'ancient', 'paleontology'],
            specialInstructions: 'Include T-Rex, Triceratops, Stegosaurus, and various dinosaur species in prehistoric settings.'
        },
        'mythical': { 
            title: 'Mythical Creatures', 
            description: 'Legendary beings from folklore and mythology around the world.',
            keywords: ['mythical', 'legends', 'folklore', 'creatures', 'mythology'],
            specialInstructions: 'Include griffins, phoenixes, centaurs, and creatures from various mythologies.'
        },
        'birds': { 
            title: 'Birds & Flight', 
            description: 'Soar with beautiful birds from tiny hummingbirds to majestic eagles.',
            keywords: ['birds', 'flight', 'wings', 'feathers', 'avian'],
            specialInstructions: 'Include eagles, hummingbirds, owls, peacocks, and birds in flight.'
        },
        'architecture': { 
            title: 'Buildings & Architecture', 
            description: 'Explore amazing buildings, castles, and architectural wonders.',
            keywords: ['architecture', 'buildings', 'castles', 'monuments', 'structures'],
            specialInstructions: 'Include castles, cathedrals, modern buildings, and architectural landmarks.'
        },
        'sports': { 
            title: 'Sports & Recreation', 
            description: 'Active sports, games, and recreational activities for all ages.',
            keywords: ['sports', 'games', 'recreation', 'athletics', 'competition'],
            specialInstructions: 'Include soccer, basketball, swimming, and various recreational activities.'
        },
        'memes': { 
            title: 'Internet Memes & Pop Culture', 
            description: 'Fun and trendy internet memes, viral content, and pop culture references.',
            keywords: ['memes', 'internet', 'viral', 'trending', 'pop culture'],
            specialInstructions: 'Include popular meme formats, viral animals, and internet culture references suitable for coloring.'
        },
        'adult_zen': { 
            title: 'Adult Zen & Sophistication', 
            description: 'Complex, sophisticated designs for adult colorists seeking detailed meditation.',
            keywords: ['adult', 'sophisticated', 'complex', 'detailed', 'zen'],
            specialInstructions: 'Include intricate patterns, wine themes, coffee art, and sophisticated motifs.'
        },
        'spicy_bold': { 
            title: 'Bold & Spicy Designs', 
            description: 'Edgy, bold patterns with attitude - skulls, tattoo-style, and rock themes.',
            keywords: ['bold', 'edgy', 'skulls', 'tattoo', 'rock'],
            specialInstructions: 'Include skull art, tattoo designs, rock band themes, and edgy patterns.'
        },
        'children_characters': { 
            title: 'Cute Children\'s Characters', 
            description: 'Beloved children\'s characters and friendly cartoon companions for young colorists.',
            keywords: ['children', 'characters', 'cartoon', 'friendly', 'kids'],
            specialInstructions: 'Include popular children\'s cartoon characters, fairy tale characters, and kid-friendly mascots.'
        },
        'vintage_retro': { 
            title: 'Vintage & Retro Vibes', 
            description: 'Nostalgic designs from past decades with classic style and charm.',
            keywords: ['vintage', 'retro', 'classic', 'nostalgic', 'antique'],
            specialInstructions: 'Include 1950s diner themes, vintage cars, retro patterns, and classic designs.'
        },
        'gaming_tech': { 
            title: 'Gaming & Technology', 
            description: 'Video game characters, retro gaming, robots, and futuristic technology.',
            keywords: ['gaming', 'technology', 'robots', 'futuristic', 'digital'],
            specialInstructions: 'Include game controllers, pixel art, robots, and sci-fi technology.'
        },
        'holidays': { 
            title: 'Holidays & Celebrations', 
            description: 'Festive designs for all holidays and special celebrations year-round.',
            keywords: ['holidays', 'celebrations', 'festive', 'seasonal', 'traditions'],
            specialInstructions: 'Include Christmas, Halloween, Easter, birthdays, and cultural holidays.'
        },
        'music_dance': { 
            title: 'Music & Dance', 
            description: 'Musical instruments, dance poses, and rhythm-inspired artistic designs.',
            keywords: ['music', 'dance', 'instruments', 'rhythm', 'performance'],
            specialInstructions: 'Include guitars, pianos, dancers, music notes, and concert scenes.'
        },
        'steampunk': { 
            title: 'Steampunk & Victorian', 
            description: 'Intricate steampunk machinery, Victorian elegance, and clockwork mechanisms.',
            keywords: ['steampunk', 'victorian', 'gears', 'clockwork', 'mechanical'],
            specialInstructions: 'Include gears, steam machines, Victorian ladies, and clockwork animals.'
        },
        'tribal_ethnic': { 
            title: 'Tribal & Cultural Patterns', 
            description: 'Beautiful traditional patterns and designs from cultures around the world.',
            keywords: ['tribal', 'cultural', 'traditional', 'ethnic', 'patterns'],
            specialInstructions: 'Include tribal masks, cultural symbols, traditional patterns, and ethnic art.'
        }
    };
    
    return categoryMap[categoryKey] || null;
}

// Model success tracking
let modelSuccessTracker = {
    lastSuccessfulModel: 'openai',
    failedModels: new Set(),
    successCount: {},
    lastUpdateTime: Date.now()
};

// Reset failed models after 10 minutes (models might recover)
function resetFailedModelsIfNeeded() {
    const now = Date.now();
    const resetInterval = 10 * 60 * 1000; // 10 minutes
    
    if (now - modelSuccessTracker.lastUpdateTime > resetInterval) {
        console.log('Resetting failed models tracker after 10 minutes');
        modelSuccessTracker.failedModels.clear();
        modelSuccessTracker.lastUpdateTime = now;
    }
}

// Update model success tracking
function updateModelSuccess(modelName, success) {
    modelSuccessTracker.lastUpdateTime = Date.now();
    
    if (success) {
        modelSuccessTracker.lastSuccessfulModel = modelName;
        modelSuccessTracker.successCount[modelName] = (modelSuccessTracker.successCount[modelName] || 0) + 1;
        // Remove from failed models if it was there
        modelSuccessTracker.failedModels.delete(modelName);
        console.log(`✅ Model ${modelName} marked as successful (total successes: ${modelSuccessTracker.successCount[modelName]})`);
    } else {
        modelSuccessTracker.failedModels.add(modelName);
        console.log(`❌ Model ${modelName} marked as failed`);
    }
}

// Get optimized model order based on success history
function getOptimizedModelOrder(preferredModel = 'openai') {
    resetFailedModelsIfNeeded();
    
    // Define model fallback chain based on tier and capability
    const allModels = [
        'openai',           // GPT-4o Mini (primary)
        'openai-fast',      // GPT-4.1 Nano (fast fallback)
        'mistral',          // Mistral Small 3.1 24B (reliable)
        'llamascout',       // Llama 4 Scout 17B (new option)
        'llama-roblox',     // Llama 3.1 8B (stable)
        'gemma-roblox',     // Gemma 2 9B (lightweight)
        'glm',              // GLM-4 9B (alternative)
        'phi',              // Phi-4 Mini (fallback)
        'mistral-nemo-roblox' // Final fallback
    ];
    
    // Filter out recently failed models and sort by success
    const availableModels = allModels.filter(model => !modelSuccessTracker.failedModels.has(model));
    
    // If last successful model is available and different from preferred, prioritize it
    const lastSuccessful = modelSuccessTracker.lastSuccessfulModel;
    if (lastSuccessful && lastSuccessful !== preferredModel && availableModels.includes(lastSuccessful)) {
        // Put last successful model first, then preferred, then others
        const orderedModels = [lastSuccessful];
        if (availableModels.includes(preferredModel) && preferredModel !== lastSuccessful) {
            orderedModels.push(preferredModel);
        }
        // Add remaining models
        availableModels.forEach(model => {
            if (!orderedModels.includes(model)) {
                orderedModels.push(model);
            }
        });
        return orderedModels;
    }
    
    // Otherwise start with preferred model (if available), then use success-based ordering
    const modelsToTry = preferredModel !== 'openai'
        ? (availableModels.includes(preferredModel)
            ? [preferredModel, ...availableModels.filter(m => m !== preferredModel)]
            : availableModels)
        : availableModels;
    
    return modelsToTry;
}

// Unified AI API calling function with intelligent model fallback
async function callAIAPI(prompt, preferredModel = 'openai') {
    // Check if we should delay the API call due to rate limiting
    const suggestedDelay = getSuggestedDelay();
    if (suggestedDelay > 0) {
        console.log(`Rate limiting: waiting ${suggestedDelay}ms before API call`);
        await new Promise(resolve => setTimeout(resolve, suggestedDelay));
    }
    
    // Track this API call
    trackApiCall();
    
    const modelsToTry = getOptimizedModelOrder(preferredModel);
    
    const url = "https://text.pollinations.ai/openai";
    const basePayload = {
        messages: [
            { role: "system", content: "You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object." },
            { role: "user", content: prompt }
        ],
        response_format: { "type": "json_object" },
        temperature: 0.5,
        referrer: REFERRER_ID
    };
    
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    let lastError = null;
    
    for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];
        
        try {
            console.log(`Attempting API call with model: ${currentModel} (attempt ${i + 1}/${modelsToTry.length})`);
            
            const payload = {
                ...basePayload,
                model: currentModel
            };
            
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(`API Error ${response.status}: ${errorText}`);
                
                // Log the error details
                console.warn(`Model ${currentModel} failed with status ${response.status}:`, errorText);
                
                // Mark model as failed
                updateModelSuccess(currentModel, false);
                
                // Check if this is a temporary rate limit or content policy issue
                if (response.status === 403 || response.status === 429) {
                    lastError = error;
                    
                    // If we have more models to try, add delay before next attempt
                    if (i < modelsToTry.length - 1) {
                        console.log(`Waiting 5 seconds before trying next model...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        console.log(`Trying next model in fallback chain...`);
                        continue;
                    }
                }
                
                // For other errors, add shorter delay and try next model
                lastError = error;
                if (i < modelsToTry.length - 1) {
                    console.log(`Waiting 2 seconds before trying next model...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                continue;
            }

            const result = await response.json();
            const generatedContent = result?.choices?.[0]?.message?.content;

            if (!generatedContent) {
                const error = new Error("AI response did not contain expected content structure.");
                console.warn(`Model ${currentModel} returned empty content`);
                updateModelSuccess(currentModel, false);
                lastError = error;
                continue;
            }

            // Parse JSON response
            try {
                const parsedData = JSON.parse(generatedContent);
                console.log(`✅ Successfully generated data using model: ${currentModel}`);
                
                // Mark model as successful
                updateModelSuccess(currentModel, true);
                
                // Show success toast if we had to fallback
                if (i > 0 && typeof showToast === 'function') {
                    showToast(`Generated content using ${currentModel} model`, 'info', 3000);
                }
                
                return parsedData;
                
            } catch (parseError) {
                // Try to extract JSON from response
                const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const extractedData = JSON.parse(jsonMatch[0]);
                        console.log(`✅ Successfully extracted JSON from ${currentModel} response`);
                        
                        // Mark model as successful
                        updateModelSuccess(currentModel, true);
                        
                        if (i > 0 && typeof showToast === 'function') {
                            showToast(`Generated content using ${currentModel} model`, 'info', 3000);
                        }
                        
                        return extractedData;
                    } catch (extractError) {
                        console.warn(`Model ${currentModel} JSON extraction failed:`, extractError.message);
                        updateModelSuccess(currentModel, false);
                        lastError = new Error(`Could not extract valid JSON from ${currentModel} response`);
                        
                        // Add delay before trying next model for parsing errors
                        if (i < modelsToTry.length - 1) {
                            console.log(`Waiting 2 seconds before trying next model due to parsing error...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                        continue;
                    }
                } else {
                    console.warn(`Model ${currentModel} response does not contain valid JSON`);
                    updateModelSuccess(currentModel, false);
                    lastError = new Error(`${currentModel} response does not contain valid JSON`);
                    
                    // Add delay before trying next model for JSON format errors
                    if (i < modelsToTry.length - 1) {
                        console.log(`Waiting 2 seconds before trying next model due to JSON format error...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    continue;
                }
            }
            
        } catch (networkError) {
            console.warn(`Network error with model ${currentModel}:`, networkError.message);
            updateModelSuccess(currentModel, false);
            lastError = networkError;
            
            // Add delay before trying next model for network errors
            if (i < modelsToTry.length - 1) {
                console.log(`Waiting 3 seconds before trying next model due to network error...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            continue;
        }
    }
    
    // If all models failed, throw the last error
    console.error('All AI models failed. Last error:', lastError);
    console.log('Current model status:', {
        lastSuccessful: modelSuccessTracker.lastSuccessfulModel,
        failedModels: Array.from(modelSuccessTracker.failedModels),
        successCounts: modelSuccessTracker.successCount
    });
    
    if (typeof showToast === 'function') {
        showToast('All AI models are currently unavailable. Please try again later.', 'error', 5000);
    }
    
    throw lastError || new Error('All AI models failed to generate content');
}

// Get current model status for debugging
function getModelStatus() {
    return {
        lastSuccessful: modelSuccessTracker.lastSuccessfulModel,
        failedModels: Array.from(modelSuccessTracker.failedModels),
        successCounts: { ...modelSuccessTracker.successCount },
        lastUpdate: new Date(modelSuccessTracker.lastUpdateTime).toLocaleString()
    };
}

// Manually reset model tracking (useful for debugging)
function resetModelTracking() {
    modelSuccessTracker = {
        lastSuccessfulModel: 'openai',
        failedModels: new Set(),
        successCount: {},
        lastUpdateTime: Date.now()
    };
    console.log('Model tracking reset to defaults');
}

// Make these functions available globally for debugging
window.getModelStatus = getModelStatus;
window.resetModelTracking = resetModelTracking;

// API call rate limiting tracking
let apiCallTracker = {
    calls: [],
    maxCallsPerMinute: 20 // Adjust based on API limits
};

// Function to check if we should delay API calls
function shouldDelayApiCall() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove calls older than 1 minute
    apiCallTracker.calls = apiCallTracker.calls.filter(time => time > oneMinuteAgo);
    
    return apiCallTracker.calls.length >= apiCallTracker.maxCallsPerMinute;
}

// Function to track API calls
function trackApiCall() {
    apiCallTracker.calls.push(Date.now());
}

// Function to get suggested delay based on current call rate
function getSuggestedDelay() {
    if (apiCallTracker.calls.length >= apiCallTracker.maxCallsPerMinute) {
        return 3000; // 3 second delay if approaching limit
    } else if (apiCallTracker.calls.length >= apiCallTracker.maxCallsPerMinute * 0.8) {
        return 1000; // 1 second delay if at 80% of limit
    }
    return 0; // No delay needed
}

// Make rate limiting functions available for debugging
window.getApiCallStatus = () => ({
    recentCalls: apiCallTracker.calls.length,
    maxCallsPerMinute: apiCallTracker.maxCallsPerMinute,
    shouldDelay: shouldDelayApiCall(),
    suggestedDelay: getSuggestedDelay()
});

async function renderCategoryWithProgressiveLoading(categoryKey, currentPage = 1, sortBy = 'popular') {
    console.log('Rendering category with progressive loading:', categoryKey, 'Page:', currentPage, 'Sort:', sortBy);
    
    // Cancel any pending image loads from previous category
    if (window.imageLoadQueue) {
        const canceledCount = window.imageLoadQueue.cancelAll();
        if (canceledCount > 0) {
            console.log(`[Category Loading] Canceled ${canceledCount} pending image downloads for new category`);
        }
    }
    
    try {
        // Show loading state first
        mainContent.innerHTML = `
            <div class="text-center py-8">
                <div class="spinner inline-block mr-2"></div>
                <span>Loading category...</span>
            </div>
        `;
        
        // Ensure category is loaded
        const categoryData = await ensureCategoryLoaded(categoryKey);
        
        if (!categoryData) {
            mainContent.innerHTML = '<div class="text-center py-8 text-red-500"><h2>Category not found</h2><p>The requested category could not be loaded.</p><button onclick="window.location.hash = \'#\'" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Return Home</button></div>';
            mainContent.classList.remove('hidden');
            showLoading(false);
            return;
        }
        
        // Use the existing renderCategory function
        const categoryHTML = renderCategory(categoryData, categoryKey, currentPage, sortBy);
        mainContent.innerHTML = categoryHTML;
        mainContent.classList.remove('hidden');
        
        // Initialize lazy loading for images
        setupLazyLoading();
        
        // Update page title
        document.title = `${categoryData.title || 'Category'} - ColorVerse`;
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading category:', error);
        mainContent.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <h2>Error Loading Category</h2>
                <p>${error.message}</p>
                <button onclick="window.location.hash = '#'" class="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                    Return Home
                </button>
            </div>
        `;
        mainContent.classList.remove('hidden');
        showLoading(false);
    }
}

// Public function to ensure a category is loaded
async function ensureCategoryLoaded(categoryKey) {
    if (categoryLoadingState.loadedCategories.has(categoryKey)) {
        return siteData.categories[categoryKey];
    }
    
    if (categoryLoadingState.isComplete) {
        return siteData.categories[categoryKey];
    }
    
    // Load this specific category immediately
    console.log(`Loading category on demand: ${categoryKey}`);
    showToast(`Loading ${categoryKey} category...`, 'info', 2000);
    
    return await loadSingleCategory(categoryKey);
}

// Function to fetch fresh site data from the API (keep original for fallback)
async function fetchFreshData() {
    // Get current season for dynamic content
    const currentSeason = getCurrentSeason();
    const seasonalTheme = SEASONAL_THEMES[currentSeason];
    
    const prompt = `
Generate website content data for 'ColorVerse', a free coloring page website.
The output MUST be a valid JSON object adhering strictly to the following structure:
{
  "brand": {
    "name": "ColorVerse",
    "vision": "A short, inspiring vision statement for the ColorVerse brand."
  },
  "seasonal_gallery": {
    "title": "${seasonalTheme.name}",
    "subtitle": "${seasonalTheme.description}",
    "description": "${seasonalTheme.description}",
    "items": {
      "seasonal_item_1": { "title": "Seasonal Item Title 1", "description": "Detailed description for ${currentSeason} themed coloring page 1" },
      "seasonal_item_2": { "title": "Seasonal Item Title 2", "description": "Detailed description for ${currentSeason} themed coloring page 2" },
      // ... continue to 12 ${currentSeason}-themed items total
      // Focus on ${seasonalTheme.prompt} themes
      // Examples: ${currentSeason === 'spring' ? 'cherry blossoms, Easter, baby animals, garden flowers, rain showers' :
                   currentSeason === 'summer' ? 'beaches, pools, ice cream, camping, outdoor activities' :
                   currentSeason === 'autumn' ? 'Halloween, harvest, falling leaves, pumpkins, cozy scenes' :
                   'Christmas, snow, winter sports, hot cocoa, holiday celebrations'}
      "seasonal_item_12": { "title": "Seasonal Item Title 12", "description": "Detailed description for ${currentSeason} themed coloring page 12" }
    }
  },
  "categories": {
    "animals": {
      "title": "Animal Kingdom",
      "description": "Discover the wonderful world of animals from cute pets to wild creatures.",
      "keywords": ["animals", "wildlife", "pets", "zoo", "creatures"],
      "items": {
        "animal_item_1": { "title": "Animal Item Title 1", "description": "Detailed animal coloring page description 1" },
        "animal_item_2": { "title": "Animal Item Title 2", "description": "Detailed animal coloring page description 2" },
        // ... continue to exactly 160 animal items total
        "animal_item_160": { "title": "Animal Item Title 160", "description": "Detailed animal coloring page description 160" }
      }
    },
    "fantasy": {
      "title": "Fantasy & Magic",
      "description": "Enter magical realms filled with dragons, unicorns, and mystical adventures.",
      "keywords": ["fantasy", "magic", "dragons", "unicorns", "mystical"],
      "items": {
        "fantasy_item_1": { "title": "Fantasy Item Title 1", "description": "Detailed fantasy coloring page description 1" },
        "fantasy_item_2": { "title": "Fantasy Item Title 2", "description": "Detailed fantasy coloring page description 2" },
        // ... continue to exactly 160 fantasy items total
        "fantasy_item_160": { "title": "Fantasy Item Title 160", "description": "Detailed fantasy coloring page description 160" }
      }
    },
    "mandalas": {
      "title": "Mandala Meditation",
      "description": "Find peace and focus with intricate mandala patterns for mindful coloring.",
      "keywords": ["mandalas", "meditation", "patterns", "zen", "mindfulness"],
      "items": {
        "mandala_item_1": { "title": "Mandala Item Title 1", "description": "Detailed mandala coloring page description 1" },
        "mandala_item_2": { "title": "Mandala Item Title 2", "description": "Detailed mandala coloring page description 2" },
        // ... continue to exactly 160 mandala items total
        "mandala_item_160": { "title": "Mandala Item Title 160", "description": "Detailed mandala coloring page description 160" }
      }
    },
    "vehicles": {
      "title": "Vehicles & Transportation",
      "description": "Explore cars, trucks, planes, and all kinds of amazing vehicles.",
      "keywords": ["vehicles", "cars", "trucks", "planes", "transportation"],
      "items": {
        "vehicle_item_1": { "title": "Vehicle Item Title 1", "description": "Detailed vehicle coloring page description 1" },
        "vehicle_item_2": { "title": "Vehicle Item Title 2", "description": "Detailed vehicle coloring page description 2" },
        // ... continue to exactly 160 vehicle items total
        "vehicle_item_160": { "title": "Vehicle Item Title 160", "description": "Detailed vehicle coloring page description 160" }
      }
    },
    "nature": {
      "title": "Nature & Landscapes",
      "description": "Beautiful scenes from nature including forests, mountains, and gardens.",
      "keywords": ["nature", "landscapes", "trees", "flowers", "outdoors"],
      "items": {
        "nature_item_1": { "title": "Nature Item Title 1", "description": "Detailed nature coloring page description 1" },
        "nature_item_2": { "title": "Nature Item Title 2", "description": "Detailed nature coloring page description 2" },
        // ... continue to exactly 160 nature items total
        "nature_item_160": { "title": "Nature Item Title 160", "description": "Detailed nature coloring page description 160" }
      }
    },
    "food": {
      "title": "Delicious Food & Treats",
      "description": "Tasty treats, healthy foods, and culinary delights to color.",
      "keywords": ["food", "treats", "cooking", "desserts", "cuisine"],
      "items": {
        "food_item_1": { "title": "Food Item Title 1", "description": "Detailed food coloring page description 1" },
        "food_item_2": { "title": "Food Item Title 2", "description": "Detailed food coloring page description 2" },
        // ... continue to exactly 160 food items total
        "food_item_160": { "title": "Food Item Title 160", "description": "Detailed food coloring page description 160" }
      }
    },
    "space": {
      "title": "Space & Astronomy",
      "description": "Blast off to explore planets, stars, and cosmic adventures.",
      "keywords": ["space", "planets", "stars", "astronomy", "rockets"],
      "items": {
        "space_item_1": { "title": "Space Item Title 1", "description": "Detailed space coloring page description 1" },
        "space_item_2": { "title": "Space Item Title 2", "description": "Detailed space coloring page description 2" },
        // ... continue to exactly 160 space items total
        "space_item_160": { "title": "Space Item Title 160", "description": "Detailed space coloring page description 160" }
      }
    },
    "abstract": {
      "title": "Abstract Art",
      "description": "Creative abstract designs and artistic patterns for imagination.",
      "keywords": ["abstract", "art", "patterns", "creative", "artistic"],
      "items": {
        "abstract_item_1": { "title": "Abstract Item Title 1", "description": "Detailed abstract coloring page description 1" },
        "abstract_item_2": { "title": "Abstract Item Title 2", "description": "Detailed abstract coloring page description 2" },
        // ... continue to exactly 160 abstract items total
        "abstract_item_160": { "title": "Abstract Item Title 160", "description": "Detailed abstract coloring page description 160" }
      }
    },
    "flowers": {
      "title": "Beautiful Flowers",
      "description": "Gorgeous floral designs from simple blooms to elaborate bouquets.",
      "keywords": ["flowers", "floral", "gardens", "blooms", "botanical"],
      "items": {
        "flower_item_1": { "title": "Flower Item Title 1", "description": "Detailed flower coloring page description 1" },
        "flower_item_2": { "title": "Flower Item Title 2", "description": "Detailed flower coloring page description 2" },
        // ... continue to exactly 160 flower items total
        "flower_item_160": { "title": "Flower Item Title 160", "description": "Detailed flower coloring page description 160" }
      }
    },
    "ocean": {
      "title": "Ocean & Sea Life",
      "description": "Dive into underwater worlds filled with sea creatures and coral reefs.",
      "keywords": ["ocean", "sea", "marine", "underwater", "aquatic"],
      "items": {
        "ocean_item_1": { "title": "Ocean Item Title 1", "description": "Detailed ocean coloring page description 1" },
        "ocean_item_2": { "title": "Ocean Item Title 2", "description": "Detailed ocean coloring page description 2" },
        // ... continue to exactly 160 ocean items total
        "ocean_item_160": { "title": "Ocean Item Title 160", "description": "Detailed ocean coloring page description 160" }
      }
    },
    "dinosaurs": {
      "title": "Prehistoric Dinosaurs",
      "description": "Travel back in time to the age of mighty dinosaurs and ancient creatures.",
      "keywords": ["dinosaurs", "prehistoric", "fossils", "ancient", "paleontology"],
      "items": {
        "dinosaur_item_1": { "title": "Dinosaur Item Title 1", "description": "Detailed dinosaur coloring page description 1" },
        "dinosaur_item_2": { "title": "Dinosaur Item Title 2", "description": "Detailed dinosaur coloring page description 2" },
        // ... continue to exactly 160 dinosaur items total
        "dinosaur_item_160": { "title": "Dinosaur Item Title 160", "description": "Detailed dinosaur coloring page description 160" }
      }
    },
    "mythical": {
      "title": "Mythical Creatures",
      "description": "Legendary beings from folklore and mythology around the world.",
      "keywords": ["mythical", "legends", "folklore", "creatures", "mythology"],
      "items": {
        "mythical_item_1": { "title": "Mythical Item Title 1", "description": "Detailed mythical creature coloring page description 1" },
        "mythical_item_2": { "title": "Mythical Item Title 2", "description": "Detailed mythical creature coloring page description 2" },
        // ... continue to exactly 160 mythical items total
        "mythical_item_160": { "title": "Mythical Item Title 160", "description": "Detailed mythical creature coloring page description 160" }
      }
    },
    "birds": {
      "title": "Birds & Flight",
      "description": "Soar with beautiful birds from tiny hummingbirds to majestic eagles.",
      "keywords": ["birds", "flight", "wings", "feathers", "avian"],
      "items": {
        "bird_item_1": { "title": "Bird Item Title 1", "description": "Detailed bird coloring page description 1" },
        "bird_item_2": { "title": "Bird Item Title 2", "description": "Detailed bird coloring page description 2" },
        // ... continue to exactly 160 bird items total
        "bird_item_160": { "title": "Bird Item Title 160", "description": "Detailed bird coloring page description 160" }
      }
    },
    "architecture": {
      "title": "Buildings & Architecture",
      "description": "Explore amazing buildings, castles, and architectural wonders.",
      "keywords": ["architecture", "buildings", "castles", "monuments", "structures"],
      "items": {
        "architecture_item_1": { "title": "Architecture Item Title 1", "description": "Detailed architecture coloring page description 1" },
        "architecture_item_2": { "title": "Architecture Item Title 2", "description": "Detailed architecture coloring page description 2" },
        // ... continue to exactly 160 architecture items total
        "architecture_item_160": { "title": "Architecture Item Title 160", "description": "Detailed architecture coloring page description 160" }
      }
    },
    "sports": {
      "title": "Sports & Recreation",
      "description": "Active sports, games, and recreational activities for all ages.",
      "keywords": ["sports", "games", "recreation", "athletics", "competition"],
      "items": {
        "sport_item_1": { "title": "Sport Item Title 1", "description": "Detailed sports coloring page description 1" },
        "sport_item_2": { "title": "Sport Item Title 2", "description": "Detailed sports coloring page description 2" },
        // ... continue to exactly 160 sports items total
        "sport_item_160": { "title": "Sport Item Title 160", "description": "Detailed sports coloring page description 160" }
      }
    },
    "memes": {
      "title": "Internet Memes & Pop Culture",
      "description": "Fun and trendy internet memes, viral content, and pop culture references.",
      "keywords": ["memes", "internet", "viral", "trending", "pop culture"],
      "items": {
        "meme_item_1": { "title": "Meme Item Title 1", "description": "Detailed meme/pop culture coloring page description 1" },
        "meme_item_2": { "title": "Meme Item Title 2", "description": "Detailed meme/pop culture coloring page description 2" },
        // ... continue to exactly 160 meme items total - popular meme formats, viral animals, internet culture references
        "meme_item_160": { "title": "Meme Item Title 160", "description": "Detailed meme/pop culture coloring page description 160" }
      }
    },
    "adult_zen": {
      "title": "Adult Zen & Sophistication",
      "description": "Complex, sophisticated designs for adult colorists seeking detailed meditation.",
      "keywords": ["adult", "sophisticated", "complex", "detailed", "zen"],
      "items": {
        "zen_item_1": { "title": "Zen Item Title 1", "description": "Detailed sophisticated adult coloring page description 1" },
        "zen_item_2": { "title": "Zen Item Title 2", "description": "Detailed sophisticated adult coloring page description 2" },
        // ... continue to exactly 160 zen items total - intricate patterns, wine themes, coffee art, sophisticated motifs
        "zen_item_160": { "title": "Zen Item Title 160", "description": "Detailed sophisticated adult coloring page description 160" }
      }
    },
    "spicy_bold": {
      "title": "Bold & Spicy Designs",
      "description": "Edgy, bold patterns with attitude - skulls, tattoo-style, and rock themes.",
      "keywords": ["bold", "edgy", "skulls", "tattoo", "rock"],
      "items": {
        "bold_item_1": { "title": "Bold Item Title 1", "description": "Detailed bold/edgy coloring page description 1" },
        "bold_item_2": { "title": "Bold Item Title 2", "description": "Detailed bold/edgy coloring page description 2" },
        // ... continue to exactly 160 bold items total - skull art, tattoo designs, rock band themes, edgy patterns
        "bold_item_160": { "title": "Bold Item Title 160", "description": "Detailed bold/edgy coloring page description 160" }
      }
    },
    "children_characters": {
      "title": "Cute Children's Characters",
      "description": "Beloved children's characters and friendly cartoon companions for young colorists.",
      "keywords": ["children", "characters", "cartoon", "friendly", "kids"],
      "items": {
        "character_item_1": { "title": "Character Item Title 1", "description": "Detailed children's character coloring page description 1" },
        "character_item_2": { "title": "Character Item Title 2", "description": "Detailed children's character coloring page description 2" },
        // ... continue to exactly 160 character items total - cartoon characters, fairy tale characters, kid-friendly mascots
        "character_item_160": { "title": "Character Item Title 160", "description": "Detailed children's character coloring page description 160" }
      }
    },
    "vintage_retro": {
      "title": "Vintage & Retro Vibes",
      "description": "Nostalgic designs from past decades with classic style and charm.",
      "keywords": ["vintage", "retro", "classic", "nostalgic", "antique"],
      "items": {
        "vintage_item_1": { "title": "Vintage Item Title 1", "description": "Detailed vintage/retro coloring page description 1" },
        "vintage_item_2": { "title": "Vintage Item Title 2", "description": "Detailed vintage/retro coloring page description 2" },
        // ... continue to exactly 160 vintage items total - 1950s diner themes, vintage cars, retro patterns, classic pin-ups
        "vintage_item_160": { "title": "Vintage Item Title 160", "description": "Detailed vintage/retro coloring page description 160" }
      }
    },
    "gaming_tech": {
      "title": "Gaming & Technology",
      "description": "Video game characters, retro gaming, robots, and futuristic technology.",
      "keywords": ["gaming", "technology", "robots", "futuristic", "digital"],
      "items": {
        "gaming_item_1": { "title": "Gaming Item Title 1", "description": "Detailed gaming/tech coloring page description 1" },
        "gaming_item_2": { "title": "Gaming Item Title 2", "description": "Detailed gaming/tech coloring page description 2" },
        // ... continue to exactly 160 gaming items total - game controllers, pixel art, robots, sci-fi tech
        "gaming_item_160": { "title": "Gaming Item Title 160", "description": "Detailed gaming/tech coloring page description 160" }
      }
    },
    "holidays": {
      "title": "Holidays & Celebrations",
      "description": "Festive designs for all holidays and special celebrations year-round.",
      "keywords": ["holidays", "celebrations", "festive", "seasonal", "traditions"],
      "items": {
        "holiday_item_1": { "title": "Holiday Item Title 1", "description": "Detailed holiday/celebration coloring page description 1" },
        "holiday_item_2": { "title": "Holiday Item Title 2", "description": "Detailed holiday/celebration coloring page description 2" },
        // ... continue to exactly 160 holiday items total - Christmas, Halloween, Easter, birthdays, cultural holidays
        "holiday_item_160": { "title": "Holiday Item Title 160", "description": "Detailed holiday/celebration coloring page description 160" }
      }
    },
    "music_dance": {
      "title": "Music & Dance",
      "description": "Musical instruments, dance poses, and rhythm-inspired artistic designs.",
      "keywords": ["music", "dance", "instruments", "rhythm", "performance"],
      "items": {
        "music_item_1": { "title": "Music Item Title 1", "description": "Detailed music/dance coloring page description 1" },
        "music_item_2": { "title": "Music Item Title 2", "description": "Detailed music/dance coloring page description 2" },
        // ... continue to exactly 160 music items total - guitars, pianos, dancers, music notes, concert scenes
        "music_item_160": { "title": "Music Item Title 160", "description": "Detailed music/dance coloring page description 160" }
      }
    },
    "steampunk": {
      "title": "Steampunk & Victorian",
      "description": "Intricate steampunk machinery, Victorian elegance, and clockwork mechanisms.",
      "keywords": ["steampunk", "victorian", "gears", "clockwork", "mechanical"],
      "items": {
        "steampunk_item_1": { "title": "Steampunk Item Title 1", "description": "Detailed steampunk/victorian coloring page description 1" },
        "steampunk_item_2": { "title": "Steampunk Item Title 2", "description": "Detailed steampunk/victorian coloring page description 2" },
        // ... continue to exactly 160 steampunk items total - gears, steam machines, Victorian ladies, clockwork animals
        "steampunk_item_160": { "title": "Steampunk Item Title 160", "description": "Detailed steampunk/victorian coloring page description 160" }
      }
    },
    "tribal_ethnic": {
      "title": "Tribal & Cultural Patterns",
      "description": "Beautiful traditional patterns and designs from cultures around the world.",
      "keywords": ["tribal", "cultural", "traditional", "ethnic", "patterns"],
      "items": {
        "tribal_item_1": { "title": "Tribal Item Title 1", "description": "Detailed tribal/cultural coloring page description 1" },
        "tribal_item_2": { "title": "Tribal Item Title 2", "description": "Detailed tribal/cultural coloring page description 2" },
        // ... continue to exactly 160 tribal items total - tribal masks, cultural symbols, traditional patterns, ethnic art
        "tribal_item_160": { "title": "Tribal Item Title 160", "description": "Detailed tribal/cultural coloring page description 160" }
      }
    }
  }
}

Constraints & Guidelines:
- Create exactly 25 distinct and diverse categories including unexpected themes like memes, adult sophistication, and bold designs.
- Each category must contain exactly 160 unique items.
- The seasonal_gallery should have 12 ${currentSeason}-themed items that match the current season (${seasonalTheme.name}).
- Category keys and item keys should be lowercase, descriptive, and use underscores instead of spaces.
- Each item MUST have both "title" and "description" properties with the exact structure shown above.
- Item descriptions MUST be detailed enough to serve as effective prompts for an AI image generator to create black and white line art coloring pages.
- Include variety in complexity levels - some simple for beginners, some complex for advanced colorists.
- For adult/sophisticated themes, focus on intricate patterns, wine culture, coffee art, and elegant designs rather than inappropriate content.
- For bold/spicy themes, use skull art, tattoo-inspired designs, rock music themes, and edgy patterns.
- Ensure the final output is ONLY the JSON object, with no introductory text, explanations, or markdown formatting.
`;

    const url = "https://text.pollinations.ai/openai";
    const payload = {
        model: "openai-large", // Use the openai model which works with anonymous tier
        messages: [
            { role: "system", content: "You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object." },
            { role: "user", content: prompt }
        ],
        response_format: { "type": "json_object" }, // Request JSON output
        temperature: 0.5, // Use the same temperature as in test.html
        referrer: REFERRER_ID // Add referrer to help with API access
    };
    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    try {
        console.log("Calling Pollinations AI with intelligent fallback system");
        
        // Show a toast notification about data loading
        if (typeof showToast === 'function') {
            showToast('Loading fresh coloring page content...', 'info', 5000);
        }
        
        // Use the enhanced API calling function with fallback
        const parsedData = await callAIAPI(prompt, 'openai-large');

        // Basic validation (can be expanded)
        if (!parsedData.brand || !parsedData.categories || Object.keys(parsedData.categories).length === 0) {
             throw new Error("Generated JSON data is missing required fields (brand/categories).");
        }
        
        // Validate category structure
        const categoryKeys = Object.keys(parsedData.categories);
        if (categoryKeys.length !== 25) {
            console.warn(`Expected 25 categories, but got ${categoryKeys.length}`);
            if (typeof showToast === 'function') {
                showToast(`Expected 25 categories, but received ${categoryKeys.length}. Some categories may be missing.`, 'warning');
            }
        }
        
        // Validate items in each category
        let validCategories = 0;
        const totalCategories = categoryKeys.length;
        for (const [catKey, category] of Object.entries(parsedData.categories)) {
            if (category.items && Object.keys(category.items).length >= 50) { // At least 50 items per category (reduced from 160 for tolerance)
                validCategories++;
            } else {
                const itemCount = category.items ? Object.keys(category.items).length : 0;
                console.warn(`Category ${catKey} has insufficient items: ${itemCount}`);
                if (typeof showToast === 'function') {
                    showToast(`Category "${category.title || catKey}" has only ${itemCount} items (expected 160).`, 'warning');
                }
            }
        }
        
        console.log(`Validated categories: ${validCategories}/${totalCategories}`);

        console.log("Site data generated and parsed successfully");
        siteData = parsedData; // Store globally
        
        // Cache the data
        saveToCache(parsedData);
        
        // Show success message
        if (typeof showToast === 'function') {
            showToast('Content loaded successfully!', 'success');
        }
        
        return parsedData; // Resolve the promise

    } catch (error) {
        console.error("Error generating or parsing site data:", error);
        
        // Show error message to user
        if (typeof showToast === 'function') {
            if (error.name === 'AbortError') {
                showToast('Request timed out. Please check your connection and try again.', 'error');
            } else {
                showToast('Failed to load content. Using cached data if available.', 'error');
            }
        }
        
        // Try to load from cache as a fallback
        const cachedData = loadFromCache();
        if (cachedData) {
            console.log("Using cached data as fallback");
            if (typeof showToast === 'function') {
                showToast('Showing cached content.', 'info');
            }
            siteData = cachedData;
            showLoading(false);
            return cachedData;
        }
        
        // If no cached data, use sample data as last resort
        console.log("Using sample data as last resort");
        if (typeof showToast === 'function') {
            showToast('Showing sample content.', 'warning');
        }
        const sampleData = getSampleSiteData();
        siteData = sampleData;
        showLoading(false);
        return sampleData;
    }
    
    // Sample data for fallback when AI service is unavailable
    function getSampleSiteData() {
        const currentSeason = getCurrentSeason();
        const seasonalTheme = SEASONAL_THEMES[currentSeason];
        
        // Create season-appropriate sample items
        const seasonalItems = currentSeason === 'spring' ? {
            "spring_flowers": {
                "title": "Spring Flower Garden",
                "description": "A garden bursting with tulips, daffodils, and cherry blossoms with butterflies"
            },
            "easter_bunny": {
                "title": "Easter Bunny",
                "description": "A cute bunny with Easter eggs and spring flowers in a meadow"
            },
            "baby_animals": {
                "title": "Baby Farm Animals",
                "description": "Adorable baby chicks, lambs, and calves in a springtime farm setting"
            }
        } : currentSeason === 'summer' ? {
            "beach_paradise": {
                "title": "Beach Paradise",
                "description": "A detailed beach scene with palm trees, surfboards, beach umbrellas, sandcastles, and playful dolphins jumping in the waves"
            },
            "summer_camping": {
                "title": "Summer Camping Adventure",
                "description": "A cozy campsite with tents, campfire, marshmallow roasting, star-filled sky, and friendly forest animals"
            },
            "ice_cream_truck": {
                "title": "Ice Cream Truck Delight",
                "description": "A colorful ice cream truck surrounded by happy children, various ice cream treats, summer treats, and park setting"
            }
        } : currentSeason === 'autumn' ? {
            "pumpkin_patch": {
                "title": "Pumpkin Patch",
                "description": "A festive pumpkin patch with various sized pumpkins, autumn leaves, and harvest decorations"
            },
            "halloween_scene": {
                "title": "Halloween Night",
                "description": "A spooky but fun Halloween scene with jack-o'-lanterns, bats, and trick-or-treaters"
            },
            "autumn_leaves": {
                "title": "Falling Autumn Leaves",
                "description": "Trees with colorful falling leaves, acorns, and woodland creatures preparing for winter"
            }
        } : {
            "winter_wonderland": {
                "title": "Winter Wonderland",
                "description": "A magical winter scene with snow-covered trees, snowmen, and winter animals"
            },
            "christmas_tree": {
                "title": "Christmas Tree",
                "description": "A decorated Christmas tree with ornaments, presents, and holiday decorations"
            },
            "hot_cocoa": {
                "title": "Hot Cocoa Time",
                "description": "A cozy winter scene with hot cocoa, marshmallows, warm blankets, and snow outside"
            }
        };
        
        return {
            "brand": {
                "name": "ColorVerse",
                "vision": "Inspiring creativity through AI-generated coloring pages for everyone."
            },
            "seasonal_gallery": {
                "title": seasonalTheme.name,
                "subtitle": seasonalTheme.description,
                "description": seasonalTheme.description,
                "items": seasonalItems
            },
            "categories": {
                "animals": {
                    "title": "Animal Kingdom",
                    "description": "Coloring pages featuring animals from around the world.",
                    "keywords": ["animals", "wildlife", "creatures", "zoo", "pets"],
                    "items": {
                        "cute_cat": { "title": "Cute Cat", "description": "An adorable cat with big eyes sitting curled up, clean line art style" },
                        "playful_dog": { "title": "Playful Dog", "description": "A happy dog with floppy ears running in a field, clean line art style" },
                        "majestic_lion": { "title": "Majestic Lion", "description": "A regal lion with a full mane standing on a rock, clean line art style" },
                        "graceful_deer": { "title": "Graceful Deer", "description": "A deer with antlers in a forest clearing, clean line art style" },
                        "fluffy_rabbit": { "title": "Fluffy Rabbit", "description": "A cute rabbit with long ears sitting among flowers, clean line art style" },
                        "wise_owl": { "title": "Wise Owl", "description": "A detailed owl perched on a branch with intricate feather patterns, clean line art style" },
                        "jumping_kangaroo": { "title": "Jumping Kangaroo", "description": "A kangaroo mid-jump with joey in pouch in Australian outback setting, clean line art style" },
                        "swimming_dolphin": { "title": "Swimming Dolphin", "description": "A graceful dolphin leaping through ocean waves with splashing water, clean line art style" }
                    }
                },
                "fantasy": {
                    "title": "Fantasy Worlds",
                    "description": "Magical creatures and enchanted settings for your imagination.",
                    "keywords": ["fantasy", "magic", "dragons", "unicorns", "fairies"],
                    "items": {
                        "mighty_dragon": { "title": "Mighty Dragon", "description": "A powerful dragon with wings soaring over mountains, clean line art style" },
                        "graceful_unicorn": { "title": "Graceful Unicorn", "description": "A unicorn with a spiraled horn in a magical forest, clean line art style" },
                        "fairy_queen": { "title": "Fairy Queen", "description": "A fairy with delicate wings and a crown in a flower garden, clean line art style" },
                        "castle_wizard": { "title": "Wizard's Castle", "description": "A mystical castle with towers and magical symbols, clean line art style" },
                        "enchanted_forest": { "title": "Enchanted Forest", "description": "A forest with glowing mushrooms and magical creatures, clean line art style" },
                        "phoenix_rising": { "title": "Phoenix Rising", "description": "A magnificent phoenix with spread wings surrounded by flames and mystical energy, clean line art style" },
                        "mermaid_palace": { "title": "Mermaid Palace", "description": "An underwater palace with mermaids, sea horses, and coral decorations, clean line art style" }
                    }
                },
                "mandalas": {
                    "title": "Mandalas",
                    "description": "Intricate circular patterns for relaxation and focus.",
                    "keywords": ["mandalas", "patterns", "zen", "meditation", "geometric"],
                    "items": {
                        "floral_mandala": { "title": "Floral Mandala", "description": "A circular pattern with intricate flower designs, clean line art style" },
                        "geometric_mandala": { "title": "Geometric Mandala", "description": "A symmetrical pattern with geometric shapes, clean line art style" },
                        "sacred_geometry": { "title": "Sacred Geometry", "description": "A mandala based on sacred geometric principles, clean line art style" },
                        "nature_mandala": { "title": "Nature Mandala", "description": "A circular design with leaves, vines, and natural elements, clean line art style" },
                        "cosmic_mandala": { "title": "Cosmic Mandala", "description": "A mandala with stars, planets, and celestial patterns, clean line art style" },
                        "butterfly_mandala": { "title": "Butterfly Mandala", "description": "A symmetrical mandala featuring butterfly wings and flight patterns, clean line art style" },
                        "ocean_mandala": { "title": "Ocean Mandala", "description": "A circular design with wave patterns, shells, and marine elements, clean line art style" }
                    }
                },
                "vehicles": {
                    "title": "Vehicles",
                    "description": "Cars, planes, boats, and other transportation for young enthusiasts.",
                    "keywords": ["vehicles", "cars", "trucks", "planes", "trains"],
                    "items": {
                        "race_car": { "title": "Race Car", "description": "A sleek racing car with aerodynamic design, clean line art style" },
                        "airplane_sky": { "title": "Airplane in Sky", "description": "A commercial airplane flying through clouds, clean line art style" },
                        "sailboat_ocean": { "title": "Sailboat Ocean", "description": "A sailboat with billowing sails on calm waters, clean line art style" },
                        "fire_truck": { "title": "Fire Truck", "description": "An emergency fire truck with ladder and sirens, clean line art style" },
                        "train_journey": { "title": "Train Journey", "description": "A locomotive with connected cars on railway tracks, clean line art style" },
                        "helicopter_rescue": { "title": "Helicopter Rescue", "description": "A rescue helicopter with spinning rotors in mountain rescue scene, clean line art style" },
                        "motorcycle_adventure": { "title": "Motorcycle Adventure", "description": "A detailed motorcycle on a winding mountain road, clean line art style" }
                    }
                },
                "memes": {
                    "title": "Internet Memes & Pop Culture",
                    "description": "Fun and trendy internet memes and pop culture references.",
                    "keywords": ["memes", "internet", "viral", "trending", "pop culture"],
                    "items": {
                        "grumpy_cat": { "title": "Grumpy Cat", "description": "A cat with an annoyed expression sitting with crossed arms, internet meme style line art" },
                        "doge_wow": { "title": "Doge Wow", "description": "A Shiba Inu dog with characteristic expression surrounded by comic text bubbles, clean line art style" },
                        "distracted_boyfriend": { "title": "Distracted Person", "description": "Three people in the classic distracted boyfriend meme pose, clean line art style" },
                        "this_is_fine": { "title": "This Is Fine", "description": "A dog sitting in a room with flames around saying this is fine, clean line art style" },
                        "success_kid": { "title": "Success Kid", "description": "A toddler with fist pumped in victory pose on beach, clean line art style" }
                    }
                },
                "adult_zen": {
                    "title": "Adult Zen & Sophistication",
                    "description": "Complex, sophisticated designs for adult colorists seeking detailed meditation.",
                    "keywords": ["adult", "sophisticated", "complex", "detailed", "zen"],
                    "items": {
                        "wine_vineyard": { "title": "Wine Vineyard", "description": "Intricate vineyard scene with wine bottles, grape vines, and wine glasses, sophisticated line art style" },
                        "coffee_culture": { "title": "Coffee Culture", "description": "Detailed coffee shop scene with espresso machines, latte art, and coffee beans, sophisticated line art style" },
                        "zen_garden": { "title": "Zen Garden", "description": "A peaceful zen garden with raked sand patterns, stones, and meditation elements, detailed line art style" },
                        "abstract_meditation": { "title": "Abstract Meditation", "description": "Complex abstract patterns designed for meditative coloring, intricate line art style" },
                        "elegant_patterns": { "title": "Elegant Patterns", "description": "Sophisticated geometric and floral patterns with fine details, complex line art style" }
                    }
                },
                "spicy_bold": {
                    "title": "Bold & Spicy Designs",
                    "description": "Edgy, bold patterns with attitude - skulls, tattoo-style, and rock themes.",
                    "keywords": ["bold", "edgy", "skulls", "tattoo", "rock"],
                    "items": {
                        "sugar_skull": { "title": "Sugar Skull", "description": "Ornate Day of the Dead sugar skull with intricate decorative patterns, bold line art style" },
                        "rock_guitar": { "title": "Rock Guitar", "description": "Electric guitar with flames and rock music symbols, edgy line art style" },
                        "tribal_dragon": { "title": "Tribal Dragon", "description": "Dragon design in tribal tattoo style with bold geometric patterns, strong line art style" },
                        "skull_roses": { "title": "Skull and Roses", "description": "Gothic skull surrounded by detailed roses and thorns, dramatic line art style" },
                        "motorcycle_skull": { "title": "Motorcycle Skull", "description": "Skull wearing motorcycle helmet with flames and bike elements, bold line art style" }
                    }
                }
            }
        };
    }
}

// Make the static content functions available globally for use in links
window.printColoringPage = printColoringPage;
window.sharePage = sharePage;

// Handle form submissions on static pages
document.addEventListener('submit', function(event) {
    // Check if this is a form in our static content
    if (event.target.closest('#static-contact')) {
        event.preventDefault();
        alert('Thank you for your message! This is a demo form. In a production environment, this would submit your information to our team.');
    }
});

// --- Global Event Listeners ---
window.addEventListener('hashchange', handleRouteChange);

// Cancel all pending downloads when user navigates away from the site
window.addEventListener('beforeunload', () => {
    if (window.imageLoadQueue) {
        const canceledCount = window.imageLoadQueue.cancelAll();
        if (canceledCount > 0) {
            console.log(`[Page Unload] Canceled ${canceledCount} pending downloads before page unload`);
        }
    }
});

// --- Theme Initialization and Event Listeners ---
function initThemeHandlers() {
    // Set up theme switcher buttons
    const lightThemeBtn = document.getElementById('theme-light');
    const darkThemeBtn = document.getElementById('theme-dark');
    const colorfulThemeBtn = document.getElementById('theme-colorful');
    
    // Apply saved theme from localStorage or use default
    const savedTheme = localStorage.getItem('colorverse-theme') || 'light';
    applyTheme(savedTheme);
    
    // Apply dark mode to body background immediately
    if (savedTheme === 'dark') {
        document.body.style.backgroundColor = '#121826';
    } else if (savedTheme === 'colorful') {
        document.body.style.backgroundColor = '#f0f9ff';
    }
    
    if (lightThemeBtn && darkThemeBtn && colorfulThemeBtn) {
        lightThemeBtn.addEventListener('click', () => applyTheme('light'));
        darkThemeBtn.addEventListener('click', () => applyTheme('dark'));
        colorfulThemeBtn.addEventListener('click', () => applyTheme('colorful'));
    }
}

// --- Style Selector Initialization ---
function initStyleSelector() {
    const styleSelector = document.getElementById('style-selector');
    
    if (styleSelector) {
        // Clear existing options
        styleSelector.innerHTML = '';
        
        // Dynamically populate options from COLORING_STYLES
        Object.entries(COLORING_STYLES).forEach(([key, style]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = style.name;
            option.className = 'text-gray-800';
            styleSelector.appendChild(option);
        });
        
        // Load saved style from localStorage or use default
        const savedStyle = localStorage.getItem('colorverse-style') || '';
        currentColoringStyle = savedStyle;
        styleSelector.value = savedStyle;

        // Apply saved style on initialization
        if (savedStyle) {
            changeColoringStyle(savedStyle);
        }
        
        // Add change event listener
        styleSelector.addEventListener('change', (event) => {
            const newStyle = event.target.value;
            console.log(`Style selector changed to: "${newStyle}"`);
            
            // Save to localStorage
            localStorage.setItem('colorverse-style', newStyle);
            
            // Apply the new style
            changeColoringStyle(newStyle);
        });
        
        console.log(`Style selector initialized with ${Object.keys(COLORING_STYLES).length} styles, current: "${currentColoringStyle}"`);
    } else {
        console.warn('Style selector element not found');
    }
}

// Load cached image URLs on startup
function loadCachedImageUrls() {
    try {
        const cachedImageUrls = localStorage.getItem(CACHE_KEY_IMAGE_URLS);
        if (cachedImageUrls) {
            const urlMap = JSON.parse(cachedImageUrls);
            for (const [key, value] of Object.entries(urlMap)) {
                imageUrlCache.set(key, value);
            }
            console.log(`Loaded ${imageUrlCache.size} cached image URLs`);
            return true;
        }
    } catch (e) {
        console.warn('Failed to load cached image URLs:', e);
    }
    return false;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Initializing ColorVerse app...");
        
        // Pre-load cached image URLs to speed up initial render
        loadCachedImageUrls();
        
        // Initialize theme handlers first
        initThemeHandlers();
        
        // Initialize style selector
        initStyleSelector();
        
        // Set up global error handling for images
        setupGlobalImageErrorHandling();
        
        // Set up seasonal themes based on current date
        currentSeason = getCurrentSeason();
        console.log(`Setting up seasonal theme for: ${currentSeason}`);
        
        // Generate site data (this will use cache if available)
        await generateSiteData();
        
        // Render the initial route
        handleRouteChange();
        
        // Additional initialization for image loading
        console.log("Setting up lazy loading for images");
        // Will be called again after route changes, but ensure it's also set up initially
        setTimeout(() => {
            setupLazyLoading();
        }, 300);
        
        // Simplified window load handler
        window.addEventListener('load', () => {
            console.log("Window fully loaded");
            document.body.classList.remove('loading');
        });
        
        // MutationObserver removed as it was causing performance issues
        
        console.log("Initialization complete");
    } catch (error) {
        console.error("Initialization failed:", error);
        
        // Try to recover with any cached data that might be available
        const cachedData = loadFromCache();
        if (cachedData) {
            console.warn("Recovering with cached data");
            siteData = cachedData;
            handleRouteChange();
        }
    }
});

// Clear cache function for development
function clearAllCache() {
    localStorage.removeItem('colorverse-site-data');
    localStorage.removeItem('colorverse-cache-timestamp');
    localStorage.removeItem('colorverse-image-urls');
    console.log('All cache cleared!');
}

// Make functions accessible from HTML
window.sharePage = sharePage;

// Export functions for testing in Node environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initStyleSelector,
        changeColoringStyle,
        applyTheme,
        loadCachedImageUrls,
        getImageUrl,
        getDynamicReferrer,
        getCategoryIcon,
        getRandomPastelGradient,
        isCacheValid,
        saveToCache,
        loadFromCache,
        getCurrentPageFromHash,
        getCurrentSortFromHash,
        shouldRefreshCache,
        COLORING_STYLES,
        getCurrentColoringStyle: () => currentColoringStyle,
        imageUrlCache,
        callAIAPI,
        getOptimizedModelOrder,
        modelSuccessTracker,
        CACHE_KEY_IMAGE_URLS,
        CACHE_KEY_SITE_DATA,
        CACHE_KEY_TIMESTAMP
    };
}
