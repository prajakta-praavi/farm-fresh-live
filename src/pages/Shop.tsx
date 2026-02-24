import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { categories as mockCategories, products as mockProducts } from "@/data/mockData";
import { cn } from "@/lib/utils";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import shopBreadcrumbImage from "@/assets/shop breadcrub main.png";
import { getPublicProducts, type PublicProduct } from "@/lib/public-api";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [products, setProducts] = useState<PublicProduct[]>(mockProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const dynamicCategories = Array.from(new Set(products.map((item) => item.category))).filter(Boolean);
    if (dynamicCategories.length > 0) {
      return ["All", ...dynamicCategories];
    }
    return mockCategories;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      return selectedCategory === "All" || p.category === selectedCategory;
    });
  }, [products, selectedCategory]);

  const visibleProducts = useMemo(() => {
    if (selectedCategory === "All") return filtered;
    return filtered.slice(0, 4);
  }, [filtered, selectedCategory]);

  return (
    <Layout>
      <div className="pt-24 pb-16">
        <PageBreadcrumb
          image={shopBreadcrumbImage}
          alt="Shop banner"
          title="EXPLORE OUR SHOP"
          subtitle="ORGANIC & FSSAI CERTIFIED"
          align="center"
          titleClassName="text-[#4a1f00]"
          subtitleClassName="text-[#0b0b0b]"
          overlayClassName="items-center"
        />

        <div className="container">
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 md:px-8 h-12 rounded-xl text-sm md:text-base font-semibold whitespace-nowrap border transition-all duration-250",
                    selectedCategory === cat
                      ? "bg-[#4aa85f] text-white border-[#4aa85f] shadow-[0_8px_18px_rgba(74,168,95,0.32)] scale-[1.01]"
                      : "bg-white text-foreground border-[#9bb3aa] hover:border-[#4aa85f] hover:text-primary hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 text-sm text-muted-foreground">
            Showing {visibleProducts.length} of {filtered.length} products
          </div>

          {loading ? <p className="mb-4 text-sm text-muted-foreground">Loading products...</p> : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No products found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Shop;
