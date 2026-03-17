import { Link } from "react-router-dom";
import { Gift, Leaf, Package, Sparkles, MessageCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import giftingBreadcrumbImage from "@/assets/corporate gifting breadcrub.webp";
import giftingStoryImage from "@/assets/girt-scaled.webp";
import giftingPromoBannerImage from "@/assets/gift banner.png";

const whatsappLink =
  "https://wa.me/917774041569?text=Hello%20Rushivan%20Aagro%2C%0A%0AI%20am%20interested%20in%20Customised%20Corporate%20Gift%20Hampers.%0A%0AName%3A%20%0AOccasion%3A%20%0ALocation%20%2F%20City%3A%20%0AQuantity%20Required%3A%20%0AApprox%20Budget%20per%20Hamper%3A%20%0A%0APlease%20share%20available%20product%20options%20and%20details.%20Thank%20you.";

const whyChoose = [
  {
    icon: Leaf,
    title: "Farm-Fresh Organic Products",
    description: "Naturally grown, chemical-free farm produce packed with freshness and authenticity.",
  },
  {
    icon: Package,
    title: "Customised Gift Hampers",
    description: "Tailor hampers based on budget, occasion, and recipient preferences.",
  },
  {
    icon: Sparkles,
    title: "Elegant & Premium Packaging",
    description: "Beautifully packed gift boxes suitable for corporate and festive gifting.",
  },
  {
    icon: Gift,
    title: "Direct From Farm",
    description: "Authentic farm products sourced and packed directly from Rushivan Aagro.",
  },
];

const occasions = [
  "Corporate Festive Gifts",
  "Employee Appreciation Gifts",
  "Client Relationship Gifts",
  "Corporate Events & Conferences",
];

const hamperProducts = [
  "Organic agro products",
  "Farm-fresh grains & pulses",
  "Traditional farm produce",
  "Seasonal specialty items",
];

const orderingSteps = [
  {
    title: "Step 1 – Share Your Requirement",
    description: "Tell us quantity, budget, and occasion.",
  },
  {
    title: "Step 2 – Hamper Customisation",
    description: "We curate a hamper with suitable products and packaging.",
  },
  {
    title: "Step 3 – Delivery",
    description: "Bulk packaging and delivery ready for your corporate gifting needs.",
  },
];

const CorporateGifting = () => {
  return (
    <Layout>
      <div className="pt-20 pb-16">
        <section className="relative min-h-[60vh] flex items-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={giftingBreadcrumbImage}
              alt="Premium corporate gift hampers"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="container relative z-10 py-12">
            <div className="max-w-2xl text-white">
              <p className="text-sm uppercase tracking-[0.3em] text-white/80">Corporate Gifting</p>
              <h1 className="mt-3 text-3xl font-display font-bold leading-tight sm:text-4xl md:text-5xl">
                Premium Organic Corporate Gift Hampers
              </h1>
              <p className="mt-4 text-sm sm:text-base md:text-lg text-white/90 leading-relaxed">
                Thoughtfully curated gift hampers featuring farm-fresh, naturally grown products from
                Rushivan Aagro. Perfect for corporate gifting, festive hampers, client appreciation,
                and employee rewards.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link to="/contact#contact-form">Enquire Now</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Us
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="container">
          <section className="py-12">
            <h2 className="text-center text-2xl font-display font-bold md:text-3xl">
              Why Choose Rushivan Gift Hampers
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {whyChoose.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-12">
            <h2 className="text-center text-2xl font-display font-bold md:text-3xl">
              Occasions for Corporate Gifting
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {occasions.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-white p-5 text-center font-medium"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="py-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-display font-bold md:text-3xl">
                  Build Your Custom Gift Hamper
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Create personalised hampers with handpicked organic products such as:
                </p>
                <ul className="mt-4 space-y-2">
                  {hamperProducts.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm sm:text-base">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Each hamper is customisable in size, packaging, and product selection. You can mix
                  and match products to curate the perfect hamper for employees, clients or festive
                  gifting.
                </p>
              </div>
              <div>
                <img
                  src={giftingStoryImage}
                  alt="Custom corporate gift hamper"
                  className="h-[320px] w-full rounded-2xl object-cover md:h-[420px]"
                />
              </div>
            </div>
          </section>

          <section className="py-12">
            <h2 className="text-center text-2xl font-display font-bold md:text-3xl">
              Simple 3-Step Ordering Process
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {orderingSteps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-border bg-card p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold">
                      {index + 1}
                    </span>
                    <h3 className="font-display font-semibold text-base">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="relative mt-6 overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={giftingPromoBannerImage}
              alt="Custom corporate gift hampers"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
          <div className="container relative z-10 py-14 text-center text-white md:py-20">
            <h2 className="text-2xl font-display font-bold md:text-4xl">
              Looking for Custom Corporate Gift Hampers?
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm sm:text-base md:text-lg text-white/90">
              Let us create thoughtful organic gift hampers for your employees, clients, and special
              occasions.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/contact#contact-form">Enquire Now</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp for Quick Response
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default CorporateGifting;
