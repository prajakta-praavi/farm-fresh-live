import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Rushivan Agro";
const SITE_URL = "https://www.rushivanagro.com";
const DEFAULT_DESCRIPTION =
  "Rushivan Agro offers farm-fresh dairy, fruits, grains, natural sweetness products, and authentic farm stay experiences.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.ico`;

type SeoConfig = {
  title: string;
  description: string;
  robots?: string;
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

  useEffect(() => {
    const seo = getSeoConfig(pathname);
    const canonicalUrl = `${SITE_URL}${pathname === "/" ? "" : pathname}`;

    document.title = seo.title;
    setCanonical(canonicalUrl);

    setMeta('meta[name="description"]', "name", "description", seo.description);
    setMeta('meta[name="robots"]', "name", "robots", seo.robots ?? "index, follow");

    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    setMeta('meta[property="og:title"]', "property", "og:title", seo.title);
    setMeta('meta[property="og:description"]', "property", "og:description", seo.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_OG_IMAGE);

    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", seo.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", seo.description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_OG_IMAGE);
  }, [pathname]);

  return null;
};

export default SeoManager;
