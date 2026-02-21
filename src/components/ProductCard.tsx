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
    <div className="p-4">
      <h3 className="font-serif font-semibold text-sm mb-1 line-clamp-2">{name}</h3>
      <p className="text-muted-foreground text-xs mb-3">{unit}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-primary font-bold">Rs {price}</span>
          {originalPrice && (
            <span className="text-muted-foreground text-sm line-through">Rs {originalPrice}</span>
          )}
        </div>
        <Button asChild size="sm" className="h-8 rounded-full text-xs">
          <Link to={`/product/${id}`}>
            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
            Add to Cart
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

export default ProductCard;
