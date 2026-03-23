import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, ArrowLeft, User } from "lucide-react";
import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import blogBreadcrumbImage from "@/assets/blog breadcrub.png";
import blogFallbackImage from "@/assets/blog-1.png";
import { getPublicBlogBySlug, getPublicBlogs, type PublicBlogPost } from "@/lib/public-api";
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
  const [relatedPosts, setRelatedPosts] = useState<PublicBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    const load = async () => {
      try {
        const [postData, allBlogs] = await Promise.all([getPublicBlogBySlug(slug), getPublicBlogs()]);
        if (!isMounted) return;
        setPost(postData);
        const filtered = (allBlogs || []).filter((item) => item.slug !== slug);
        setRelatedPosts(filtered.slice(0, 3));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
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
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                  {post.category}
                </span>
                {post.author ? (
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <User className="h-3.5 w-3.5" />
                    {post.author}
                  </span>
                ) : null}
              </div>
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

            {relatedPosts.length > 0 ? (
              <div className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-display font-semibold text-foreground">Related Blogs</h2>
                  <Link to="/blog" className="text-sm font-semibold text-primary">
                    View all
                  </Link>
                </div>
                <div className="grid gap-5 md:grid-cols-3">
                  {relatedPosts.map((item) => (
                    <Link
                      key={item.id}
                      to={`/blog/${item.slug}`}
                      className="group rounded-2xl border bg-white p-3 transition-shadow hover:shadow-md"
                    >
                      <img
                        src={item.image || blogFallbackImage}
                        alt={item.title}
                        className="mb-3 h-52 w-full rounded-xl object-cover sm:h-56"
                        onError={(event) => {
                          const target = event.currentTarget;
                          if (target.src !== blogFallbackImage) {
                            target.src = blogFallbackImage;
                          }
                        }}
                      />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.category}</p>
                        <h3 className="line-clamp-2 text-base font-semibold text-foreground group-hover:text-primary">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>{item.author}</span>
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BlogDetails;
