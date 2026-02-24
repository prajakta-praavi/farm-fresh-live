import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Star,
  Leaf,
  Truck,
  Heart,
  Shield,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import homeBanner1 from "@/assets/home banner1.png";
import homeBanner2 from "@/assets/banner2.png";
import homeBanner3 from "@/assets/banner3.png";
import grainsAndPulsesImage from "@/assets/grains and pulses.png";
import naturalSweetnessImage from "@/assets/natural sweetness.png";
import spicesAndCondimentsImage from "@/assets/spices and condiments.png";
import dairyProductsImage from "@/assets/dairy products.png";
import freshFruitsImage from "@/assets/fresh fruits.png";
import gauSevaImage from "@/assets/gau seva secred products.png";
import roomTwoImage from "@/assets/room-2.png";
import roomThreeImage from "@/assets/Room-3.png";
import roomFourImage from "@/assets/room-4.png";
import shopProductImage from "@/assets/shop product.png";
import testimonialBgImage from "@/assets/testimonial_bg.png";
import aboutHomeImage from "@/assets/About-home.png";
import { products as mockProducts, testimonials } from "@/data/mockData";
import { getPublicProducts, type PublicProduct } from "@/lib/publicApi";

const categoryData = [
  { name: "Grains & Pulses", image: grainsAndPulsesImage },
  { name: "Natural Sweetness", image: naturalSweetnessImage },
  { name: "Spices & Condiments", image: spicesAndCondimentsImage },
  { name: "Dairy Products", image: dairyProductsImage },
  { name: "Fresh Fruits", image: freshFruitsImage },
  { name: "Gau Seva Sacred Products", image: gauSevaImage },
];

const whyChoose = [
  { icon: Leaf, title: "100% Organic", desc: "No chemicals, no pesticides - just pure nature" },
  { icon: Truck, title: "Farm Fresh", desc: "Direct from our farm to your doorstep" },
  { icon: Heart, title: "Ethical Farming", desc: "Humane treatment of animals & sustainable practices" },
  { icon: Shield, title: "Quality Assured", desc: "Every product tested for purity and freshness" },
];

const bannerSlides = [
  {
    image: homeBanner1,
    scriptTitle: "Farm-Fresh Goodness",
    title: "From Our Fields to Your Plate",
    description:
      "Enjoy chemical-free produce grown with care and healthy living from Rushivan Aagro.",
    buttonLabel: "SHOP NOW",
    buttonTo: "/shop",
    theme: "default",
  },
  {
    image: homeBanner2,
    scriptTitle: "FRESHLY",
    title: "HANDPICKED STRAWBERRIES",
    description: "Freshly Harvested, Farm-to-Table Strawberries You Can Trust",
    buttonLabel: "SHOP NOW",
    buttonTo: "/shop",
    theme: "strawberry",
  },
  {
    image: homeBanner3,
    scriptTitle: "Taste the Difference",
    title: "Healthy Choices for Every Family",
    description:
      "Discover farm-crafted essentials designed for wellness, flavor, and a better everyday lifestyle.",
    buttonLabel: "BUY NOW",
    buttonTo: "/shop",
    theme: "default",
  },
];

const farmStaySlides = [roomTwoImage, roomThreeImage, roomFourImage];

const Index = () => {
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeFarmStaySlide, setActiveFarmStaySlide] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [visibleTestimonials, setVisibleTestimonials] = useState(3);
  const [featuredProducts, setFeaturedProducts] = useState<PublicProduct[]>(mockProducts);
  const touchStartX = useRef<number | null>(null);
  const currentSlide = bannerSlides[activeBanner];

  useEffect(() => {
    document.title = "Rushivan Aagro | Pure by Nature, Rooted in Tradition.";
  }, []);

  useEffect(() => {
    getPublicProducts()
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setFeaturedProducts(items);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % bannerSlides.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateVisibleTestimonials = () => {
      if (window.innerWidth < 640) {
        setVisibleTestimonials(1);
        return;
      }
      if (window.innerWidth < 1024) {
        setVisibleTestimonials(2);
        return;
      }
      setVisibleTestimonials(3);
    };

    updateVisibleTestimonials();
    window.addEventListener("resize", updateVisibleTestimonials);
    return () => window.removeEventListener("resize", updateVisibleTestimonials);
  }, []);

  useEffect(() => {
    const testimonialTimer = window.setInterval(() => {
      setActiveTestimonial((prev) => {
        const maxIndex = Math.max(testimonials.length - visibleTestimonials, 0);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 3500);
    return () => window.clearInterval(testimonialTimer);
  }, [visibleTestimonials]);

  useEffect(() => {
    const roomSliderTimer = window.setInterval(() => {
      setActiveFarmStaySlide((prev) => (prev + 1) % farmStaySlides.length);
    }, 3000);
    return () => window.clearInterval(roomSliderTimer);
  }, []);

  const goToPrevBanner = () => {
    setActiveBanner((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const goToNextBanner = () => {
    setActiveBanner((prev) => (prev + 1) % bannerSlides.length);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        goToPrevBanner();
      } else {
        goToNextBanner();
      }
    }
    touchStartX.current = null;
  };

  const goToPrevTestimonial = () => {
    const maxIndex = Math.max(testimonials.length - visibleTestimonials, 0);
    setActiveTestimonial((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const goToNextTestimonial = () => {
    const maxIndex = Math.max(testimonials.length - visibleTestimonials, 0);
    setActiveTestimonial((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  return (
    <Layout>
      <section
        className="relative h-[50vh] sm:h-[60vh] md:h-[76vh] lg:h-screen flex items-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="absolute inset-0">
          {bannerSlides.map((slide, index) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={`Rushivan Aagro banner ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                activeBanner === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-black/5" />
        </div>

        <div className="container relative z-10">
          <motion.div
            key={activeBanner}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`max-w-[96%] sm:max-w-[82%] md:max-w-[62%] lg:max-w-[50%] xl:max-w-[46%] rounded-2xl px-3 py-3 sm:px-6 sm:py-6 md:px-8 md:py-8 ${
              currentSlide.theme === "strawberry" ? "mr-auto bg-white/68" : "bg-white/78"
            } backdrop-blur-[2px]`}
          >
            <p
              className={`leading-tight mb-2 sm:mb-3 ${
                currentSlide.theme === "strawberry"
                  ? "font-black uppercase tracking-tight text-[#ff5e4d] text-3xl sm:text-5xl md:text-6xl lg:text-7xl"
                  : "font-script text-[#67b31b] text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
              }`}
            >
              {currentSlide.scriptTitle}
            </p>
            <h1
              className={`leading-tight mb-2 sm:mb-3 ${
                currentSlide.theme === "strawberry"
                  ? "text-[#9d673f] text-sm sm:text-2xl md:text-3xl font-extrabold tracking-[0.09em] sm:tracking-[0.18em]"
                  : "text-[#06533A] text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold"
              }`}
            >
              {currentSlide.title}
            </h1>
            <p
              className={`leading-snug sm:leading-relaxed mb-4 sm:mb-6 max-w-2xl ${
                currentSlide.theme === "strawberry"
                  ? "text-[#4a4a4a] text-sm sm:text-xl md:text-[2rem]"
                  : "text-[#0A573D] text-sm sm:text-base md:text-lg"
              }`}
            >
              {currentSlide.description}
            </p>
            <Button
              asChild
              className="rounded-full h-9 sm:h-11 md:h-12 px-5 sm:px-8 md:px-9 text-xs sm:text-base font-bold bg-[#0C7A12] hover:bg-[#09680f] text-white"
            >
              <Link to={currentSlide.buttonTo}>{currentSlide.buttonLabel}</Link>
            </Button>
          </motion.div>
        </div>

        <button
          onClick={goToPrevBanner}
          className="absolute left-2 sm:left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/85 text-[#0A573D] border border-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Previous banner"
        >
          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>
        <button
          onClick={goToNextBanner}
          className="absolute right-2 sm:right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/85 text-[#0A573D] border border-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Next banner"
        >
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        </button>

        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {bannerSlides.map((slide, index) => (
            <button
              key={slide.image}
              onClick={() => setActiveBanner(index)}
              className={`h-2.5 rounded-full transition-all ${
                activeBanner === index ? "w-8 bg-[#0C7A12]" : "w-2.5 bg-[#0C7A12]/40"
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="bg-white py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              About Rushivan Aagro
            </h2>
          </div>
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <div className="space-y-4 text-base leading-relaxed text-foreground md:text-[1.65rem] md:leading-[1.55]">
                <p>Welcome to Rushivan Aagro - your peaceful farmstay escape.</p>
                <p>
                  Experience nature, village life, and organic living in the heart of Maharashtra.
                  Stay with us, meet our farm animals, and enjoy our range of fresh organic products.
                </p>
                <p>
                  रशिवन अॅग्रो मध्ये आपले स्वागत आहे - निसर्गाच्या सानिध्यातील आमचे शेत-निवास. हृदय
                  महाराष्ट्रातील निसर्ग, ग्रामीण जीवन आणि सेंद्रिय उत्पादनांचा आनंद घ्या. आमच्याशी राहा,
                  आमच्या शेतप्राण्यांना भेटा, आणि ताज्या सेंद्रिय उत्पादनांचा आनंद घ्या.
                </p>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <img
                src={aboutHomeImage}
                alt="About Rushivan Aagro"
                className="h-auto w-full max-w-[520px] object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-cream">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Explore Our Categories
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-6 md:gap-6 lg:gap-8">
              {categoryData.map((cat) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <Link to={`/shop?category=${encodeURIComponent(cat.name)}`} className="group block">
                    <div className="relative mx-auto w-[120px] h-[120px] sm:w-[132px] sm:h-[132px] md:w-[148px] md:h-[148px] lg:w-[160px] lg:h-[160px] rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)] flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                      <div className="w-[96px] h-[96px] sm:w-[104px] sm:h-[104px] md:w-[118px] md:h-[118px] lg:w-[128px] lg:h-[128px] rounded-full bg-[#329d63] flex items-center justify-center overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-[78%] h-[78%] object-contain"
                        />
                      </div>
                    </div>
                    <h3 className="mt-3 md:mt-4 font-bold text-sm sm:text-base md:text-lg lg:text-xl text-foreground leading-tight">
                      {cat.name}
                    </h3>
                  </Link>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-2">Featured Products</h2>
            </div>
            <Button asChild variant="outline" className="hidden md:flex rounded-full">
              <Link to="/shop">
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
          <div className="md:hidden mt-8 text-center">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/shop">
                View All Products <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-primary/5">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Why Choose Rushivan Aagro?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChoose.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card p-6 rounded-2xl border border-border text-center hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-2xl shadow-xl"
            >
              <div className="relative w-full aspect-[4/3]">
                {farmStaySlides.map((slide, index) => (
                  <img
                    key={`${slide}-${index}`}
                    src={slide}
                    alt={`Farm Stay Room ${index + 1}`}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                      activeFarmStaySlide === index ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
              </div>
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                {farmStaySlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFarmStaySlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      activeFarmStaySlide === index ? "w-7 bg-white" : "w-2.5 bg-white/60"
                    }`}
                    aria-label={`Go to room slide ${index + 1}`}
                  />
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-accent font-semibold text-sm uppercase tracking-wide">Experience the Farm Life</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold mt-2 mb-4">
                Stay at Our Farm
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Escape the city and immerse yourself in the tranquility of rural life. Wake up to birdsong, milk fresh cows, walk through organic fields, and enjoy farm-fresh meals under the stars.
              </p>
              <ul className="space-y-3 mb-8">
                {["2 cozy cottage rooms", "Stay for up to 12-15 people", "Farm experiences & homely healthy meals"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="rounded-full">
                <Link to="/stay">
                  <Calendar className="w-5 h-5 mr-2" />
                  Book Your Stay
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden py-6 sm:py-8 md:py-10"
        style={{ backgroundImage: `url(${testimonialBgImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-white/85" />
        <div className="container relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">What Our Customers Say</h2>
          </div>
          <div className="mb-3 md:mb-4 flex items-center justify-end gap-2">
            <button
              onClick={goToPrevTestimonial}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0C7A12]/30 bg-white text-[#0C7A12] transition-colors hover:bg-[#0C7A12] hover:text-white"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextTestimonial}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0C7A12]/30 bg-white text-[#0C7A12] transition-colors hover:bg-[#0C7A12] hover:text-white"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-hidden">
            <div
              className="-mx-3 flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${(activeTestimonial * 100) / visibleTestimonials}%)` }}
            >
              {testimonials.map((t, index) => (
                <div
                  key={`${t.name}-${index}`}
                  className="w-full shrink-0 px-3"
                  style={{ width: `${100 / visibleTestimonials}%` }}
                >
                  <div className="bg-card p-6 rounded-2xl border border-border h-full">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-gold text-gold" />
                      ))}
                    </div>
                    <p className="text-foreground/80 text-sm leading-relaxed mb-4 font-serif italic">
                      "{t.text}"
                    </p>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-muted-foreground text-xs">{t.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-14 md:py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={shopProductImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/85" />
        </div>
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Taste the Difference of Real Farm Produce
          </h2>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base"
          >
            <Link to="/shop">Start Shopping Today</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
