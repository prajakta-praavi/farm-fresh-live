import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import contactBreadcrumbImage from "@/assets/contact breadcrub main.png";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("https://formsubmit.co/ajax/rushivanagro@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          message: form.message,
          _subject: "New Contact Form Lead - Rushivan Aagro",
          _template: "table",
          _captcha: "false",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      toast({
        title: "Your form is successfully submitted",
      });
    } catch {
      toast({
        title: "Submission Failed",
        description: "Unable to submit right now. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="pt-24 pb-16">
        <PageBreadcrumb image={contactBreadcrumbImage} alt="Contact banner" />

        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Contact Info */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div>
                <h2 className="text-2xl font-display font-bold mb-6">Get in Touch</h2>
                <div className="space-y-5">
                  {[
                    {
                      icon: MapPin,
                      label: "Visit Our Farm",
                      value: "W27G+J3, Chawaneshwar, Maharashtra - 415525, India",
                    },
                    { icon: Phone, label: "Call Us", value: "+91 9112137676 / +91 7774041569" },
                    { icon: Mail, label: "Email Us", value: "rushivanagro@gmail.com" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-muted-foreground text-sm">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="https://wa.me/917774041569?text=%2AHello%20Rushivan%20Aagro%2C%2A%0A%0AMy%20Name%3A%20%0AEnquiry%20For%3A%20%0A(Farmstay%20Booking%20%2F%20Organic%20Agro%20Products)"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[hsl(142,70%,40%)] text-[hsl(0,0%,100%)] px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </a>

              {/* Map placeholder */}
              <div className="rounded-2xl overflow-hidden border border-border h-64 bg-muted flex items-center justify-center">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3796.387438581428!2d74.02265627415414!3d17.914074387420992!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2450056d99905%3A0x439a465e4257dfe4!2sRushivan%20Agro%20Tourism!5e0!3m2!1sen!2sin!4v1771666196435!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Farm Location"
                />
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-4">
                <h3 className="font-display font-bold text-xl mb-2">Send Us a Message</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name</label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 12137676"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Subject</label>
                  <Input
                    required
                    value={form.subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="How can we help?"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Message</label>
                  <Textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell us more..."
                    className="rounded-xl"
                    rows={5}
                  />
                </div>
                <Button type="submit" size="lg" className="w-full rounded-full h-12" disabled={isSubmitting}>
                  <Send className="w-5 h-5 mr-2" />
                  {isSubmitting ? "Submitting..." : "Send Message"}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;


