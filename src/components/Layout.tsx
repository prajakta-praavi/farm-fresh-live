import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import FloatingAudioButton from "./FloatingAudioButton";

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-white">
    <Header />
    <main className="flex-1 bg-white">{children}</main>
    <Footer />
    <FloatingAudioButton />
    <WhatsAppButton />
  </div>
);

export default Layout;
