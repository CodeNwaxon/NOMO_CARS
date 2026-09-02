import { Shield, Lock, FileText, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PolicyPage() {
  return (
    <div className="min-h-screen py-4 px-2 md:p-12 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop')" }}>
      {/* Dynamic overlay for dark/light mode */}
      <div className="absolute inset-0 dark:bg-black/90 bg-white/95 z-0 transition-colors duration-300"></div>

      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-brand-primary/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative pt-8">
        <div className="px-4 text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-5xl font-black mb-1 md:mb-2 text-transparent bg-clip-text bg-gradient-to-br from-gray-900 dark:from-white via-blue-800 dark:via-blue-200 to-brand-primary">
            Privacy Policy & Terms
          </h1>
          <p className="text-xs md:text-sm text-foreground/70 max-w-2xl mx-auto">
            Your privacy and security are our top priorities. Read our policies below to understand how we protect your data and the terms of using Nomo Cars.
          </p>
        </div>

        <div className="glass-panel rounded md:p-6 p-4 space-y-12">

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">1. Terms of Service</h2>
            </div>
            <div className="space-y-4 text-sm md:text-base text-foreground/70 leading-relaxed px-2 md:px-11">
              <p>
                By accessing and using Nomo Cars, you agree to comply with our platform's guidelines. We provide a seamless connection between independent drivers, logistic companies, and passengers.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Users must be at least 18 years old to register as a driver.</li>
                <li>All vehicles must meet our safety and inspection standards before approval.</li>
                <li>Passengers must ensure they select the correct transport category for their needs.</li>
              </ul>
            </div>
          </section>

          <div className="h-px w-full bg-border/50"></div>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-secondary/10 rounded-lg text-brand-secondary">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">2. Privacy Policy</h2>
            </div>
            <div className="space-y-4 text-sm md:text-base text-foreground/70 leading-relaxed px-2 md:px-11">
              <p>
                We are committed to safeguarding your personal information. When you use Nomo Cars, we collect data necessary to provide and improve our services.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-foreground">Location Data:</strong> Used strictly for matching you with nearby rides or passengers and tracking active journeys for safety.</li>
                <li><strong className="text-foreground">Account Information:</strong> Your profile details, including images and contact info, are securely stored and never sold to third parties.</li>
              </ul>
            </div>
          </section>

          <div className="h-px w-full bg-border/50"></div>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">3. Data Usage & Cookies</h2>
            </div>
            <div className="space-y-4 text-sm md:text-base text-foreground/70 leading-relaxed px-2 md:px-11">
              <p>
                Nomo Cars utilizes cookies and similar tracking technologies to enhance user experience, remember preferences, and analyze app traffic. You can manage your cookie preferences through your browser settings.
              </p>
            </div>
          </section>

          <div className="h-px w-full bg-border/50"></div>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">4. Compliance & Safety</h2>
            </div>
            <div className="space-y-4 text-sm md:text-base text-foreground/70 leading-relaxed px-2 md:px-11">
              <p>
                Safety is built into every ride. We strictly verify drivers and monitor trips. Any violation of our terms, including inappropriate behavior or fraudulent activity, will result in immediate account termination.
              </p>
            </div>
          </section>

        </div>

        <div className="mt-12 text-center text-xs md:text-sm text-foreground/50">
          Last Updated: September 2026
        </div>
      </div>
    </div>
  );
}
