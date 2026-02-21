import { Heart, ShoppingCart, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  unit: string;
}

const ProductCard = ({ id, name, price, originalPrice, image, category, unit }: ProductCardProps) => (
  <div className="group bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-all duration-300">
    <div className="relative aspect-square overflow-hidden bg-muted">
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute top-3 left-3">
        <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-medium">
          {category}
        </span>
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-8 h-8 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-sm">
          <Heart className="w-4 h-4" />
        </button>
        <Link
          to={`/product/${id}`}
          className="w-8 h-8 rounded-full bg-card/90 backdrop-blur flex items-center justify-center hover:bg-card transition-colors shadow-sm"
          aria-label={`View ${name}`}
        >
          <Eye className="w-4 h-4" />
        </Link>
      </div>
    </div>
    <div className="p-3 sm:p-4">
      <h3 className="font-serif font-semibold text-sm mb-0.5 line-clamp-2 min-h-[2.1rem]">{name}</h3>
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
          <Button asChild size="sm" className="h-8 rounded-full text-xs px-4">
            <Link to={`/product/${id}`}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Add to Cart
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default ProductCard;
