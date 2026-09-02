import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, ArrowLeft, Shield, Clock, Users, MapPin } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="pb-18 min-h-screen bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-secondary/10 to-transparent -z-10"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 z-10 relative">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary mb-1 md:mb-4">
            About Nomo Cars
          </h1>
          <p className="text-xs md:text-xl text-foreground/70 max-w-2xl">
            Redefining the future of freight and logistics across Africa.
          </p>
        </div>

        {/* CEO Message Section */}
        <section className="mb-12 md:mb-20 glass-panel rounded-xl md:rounded-3xl p-3 md:p-12 border border-white/10 dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center relative z-10">
            <div className="md:col-span-5 flex flex-col items-center md:items-start">
              <div className="relative w-60 h-65 md:w-72 md:h-72 mb-6 rounded-xl md:rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                <Image
                  src="/ceo2.jpeg"
                  alt="Nomo Cars CEO"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold dark:text-white">John Doe</h3>
              <p className="text-brand-primary font-medium mb-4">CEO & Founder, Nomo Cars</p>

              <div className="flex flex-col gap-2 w-full max-w-[250px]">
                <a href="tel:+1234567890" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-bg border border-card-border hover:border-brand-primary/50 hover:shadow-sm transition-all text-sm group">
                  <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="font-medium">+1 (234) 567-890</span>
                </a>
                <a href="mailto:ceo@nomocars.com" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card-bg border border-card-border hover:border-brand-secondary/50 hover:shadow-sm transition-all text-sm group">
                  <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary group-hover:bg-brand-secondary group-hover:text-white transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="font-medium">ceo@nomocars.com</span>
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <h2 className="text-xl md:text-3xl font-bold mb-6 dark:text-white">Message from the CEO</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed text-sm md:text-lg">
                <p>
                  "When we started Nomo Cars, we had a clear vision: to build a seamless, reliable, and highly efficient logistics network that connects businesses across Africa. Today, we are transforming how goods move."
                </p>
                <p>
                  "The freight industry has historically struggled with supply chain bottlenecks, fragmented fleets, and lack of transparency. We built this platform to bridge the gap between heavy-duty transporters, businesses, and individuals who need reliable cargo movement."
                </p>
                <p>
                  "Our unique bidding system ensures competitive freight pricing, while our strict driver and vehicle verification guarantees the safety of your cargo. We are more than just a logistics company; we are your strategic partner in growth."
                </p>
                <p className="font-medium italic dark:text-gray-300">
                  "Thank you for trusting Nomo Cars to move your business. Together, we are delivering Africa's future."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-12 dark:text-white">What Makes Nomo Cars Different?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mb-6">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">Safety First</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                Every driver and vehicle undergoes rigorous vetting. We prioritize the security and integrity of your cargo above all else.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary mb-6">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">Reliable & Timely</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                Whether you're moving a small parcel or heavy haulage, our logistics network ensures your goods arrive exactly on time.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-6">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">Fair Bidding</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                Transporters and clients negotiate freight rates transparently. Say goodbye to hidden fees and unpredictable logistics costs.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                <MapPin className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 dark:text-white">Anywhere You Go</h3>
              <p className="text-foreground/70 text-sm leading-relaxed">
                From major ports to remote warehouses, Nomo Cars connects you to a fleet ready to deliver anywhere across the continent.
              </p>
            </div>
          </div>
        </section>

        {/* Next Steps / CTA Section */}
        <section className="mt-20 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 dark:text-white">Have more questions?</h2>
          <div className="flex flex-row flex-nowrap items-center justify-center gap-2 md:gap-4 px-2">
            <Link
              href="/faq"
              className="px-4 py-2 md:px-8 md:py-3.5 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-1 text-xs md:text-base whitespace-nowrap"
            >
              Find Out More
            </Link>
            <Link
              href="/policy"
              className="px-4 py-2 md:px-8 md:py-3.5 bg-card-bg border border-card-border hover:border-brand-primary/50 text-foreground font-medium rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-1 text-xs md:text-base whitespace-nowrap"
            >
              Our Policies
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
