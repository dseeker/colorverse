/**
 * Coloring Tips Manager for ColorVerse
 * Displays helpful coloring tips for parents and kids
 */

class ColoringTipsManager {
  constructor() {
    this.tips = [
      {
        icon: "fa-palette",
        title: "Start with Light Colors",
        content:
          "Begin with lighter colors and gradually add darker shades for depth. This makes it easier to correct mistakes!",
      },
      {
        icon: "fa-layer-group",
        title: "Layer Your Colors",
        content:
          "Build up colors in light layers for richer, more vibrant results. Start light, then add medium and dark tones.",
      },
      {
        icon: "fa-arrows-alt",
        title: "Color in One Direction",
        content:
          "Keep your strokes consistent - either all horizontal or all vertical. This creates a cleaner, more professional look.",
      },
      {
        icon: "fa-hand-sparkles",
        title: "Don't Press Too Hard",
        content:
          "Use a light touch! Pressing too hard can damage paper and make colors look muddy. Build up gradually instead.",
      },
      {
        icon: "fa-eye",
        title: "Leave White Space",
        content:
          "Not every area needs color! Leaving some white space can create beautiful highlights and make your artwork pop.",
      },
      {
        icon: "fa-circle",
        title: "Circular Motion for Blending",
        content:
          "Use small circular motions when blending colors together. This creates smooth transitions between different hues.",
      },
      {
        icon: "fa-sun",
        title: "Consider Lighting",
        content:
          "Think about where the light is coming from! Color more heavily on the shadow side and lighter where light hits.",
      },
      {
        icon: "fa-shapes",
        title: "Practice Color Theory",
        content:
          "Complementary colors (opposites on the color wheel) create vibrant contrast. Try blue with orange or red with green!",
      },
      {
        icon: "fa-wind",
        title: "Sharpen Regularly",
        content:
          "Keep colored pencils sharp for detailed areas. A sharp point gives you better control for intricate sections.",
      },
      {
        icon: "fa-tint",
        title: "Try Different Mediums",
        content:
          "Experiment with crayons, colored pencils, markers, and gel pens. Each gives a different effect and texture!",
      },
      {
        icon: "fa-gem",
        title: "Blend with a Colorless Blender",
        content:
          "A colorless blender pencil can smooth out colors and blend them seamlessly together. Great for skin tones!",
      },
      {
        icon: "fa-magic",
        title: "Use Black Sparingly",
        content:
          "Instead of black for shadows, try dark purple, dark blue, or dark brown. They look more natural and vibrant!",
      },
      {
        icon: "fa-border-all",
        title: "Work from Background to Foreground",
        content:
          "Color background elements first, then work forward. This prevents smudging your foreground details.",
      },
      {
        icon: "fa-eraser",
        title: "Correct Mistakes Gently",
        content:
          "Made a mistake? Try lifting color with a kneaded eraser or color over it with a lighter shade. Don't panic!",
      },
      {
        icon: "fa-paper-plane",
        title: "Protect Your Work",
        content:
          "Place a blank sheet under your hand while coloring to prevent oils from smudging your artwork.",
      },
      {
        icon: "fa-clock",
        title: "Take Breaks",
        content:
          "Coloring should be relaxing! Take breaks every 20-30 minutes to rest your hand and eyes.",
      },
      {
        icon: "fa-heart",
        title: "There Are No Rules",
        content:
          "Remember: the sky can be purple and grass can be pink if you want! Coloring is about creativity and fun.",
      },
      {
        icon: "fa-graduation-cap",
        title: "Learn from Others",
        content:
          "Watch coloring tutorials online or join coloring communities. There's always a new technique to discover!",
      },
      {
        icon: "fa-lightbulb",
        title: "Highlight with White",
        content:
          "Add white gel pen or pencil highlights at the end for sparkle and dimension. Great for eyes and shiny objects!",
      },
      {
        icon: "fa-brush",
        title: "Texture Matters",
        content:
          "Vary your stroke direction to create textures. Vertical strokes for tree bark, circular for fluffy clouds!",
      },
    ];

    this.currentTipIndex = 0;
    this.tipElement = null;
    this.autoRotateInterval = null;
    this.isVisible = false;
  }

  /**
   * Initialize the coloring tips system
   */
  init() {
    this.createTipElement();
    this.setupEventListeners();
    this.startAutoRotation();
  }

  /**
   * Create the tip DOM element
   */
  createTipElement() {
    this.tipElement = document.createElement("div");
    this.tipElement.className = "coloring-tip";
    this.tipElement.setAttribute("role", "alert");
    this.tipElement.setAttribute("aria-live", "polite");
    this.tipElement.innerHTML = `
            <button class="tip-close" aria-label="Close tip">
                <i class="fas fa-times"></i>
            </button>
            <div class="tip-header">
                <i class="fas"></i>
                <h4></h4>
            </div>
            <div class="tip-content"></div>
        `;

    document.body.appendChild(this.tipElement);

    // Close button
    this.tipElement.querySelector(".tip-close").addEventListener("click", () => {
      this.hideTip();
    });

    // Click anywhere to dismiss
    this.tipElement.addEventListener("click", e => {
      if (e.target === this.tipElement) {
        this.hideTip();
      }
    });
  }

  /**
   * Show a specific tip
   */
  showTip(index = this.currentTipIndex) {
    if (index < 0 || index >= this.tips.length) {
      index = 0;
    }

    const tip = this.tips[index];
    this.currentTipIndex = index;

    const iconEl = this.tipElement.querySelector(".tip-header i");
    const titleEl = this.tipElement.querySelector(".tip-header h4");
    const contentEl = this.tipElement.querySelector(".tip-content");

    iconEl.className = `fas ${tip.icon}`;
    titleEl.textContent = tip.title;
    contentEl.textContent = tip.content;

    this.tipElement.classList.add("visible");
    this.isVisible = true;

    // Auto-hide after 10 seconds unless hovered
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      if (!this.isHovered) {
        this.hideTip();
      }
    }, 10000);
  }

  /**
   * Hide the current tip
   */
  hideTip() {
    this.tipElement.classList.remove("visible");
    this.isVisible = false;
    clearTimeout(this.hideTimeout);
  }

  /**
   * Show the next tip
   */
  nextTip() {
    this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
    this.showTip(this.currentTipIndex);
  }

  /**
   * Show a random tip
   */
  showRandomTip() {
    const randomIndex = Math.floor(Math.random() * this.tips.length);
    this.showTip(randomIndex);
  }

  /**
   * Start auto-rotation of tips
   */
  startAutoRotation() {
    // Show first tip after 5 seconds
    setTimeout(() => {
      this.showRandomTip();
    }, 5000);

    // Rotate every 30 seconds
    this.autoRotateInterval = setInterval(() => {
      if (!this.isVisible) {
        this.nextTip();
      }
    }, 30000);
  }

  /**
   * Stop auto-rotation
   */
  stopAutoRotation() {
    clearInterval(this.autoRotateInterval);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Hover detection to pause auto-hide
    this.tipElement.addEventListener("mouseenter", () => {
      this.isHovered = true;
      clearTimeout(this.hideTimeout);
    });

    this.tipElement.addEventListener("mouseleave", () => {
      this.isHovered = false;
      // Resume auto-hide
      this.hideTimeout = setTimeout(() => {
        this.hideTip();
      }, 5000);
    });

    // Keyboard shortcut (Shift + ?) to show a random tip
    document.addEventListener("keydown", e => {
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        this.showRandomTip();
      }
    });
  }

  /**
   * Create a button to trigger tips
   */
  createTipButton() {
    const button = document.createElement("button");
    button.className =
      "fixed bottom-4 left-4 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg z-40 transition-transform hover:scale-110";
    button.innerHTML = '<i class="fas fa-lightbulb"></i>';
    button.title = "Show coloring tip (Shift + ?)";
    button.setAttribute("aria-label", "Show coloring tip");

    button.addEventListener("click", () => {
      this.showRandomTip();
    });

    document.body.appendChild(button);
    return button;
  }

  /**
   * Show a tip related to a specific topic
   */
  showThemedTip(theme) {
    const themeKeywords = {
      animal: ["fa-paw", "creature", "pet", "wildlife"],
      nature: ["fa-leaf", "flower", "tree", "plant"],
      fantasy: ["fa-dragon", "magic", "fairy", "unicorn"],
      mandala: ["fa-circle", "pattern", "symmetry"],
      beginner: ["fa-hand-sparkles", "light", "easy", "start"],
      advanced: ["fa-layer-group", "detail", "intricate", "complex"],
    };

    const keywords = themeKeywords[theme.toLowerCase()] || [];

    // Find tips matching the theme
    const matchingTips = this.tips.filter(
      tip =>
        keywords.some(
          kw => tip.title.toLowerCase().includes(kw) || tip.content.toLowerCase().includes(kw)
        ) || keywords.includes(tip.icon)
    );

    if (matchingTips.length > 0) {
      const randomMatch = matchingTips[Math.floor(Math.random() * matchingTips.length)];
      const tipIndex = this.tips.indexOf(randomMatch);
      this.showTip(tipIndex);
    } else {
      this.showRandomTip();
    }
  }
}

// Create global instance
const coloringTipsManager = new ColoringTipsManager();
window.ColoringTipsManager = coloringTipsManager;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  coloringTipsManager.init();
  coloringTipsManager.createTipButton();
});

export default coloringTipsManager;
