import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import giftingBreadcrumbImage from "@/assets/gifting breadcrub.png";
import giftingStoryImage from "@/assets/girt-scaled.webp";
import giftingPromoBannerImage from "@/assets/gift banner.webp";
import giftingVideo1 from "@/assets/short-2.mp4";
import giftingVideo2 from "@/assets/short-3.mp4";
import giftingVideo3 from "@/assets/short-4.mp4";
import giftingVideo4 from "@/assets/Short-5.mp4";

const CorporateGifting = () => {
  return (
    <Layout>
      <div className="pt-24 pb-16">
        <PageBreadcrumb
          image={giftingBreadcrumbImage}
          alt="Corporate gifting banner"
          title={"Make Every Corporate Moment & Festival Moment\nMemorable With Our Premium Hampers."}
          subtitle="Starting at Just 999/-"
          align="left"
          titleClassName="text-white font-serif font-normal text-[10px] sm:text-base md:text-xl leading-tight tracking-normal max-w-3xl whitespace-pre-line"
          subtitleClassName="text-white font-serif font-bold text-xs sm:text-lg md:text-2xl mt-2"
          overlayClassName="items-center bg-black/20"
        />

        <div className="container">
          <section className="mb-14 grid items-center gap-8 md:grid-cols-2 md:gap-10">
            <div>
              <p className="mb-5 text-foreground leading-relaxed">
                Festivals are moments of love and togetherness - and the gifts we share become
                memories that last. Our Rushivan Aagro Festive Gift Collection brings together
                tradition, purity, and freshness in beautifully curated hampers made with homemade
                care and premium ingredients, thoughtfully sourced from trusted farms and prepared
                with uncompromised quality standards.
              </p>
              <p className="mb-5 text-foreground leading-relaxed">
                Perfect for family, friends, employees, or clients, our hampers add a warm touch to
                every celebration. From classic festive treats to healthy, chemical-free products and
                naturally prepared delights, everything is crafted with authenticity and attention to
                detail, ensuring a delightful experience that reflects care, gratitude, and emotions.
                You can even customize your hamper exactly the way you like.
              </p>
              <p className="text-xl font-semibold text-foreground">
                Celebrate every festival with gifts that feel thoughtful, look elegant, and taste
                memorable.
              </p>
            </div>

            <div>
              <img
                src={giftingStoryImage}
                alt="Corporate gifting collection"
                className="h-[320px] w-full rounded-xl object-cover md:h-[460px]"
              />
            </div>
          </section>

          <section className="mb-14">
            <img
              src={giftingPromoBannerImage}
              alt="Corporate gifting banner"
              className="h-auto w-full object-cover"
            />
          </section>

          <section className="mb-14">
            <h2 className="mb-6 text-center text-2xl font-display font-bold md:text-3xl">
              Customised Corporate Gift Hampers
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[giftingVideo1, giftingVideo2, giftingVideo3, giftingVideo4].map((videoSrc, idx) => (
                <div key={idx} className="overflow-hidden bg-black">
                  <video
                    src={videoSrc}
                    className="aspect-[9/16] w-full object-cover"
                    controls
                    muted
                    loop
                    playsInline
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default CorporateGifting;
