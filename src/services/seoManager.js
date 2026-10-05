/**
 * SEO Utilities for ColorVerse
 * Handles structured data, meta tags, and SEO optimization
 */

class SEOManager {
  constructor() {
    this.siteName = "ColorVerse";
    this.siteUrl = "https://dseeker.github.io/colorverse";
    this.defaultImage = `${this.siteUrl}/assets/og-image.jpg`;
  }

  /**
   * Items use `title` in the live data; some legacy paths use `name`.
   * Normalize so the SEO manager works either way.
   */
  itemName(item) {
    return (item && (item.title || item.name)) || "Untitled";
  }

  /**
   * Generate JSON-LD structured data for a coloring page
   */
  generateColoringPageSchema(category, item, imageUrl) {
    const name = this.itemName(item);
    return {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      name: name,
      description: `Free printable ${name.toLowerCase()} coloring page for kids. High-quality ${category} coloring sheet available for download.`,
      image: {
        "@type": "ImageObject",
        url: imageUrl,
        width: 1024,
        height: 1024,
      },
      author: {
        "@type": "Organization",
        name: this.siteName,
        url: this.siteUrl,
      },
      datePublished: new Date().toISOString(),
      license: "https://creativecommons.org/licenses/by-nc/4.0/",
      acquireLicensePage: `${this.siteUrl}/license`,
      copyrightHolder: {
        "@type": "Organization",
        name: this.siteName,
      },
      keywords: [
        "coloring pages",
        "free coloring pages",
        "kids coloring",
        "printable coloring",
        `${category} coloring`,
        name.toLowerCase(),
      ].join(", "),
    };
  }

  /**
   * Generate breadcrumb structured data
   */
  generateBreadcrumbSchema(category, item = null) {
    const breadcrumbs = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: this.siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category,
        item: `${this.siteUrl}/#category/${category.toLowerCase()}`,
      },
    ];

    if (item) {
      breadcrumbs.push({
        "@type": "ListItem",
        position: 3,
        name: this.itemName(item),
        item: `${this.siteUrl}/#item/${category.toLowerCase()}/${item.key}`,
      });
    }

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs,
    };
  }

  /**
   * Generate WebSite structured data
   */
  generateWebsiteSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: this.siteName,
      url: this.siteUrl,
      description:
        "Free AI-generated coloring pages for kids and adults. Download and print high-quality coloring sheets.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${this.siteUrl}/#search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  }

  /**
   * Generate Organization structured data
   */
  generateOrganizationSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: this.siteName,
      url: this.siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${this.siteUrl}/assets/logo.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        "https://www.facebook.com/colorverse",
        "https://twitter.com/colorverse",
        "https://www.pinterest.com/colorverse",
      ],
    };
  }

  /**
   * Generate CreativeWork structured data for the coloring book collection
   */
  generateCollectionSchema(categories) {
    const items = [];
    Object.entries(categories).forEach(([key, category]) => {
      Object.entries(category.items || {}).forEach(([itemKey, item]) => {
        items.push({
          "@type": "ListItem",
          name: this.itemName(item),
          url: `${this.siteUrl}/#item/${key}/${itemKey}`,
        });
      });
    });

    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Free Coloring Pages Collection",
      description:
        "Browse our extensive collection of free printable coloring pages for kids and adults. Animals, fantasy, mandalas, and more!",
      url: this.siteUrl,
      isPartOf: {
        "@type": "WebSite",
        name: this.siteName,
        url: this.siteUrl,
      },
      about: {
        "@type": "Thing",
        name: "Coloring Pages",
      },
      itemListElement: items,
    };
  }

  /**
   * Inject structured data into the page
   */
  injectStructuredData(data) {
    // Remove existing structured data
    const existing = document.querySelectorAll('script[type="application/ld+json"]');
    existing.forEach(el => el.remove());

    // Add new structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data, null, 2);
    document.head.appendChild(script);
  }

  /**
   * Update meta tags dynamically
   */
  updateMetaTags(title, description, image = null, canonicalUrl = null) {
    // Title
    document.title = title ? `${title} | ${this.siteName}` : this.siteName;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl || this.siteUrl;

    // Open Graph tags
    this.updateOpenGraphTags(title, description, image);

    // Twitter Card tags
    this.updateTwitterCardTags(title, description, image);
  }

  /**
   * Update Open Graph meta tags
   */
  updateOpenGraphTags(title, description, image) {
    const ogTags = {
      "og:title": title || this.siteName,
      "og:description": description,
      "og:image": image || this.defaultImage,
      "og:url": window.location.href,
      "og:type": "website",
      "og:site_name": this.siteName,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    });
  }

  /**
   * Update Twitter Card meta tags
   */
  updateTwitterCardTags(title, description, image) {
    const twitterTags = {
      "twitter:card": "summary_large_image",
      "twitter:title": title || this.siteName,
      "twitter:description": description,
      "twitter:image": image || this.defaultImage,
      "twitter:site": "@colorverse",
    };

    Object.entries(twitterTags).forEach(([name, content]) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    });
  }

  /**
   * Generate sitemap.xml content
   */
  generateSitemap(categories) {
    const urls = [
      {
        loc: this.siteUrl,
        lastmod: new Date().toISOString().split("T")[0],
        changefreq: "daily",
        priority: "1.0",
      },
    ];

    // Add category pages
    Object.keys(categories).forEach(categoryKey => {
      urls.push({
        loc: `${this.siteUrl}/#category/${categoryKey}`,
        lastmod: new Date().toISOString().split("T")[0],
        changefreq: "weekly",
        priority: "0.8",
      });
    });

    // Add individual item pages
    Object.entries(categories).forEach(([categoryKey, category]) => {
      Object.entries(category.items || {}).forEach(([itemKey]) => {
        urls.push({
          loc: `${this.siteUrl}/#item/${categoryKey}/${itemKey}`,
          lastmod: new Date().toISOString().split("T")[0],
          changefreq: "monthly",
          priority: "0.6",
        });
      });
    });

    const urlEntries = urls
      .map(
        url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
      )
      .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Download sitemap.xml
   */
  downloadSitemap(categories) {
    const sitemap = this.generateSitemap(categories);
    const blob = new Blob([sitemap], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create global instance
window.SEOManager = new SEOManager();
