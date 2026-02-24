import { Link } from "react-router-dom";
import rushivanLogo from "@/assets/footer_logo.svg";
import footerBackground from "@/assets/final footer.png";
import { Facebook, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="text-foreground">
      <div
        className="relative overflow-hidden bg-[#7e9d82] bg-cover bg-[center_top] bg-no-repeat md:bg-center"
        style={{ backgroundImage: `url(${footerBackground})` }}
      >
        <div className="absolute inset-0 bg-[#7e9d82]/45" />
        <div className="container relative z-10 pb-0 pt-10 md:pt-12">
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex h-full flex-col items-start pb-6 text-left md:pb-8">
              <img
                src={rushivanLogo}
                alt="Rushivan Aagro"
                className="mb-5 block h-14 w-auto max-w-[180px] object-contain sm:h-16 sm:max-w-[220px] md:h-20 md:max-w-[250px] md:object-left"
              />
              <div className="pl-0 md:pl-6">
                <div className="mb-5 flex items-center gap-3">
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3b5998] text-white transition-transform duration-200 hover:scale-105"
                  >
                    <Facebook size={20} />
                  </a>
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6b7280] text-white transition-transform duration-200 hover:scale-105"
                  >
                    <Instagram size={20} />
                  </a>
                </div>
                <p className="text-base font-semibold leading-none text-foreground md:text-lg">
                  FSSAI : 21525036002976
                </p>
                <p className="mt-3 text-base font-semibold leading-none text-foreground md:text-lg">
                  GST : 27AGKPY0634N1ZQ
                </p>
              </div>
            </div>

            <div className="flex h-full flex-col pb-6 md:pb-8">
              <h3 className="mb-4 text-xl font-bold text-[#2f9b66] sm:text-2xl md:text-3xl">Quick Links</h3>
              <ul className="space-y-2 text-base font-medium text-foreground md:text-lg">
                {[
                  { to: "/", label: "Home" },
                  { to: "/about", label: "About" },
                  { to: "/shop", label: "Shop" },
                  { to: "/stay", label: "Stay" },
                  { to: "/corporate-gifting", label: "Corporate Gifting" },
                  { to: "/contact", label: "Contact" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="transition-colors hover:text-[#2f9b66]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex h-full flex-col pb-6 md:pb-8">
              <h3 className="mb-4 text-xl font-bold text-[#2f9b66] sm:text-2xl md:text-3xl">Contact Details</h3>
              <div className="space-y-2 text-base font-medium text-foreground md:text-lg">
                <p>Address: W27G+J3,</p>
                <p>Chawaneshwar,</p>
                <p>Maharashtra - 415525, India</p>
                <p>Phone: +91 9112137676</p>
                <p>Phone: +91 7774041569</p>
              </div>
            </div>

            <div className="flex h-full flex-col pb-6 md:pb-8">
              <h3 className="mb-4 text-xl font-bold text-[#2f9b66] sm:text-2xl md:text-3xl">Location</h3>
              <div className="overflow-hidden rounded-md border border-[#9ec4d2] bg-white shadow-sm">
                <iframe
                  title="Rushivan Aagro Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3796.387438581428!2d74.02265627415414!3d17.914074387420992!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2450056d99905%3A0x439a465e4257dfe4!2sRushivan%20Agro%20Tourism!5e0!3m2!1sen!2sin!4v1771666196435!5m2!1sen!2sin"
                  className="h-[190px] w-full md:h-[200px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 bg-[#2f9b66] py-4 text-center">
          <p className="px-4 text-sm font-semibold text-[#ffffff] md:text-lg !text-center">
            Copyright &copy;2025 All Rights Reserved By Rushivan Aagro Designed By{" "}
            <span className="text-[#ffe34d]">Webakoof</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
