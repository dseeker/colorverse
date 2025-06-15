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
    nologo: true,
    model: 'flux' // Using Turbo model
};
// Dynamic referrer extraction for better API identification and rate limiting
function getDynamicReferrer() {
    try {
        const hostname = window.location.hostname;
        
        // Handle localhost and development environments
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'ColorVerse-LocalDev';
        }
        
        // Use actual domain name for production
        return hostname;
    } catch (error) {
        console.warn('Failed to extract dynamic referrer:', error);
        return 'ColorVerseWebApp'; // Fallback to original hardcoded value
    }
}

const REFERRER_ID = getDynamicReferrer(); // Dynamic referrer for API usage tracking
const PLACEHOLDER_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

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
        name: 'Spring Collection',
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
        name: 'Fall Colors',
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
    music: 'fas fa-music'
};

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
    }
    
    add(imageElement, src) {
        this.queue.push({ imageElement, src });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        const { imageElement, src } = this.queue.shift();
        
        try {
            // Show loading state
            imageElement.classList.add('loading');
            
            // Create a new image to preload
            const img = new Image();
            
            img.onload = () => {
                imageElement.src = src;
                imageElement.classList.remove('loading');
                const loadingIndicator = imageElement.parentNode.querySelector('.image-loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
            };
            
            img.onerror = () => {
                console.error(`Failed to load image: ${src}`);
                imageElement.classList.remove('loading');
                imageElement.classList.add('error');
                
                // Hide loading indicator
                const loadingIndicator = imageElement.parentNode.querySelector('.image-loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                // Add error indication
                const errorIndicator = document.createElement('div');
                errorIndicator.className = 'image-error-indicator absolute inset-0 flex items-center justify-center';
                errorIndicator.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>';
                imageElement.parentNode.classList.add('relative');
                imageElement.parentNode.appendChild(errorIndicator);
                
                // Set a placeholder image
                imageElement.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk5OTk5OSI+SW1hZ2UgRXJyb3I8L3RleHQ+PC9zdmc+';
            };
            
            // Start loading
            img.src = src;
            
            // Delay before next image
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenLoads));
        } catch (error) {
            console.error('Error loading image:', error);
        }
        
        // Continue with the next item
        this.processQueue();
    }
}

// Create an instance of the queue
const imageLoadQueue = new ImageLoadQueue(300); // 300ms between loads

// --- Lazy Loading Setup ---
function setupLazyLoading() {
    if (!('IntersectionObserver' in window)) {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.getAttribute('data-src');
        });
        return;
    }
    
    // First look for any stuck loading indicators and hide them
    document.querySelectorAll('.image-loading-indicator').forEach(indicator => {
        indicator.style.display = 'none';
    });
    
    // Create the IntersectionObserver to watch for images entering the viewport
    const imageObserver = new IntersectionObserver((entries, observer) => {
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
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
        // Add loading indicator
        const wrapper = img.parentNode;
        if (wrapper) {
            wrapper.classList.add('relative');
            const loader = document.createElement('div');
            loader.className = 'image-loading-indicator absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-0';
            loader.innerHTML = '<div class="spinner"></div>';
            wrapper.insertBefore(loader, wrapper.firstChild); // Insert loader before the image
            
            // Make sure the image has a higher z-index
            img.style.position = 'relative';
            img.style.zIndex = '10';
        }
        
        // Start observing
        imageObserver.observe(img);
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
        // Generate a cache key based on prompt and params
        const cacheKey = JSON.stringify({ prompt, params });
        
        // Check if we have this URL cached
        if (imageUrlCache.has(cacheKey)) {
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

        // Crucial for coloring pages: Modify the prompt for good line art
        const coloringPrompt = `high contrast black and white line art coloring page, ${enhancedPrompt}, pure outlines with no shading, no color, no grayscale, thick clean lines, simple contours only, minimalist printable coloring book style, suitable for children to color`;

        const query = new URLSearchParams({
            width: fullParams.width,
            height: fullParams.height,
            seed: seed,
            nologo: fullParams.nologo,
            referrer: REFERRER_ID,
            model: fullParams.model || DEFAULT_IMAGE_PARAMS.model
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
        localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(data));
        localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
        console.log('Site data cached successfully');
    } catch (error) {
        console.warn('Failed to cache site data:', error);
        // If storage is full, clear it and try again
        try {
            localStorage.clear();
            localStorage.setItem(CACHE_KEY_SITE_DATA, JSON.stringify(data));
            localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
        } catch (e) {
            console.error('Still failed to cache after clearing localStorage:', e);
        }
    }
}

function loadFromCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY_SITE_DATA);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    } catch (error) {
        console.warn('Failed to load cached site data:', error);
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
        
        const firstItemKey = Object.keys(category.items)[0];
        const firstItem = category.items[firstItemKey];
        const thumbnailUrl = firstItem ? getImageUrl(firstItem.description, { width: 400, height: 400 }) : 'placeholder.png';
        
        html += `
            <a href="#category/${key}" class="category-card block rounded-xl shadow-md overflow-hidden hover:shadow-xl transition duration-300 group">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" alt="${category.title}" class="w-full h-48 object-cover group-hover:opacity-90 transition-opacity relative z-10">
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
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" alt="${category.title}" class="w-full h-40 object-cover group-hover:opacity-90 transition-opacity relative z-10">
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
                <img src="${PLACEHOLDER_IMAGE}" data-src="${imageUrl}" alt="${pickItem.title}" class="w-full h-auto object-contain rounded relative z-10">
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

// Generate recent additions carousel
function renderRecentAdditions(data) {
    // For demo, we'll select 8 random items from across categories
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
    
    // Shuffle and take first 8
    allItems = allItems.sort(() => 0.5 - Math.random()).slice(0, 8);
    
    let html = '';
    
    allItems.forEach(({ categoryKey, itemKey, item, categoryTitle }) => {
        const thumbnailUrl = getImageUrl(item.description, { width: 300, height: 300 });
        
        html += `
            <a href="#item/${categoryKey}/${itemKey}" class="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" alt="${item.title}" class="w-full h-48 object-cover relative z-10">
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

function renderCategory(categoryData, categoryKey) {
    if (!categoryData) return '<p class="text-center text-red-500">Category not found.</p>';
    
    const categoryIcon = getCategoryIcon(categoryKey);
    
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
                <button class="bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100 px-3 py-1 rounded-md text-sm">Popular</button>
                <button class="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1 rounded-md text-sm">Newest</button>
                <button class="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1 rounded-md text-sm">A-Z</button>
            </div>
            <div class="ml-auto">
                <span class="text-gray-600 dark:text-gray-400 text-sm">${Object.keys(categoryData.items).length} items</span>
            </div>
        </div>
        
        <!-- Items Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    `;

    let itemsToRender = categoryData.items || {};
    
    // If seasonal category, use seasonal_gallery items if available
    if (categoryKey === 'seasonal' && siteData.seasonal_gallery && siteData.seasonal_gallery.items) {
        itemsToRender = siteData.seasonal_gallery.items;
    }
    
    for (const [itemKey, item] of Object.entries(itemsToRender)) {
         const thumbnailUrl = getImageUrl(item.description, { width: 400, height: 400 });
         html += `
            <a href="#item/${categoryKey}/${itemKey}" class="category-card block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group">
                <div class="relative">
                    <div class="image-loading-indicator absolute inset-0 flex items-center justify-center z-0">
                        <div class="spinner"></div>
                    </div>
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" alt="${item.title}" class="w-full h-32 object-cover group-hover:opacity-80 transition-opacity relative z-10">
                    <div class="absolute inset-0 bg-primary-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center z-20">
                        <div class="bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300">
                            <i class="fas fa-eye text-primary-600"></i>
                        </div>
                    </div>
                </div>
                <div class="p-3">
                    <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">${item.title}</h4>
                </div>
            </a>
         `;
    }

    // If no items found for seasonal category, provide a fallback
    if (categoryKey === 'seasonal' && Object.keys(itemsToRender).length === 0) {
        html += `
            <div class="col-span-full text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <i class="${SEASONAL_THEMES[currentSeason].icon} text-6xl text-primary-600 mb-4 block"></i>
                <h3 class="text-2xl font-semibold mb-2">No ${currentSeason} Coloring Pages Yet</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">
                    We're preparing some exciting ${currentSeason} themed coloring pages! 
                    Check back soon or explore our other categories.
                </p>
                <a href="#" class="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition">
                    Browse All Categories
                </a>
            </div>
        `;
    }

    html += '</div>';
    
    // Modify pagination to only show if more than one page of items
    const itemCount = Object.keys(itemsToRender).length;
    if (itemCount > 12) {
        html += `
            <div class="mt-8 flex justify-center">
                <nav class="flex items-center space-x-2" aria-label="Pagination">
                    <span class="px-3 py-1 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed">Previous</span>
                    <span class="px-3 py-1 rounded-md bg-primary-600 text-white">1</span>
                    <a href="#" class="px-3 py-1 rounded-md hover:bg-gray-200 text-gray-700 dark:text-gray-300">2</a>
                    <a href="#" class="px-3 py-1 rounded-md hover:bg-gray-200 text-gray-700 dark:text-gray-300">3</a>
                    <span class="px-2">...</span>
                    <a href="#" class="px-3 py-1 rounded-md hover:bg-gray-200 text-gray-700 dark:text-gray-300">8</a>
                    <a href="#" class="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-300">Next</a>
                </nav>
            </div>
        `;
    }
    
    return html;
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
                <img id="coloring-image" src="${PLACEHOLDER_IMAGE}" data-src="${imageUrl}" alt="Coloring page: ${itemData.title}" class="max-w-full max-h-[70vh] object-contain rounded shadow relative z-10">
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
                    <img src="${PLACEHOLDER_IMAGE}" data-src="${thumbnailUrl}" alt="${item.title}" class="w-full h-32 object-cover relative z-10">
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
    mainContent.innerHTML = ''; // Clear previous content
    
    // Reset the image loading queue in a more efficient way
    if (imageLoadQueue) {
        // Just mark as not processing, which will reset on next add
        imageLoadQueue.isProcessing = false;
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
                const categoryKey = hash.substring('#category/'.length);
                mainContent.innerHTML = renderCategory(siteData.categories[categoryKey], categoryKey);
                mainContent.classList.remove('hidden');
            } else if (hash.startsWith('#item/')) {
                const parts = hash.substring('#item/'.length).split('/');
                if (parts.length === 2) {
                    const categoryKey = parts[0];
                    const itemKey = parts[1];
                    const itemData = siteData?.categories?.[categoryKey]?.items?.[itemKey];
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
            } else if (hash === '#donate') {
                mainContent.innerHTML = `
                    <nav aria-label="breadcrumb" class="flex items-center mb-6 mt-2 text-sm text-gray-600 py-2">
                        <a href="#" class="hover:text-primary-600 transition-colors flex items-center">
                            <i class="fas fa-home mr-1"></i> Home
                        </a>
                        <i class="fas fa-chevron-right mx-2 text-gray-400"></i>
                        <span class="font-medium text-gray-800">Support ColorVerse</span>
                    </nav>
                    
                    <h1 class="text-3xl font-bold mb-6">Support ColorVerse</h1>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
                        <h2 class="text-2xl font-semibold mb-4">Why Support Us?</h2>
                        <p class="mb-4">ColorVerse is dedicated to making high-quality coloring pages accessible to everyone. We provide all our content for free, but maintaining and improving our platform requires resources. Your support helps us:</p>
                        
                        <ul class="list-disc ml-6 mb-6 space-y-2">
                            <li>Keep our coloring pages completely free for everyone</li>
                            <li>Develop new features and improve our AI generation technology</li>
                            <li>Add more diverse categories and designs</li>
                            <li>Cover our server and development costs</li>
                            <li>Keep ads minimal and non-intrusive</li>
                        </ul>
                        
                        <p>Every contribution, no matter the size, makes a difference in our ability to continue providing this creative resource.</p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                            <h2 class="text-2xl font-semibold mb-4 flex items-center">
                                <i class="fas fa-heart text-red-500 mr-3"></i> 
                                One-Time Donation
                            </h2>
                            <p class="mb-6">Make a single contribution to support our ongoing efforts. Every donation helps!</p>
                            
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
                            <h2 class="text-2xl font-semibold mb-4 flex items-center">
                                <i class="fas fa-star text-yellow-500 mr-3"></i> 
                                Become a Patron
                            </h2>
                            <p class="mb-6">Support us monthly and receive special perks as a thank you for your ongoing support!</p>
                            
                            <div class="space-y-6">
                                <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <h3 class="font-semibold text-lg mb-2">Art Enthusiast - $5/month</h3>
                                    <ul class="text-sm space-y-1 mb-3">
                                        <li>• Ad-free browsing experience</li>
                                        <li>• Special thank you in our monthly newsletter</li>
                                    </ul>
                                </div>
                                
                                <div class="p-4 border-2 border-primary-500 rounded-lg relative">
                                    <span class="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/2 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">Popular</span>
                                    <h3 class="font-semibold text-lg mb-2">Creative Supporter - $10/month</h3>
                                    <ul class="text-sm space-y-1 mb-3">
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
                                <p>Help us grow by sharing ColorVerse with friends, family, and on social media.</p>
                            </div>
                            
                            <div>
                                <div class="rounded-full bg-white bg-opacity-20 w-16 h-16 flex items-center justify-center text-3xl mb-4">
                                    <i class="fas fa-comment"></i>
                                </div>
                                <h3 class="text-xl font-medium mb-2">Provide Feedback</h3>
                                <p>Your input helps us improve! Let us know what you like and how we can make ColorVerse even better.</p>
                            </div>
                            
                            <div>
                                <div class="rounded-full bg-white bg-opacity-20 w-16 h-16 flex items-center justify-center text-3xl mb-4">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <h3 class="text-xl font-medium mb-2">Subscribe</h3>
                                <p>Join our newsletter to stay updated and engaged with our growing community.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
                        <h2 class="text-2xl font-semibold mb-3">Thank You!</h2>
                        <p class="mb-4">We're grateful for every form of support. Your contributions help us continue to provide free, high-quality coloring pages to our community.</p>
                        <p class="text-sm text-gray-500">ColorVerse is not a registered non-profit organization. Donations are not tax-deductible.</p>
                    </div>
                `;
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
            }, 100);
        }
    }, 100); // Short delay for visual feedback
}

// --- AI Data Generation ---

// Check if we need to refresh the cache
function shouldRefreshCache() {
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
    
    // First try to load from cache
    const cachedData = loadFromCache();
    const needsRefresh = shouldRefreshCache();
    
    if (cachedData && !needsRefresh) {
        console.log("Loading site data from cache...");
        siteData = cachedData;
        
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
        return cachedData;
    }
    
    // If we have cached data but need a refresh, use the cached data first 
    // and update in the background
    if (cachedData && needsRefresh) {
        console.log("Using cached data while refreshing in background...");
        siteData = cachedData;
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
        
        return cachedData;
    }
    
    console.log("Cache invalid or not found, generating site data via AI...");
    return fetchFreshData();
}

// Function to fetch fresh site data from the API
async function fetchFreshData() {
    const prompt = `
Generate website content data for 'ColorVerse', a free coloring page website.
The output MUST be a valid JSON object adhering strictly to the following structure:
{
  "brand": {
    "name": "ColorVerse",
    "vision": "A short, inspiring vision statement for the ColorVerse brand."
  },
  "seasonal_gallery": {
    "title": "Spring Awakening",
    "subtitle": "Nature's Palette of Renewal and Growth",
    "description": "Discover the vibrant transformation of spring through intricate coloring pages that capture life's beautiful emergence.",
    "items": {
      "garden_symphony": { 
        "title": "Garden Symphony", 
        "description": "An intricate line art of a spring garden with layered tulips, daffodils, and cherry blossoms, highlighting delicate petals and emerging new growth" 
      },
      "meadow_morning": { 
        "title": "Meadow Morning", 
        "description": "A whimsical scene of newborn animals - baby rabbits, lambs, and chirping birds - nestled in a lush, detail-rich spring meadow with wildflowers" 
      },
      "butterfly_dance": {
        "title": "Butterfly Dance",
        "description": "A graceful composition of butterflies emerging from chrysalises, surrounded by budding branches and delicate spring foliage"
      }
    }
  },
  "categories": {
    "category_key_1": {
      "title": "Category Title 1",
      "description": "A brief, engaging description for Category 1.",
      "keywords": ["keyword1", "keyword2", "relevant", "seo", "terms"],
      "items": {
        "item_key_1_1": { "title": "Item Title 1.1", "description": "Detailed description for image generation prompt 1.1" },
        "item_key_1_2": { "title": "Item Title 1.2", "description": "Detailed description for image generation prompt 1.2" },
        // ... up to 40 items ...
        "item_key_1_40": { "title": "Item Title 1.40", "description": "Detailed description for image generation prompt 1.40" }
      }
    },
    "category_key_2": {
      "title": "Category Title 2",
      "description": "A brief, engaging description for Category 2.",
      "keywords": ["keyword3", "keyword4", "more", "seo"],
      "items": {
         "item_key_2_1": { "title": "Item Title 2.1", "description": "Detailed description for image generation prompt 2.1" },
         // ... up to 40 items ...
         "item_key_2_40": { "title": "Item Title 2.40", "description": "Detailed description for image generation prompt 2.40" }
      }
    },
    // ... exactly 20 categories in total ...
    "category_key_20": {
      "title": "Category Title 20",
      "description": "A brief, engaging description for Category 20.",
      "keywords": ["final", "category", "keywords"],
      "items": {
         "item_key_20_1": { "title": "Item Title 20.1", "description": "Detailed description for image generation prompt 20.1" },
         // ... up to 40 items ...
         "item_key_20_40": { "title": "Item Title 20.40", "description": "Detailed description for image generation prompt 20.40" }
      }
    }
  }
}

Constraints & Guidelines:
- Create exactly 20 distinct and appealing categories suitable for coloring pages (e.g., Animals, Fantasy, Mandalas, Vehicles, Nature, Food, Space, Abstract, etc.).
- Each category must contain exactly 40 unique items.
- Category keys and item keys should be lowercase, descriptive, and use underscores instead of spaces (e.g., 'magical_forests', 'cute_cat_playing').
- Item descriptions MUST be detailed enough to serve as effective prompts for an AI image generator to create black and white line art coloring pages (e.g., "A majestic lion with a flowing mane resting under an acacia tree on the savanna, clean line art style").
- Keywords should be relevant for SEO.
- Ensure the final output is ONLY the JSON object, with no introductory text, explanations, or markdown formatting.
`;

    const url = "https://text.pollinations.ai/openai";
    const payload = {
        model: "openai-large", // Use the specified large model
        messages: [
            { role: "system", content: "You are an AI assistant that generates structured JSON data based on user requirements. Output ONLY the requested JSON object." },
            { role: "user", content: prompt }
        ],
        response_format: { "type": "json_object" }, // Request JSON output
        temperature: 0.7, // Adjust creativity slightly
        // seed: 12345 // Optional: for reproducibility during testing
        referrer: REFERRER_ID // Identify the app
    };
    const headers = { "Content-Type": "application/json" };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log("AI Response received:", result);

        // Extract the actual JSON content from the AI's response
        const generatedContent = result?.choices?.[0]?.message?.content;

        if (!generatedContent) {
            throw new Error("AI response did not contain the expected content structure.");
        }

        // Parse the JSON string within the content
        const parsedData = JSON.parse(generatedContent);

        // Basic validation (can be expanded)
        if (!parsedData.brand || !parsedData.categories || Object.keys(parsedData.categories).length === 0) {
             throw new Error("Generated JSON data is missing required fields (brand/categories).");
        }
        // Add more checks if needed (e.g., category count, item count)

        console.log("Site data generated and parsed successfully");
        siteData = parsedData; // Store globally
        
        // Cache the data
        saveToCache(parsedData);
        
        return parsedData; // Resolve the promise

    } catch (error) {
        console.error("Error generating or parsing site data:", error);
        siteData = null; // Ensure data is null on error
        mainContent.innerHTML = `
            <div class="text-center text-red-600 p-8 bg-red-100 border border-red-400 rounded">
                <h2 class="text-xl font-bold mb-2">Failed to Generate Content</h2>
                <p>We couldn't automatically generate the coloring categories using AI at this time.</p>
                <p class="mt-2">Please try refreshing the page. If the problem persists, the AI service might be temporarily unavailable.</p>
                <p class="text-sm mt-4">Error details: ${error.message}</p>
            </div>`;
        showLoading(false); // Hide loading indicator on error
        throw error; // Reject the promise
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

// Make functions accessible from HTML
window.sharePage = sharePage;