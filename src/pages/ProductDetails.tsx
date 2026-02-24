import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import shopBreadcrumbImage from "@/assets/shop breadcrub main.png";
import { addToCart } from "@/lib/cart";
import { getPublicProductById, getPublicProducts, type PublicProduct, type PublicProductVariation } from "@/lib/publicApi";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [allProducts, setAllProducts] = useState<PublicProduct[]>([]);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);

  useEffect(() => {
    const productId = Number(id || 0);
    if (!productId) return;

    getPublicProductById(productId).then((value) => {
      setProduct(value);
      const firstVariation = value?.variations?.[0] ?? null;
      setSelectedVariationId(firstVariation ? firstVariation.id : null);
    });

    getPublicProducts().then((items) => {
      setAllProducts(Array.isArray(items) ? items : []);
    });
  }, [id]);

  const selectedVariation = useMemo<PublicProductVariation | null>(() => {
    if (!product || !Array.isArray(product.variations) || product.variations.length === 0) return null;
    return product.variations.find((item) => item.id === selectedVariationId) ?? product.variations[0];
  }, [product, selectedVariationId]);

  const variationsByAttribute = useMemo(() => {
    const map = new Map<string, PublicProductVariation[]>();
    (product?.variations || []).forEach((variation) => {
      const key = variation.attribute_name || "Option";
      const current = map.get(key) || [];
      current.push(variation);
      map.set(key, current);
    });
    return Array.from(map.entries());
  }, [product?.variations]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCategory = allProducts.filter((item) => item.id !== product.id && item.category === product.category);
    if (sameCategory.length >= 4) return sameCategory.slice(0, 4);
    const otherProducts = allProducts.filter((item) => item.id !== product.id && item.category !== product.category);
    return [...sameCategory, ...otherProducts].slice(0, 4);
  }, [allProducts, product]);

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

  const description =
    product.description?.trim() ||
    `${product.name} is sourced directly from our farm under strict hygiene and quality standards. This product is delivered fresh and carefully packed for daily use.`;

  const normalizeRupeeText = (value?: string | null) => {
    if (!value) return "";
    return value.replace(/\bRs\.?\s*/gi, "\u20B9 ");
  };

  const displayPrice = selectedVariation ? selectedVariation.price : product.price;
  const displayStock = selectedVariation ? selectedVariation.stock : Number(product.stockQuantity || 0);
  const displayUnit = selectedVariation
    ? selectedVariation.quantity_value != null && selectedVariation.unit
      ? `${selectedVariation.quantity_value} ${selectedVariation.unit}`
      : normalizeRupeeText(selectedVariation.value)
    : product.unit;

  const handleAddToCart = () => {
    addToCart(product.id, 1, {
      variationId: selectedVariation?.id ?? null,
      variationLabel:
        selectedVariation?.quantity_value != null && selectedVariation?.unit
          ? `${selectedVariation.quantity_value} ${selectedVariation.unit}`
          : normalizeRupeeText(selectedVariation?.value) || displayUnit,
      variationAttribute: selectedVariation?.attribute_name || "Unit",
      sku: selectedVariation?.sku ?? null,
      unitPrice: displayPrice,
    });
    alert(`${product.name} added to cart.`);
  };

  return (
    <Layout>
      <div className="pt-28 pb-16">
        <PageBreadcrumb image={shopBreadcrumbImage} alt={`${product.name} banner`} />
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <img src={product.image} alt={product.name} className="w-full rounded-xl border border-border object-cover" />
            <div>
              <p className="inline-flex bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium mb-3">
                {product.category}
              </p>
              <h1 className="mb-2 break-words text-3xl font-display font-bold md:text-4xl">{product.name}</h1>
              <p className="text-muted-foreground mb-4">{description}</p>
              <p className="text-sm text-muted-foreground mb-2">HSN: {product.hsnCode || "N/A"}</p>
              <p className="text-sm text-muted-foreground mb-2">
                Selected Option: {selectedVariation?.attribute_name ? `${selectedVariation.attribute_name}: ` : ""}
                {displayUnit}
              </p>
              <p className="text-sm text-muted-foreground mb-3">Stock: {displayStock}</p>
              <div className="flex items-end gap-3 mb-6">
                <span className="text-2xl font-bold text-primary">{"\u20B9"} {displayPrice}</span>
              </div>

              {variationsByAttribute.map(([attributeName, options]) => (
                <div key={attributeName} className="mb-4">
                  <p className="text-sm font-semibold mb-2">
                    {(attributeName || "").trim().toLowerCase() === "weight" ? "Weight Options" : `${attributeName} Options`}
                  </p>
                  <select
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={
                      selectedVariation && selectedVariation.attribute_name === attributeName
                        ? String(selectedVariation.id)
                        : ""
                    }
                    onChange={(event) => setSelectedVariationId(Number(event.target.value))}
                  >
                    <option value="">Select {attributeName}</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {(option.quantity_value != null && option.unit
                          ? `${option.quantity_value} ${option.unit}`
                          : normalizeRupeeText(option.value)) || normalizeRupeeText(option.value)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {displayStock > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate(`/checkout/${product.id}?variationId=${selectedVariation?.id ?? ""}`)}>
                    Buy Now
                  </Button>
                  <Button variant="outline" onClick={handleAddToCart}>
                    Add to Cart
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-semibold text-red-600">Out of Stock</p>
              )}
            </div>
          </div>

          <div className="mt-14">
            <h2 className="text-2xl font-display font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/product/${item.id}`}
                  className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" />
                  <div className="p-3">
                    <p className="text-sm font-semibold line-clamp-2 mb-1">{item.name}</p>
                    <p className="text-sm text-primary font-bold">{"\u20B9"} {item.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetails;
