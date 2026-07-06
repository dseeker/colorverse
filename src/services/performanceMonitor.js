/**
 * Performance Monitor for ColorVerse
 * Tracks Core Web Vitals and other performance metrics
 * Helps identify bottlenecks and optimization opportunities
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.isActive = true;
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (!window.performance) {
      console.warn("Performance API not supported");
      return;
    }

    this.measureNavigationTiming();
    this.measureResourceLoading();
    this.measureCoreWebVitals();
    this.measureUserTiming();
    this.setupLongTaskObserver();
    this.setupPaintObserver();
    this.setupLayoutShiftObserver();

    console.log("[Performance] Monitoring initialized");
  }

  /**
   * Measure navigation timing metrics
   */
  measureNavigationTiming() {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        if (navigation) {
          this.metrics.navigation = {
            dnsLookup: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
            tcpConnection: Math.round(navigation.connectEnd - navigation.connectStart),
            serverResponse: Math.round(navigation.responseEnd - navigation.responseStart),
            domProcessing: Math.round(navigation.domComplete - navigation.domLoading),
            totalLoadTime: Math.round(navigation.loadEventEnd - navigation.startTime),
          };

          console.log("[Performance] Navigation Timing:", this.metrics.navigation);
        }
      }, 0);
    });
  }

  /**
   * Measure resource loading performance
   */
  measureResourceLoading() {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const resources = performance.getEntriesByType("resource");
        const slowResources = resources
          .filter(r => r.duration > 500)
          .map(r => ({
            name: r.name.split("/").pop(),
            type: r.initiatorType,
            duration: Math.round(r.duration),
            size: r.transferSize,
          }));

        this.metrics.resources = {
          totalResources: resources.length,
          slowResources: slowResources.slice(0, 10), // Top 10 slowest
          totalTransferSize: resources.reduce((sum, r) => sum + r.transferSize, 0),
        };

        console.log("[Performance] Resource Loading:", this.metrics.resources);
      }, 100);
    });
  }

  /**
   * Measure Core Web Vitals
   */
  measureCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = {
            value: Math.round(lastEntry.startTime),
            element: lastEntry.element?.tagName || "unknown",
            rating: this.getRating(lastEntry.startTime, 2500, 4000),
          };
          console.log(
            "[Performance] LCP:",
            this.metrics.lcp.value + "ms",
            "-",
            this.metrics.lcp.rating
          );
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn("LCP measurement not supported");
      }
    }

    // First Input Delay (FID) - now replaced by Interaction to Next Paint (INP)
    if ("PerformanceObserver" in window) {
      try {
        const fidObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "first-input") {
              this.metrics.fid = {
                value: Math.round(entry.processingStart - entry.startTime),
                rating: this.getRating(entry.processingStart - entry.startTime, 100, 300),
              };
              console.log(
                "[Performance] FID:",
                this.metrics.fid.value + "ms",
                "-",
                this.metrics.fid.rating
              );
            }
          }
        });
        fidObserver.observe({ entryTypes: ["first-input"] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn("FID measurement not supported");
      }
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsEntries = [];

    if ("PerformanceObserver" in window) {
      try {
        const clsObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          }
          this.metrics.cls = {
            value: Math.round(clsValue * 1000) / 1000,
            entries: clsEntries.length,
            rating: this.getCLSRating(clsValue),
          };
          console.log("[Performance] CLS:", this.metrics.cls.value, "-", this.metrics.cls.rating);
        });
        clsObserver.observe({ entryTypes: ["layout-shift"] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn("CLS measurement not supported");
      }
    }
  }

  /**
   * Measure user timing marks
   */
  measureUserTiming() {
    try {
      // Mark key moments in app lifecycle
      if (window.performance && performance.mark) {
        // Mark when DOM is ready
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => {
            try {
              performance.mark("dom-ready");
            } catch (e) {
              // Ignore
            }
          });
        } else {
          // DOM already loaded
          try {
            performance.mark("dom-ready");
          } catch (e) {
            // Ignore
          }
        }

        // Mark when app is fully initialized
        window.addEventListener("load", () => {
          setTimeout(() => {
            try {
              performance.mark("app-initialized");

              // Check if dom-ready mark exists before measuring
              const domReadyEntries = performance.getEntriesByName("dom-ready");
              if (domReadyEntries && domReadyEntries.length > 0) {
                performance.measure("app-init", "dom-ready", "app-initialized");
                const measure = performance.getEntriesByName("app-init")[0];
                if (measure) {
                  this.metrics.appInit = {
                    value: Math.round(measure.duration),
                  };
                  console.log(
                    "[Performance] App initialization:",
                    this.metrics.appInit.value + "ms"
                  );
                }
              }
            } catch (e) {
              // Silently ignore performance measurement errors
            }
          }, 0);
        });
      }
    } catch (e) {
      // Silently ignore any errors in performance timing
    }
  }

  /**
   * Setup Long Task observer to detect blocking tasks
   */
  setupLongTaskObserver() {
    if ("PerformanceObserver" in window) {
      try {
        const longTaskObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            console.warn("[Performance] Long task detected:", Math.round(entry.duration) + "ms");
            this.metrics.longTasks = (this.metrics.longTasks || 0) + 1;
          }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn("Long task observation not supported");
      }
    }
  }

  /**
   * Setup Paint observer for FCP and FMP
   */
  setupPaintObserver() {
    if ("PerformanceObserver" in window) {
      try {
        const paintObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-contentful-paint") {
              this.metrics.fcp = {
                value: Math.round(entry.startTime),
                rating: this.getRating(entry.startTime, 1800, 3000),
              };
              console.log(
                "[Performance] FCP:",
                this.metrics.fcp.value + "ms",
                "-",
                this.metrics.fcp.rating
              );
            }
          }
        });
        paintObserver.observe({ entryTypes: ["paint"] });
        this.observers.push(paintObserver);
      } catch (e) {
        console.warn("Paint observation not supported");
      }
    }
  }

  /**
   * Setup Layout Shift observer
   */
  setupLayoutShiftObserver() {
    // Handled in measureCoreWebVitals with CLS
  }

  /**
   * Get rating based on thresholds
   */
  getRating(value, goodThreshold, poorThreshold) {
    if (value <= goodThreshold) {
      return "good";
    }
    if (value <= poorThreshold) {
      return "needs-improvement";
    }
    return "poor";
  }

  /**
   * Get CLS rating
   */
  getCLSRating(value) {
    if (value < 0.1) {
      return "good";
    }
    if (value < 0.25) {
      return "needs-improvement";
    }
    return "poor";
  }

  /**
   * Get all metrics summary
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  /**
   * Report metrics to console or analytics
   */
  report() {
    const report = this.getMetrics();
    console.log("[Performance] Full Report:", report);
    return report;
  }

  /**
   * Measure specific operation
   */
  measureOperation(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    console.log(`[Performance] ${name}:`, Math.round(end - start) + "ms");

    return {
      result,
      duration: Math.round(end - start),
    };
  }

  /**
   * Mark start of an operation
   */
  markStart(name) {
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * Mark end of an operation and measure
   */
  markEnd(name) {
    if (performance.mark) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      const measure = performance.getEntriesByName(name)[0];
      if (measure) {
        console.log(`[Performance] ${name}:`, Math.round(measure.duration) + "ms");
      }
    }
  }

  /**
   * Cleanup observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isActive = false;
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();
window.PerformanceMonitor = performanceMonitor;

// Auto-initialize
document.addEventListener("DOMContentLoaded", () => {
  performanceMonitor.init();
});

// Export for ES6 modules
export default performanceMonitor;
