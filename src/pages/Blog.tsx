import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import blogBreadcrumbImage from "@/assets/blog breadcrub.png";
import { getPublicBlogs, type PublicBlogPost } from "@/lib/public-api";

const Blog = () => {
  const [posts, setPosts] = useState<PublicBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicBlogs()
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="pt-24 pb-16">
        <PageBreadcrumb image={blogBreadcrumbImage} alt="Blog banner" />

        <div className="container">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Our Blog</h1>
          </div>
          {loading ? <p className="text-center text-muted-foreground">Loading blogs...</p> : null}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border overflow-hidden group hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[3/2] overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                      {post.category}
                    </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.date || "Published recently"}
                  </span>
                </div>
                <h2 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-xs text-muted-foreground mb-2">By {post.author}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="text-primary text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    Read More <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.article>
            ))}
            {!loading && posts.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground">No blog posts available.</p>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Blog;
