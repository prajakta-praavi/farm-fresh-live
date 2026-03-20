import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Rushivan Agro";
const SITE_URL = "https://www.rushivanagro.com";
const DEFAULT_DESCRIPTION =
  "Rushivan Agro offers farm-fresh dairy, fruits, grains, natural sweetness products, and authentic farm stay experiences.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.ico`;
const DEFAULT_KEYWORDS =
  "Rushivan Agro, farm fresh products, organic farm, agritourism, farm stay, dairy, grains, pulses, natural sweeteners, strawberries";

type SeoConfig = {
  title: string;
  description: string;
  robots?: string;
};

export type SeoOverride = Partial<SeoConfig> & {
  image?: string;
  ogType?: "website" | "article" | "product";
  keywords?: string;
  canonicalPath?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>> | null;
};

type SeoContextValue = {
  override: SeoOverride | null;
  setOverride: (value: SeoOverride | null) => void;
};

const SeoContext = createContext<SeoContextValue>({
  override: null,
  setOverride: () => undefined,
});

export const SeoProvider = ({ children }: { children: ReactNode }) => {
  const [override, setOverride] = useState<SeoOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
};

export const useSeo = (override: SeoOverride | null) => {
  const { setOverride } = useContext(SeoContext);

  useEffect(() => {
    setOverride(override);
    return () => setOverride(null);
  }, [setOverride, override]);
};

const getSeoConfig = (pathname: string): SeoConfig => {
  if (pathname === "/") {
    return {
      title: `${SITE_NAME} | Farm Fresh Products & Agritourism`,
      description: DEFAULT_DESCRIPTION,
    };
  }
  if (pathname === "/about") {
    return {
      title: `About ${SITE_NAME} | Pure by Nature`,
      description:
        "Learn about Rushivan Agro, our farming values, natural products, and commitment to quality from farm to home.",
    };
  }
  if (pathname === "/shop") {
    return {
      title: `Shop Farm Products | ${SITE_NAME}`,
      description:
        "Buy farm-fresh dairy products, fruits, grains, pulses, spices, and natural sweetness products from Rushivan Agro.",
    };
  }
  if (pathname.startsWith("/product/")) {
    return {
      title: `Product Details | ${SITE_NAME}`,
      description:
        "View product details, available weight options, stock, and pricing for Rushivan Agro farm products.",
    };
  }
  if (pathname === "/stay") {
    return {
      title: `Farm Stay | ${SITE_NAME}`,
      description:
        "Book a peaceful farm stay at Rushivan Agro and enjoy nature, fresh food, and countryside experiences.",
    };
  }
  if (pathname === "/corporate-gifting") {
    return {
      title: `Corporate Gifting | ${SITE_NAME}`,
      description:
        "Explore premium corporate gifting options with farm-fresh and natural products from Rushivan Agro.",
    };
  }
  if (pathname === "/blog") {
    return {
      title: `Blog | ${SITE_NAME}`,
      description:
        "Read stories, updates, and insights from Rushivan Agro on farming, food, and natural living.",
    };
  }
  if (pathname.startsWith("/blog/")) {
    return {
      title: `Blog Article | ${SITE_NAME}`,
      description: "Explore farm life, healthy food, and natural product insights from the Rushivan Agro blog.",
    };
  }
  if (pathname === "/contact") {
    return {
      title: `Contact Us | ${SITE_NAME}`,
      description:
        "Contact Rushivan Agro for product inquiries, orders, collaborations, and farm stay bookings.",
    };
  }
  if (pathname === "/cart") {
    return {
      title: `Your Cart | ${SITE_NAME}`,
      description: "Review your selected Rushivan Agro products and proceed to secure checkout.",
      robots: "noindex, nofollow",
    };
  }
  if (pathname.startsWith("/checkout/")) {
    return {
      title: `Checkout | ${SITE_NAME}`,
      description: "Complete your Rushivan Agro order with secure checkout.",
      robots: "noindex, nofollow",
    };
  }
  if (pathname === "/track-order") {
    return {
      title: `Track Order | ${SITE_NAME}`,
      description: "Track your Rushivan Agro order securely.",
      robots: "noindex, nofollow",
    };
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/customer")) {
    return {
      title: `${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
      robots: "noindex, nofollow",
    };
  }
  return {
    title: `Page Not Found | ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    robots: "noindex, nofollow",
  };
};

const setMeta = (selector: string, attribute: "name" | "property", value: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const setJsonLd = (id: string, data: Record<string, unknown> | Array<Record<string, unknown>> | null) => {
  const selector = `script[type="application/ld+json"][data-seo="${id}"]`;
  let element = document.head.querySelector<HTMLScriptElement>(selector);
  if (!data) {
    if (element) {
      element.remove();
    }
    return;
  }
  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.setAttribute("data-seo", id);
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
};

const setCanonical = (href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const SeoManager = () => {
  const { pathname } = useLocation();
  const { override } = useContext(SeoContext);

  useEffect(() => {
    const seo = { ...getSeoConfig(pathname), ...(override || {}) };
    const canonicalPath = override?.canonicalPath;
    const canonicalUrl = canonicalPath
      ? canonicalPath.startsWith("http")
        ? canonicalPath
        : `${SITE_URL}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`
      : `${SITE_URL}${pathname === "/" ? "" : pathname}`;
    const ogImage = override?.image || DEFAULT_OG_IMAGE;
    const ogType = override?.ogType || "website";
    const keywords = override?.keywords || DEFAULT_KEYWORDS;

    document.title = seo.title;
    setCanonical(canonicalUrl);

    setMeta('meta[name="description"]', "name", "description", seo.description);
    setMeta('meta[name="robots"]', "name", "robots", seo.robots ?? "index, follow");
    setMeta('meta[name="keywords"]', "name", "keywords", keywords);

    setMeta('meta[property="og:type"]', "property", "og:type", ogType);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    setMeta('meta[property="og:title"]', "property", "og:title", seo.title);
    setMeta('meta[property="og:description"]', "property", "og:description", seo.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    setMeta('meta[property="og:locale"]', "property", "og:locale", "en_IN");

    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);

    setJsonLd("base-organization", {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: DEFAULT_OG_IMAGE,
      sameAs: [],
    });

    setJsonLd(
      "base-website",
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      }
    );

    setJsonLd("page", override?.structuredData ?? null);
  }, [pathname, override]);

  return null;
};

export default SeoManager;
