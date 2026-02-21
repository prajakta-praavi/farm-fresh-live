import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import aboutBreadcrumbImage from "@/assets/breadcrub about.png";
import aboutStoryImage from "@/assets/about_story.jpg";
import visionImage from "@/assets/vision.png";
import missionImage from "@/assets/mission.png";
import ph1Image from "@/assets/ph1.svg";
import ph2Image from "@/assets/ph2.svg";
import ph3Image from "@/assets/ph3.svg";
import ph4Image from "@/assets/ph4.svg";
import fssaiCertificateImage from "@/assets/FSSAI New.png";
import scopeCertificateImage from "@/assets/2nd Year Scope certificate-Rushivan.png";
import { Leaf, Tractor } from "lucide-react";

const About = () => (
  <Layout>
    <div className="pt-24 pb-16">
      <PageBreadcrumb image={aboutBreadcrumbImage} alt="About banner" />

      <div className="container py-12 space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-10 items-start"
        >
          <div>
            <h2 className="text-4xl font-display font-bold mb-5">About Rushivanagro</h2>
            <p className="text-foreground leading-relaxed mb-4">
              Welcome to Rushivan Agro, where nature, sustainability, and organic living come
              together. Surrounded by lush greenery, our farm offers more than just a stay - it is
              an experience of peace, purity, and natural living.
            </p>
            <p className="text-foreground leading-relaxed mb-4">
              Born from a vision of sustainable farming and eco-tourism, Rushivan Agro lets you
              reconnect with nature, learn traditional organic practices, and enjoy fresh,
              chemical-free produce straight from our land.
            </p>
            <h3 className="text-2xl font-display font-bold mb-3">What We Offer:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Leaf className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <span>Farm Stay - Cozy cottages and tents for a peaceful rural retreat.</span>
              </li>
              <li className="flex items-start gap-3">
                <Leaf className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <span>
                  Organic Produce - Naturally grown fruits, vegetables, and grains for healthy
                  living.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Tractor className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                <span>Farm Tours - Hands-on experiences in organic farming and sustainability.</span>
              </li>
            </ul>
          </div>
          <img
            src={aboutStoryImage}
            alt="Rushivan Agro story"
            className="mx-auto h-[300px] w-full max-w-[560px] rounded-2xl object-cover shadow-lg md:h-[420px]"
          />
        </motion.div>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Happiness Grows from the Soil",
              text: "Life on our farm blooms with fresh air, greenery, and natural living.",
              local: "ताजी हवा, हिरवाई आणि नैसर्गिकतेत आमचा आनंद उमलतो.",
              image: ph1Image,
            },
            {
              title: "Respect for Land & Life",
              text: "Our agro tourism model is built on sustainable, eco-friendly farming.",
              local: "शाश्वत, पर्यावरणपूरक शेती हीच आमची जीवनशैली.",
              image: ph2Image,
            },
            {
              title: "Pure, Honest Produce",
              text: "Organic practices ensure every harvest is clean, safe, and wholesome.",
              local: "सेंद्रिय पद्धतीमुळे आमचा शेतमाल अधिक शुद्ध, सुरक्षित आणि पोषक.",
              image: ph3Image,
            },
            {
              title: "A Farmstay with Heart",
              text: "Warm hospitality makes every visitor feel at home in nature.",
              local: "निसर्गांतच उबदार आदरातिथ्य - प्रत्येक पाहुण्यासाठी घरचाच अनुभव.",
              image: ph4Image,
            },
          ].map((item) => (
            <div key={item.title} className="text-center px-2">
              <img src={item.image} alt={item.title} className="mx-auto h-28 w-28 object-contain" />
              <h3 className="mt-4 text-2xl font-display font-bold text-[#0b7a55]">{item.title}</h3>
              <p className="mt-3 text-[1.03rem] text-[#5f6d7a]">{item.text}</p>
              <p className="mt-2 text-[1.03rem] text-[#5f6d7a]">{item.local}</p>
            </div>
          ))}
        </section>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div className="text-center md:text-left">
            <img src={visionImage} alt="Our Vision" className="h-20 w-20 mx-auto mb-4 object-contain" />
            <h3 className="text-center text-3xl font-display font-bold text-[#0b7a55] mb-4">Our Vision | आमचे ध्येय</h3>
            <p className="text-foreground leading-relaxed mb-3">
              To create a world where people reconnect with nature, experience sustainable living,
              and find peace in the simplicity of rural life.
            </p>
            <p className="text-foreground leading-relaxed">
              निसर्गाशी पुन्हा नाते जोडणारा, शाश्वत जीवनाचा अनुभव देणारा आणि ग्रामीण शांततेत
              समाधान शोधणारा असा जग निर्माण करणे.
            </p>
          </div>

          <div className="text-center md:text-left">
            <img src={missionImage} alt="Our Mission" className="h-20 w-20 mx-auto mb-4 object-contain" />
            <h3 className="text-center text-3xl font-display font-bold text-[#0b7a55] mb-4">Our Mission | आमचे उद्दिष्ट</h3>
            <p className="text-foreground leading-relaxed mb-3">
              To promote organic farming, eco-friendly tourism, and traditional wisdom through
              authentic farm experiences that inspire healthy and mindful living.
            </p>
            <p className="text-foreground leading-relaxed">
              सेंद्रिय शेती, पर्यावरणपूरक पर्यटन आणि पारंपरिक ज्ञान यांचा प्रसार करून
              आरोग्यवर्धक व सजग जीवनशैलीसाठी प्रेरणा देणे.
            </p>
          </div>
        </div>

        <section className="rounded-3xl border border-[#dbe6df] p-4 md:p-6">
          <div className="mb-5 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Our Certifications
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: "FSSAI Certification", image: fssaiCertificateImage },
              { title: "Scope Certification", image: scopeCertificateImage },
            ].map((cert, i) => (
              <motion.div
                key={cert.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="overflow-hidden rounded-2xl border border-[#d9e6dd] bg-white shadow-sm"
              >
                <div className="flex items-center justify-center border-b border-[#edf3ef] px-3 py-2 md:px-4">
                  <h3 className="text-center text-base md:text-lg font-semibold text-[#0c6844]">{cert.title}</h3>
                </div>
                <div className="p-0">
                  <img
                    src={cert.image}
                    alt={cert.title}
                    className="mx-auto h-[300px] w-full object-contain bg-white md:h-[360px]"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </div>
  </Layout>
);

export default About;
