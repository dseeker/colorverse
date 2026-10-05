/**
 * Analytics Manager for ColorVerse
 *
 * Privacy-first event collection. Off by default; must be explicitly enabled
 * via window._env.ENABLE_ANALYTICS = true. When enabled, batches events and
 * POSTs them to window._env.ANALYTICS_ENDPOINT at most once every 10 seconds
 * (or on visibilitychange/pagehide).
 *
 * What we collect:
 *   - route changes (page views) — the hash path only, no query params
 *   - print actions (count only, no item content)
 *   - download actions (count only, no item content)
 *   - favorite add / remove (count only, no item content)
 *   - share actions (count only, no platform name or item content)
 *   - search actions (count only, never the query text)
 *   - newsletter subscriptions (count only, never the email address)
 *
 * What we DO NOT collect:
 *   - IPs, user agents, or any user identifiers
 *   - search query contents (we only send query length if ever instrumented)
 *   - newsletter email addresses
 *   - item titles, descriptions, prompts, or any AI-generated content
 *   - localStorage / favorites contents
 *
 * The endpoint is configurable so events can flow to Cloudflare Workers
 * Analytics, Plausible, PostHog, or any compatible sink. The default
 * endpoint points at the content-api worker's /events route, which logs
 * and discards unless a sink is configured there.
 */

class AnalyticsManager {
  constructor() {
    this.enabled = false;
    this.endpoint = "";
    this.queue = [];
    this.flushTimer = null;
    this.flushIntervalMs = 10000;
    this.maxQueueSize = 50;
    this.sessionId = "";
    this.bootedAt = 0;
  }

  init(env) {
    const cfg = env || window._env || {};
    this.enabled = !!cfg.ENABLE_ANALYTICS;
    this.endpoint = cfg.ANALYTICS_ENDPOINT || "";
    this.sessionId = this._generateSessionId();
    this.bootedAt = Date.now();

    if (!this.enabled) {
      return;
    }

    if (!this.endpoint) {
      console.warn(
        "[Analytics] ENABLE_ANALYTICS is on but ANALYTICS_ENDPOINT is not set; events will be dropped."
      );
      return;
    }

    // Flush on tab close / hide to avoid losing the tail batch.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flush({ sendBeacon: true });
      }
    });
    window.addEventListener("pagehide", () => {
      this.flush({ sendBeacon: true });
    });
  }

  /**
   * Track a single event. Safe to call when disabled — it's a no-op.
   * Only whitelisted event names are accepted; unknown names are dropped
   * to prevent callers from accidentally logging sensitive data.
   */
  track(name, props) {
    if (!this.enabled || !this.endpoint) {
      return;
    }
    if (!this._isAllowedEvent(name)) {
      console.warn(`[Analytics] rejected unknown event name: ${name}`);
      return;
    }

    const cleaned = this._sanitizeProps(name, props || {});
    this.queue.push({
      name,
      props: cleaned,
      ts: Date.now(),
      session: this.sessionId,
      age_sec: Math.round((Date.now() - this.bootedAt) / 1000),
    });

    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, this.flushIntervalMs);
    }
  }

  /** Convenience: track a page view from a hash route. */
  trackPageView(hash) {
    const clean = this._sanitizePath(hash || window.location.hash || "#");
    this.track("page_view", { path: clean });
  }

  /** Flush queued events to the endpoint. */
  flush(opts) {
    opts = opts || {};
    if (!this.enabled || !this.endpoint || this.queue.length === 0) {
      return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = this.queue.splice(0, this.queue.length);
    const body = JSON.stringify({ events: batch });

    try {
      if (opts.sendBeacon && navigator.sendBeacon) {
        // sendBeacon needs a Blob with the right type for many endpoints.
        const ok = navigator.sendBeacon(
          this.endpoint,
          new Blob([body], { type: "application/json" })
        );
        if (ok) {
          return;
        }
        // fall through to fetch if sendBeacon was rejected
      }
      fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(err => console.warn("[Analytics] flush failed:", err.message));
    } catch (err) {
      console.warn("[Analytics] flush threw:", err.message);
      // Re-queue on failure so we don't silently drop events on a flaky network.
      this.queue.unshift(...batch);
    }
  }

  // --- internals -------------------------------------------------------------

  _isAllowedEvent(name) {
    return (
      name === "page_view" ||
      name === "print" ||
      name === "download" ||
      name === "favorite_add" ||
      name === "favorite_remove" ||
      name === "share" ||
      name === "search" ||
      name === "newsletter_subscribe"
    );
  }

  /**
   * Enforce the privacy contract per event type. Only whitelisted props
   * survive; everything else is dropped. No AI content or user input is
   * ever sent, even if a caller passes it.
   */
  _sanitizeProps(name, props) {
    const out = {};
    if (name === "page_view") {
      if (typeof props.path === "string") {
        out.path = this._sanitizePath(props.path);
      }
    } else if (
      name === "print" ||
      name === "download" ||
      name === "favorite_add" ||
      name === "favorite_remove" ||
      name === "share" ||
      name === "search" ||
      name === "newsletter_subscribe"
    ) {
      // Count-only. We deliberately do NOT forward item identifiers, the
      // search query itself, or the subscriber's email address.
    }
    return out;
  }

  /**
   * Strip query params and fragment details from a hash path so we don't
   * accidentally log search queries. "#search?q=foo" becomes "#search".
   * "#item/<cat>/<key>" stays intact (those are content paths, not user input).
   */
  _sanitizePath(hash) {
    if (!hash) {
      return "#";
    }
    const qIdx = hash.indexOf("?");
    let base = qIdx === -1 ? hash : hash.slice(0, qIdx);
    if (base.length > 200) {
      base = base.slice(0, 200);
    }
    return base;
  }

  _generateSessionId() {
    // Random, non-identifying session token. Not derived from any user data.
    // 16 hex chars = 64 bits of entropy, enough to group events from one
    // session without correlating across sessions or devices.
    const bytes = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 8; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

const analytics = new AnalyticsManager();
analytics.init();
window.analytics = analytics;
