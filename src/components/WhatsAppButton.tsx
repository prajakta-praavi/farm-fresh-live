import whatsappIcon from "@/assets/whatsapp icon.png";

const WhatsAppButton = () => (
  <a
    href="https://wa.me/917774041569?text=%2AHello%20Rushivan%20Aagro%2C%2A%0A%0AMy%20Name%3A%20%0AEnquiry%20For%3A%20%0A(Farmstay%20Booking%20%2F%20Organic%20Agro%20Products)"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed right-4 z-[100] h-12 w-12 rounded-full bg-transparent p-1 sm:right-6 sm:h-16 sm:w-16 pointer-events-auto"
    style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
    aria-label="Chat on WhatsApp"
  >
    <img
      src={whatsappIcon}
      alt=""
      className="h-full w-full object-contain drop-shadow-[0_3px_8px_rgba(0,0,0,0.28)]"
    />
  </a>
);

export default WhatsAppButton;
