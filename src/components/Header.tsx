import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import rushivanLogo from "@/assets/rushivan_agro.png";
import { CART_EVENTS, getCartCount } from "@/lib/cart";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/shop", label: "Shop" },
  { to: "/stay", label: "Farm Stay" },
  { to: "/corporate-gifting", label: "Corporate Gifting" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  useEffect(() => {
    const syncCount = () => setCartCount(getCartCount());
    syncCount();
    window.addEventListener(CART_EVENTS.updated, syncCount);
    window.addEventListener("storage", syncCount);
    return () => {
      window.removeEventListener(CART_EVENTS.updated, syncCount);
      window.removeEventListener("storage", syncCount);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white shadow-md"
          : "bg-white"
      )}
    >
      <div className="container grid h-16 grid-cols-[auto_1fr_auto] items-center md:h-20">
        <Link to="/" className="flex items-center">
          <img
            src={rushivanLogo}
            alt="Rushivan Agro"
            className="h-10 md:h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden lg:flex items-center justify-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "relative px-3 xl:px-4 py-2 text-base xl:text-lg font-semibold leading-none transition-colors",
                location.pathname === link.to
                  ? "text-primary"
                  : "text-foreground/85 hover:text-primary"
              )}
            >
              {link.label}
              <span
                className={cn(
                  "pointer-events-none absolute left-3 right-3 -bottom-[3px] h-[2px] rounded-full transition-opacity",
                  location.pathname === link.to ? "opacity-100 bg-primary" : "opacity-0"
                )}
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="relative hidden sm:inline-flex">
            <Heart className="w-5 h-5" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label="View cart">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-background/98 backdrop-blur-lg border-t animate-fade-in">
          <nav className="container py-4 flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "px-4 py-3 rounded-xl text-base font-semibold transition-colors",
                  location.pathname === link.to
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
