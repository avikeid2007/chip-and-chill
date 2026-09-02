import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string | string[];
  canonicalUrl?: string;
  ogType?: "website" | "article" | "profile" | "event";
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

const DEFAULT_TITLE = "Chip & Chill — Championship Golf Course & Range Platform";
const DEFAULT_DESCRIPTION =
  "Book championship golf tee times, enter live tournaments with real-time scorecards, and reserve TrackMan driving range bays at premier golf facilities.";
const DEFAULT_KEYWORDS =
  "golf booking, tee times, golf course management, driving range booking, TrackMan bays, golf tournaments, USGA handicap scorecard, golf skins game";
const DEFAULT_OG_IMAGE = "/og-image.svg";
const SITE_NAME = "Chip & Chill";

export default function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl,
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  jsonLd,
}: SeoHeadProps) {
  const location = useLocation();

  useEffect(() => {
    // 1. Update Document Title
    const formattedTitle = title
      ? title.includes(SITE_NAME)
        ? title
        : `${title} | ${SITE_NAME}`
      : DEFAULT_TITLE;
    document.title = formattedTitle;

    // Helper: Update or create meta tag by name or property
    function setMeta(attribute: "name" | "property", key: string, content: string) {
      let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    }

    // Helper: Update or create link tag
    function setLink(rel: string, href: string) {
      let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
      }
      element.setAttribute("href", href);
    }

    // 2. Standard Meta Tags
    setMeta("name", "description", description);
    setMeta(
      "name",
      "keywords",
      Array.isArray(keywords) ? keywords.join(", ") : keywords
    );
    setMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    // 3. Canonical URL
    const canonicalHref =
      canonicalUrl ||
      `${window.location.origin}${location.pathname}${location.search ? location.search : ""}`;
    setLink("canonical", canonicalHref);

    // 4. Open Graph Meta (WhatsApp, Facebook, LinkedIn, iMessage)
    const absoluteOgImage = ogImage.startsWith("http")
      ? ogImage
      : `${window.location.origin}${ogImage}`;
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", formattedTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalHref);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", absoluteOgImage);
    setMeta("property", "og:image:alt", formattedTitle);

    // 5. Twitter / X Cards
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", formattedTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", absoluteOgImage);

    // 6. Schema.org JSON-LD Structured Data
    const scriptId = "seo-json-ld";
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        scriptElement.type = "application/ld+json";
        document.head.appendChild(scriptElement);
      }

      const structuredPayload = Array.isArray(jsonLd)
        ? {
            "@context": "https://schema.org",
            "@graph": jsonLd,
          }
        : {
            "@context": "https://schema.org",
            ...jsonLd,
          };

      scriptElement.textContent = JSON.stringify(structuredPayload, null, 2);
    } else if (scriptElement) {
      // Remove stale JSON-LD when moving between pages
      scriptElement.remove();
    }

    // Cleanup when component unmounts
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, noIndex, jsonLd, location.pathname, location.search]);

  return null;
}
