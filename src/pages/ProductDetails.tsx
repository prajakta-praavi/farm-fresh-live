import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import shopBreadcrumbImage from "@/assets/shop breadcrub main.png";
import { products } from "@/data/mockData";
import { addToCart } from "@/lib/cart";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = useMemo(() => {
    const productId = Number(id);
    return products.find((item) => item.id === productId);
  }, [id]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  if (!product) {
    return (
      <Layout>
        <div className="pt-28 pb-16">
          <div className="container">
            <h1 className="text-2xl font-display font-bold mb-3">Product not found</h1>
            <p className="text-muted-foreground mb-6">This product does not exist.</p>
            <Button asChild>
              <Link to="/shop">Back to Shop</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const description = `${product.name} is sourced directly from our farm under strict hygiene and quality standards. This product is delivered fresh and carefully packed for daily use.`;
  const variants = product.variants?.length
    ? product.variants
    : [{ label: product.unit, price: product.price }];
  const selectedVariant = variants[selectedVariantIndex] ?? variants[0];
  const relatedProducts = products.filter(
    (item) => item.category === product.category && item.id !== product.id
  );

  useEffect(() => {
    setSelectedVariantIndex(0);
  }, [product.id]);

  const handleAddToCart = () => {
    addToCart(product.id, 1);
    alert(`${product.name} added to cart.`);
  };

  return (
    <Layout>
      <div className="pt-28 pb-16">
        <PageBreadcrumb image={shopBreadcrumbImage} alt={`${product.name} banner`} />

        <div className="container">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <img
              src={product.image}
              alt={product.name}
              className="w-full rounded-xl border border-border object-cover"
            />
            <div>
              <p className="inline-flex bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium mb-3">
                {product.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{product.name}</h1>
              <p className="text-muted-foreground mb-4">{description}</p>
              <p className="text-sm text-muted-foreground mb-2">HSN: {product.hsnCode || "N/A"}</p>
              <p className="text-sm text-muted-foreground mb-3">Selected Pack: {selectedVariant.label}</p>
              <div className="flex items-end gap-3 mb-6">
                <span className="text-2xl font-bold text-primary">Rs {selectedVariant.price}</span>
                {product.originalPrice && (
                  <span className="text-muted-foreground line-through">Rs {product.originalPrice}</span>
                )}
              </div>

              {variants.length > 1 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-2">Weight-wise Pricing</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant, index) => (
                      <button
                        key={`${variant.label}-${variant.price}`}
                        type="button"
                        onClick={() => setSelectedVariantIndex(index)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selectedVariantIndex === index
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/40"
                        }`}
                      >
                        {variant.label} - Rs {variant.price}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate(`/checkout/${product.id}?variant=${selectedVariantIndex}`)}>
                  Buy Now
                </Button>
                <Button variant="outline" onClick={handleAddToCart}>
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-14">
              <h2 className="text-2xl font-display font-bold mb-6">Related Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    to={`/product/${item.id}`}
                    className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                    <div className="p-3">
                      <p className="text-sm font-semibold line-clamp-2 mb-1">{item.name}</p>
                      <p className="text-sm text-primary font-bold">Rs {item.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetails;
