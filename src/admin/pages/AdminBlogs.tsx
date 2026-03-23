import { useEffect, useRef, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { BlogCategory, BlogPost } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BlogForm = {
  id?: number;
  title: string;
  author_name: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  publish_mode: "published" | "scheduled" | "draft";
  publish_at: string;
  is_published: boolean;
};

const defaultForm: BlogForm = {
  title: "",
  author_name: "Rushivan Aagro",
  excerpt: "",
  content: "",
  image_url: "",
  category: "General",
  publish_mode: "published",
  publish_at: "",
  is_published: true,
};

const AdminBlogs = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [form, setForm] = useState<BlogForm>(defaultForm);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const isEdit = Boolean(form.id);

  const load = async () => {
    const [blogsData, categoriesData] = await Promise.all([adminApi.getBlogs(), adminApi.getBlogCategories()]);
    const normalizedBlogs = Array.isArray(blogsData) ? blogsData : [];
    const normalizedCategories = Array.isArray(categoriesData) ? categoriesData : [];

    const categoryMap = new Map<string, BlogCategory>();
    normalizedCategories.forEach((item) => categoryMap.set(item.name.toLowerCase(), item));
    let tempId = -1;
    normalizedBlogs.forEach((item) => {
      const name = (item.category || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { id: tempId--, name, created_at: "" });
      }
    });

    const mergedCategories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    setCategories(mergedCategories);
    setBlogs(normalizedBlogs);

    if (!form.id) {
      const general = mergedCategories.find((item) => item.name.toLowerCase() === "general");
      if (general) {
        setForm((prev) => ({ ...prev, category: general.name }));
      }
    }
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load blogs"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => setForm(defaultForm);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const isDraft = form.publish_mode === "draft";
      const isScheduled = form.publish_mode === "scheduled";
      if (isScheduled && !form.publish_at) {
        throw new Error("Please select schedule date and time");
      }
      const payload = {
        title: form.title,
        author_name: form.author_name,
        excerpt: form.excerpt,
        content: form.content,
        image_url: form.image_url,
        category: form.category,
        is_published: isDraft ? 0 : 1,
        publish_at: isScheduled ? form.publish_at : null,
      };
      if (form.id) {
        await adminApi.updateBlog(form.id, payload);
      } else {
        await adminApi.addBlog(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (blog: BlogPost) => {
    const publishAt = (blog.publish_at || "").trim();
    const asDate = publishAt ? new Date(publishAt.replace(" ", "T")) : null;
    const isFuture = Boolean(asDate && !Number.isNaN(asDate.getTime()) && asDate.getTime() > Date.now());
    const publishMode: BlogForm["publish_mode"] =
      Number(blog.is_published) !== 1 ? "draft" : isFuture ? "scheduled" : "published";
    const localPublishAt =
      publishAt && asDate && !Number.isNaN(asDate.getTime())
        ? new Date(asDate.getTime() - asDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : "";

    setForm({
      id: blog.id,
      title: blog.title,
      author_name: blog.author_name || "",
      excerpt: blog.excerpt,
      content: blog.content,
      image_url: blog.image_url || "",
      category: blog.category || "General",
      publish_mode: publishMode,
      publish_at: localPublishAt,
      is_published: Number(blog.is_published) === 1,
    });
    setError("");
  };

  const getBlogStatus = (blog: BlogPost) => {
    if (Number(blog.is_published) !== 1) return "Draft";
    const publishAt = (blog.publish_at || "").trim();
    if (!publishAt) return "Published";
    const asDate = new Date(publishAt.replace(" ", "T"));
    if (Number.isNaN(asDate.getTime())) return "Published";
    return asDate.getTime() > Date.now() ? "Scheduled" : "Published";
  };

  const onImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const maxSize = 5 * 1024 * 1024;
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const allowed = new Set(["jpg", "jpeg", "png", "webp"]);
      if (!allowed.has(extension)) {
        throw new Error("Only jpg, jpeg, png, webp files are allowed");
      }
      if (file.size <= 0 || file.size > maxSize) {
        throw new Error("Image must be between 1 byte and 5MB");
      }
      const result = await adminApi.uploadProductImage(file);
      setForm((prev) => ({ ...prev, image_url: result.image_url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const onDeleteBlog = async (id: number) => {
    if (!window.confirm("Delete this blog post?")) return;
    setError("");
    try {
      await adminApi.deleteBlog(id);
      if (form.id === id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const onAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setError("");
    setSavingCategory(true);
    try {
      await adminApi.addBlogCategory(name);
      setNewCategoryName("");
      await load();
      setForm((prev) => ({ ...prev, category: name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Category add failed");
    } finally {
      setSavingCategory(false);
    }
  };

  const onDeleteCategory = async (category: BlogCategory) => {
    if (category.name.toLowerCase() === "general") return;
    setError("");
    setDeletingCategoryId(category.id);
    try {
      await adminApi.deleteBlogCategory(category.id);
      await load();
      if (form.category.toLowerCase() === category.name.toLowerCase()) {
        setForm((prev) => ({ ...prev, category: "General" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Category delete failed");
    } finally {
      setDeletingCategoryId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Blog Management</h1>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <h2 className="font-semibold">Blog Categories</h2>
        <div className="flex gap-3">
          <Input
            placeholder="Add category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button type="button" onClick={onAddCategory} disabled={savingCategory || newCategoryName.trim() === ""}>
            {savingCategory ? "Adding..." : "Add Category"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div key={`${category.id}-${category.name}`} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <span>{category.name}</span>
              {category.name.toLowerCase() !== "general" ? (
                <button
                  type="button"
                  onClick={() => onDeleteCategory(category)}
                  disabled={deletingCategoryId === category.id}
                  className="text-red-600 disabled:text-red-300"
                >
                  {deletingCategoryId === category.id ? "..." : "x"}
                </button>
              ) : null}
            </div>
          ))}
          {categories.length === 0 ? <p className="text-sm text-slate-500">No categories found.</p> : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4 space-y-4">
        <h2 className="font-semibold">{isEdit ? "Edit Blog Post" : "Add New Blog Post"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Blog title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="md:col-span-1"
            required
          />
          <Input
            placeholder="Author name"
            value={form.author_name}
            onChange={(e) => setForm((prev) => ({ ...prev, author_name: e.target.value }))}
            className="md:col-span-1"
          />
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {categories.map((category) => (
              <option key={`${category.id}-${category.name}`} value={category.name}>
                {category.name}
              </option>
            ))}
            {categories.length === 0 ? <option value="General">General</option> : null}
          </select>
          <select
            value={form.publish_mode}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                publish_mode: e.target.value as BlogForm["publish_mode"],
                is_published: e.target.value === "draft" ? false : true,
                publish_at: e.target.value === "scheduled" ? prev.publish_at : "",
              }))
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="published">Publish Now</option>
            <option value="scheduled">Schedule</option>
            <option value="draft">Draft</option>
          </select>
          {form.publish_mode === "scheduled" ? (
            <Input
              type="datetime-local"
              value={form.publish_at}
              onChange={(e) => setForm((prev) => ({ ...prev, publish_at: e.target.value }))}
            />
          ) : null}
          <Input
            placeholder="Image URL (uploaded path)"
            value={form.image_url}
            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
            className="md:col-span-2"
          />
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImagePick} />
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
            {form.image_url ? <span className="text-xs text-slate-600 break-all">{form.image_url}</span> : null}
          </div>
          <Textarea
            placeholder="Excerpt"
            value={form.excerpt}
            onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
            className="md:col-span-2"
            required
          />
          <Textarea
            placeholder="Content (use blank line between paragraphs)"
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            className="md:col-span-2 min-h-[180px]"
            required
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
              disabled
            />
            Published (auto from Publish Mode)
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Blog" : "Add Blog"}
          </Button>
          {isEdit ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel Edit
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 font-semibold">All Blog Posts</h2>
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-2">Title</th>
                <th className="p-2">Author</th>
                <th className="p-2">Slug</th>
                <th className="p-2">Category</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => (
                <tr key={blog.id} className="border-t">
                  <td className="p-2">{blog.title}</td>
                  <td className="p-2">{blog.author_name || "-"}</td>
                  <td className="p-2">{blog.slug}</td>
                  <td className="p-2">{blog.category}</td>
                  <td className="p-2">{getBlogStatus(blog)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => onEdit(blog)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDeleteBlog(blog.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && blogs.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={6}>
                    No blog posts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBlogs;
