import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import blogBreadcrumbImage from "@/assets/blog breadcrub.png";
import blogFallbackImage from "@/assets/blog-1.png";
import { getPublicBlogBySlug, type PublicBlogPost } from "@/lib/public-api";
import { useSeo } from "@/components/SeoManager";

const SITE_NAME = "Rushivan Agro";
const SITE_URL = "https://www.rushivanagro.com";

const toAbsoluteUrl = (value?: string | null) => {
  const path = (value || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${SITE_URL}${path}`;
  return `${SITE_URL}/${path.replace(/^\/+/, "")}`;
};

const toSeoDescription = (value: string) => {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trim()}...`;
};

const toIsoDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const BlogDetails = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<PublicBlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    getPublicBlogBySlug(slug)
      .then((data) => setPost(data))
      .finally(() => setLoading(false));
  }, [slug]);

  const seoData = useMemo(() => {
    if (loading) {
      return {
        title: `Blog Article | ${SITE_NAME}`,
        description: "Read the latest stories and insights from Rushivan Agro.",
        ogType: "article" as const,
      };
    }

    if (!post) {
      return {
        title: `Blog Not Found | ${SITE_NAME}`,
        description: "The blog you are looking for does not exist.",
        robots: "noindex, nofollow",
        ogType: "article" as const,
      };
    }

    const seoDescription = toSeoDescription(post.excerpt || post.content?.[0] || post.title);
    const imageUrl = toAbsoluteUrl(post.image || blogFallbackImage) || `${SITE_URL}/favicon.ico`;
    const articleUrl = `${SITE_URL}/blog/${post.slug}`;
    const publishedAt = toIsoDate(post.publishedAt || post.date);

    return {
      title: `${post.title} | ${SITE_NAME}`,
      description: seoDescription,
      image: imageUrl,
      ogType: "article" as const,
      keywords: `${post.title}, ${post.category}, ${SITE_NAME} blog`,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: seoDescription,
        image: [imageUrl],
        author: {
          "@type": "Person",
          name: post.author || SITE_NAME,
        },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/favicon.ico`,
          },
        },
        datePublished: publishedAt || undefined,
        dateModified: publishedAt || undefined,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": articleUrl,
        },
        articleSection: post.category,
      },
    };
  }, [loading, post]);

  useSeo(seoData);

  if (loading) {
    return (
      <Layout>
        <div className="pt-24 pb-16">
          <div className="container">
            <p className="text-muted-foreground">Loading blog...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="pt-24 pb-16">
          <div className="container">
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-4">Blog Not Found</h1>
            <p className="text-muted-foreground mb-6">The blog you are looking for does not exist.</p>
            <Link to="/blog" className="inline-flex items-center gap-2 text-primary font-semibold">
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pt-24 pb-16">
        <PageBreadcrumb image={blogBreadcrumbImage} alt="Blog details banner" />

        <div className="container">
          <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-primary font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <div>
            <h1 className="mb-5 text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground">
              {post.title}
            </h1>
            <p className="mb-2 text-sm text-muted-foreground">By {post.author}</p>
            <img
              src={post.image || blogFallbackImage}
              alt={post.title}
              className="mb-6 h-[320px] md:h-[520px] w-full object-cover"
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src !== blogFallbackImage) {
                  target.src = blogFallbackImage;
                }
              }}
            />
            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                {post.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.date || "Published recently"}
              </span>
            </div>

            <div className="space-y-5 w-full">
              {post.content?.map((para: string, idx: number) => (
                <p key={idx} className="w-full text-foreground leading-relaxed text-justify">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BlogDetails;
