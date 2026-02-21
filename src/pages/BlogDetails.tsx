import { Link, useParams } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import blogBreadcrumbImage from "@/assets/blog breadcrub.png";
import { blogPosts } from "@/data/mockData";

const BlogDetails = () => {
  const { slug } = useParams();
  const post = blogPosts.find((b) => b.slug === slug);

  if (!post) {
    return (
      <Layout>
        <div className="pt-24 pb-16">
          <div className="container">
            <h1 className="text-3xl font-display font-bold mb-4">Blog Not Found</h1>
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
            <h1 className="mb-5 text-3xl md:text-4xl font-display font-bold text-foreground">
              {post.title}
            </h1>
            <img src={post.image} alt={post.title} className="mb-6 h-[320px] md:h-[520px] w-full object-cover" />
            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                {post.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime}
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
