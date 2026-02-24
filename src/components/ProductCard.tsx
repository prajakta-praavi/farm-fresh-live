import { useEffect, useState } from "react";
import { Heart, ShoppingCart, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  unit: string;
}

const WISHLIST_KEY = "rushivan_wishlist_ids";

const ProductCard = ({ id, name, price, originalPrice, image, category, unit }: ProductCardProps) => {
  const [inWishlist, setInWishlist] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as number[];
      setInWishlist(Array.isArray(ids) && ids.includes(id));
    } catch {
      setInWishlist(false);
    }
  }, [id]);

  const onToggleWishlist = () => {
    const raw = localStorage.getItem(WISHLIST_KEY);
    let ids: number[] = [];
    try {
      ids = raw ? ((JSON.parse(raw) as number[]) || []) : [];
    } catch {
      ids = [];
    }
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    const added = next.includes(id);
    setInWishlist(added);
    alert(added ? `${name} added to wishlist.` : `${name} removed from wishlist.`);
  };

  const openDetails = () => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="group bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <button type="button" className="block w-full h-full text-left" onClick={openDetails} aria-label={`Open ${name} details`}>
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </button>
        <div className="absolute top-3 left-3 hidden sm:block">
          <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-medium">
            {category}
          </span>
        </div>
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onToggleWishlist}
            className="w-8 h-8 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-sm"
            aria-label={inWishlist ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? "fill-red-500 text-red-500" : ""}`} />
          </button>
          <button
            type="button"
            onClick={openDetails}
            className="w-8 h-8 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-sm"
            aria-label={`View ${name}`}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <div className="mb-2 sm:hidden">
          <span className="bg-primary/10 text-primary text-[11px] px-2.5 py-1 rounded-full font-medium">
            {category}
          </span>
        </div>
        <button type="button" onClick={openDetails} className="font-serif font-semibold text-sm mb-0.5 line-clamp-2 min-h-[2.1rem] text-left hover:text-primary">
          {name}
        </button>
        <p className="text-muted-foreground text-xs mb-1.5">{unit}</p>

        <div className="pt-0.5 md:flex md:items-end md:justify-between">
          <div className="mb-2.5 md:mb-0">
            <p className="text-primary font-bold text-lg leading-none">
              <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
                <span>Rs</span>
                <span>{price}</span>
              </span>
            </p>
            {originalPrice && (
              <p className="text-muted-foreground text-xs line-through font-medium mt-0.5">
                Rs {originalPrice}
              </p>
            )}
          </div>

          <div className="flex justify-center md:justify-end">
            <Button
              size="sm"
              className="h-8 rounded-full text-xs px-4"
              onClick={() => {
                addToCart(id, 1, { unitPrice: price, variationLabel: unit, variationAttribute: "Unit" });
                alert(`${name} added to cart.`);
              }}
            >
              <span className="inline-flex items-center">
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                Add to Cart
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
